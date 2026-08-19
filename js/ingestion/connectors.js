// Ingestion Source Connectors (Fixture & HTTP Transport)

const { Source, Document } = (typeof require !== 'undefined') 
  ? require('../core/models.js') 
  : (window.ORVYRA_Models || {});

class IngestionError {
    constructor(status, errorType, sourceUrl, retryable) {
        this.status = status; // e.g. "FAILED"
        this.errorType = errorType; // e.g. "TIMEOUT", "HTTP_404", "INVALID_JSON"
        this.sourceUrl = sourceUrl;
        this.retryable = retryable;
    }
}

class SourceConnector {
    constructor(sourceModel) {
        this.source = sourceModel;
    }
    
    async fetch() {
        throw new Error("fetch() must be implemented by subclass");
    }

    _generateDocument(rawContent, contentType) {
        let hash = "hash_" + Date.now();
        if (typeof require !== 'undefined') {
            try {
                const crypto = require('crypto');
                hash = crypto.createHash('sha256').update(rawContent).digest('hex');
            } catch(e) {}
        }
        return {
            document: new Document(
                `doc_${Date.now()}_${hash.substring(0, 8)}`,
                this.source.id,
                this.source.title,
                this.source.url,
                rawContent,
                this.source.publicationDate,
                contentType,
                hash
            ),
            hash: hash
        };
    }
}

class FixtureConnector extends SourceConnector {
    constructor(sourceModel, filepathOrData) {
        super(sourceModel);
        this.filepathOrData = filepathOrData;
    }

    async fetch() {
        try {
            let rawContent;
            if (typeof this.filepathOrData === 'string') {
                if (typeof require !== 'undefined') {
                    const fs = require('fs');
                    rawContent = fs.readFileSync(this.filepathOrData, 'utf8');
                } else {
                    rawContent = this.filepathOrData;
                }
            } else {
                rawContent = JSON.stringify(this.filepathOrData);
            }
            JSON.parse(rawContent);
            return this._generateDocument(rawContent, "JSON");
        } catch (e) {
            return new IngestionError("FAILED", "INVALID_JSON", String(this.filepathOrData), false);
        }
    }
}

class HttpConnector extends SourceConnector {
    constructor(sourceModel, timeoutMs = 5000) {
        super(sourceModel);
        this.timeoutMs = timeoutMs;
    }

    async fetch() {
        const fetchImpl = (typeof globalThis !== 'undefined' && globalThis.fetch) ? globalThis.fetch : null;
        if (!fetchImpl) {
            return new IngestionError("FAILED", "NO_FETCH_IMPL", this.source.url, false);
        }

        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

        try {
            const opts = controller ? { signal: controller.signal } : {};
            const response = await fetchImpl(this.source.url, opts);
            if (timeoutId) clearTimeout(timeoutId);

            if (!response.ok) {
                const retryable = response.status === 429 || response.status >= 500;
                return new IngestionError("FAILED", `HTTP_${response.status}`, this.source.url, retryable);
            }

            const text = await response.text();
            if (text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE')) {
                return new IngestionError("FAILED", "UNEXPECTED_HTML", this.source.url, false);
            }

            try {
                JSON.parse(text);
                return this._generateDocument(text, "JSON");
            } catch (err) {
                return new IngestionError("FAILED", "INVALID_JSON", this.source.url, false);
            }

        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            if (error && error.name === 'AbortError') {
                return new IngestionError("FAILED", "TIMEOUT", this.source.url, true);
            }
            return new IngestionError("FAILED", "NETWORK_FAILURE", this.source.url, true);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SourceConnector, FixtureConnector, HttpConnector, IngestionError };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Connectors = { SourceConnector, FixtureConnector, HttpConnector, IngestionError };
}
