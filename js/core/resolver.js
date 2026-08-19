// Deterministic Entity Resolution Engine

const { MatchStatus } = (typeof require !== 'undefined') 
  ? require('./models.js') 
  : (window.ORVYRA_Models || { MatchStatus: { MATCH:"MATCH", POSSIBLE_MATCH:"POSSIBLE_MATCH", NO_MATCH:"NO_MATCH" } });

class EntityResolver {
    constructor() {
        this.aliasMap = new Map(); // normalized alias -> canonical ID
        this.idMap = new Map();    // ID -> Entity object
    }
    
    normalize(text) {
        if (!text) return "";
        return String(text)
            .toLowerCase()
            .trim()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    registerEntity(entity) {
        if (!entity || !entity.id) return;
        this.idMap.set(entity.id, entity);
        
        // Register canonical name
        if (entity.canonicalName || entity.name) {
            const name = entity.canonicalName || entity.name;
            this.aliasMap.set(this.normalize(name), entity.id);
        }
        
        // Register aliases
        if (entity.aliases && Array.isArray(entity.aliases)) {
            for (const alias of entity.aliases) {
                if (alias) this.aliasMap.set(this.normalize(alias), entity.id);
            }
        }
    }

    resolve(mention) {
        if (!mention) return null;
        
        // 1. Try explicit ID match
        if (this.idMap.has(mention)) {
            return this.idMap.get(mention).id;
        }

        // 2. Try normalized alias mapping
        const norm = this.normalize(mention);
        if (this.aliasMap.has(norm)) {
            return this.aliasMap.get(norm);
        }

        return null;
    }
}

class AdvancedEntityResolver extends EntityResolver {
    resolveAdvanced(mention) {
        if (!mention) return { matchStatus: MatchStatus.NO_MATCH, id: null, reasons: ["Empty query"] };
        
        if (this.idMap.has(mention)) {
            return { matchStatus: MatchStatus.MATCH, id: this.idMap.get(mention).id, reasons: ["Exact ID match"] };
        }

        const norm = this.normalize(mention);
        
        if (this.aliasMap.has(norm)) {
            return { matchStatus: MatchStatus.MATCH, id: this.aliasMap.get(norm), reasons: ["Exact normalized alias/name match"] };
        }

        // Substring overlap check for possible matches
        for (const [alias, id] of this.aliasMap.entries()) {
            if (alias.length > 3 && norm.length > 3 && (alias.includes(norm) || norm.includes(alias))) {
                return { matchStatus: MatchStatus.POSSIBLE_MATCH, id: id, reasons: ["Substring overlap"] };
            }
        }

        return { matchStatus: MatchStatus.NO_MATCH, id: null, reasons: ["No similarity found"] };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EntityResolver, AdvancedEntityResolver };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_Resolver = { EntityResolver, AdvancedEntityResolver };
}
