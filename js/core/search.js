// SearchService Abstraction

class SearchService {
    constructor(repository) {
        this.repo = repository;
    }

    searchInstitutions(query, typeFilter, regionFilter) {
        const results = [];
        const qNorm = query ? query.toLowerCase().trim() : "";
        for (const e of this.repo.getAllEntities()) {
            const kind = e.entityType || e.kind;
            if (kind !== 'Organization' && kind !== 'organization') continue;
            
            let match = true;
            if (typeFilter && typeFilter !== 'All Types' && typeFilter !== 'All') {
                const sub = (e.metadata && e.metadata.institution_type) || e.tagline;
                if (sub !== typeFilter) match = false;
            }
            if (regionFilter && regionFilter !== 'All Regions' && regionFilter !== 'Global') {
                const reg = (e.metadata && (e.metadata.continent || e.metadata.region || e.metadata.country)) || e.region;
                if (reg !== regionFilter) match = false;
            }
            if (qNorm) {
                const name = e.canonicalName || e.name || "";
                const nameNorm = name.toLowerCase();
                const aliases = e.aliases ? e.aliases.map(a => a.toLowerCase()).join(" ") : "";
                if (!nameNorm.includes(qNorm) && !aliases.includes(qNorm)) match = false;
            }
            if (match) results.push(e);
        }
        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SearchService };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Search = { SearchService };
}
