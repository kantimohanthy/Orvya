// ORVYRA / CosmoHub Intelligence Core - Domain Models

const InstitutionTaxonomy = [
    "SPACE_AGENCY", "UNIVERSITY", "RESEARCH_INSTITUTE", "LABORATORY", "COMPANY", "STARTUP", 
    "GOVERNMENT_ORGANIZATION", "REGULATOR", "INTERNATIONAL_ORGANIZATION", "NONPROFIT", 
    "FOUNDATION", "INVESTOR", "INCUBATOR", "ACCELERATOR", "STANDARDS_ORGANIZATION", 
    "EDUCATIONAL_INSTITUTION", "OTHER"
];

const SourcePriority = {
    PRIMARY_OFFICIAL: 1,
    GOVERNMENT: 2,
    INTERNATIONAL_ORGANIZATION: 3,
    UNIVERSITY: 4,
    RESEARCH_INSTITUTION: 5,
    COMPANY: 6,
    SCIENTIFIC_DATABASE: 7,
    SECONDARY: 8,
    UNKNOWN: 9
};

const MatchStatus = {
    MATCH: "MATCH",
    POSSIBLE_MATCH: "POSSIBLE_MATCH",
    NO_MATCH: "NO_MATCH"
};

const ProvenanceType = {
    LIVE: "LIVE",
    SOURCE_FIXTURE: "SOURCE_FIXTURE",
    SYNTHETIC: "SYNTHETIC"
};

class Source {
    constructor(id, publisher, title, url, publicationDate, sourceType, priority = SourcePriority.UNKNOWN) {
        this.id = id;
        this.publisher = publisher;
        this.title = title;
        this.url = url;
        this.publicationDate = publicationDate;
        this.sourceType = sourceType;
        this.priority = priority; 
        this.provenance = ProvenanceType.SOURCE_FIXTURE;
    }
}

class Document {
    constructor(id, sourceId, title, url, contentReference, publicationDate, documentType, hash = null) {
        this.id = id;
        this.sourceId = sourceId;
        this.title = title;
        this.url = url;
        this.contentReference = contentReference;
        this.publicationDate = publicationDate;
        this.documentType = documentType;
        this.hash = hash;
        this.provenance = ProvenanceType.SOURCE_FIXTURE;
    }
}

class RawDocument {
    constructor(sourceId, url, rawContent, contentType) {
        this.sourceId = sourceId;
        this.url = url;
        this.rawContent = rawContent;
        this.contentType = contentType;
        this.retrievalTimestamp = new Date().toISOString();
        this.hash = null;
    }
}

class Entity {
    constructor(id, canonicalName, entityType, aliases = [], metadata = {}, provenanceReferences = [], provenance = ProvenanceType.SYNTHETIC) {
        this.id = id;
        this.canonicalName = canonicalName;
        this.entityType = entityType; // Organization, Mission, Technology, Event, Market, Site, Person, Work, etc.
        this.aliases = aliases;
        this.metadata = metadata; // Handles dynamic attributes: latitude, longitude, founded, status, description, etc.
        this.provenanceReferences = provenanceReferences;
        this.provenance = provenance;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }
}

class Work {
    constructor(id, title, openAlexId = null, doi = null, publicationDate = null, journal = null, citedByCount = 0, topics = [], authors = [], provenance = ProvenanceType.LIVE) {
        this.id = id;
        this.canonicalName = title;
        this.title = title;
        this.openAlexId = openAlexId;
        this.doi = doi;
        this.publicationDate = publicationDate;
        this.journal = journal;
        this.citedByCount = citedByCount;
        this.topics = topics;
        this.authors = authors;
        this.provenance = provenance;
        this.entityType = 'Work';
        this.kind = 'work';
        this.metadata = { openAlexId, doi, publicationDate, journal, citedByCount, topics, authors };
    }
}

class Claim {
    constructor(id, subjectId, predicate, objectId, sourceDocumentId, confidence, evidence, extractionMethod, publicationDate, extractedDate, observedAt, validFrom, validUntil, provenanceStatus, provenance = ProvenanceType.SYNTHETIC) {
        this.id = id;
        this.subjectId = subjectId;
        this.predicate = predicate; 
        this.objectId = objectId;
        this.sourceDocumentId = sourceDocumentId;
        this.confidence = confidence;
        this.evidence = evidence;
        this.extractionMethod = extractionMethod;
        this.publicationDate = publicationDate;
        this.extractedDate = extractedDate;
        this.observedAt = observedAt || new Date().toISOString();
        this.validFrom = validFrom || null;
        this.validUntil = validUntil || null;
        this.provenanceStatus = provenanceStatus || "ACTIVE"; // ACTIVE, SUPERSEDED, CONFLICTED
        this.provenance = provenance;
    }
}

class Conflict {
    constructor(id, claimAId, claimBId, resolutionReason = null) {
        this.id = id;
        this.claimAId = claimAId;
        this.claimBId = claimBId;
        this.status = "UNRESOLVED";
        this.resolutionReason = resolutionReason;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Source, Document, RawDocument, Entity, Work, Claim, Conflict, InstitutionTaxonomy, SourcePriority, MatchStatus, ProvenanceType };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Models = { Source, Document, RawDocument, Entity, Work, Claim, Conflict, InstitutionTaxonomy, SourcePriority, MatchStatus, ProvenanceType };
}
