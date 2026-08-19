// CosmoHub & ORVYRA API Interface Abstraction

class CosmoHubAPI {
    constructor(queryEngine, searchService) {
        this.engine = queryEngine;
        this.search = searchService;
    }

    getInstitutions(query, type, region) { return this.search.searchInstitutions(query, type, region); }
    getInstitutionById(id) { return this.engine.getEntity(id); }
    getInstitutionClaims(id) { return this.engine.getClaimsForEntity(id); }
    getInstitutionRelationships(id) { return this.engine.getRelatedEntities(id); }
    getClaimProvenance(id) { return this.engine.getProvenanceForClaim(id); }
    getEntitiesByType(type) { return this.engine.getEntitiesByType(type); }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CosmoHubAPI };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_API = { CosmoHubAPI };
}
