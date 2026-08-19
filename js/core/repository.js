// Storage Abstraction for In-Memory Graph & Intelligence Store

class InMemoryRepository {
    constructor(entities = [], claims = [], sources = [], documents = []) {
        this.entities = new Map(entities.map(e => [e.id, e]));
        this.claims = new Map(claims.map(c => [c.id, c]));
        this.sources = new Map(sources.map(s => [s.id, s]));
        this.documents = new Map(documents.map(d => [d.id, d]));
        this.conflicts = new Map();
    }

    // Entity operations
    saveEntity(entity) { this.entities.set(entity.id, entity); }
    getEntity(id) { return this.entities.get(id) || null; }
    getAllEntities() { return Array.from(this.entities.values()); }
    deleteEntity(id) { return this.entities.delete(id); }

    // Claim operations
    saveClaim(claim) { this.claims.set(claim.id, claim); }
    getClaim(id) { return this.claims.get(id) || null; }
    getAllClaims() { return Array.from(this.claims.values()); }

    // Source & Document operations
    saveSource(source) { this.sources.set(source.id, source); }
    getSource(id) { return this.sources.get(id) || null; }
    getAllSources() { return Array.from(this.sources.values()); }

    saveDocument(doc) { this.documents.set(doc.id, doc); }
    getDocument(id) { return this.documents.get(id) || null; }
    getAllDocuments() { return Array.from(this.documents.values()); }

    // Conflict operations
    saveConflict(conflict) { this.conflicts.set(conflict.id, conflict); }
    getConflict(id) { return this.conflicts.get(id) || null; }
    getAllConflicts() { return Array.from(this.conflicts.values()); }

    clear() {
        this.entities.clear();
        this.claims.clear();
        this.sources.clear();
        this.documents.clear();
        this.conflicts.clear();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InMemoryRepository };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Repository = { InMemoryRepository };
}
