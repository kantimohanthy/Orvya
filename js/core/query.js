// Query Engine & Provenance Graph Traversal

class QueryEngine {
    constructor(entities = [], claims = [], sources = [], documents = []) {
        this.entities = new Map(entities.map(e => [e.id, e]));
        this.claims = new Map(claims.map(c => [c.id, c]));
        this.sources = new Map(sources.map(s => [s.id, s]));
        this.documents = new Map(documents.map(d => [d.id, d]));
    }

    getEntity(id) {
        return this.entities.get(id) || null;
    }

    findEntityByName(nameStr) {
        if (!nameStr) return null;
        const lower = nameStr.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ").trim();
        for (const [id, e] of this.entities) {
            const name = e.canonicalName || e.name;
            if (!name) continue;
            const canonicalNorm = name.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ").trim();
            if (canonicalNorm === lower) return e;
            if (e.aliases && Array.isArray(e.aliases)) {
                const aliasesNorm = e.aliases.map(a => a.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ").trim());
                if (aliasesNorm.includes(lower)) return e;
            }
        }
        return null;
    }

    getClaimsForEntity(entityId) {
        const results = [];
        for (const [id, claim] of this.claims) {
            if (claim.subjectId === entityId || claim.objectId === entityId) {
                results.push(claim);
            }
        }
        return results;
    }

    getRelatedEntities(entityId) {
        const claims = this.getClaimsForEntity(entityId);
        const related = [];
        for (const c of claims) {
            if (c.subjectId === entityId && c.objectId) {
                related.push({ predicate: c.predicate, entity: this.getEntity(c.objectId), claim: c, direction: 'out' });
            } else if (c.objectId === entityId) {
                related.push({ predicate: c.predicate, entity: this.getEntity(c.subjectId), claim: c, direction: 'in' });
            }
        }
        return related;
    }

    getEvidenceForClaim(claimId) {
        const claim = this.claims.get(claimId);
        return claim ? claim.evidence : null;
    }

    getProvenanceForClaim(claimId) {
        const claim = this.claims.get(claimId);
        if (!claim) return null;
        
        const doc = this.documents.get(claim.sourceDocumentId);
        const src = doc ? this.sources.get(doc.sourceId) : null;
        const ev = claim.evidence;
        
        return {
            claim: claim,
            document: doc,
            source: src,
            evidence: ev
        };
    }

    getEntitiesByType(typeStr) {
        const results = [];
        for (const [id, e] of this.entities) {
            const kind = e.entityType || e.kind;
            if (kind === typeStr) results.push(e);
        }
        return results;
    }
    
    searchEntities(query, typeFilter, regionFilter, subtypeFilter) {
        const results = [];
        const qNorm = query ? query.toLowerCase().trim() : "";
        for (const [id, e] of this.entities) {
            let match = true;
            const kind = e.entityType || e.kind;
            if (typeFilter && typeFilter !== 'All' && typeFilter !== 'All Types') {
                if (kind !== typeFilter) match = false;
            }
            if (subtypeFilter && subtypeFilter !== 'All') {
                const sub = (e.metadata && e.metadata.institution_type) || e.tagline;
                if (sub !== subtypeFilter) match = false;
            }
            if (regionFilter && regionFilter !== 'Global' && regionFilter !== 'All Regions') {
                const reg = (e.metadata && (e.metadata.continent || e.metadata.region || e.metadata.country)) || e.region;
                if (reg !== regionFilter) match = false;
            }
            if (qNorm) {
                const name = e.canonicalName || e.name || "";
                const nameNorm = name.toLowerCase();
                const aliasesNorm = (e.aliases || []).map(a => a.toLowerCase()).join(" ");
                if (!nameNorm.includes(qNorm) && !aliasesNorm.includes(qNorm)) match = false;
            }
            if (match) results.push(e);
        }
        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QueryEngine };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Query = { QueryEngine };
}
