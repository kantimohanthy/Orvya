// Ingestion & Validation Pipeline (ROR + OpenAlex Live Data Normalization & Resolution)

const { Source, Document, Entity, Claim, SourcePriority, MatchStatus, Conflict, ProvenanceType } =
  (typeof require !== 'undefined') ? require('../core/models.js') : (window.ORVYRA_Models || {});
const { InMemoryRepository } =
  (typeof require !== 'undefined') ? require('../core/repository.js') : (window.ORVYRA_Repository || {});
const { EntityResolver, AdvancedEntityResolver } =
  (typeof require !== 'undefined') ? require('../core/resolver.js') : (window.ORVYRA_Resolver || {});
const { FixtureConnector, HttpConnector, IngestionError } =
  (typeof require !== 'undefined') ? require('./connectors.js') : (window.ORVYRA_Connectors || {});

class DocumentParser {
    parse(document) {
        if (!document || !document.contentReference) return null;
        try {
            return JSON.parse(document.contentReference);
        } catch(e) {
            return null;
        }
    }
}

class EntityNormalizer {
    normalize(text) {
        if (!text) return "";
        return String(text)
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
    }
}

class ClaimBuilder {
    build(subjectId, predicate, objectId, doc, evidenceStr, confidence = "SOURCE_BACKED", provenance = ProvenanceType.LIVE) {
        const id = `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        return new Claim(
            id,
            subjectId,
            predicate,
            objectId,
            doc ? doc.id : null,
            confidence,
            evidenceStr,
            "Live Ingestion Pipeline",
            doc ? doc.publicationDate : new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString(),
            null,
            null,
            "ACTIVE",
            provenance
        );
    }
}

class Validator {
    validateClaim(claim, repo) {
        if (!claim) return false;
        if (!claim.subjectId || !repo.getEntity(claim.subjectId)) return false;
        if (claim.objectId && !repo.getEntity(claim.objectId)) return false;
        if (!claim.predicate) return false;
        if (claim.confidence === "SOURCE_BACKED" && (!claim.evidence || String(claim.evidence).trim().length === 0)) return false;
        if (claim.validFrom && claim.validUntil && new Date(claim.validFrom) > new Date(claim.validUntil)) return false;
        return true;
    }
}

class InstitutionIngestionPipeline {
    constructor(repository = null, resolver = null) {
        this.repo = repository || new InMemoryRepository();
        this.resolver = resolver || new AdvancedEntityResolver();
        this.normalizer = new EntityNormalizer();
        this.claimBuilder = new ClaimBuilder();
        this.validator = new Validator();
        this.stats = {
            entities: 0,
            claims: 0,
            rejectedClaims: 0,
            ambiguousEntities: 0,
            skippedDuplicates: 0
        };
    }

    ingestCorpus(corpusPayload) {
        if (!corpusPayload || !Array.isArray(corpusPayload.entities)) {
            return { error: 'Invalid corpus payload' };
        }

        const metrics = {
            entities: 0,
            evidence: 0,
            relationships: 0,
            rejected: 0,
            skipped: 0,
            ambiguous: 0
        };

        const evMap = new Map();

        // 1. Process evidence records
        (corpusPayload.evidence || []).forEach(v => {
            evMap.set(v.id, v);
            const doc = new Document(
                v.id,
                v.sourceUri,
                v.claim,
                v.sourceUri,
                v.claim,
                v.publishedAt,
                "Live API"
            );
            doc.provenance = v.provenance || ProvenanceType.LIVE;
            this.repo.saveDocument(doc);
            metrics.evidence++;
        });

        // 2. Process entities via AdvancedEntityResolver
        (corpusPayload.entities || []).forEach(item => {
            const name = item.canonicalName || item.name;
            const res = this.resolver.resolveAdvanced(name);

            let canonicalId = null;

            if (res.matchStatus === MatchStatus.MATCH) {
                canonicalId = res.id;
                metrics.skipped++;
            } else if (res.matchStatus === MatchStatus.POSSIBLE_MATCH) {
                metrics.ambiguous++;
                this.stats.ambiguousEntities++;
                // Do NOT force auto-merge on ambiguous match; register under candidate ID
                canonicalId = item.id;
                const ent = new Entity(
                    canonicalId,
                    name,
                    item.entityType || item.kind || 'Organization',
                    item.aliases || [],
                    item.metadata || item.attrs || {},
                    [],
                    item.provenance || ProvenanceType.LIVE
                );
                if (item.geo) ent.geo = item.geo;
                if (item.tagline) ent.tagline = item.tagline;
                if (item.region) ent.region = item.region;
                if (item.sectors) ent.sectors = item.sectors;
                this.repo.saveEntity(ent);
                this.resolver.registerEntity(ent);
                metrics.entities++;
            } else {
                canonicalId = item.id;
                const ent = new Entity(
                    canonicalId,
                    name,
                    item.entityType || item.kind || 'Organization',
                    item.aliases || [],
                    item.metadata || item.attrs || {},
                    [],
                    item.provenance || ProvenanceType.LIVE
                );
                if (item.geo) ent.geo = item.geo;
                if (item.tagline) ent.tagline = item.tagline;
                if (item.region) ent.region = item.region;
                if (item.sectors) ent.sectors = item.sectors;
                this.repo.saveEntity(ent);
                this.resolver.registerEntity(ent);
                metrics.entities++;
            }
        });

        // Build ROR ref lookup
        const byRorRef = new Map();
        this.repo.getAllEntities().forEach(ent => {
            if (ent.attrs && ent.attrs.rorId && ent.attrs.rorId.v) {
                byRorRef.set(ent.attrs.rorId.v, ent.id);
            }
        });
        const fixEndpoint = id => (id && id.startsWith('org-ref:')) ? (byRorRef.get(id.slice(8)) || id) : id;

        // 3. Process edges/claims with validation
        (corpusPayload.edges || []).forEach(e => {
            const fromId = fixEndpoint(e.from);
            const toId = fixEndpoint(e.to);
            const hasEv = e.ev && Array.isArray(e.ev) && e.ev.length > 0;
            const validEv = hasEv && e.ev.every(evId => evMap.has(evId));
            const subject = this.repo.getEntity(fromId);
            const object = this.repo.getEntity(toId);

            if (!hasEv || !validEv || !subject || !object) {
                const conf = new Conflict(`conf_${Date.now()}_${Math.random()}`, fromId, toId, 'Unevidenced or unresolved endpoint');
                this.repo.saveConflict(conf);
                metrics.rejected++;
                this.stats.rejectedClaims++;
                return;
            }

            const evText = e.ev.map(id => evMap.get(id).claim).join('; ');
            const claim = new Claim(
                e.id || `c_edge_${Date.now()}_${Math.random()}`,
                fromId,
                e.rel,
                toId,
                e.ev[0],
                "SOURCE_BACKED",
                evText,
                "Harvester Edge",
                null,
                new Date().toISOString(),
                new Date().toISOString(),
                null,
                null,
                "ACTIVE",
                e.provenance || ProvenanceType.LIVE
            );

            if (this.validator.validateClaim(claim, this.repo)) {
                this.repo.saveClaim(claim);
                metrics.relationships++;
                this.stats.claims++;
            } else {
                metrics.rejected++;
                this.stats.rejectedClaims++;
            }
        });

        this.stats.entities += metrics.entities;
        return metrics;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DocumentParser,
        EntityNormalizer,
        ClaimBuilder,
        Validator,
        InstitutionIngestionPipeline
    };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Pipeline = {
        DocumentParser,
        EntityNormalizer,
        ClaimBuilder,
        Validator,
        InstitutionIngestionPipeline
    };
}
