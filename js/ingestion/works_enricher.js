// Bounded Organization-Centric Research Works Enricher

const { Work, Claim, Document, ProvenanceType } = (typeof require !== 'undefined') 
  ? require('../core/models.js') 
  : (window.ORVYRA_Models || {});
const { GeoNormalizer } = (typeof require !== 'undefined')
  ? require('../core/geo.js')
  : (window.ORVYRA_Geo || {});
const { TaxonomyClassifier } = (typeof require !== 'undefined')
  ? require('../core/taxonomy.js')
  : (window.ORVYRA_Taxonomy || {});

class ResearchWorksEnricher {
    constructor(repository, resolver) {
        this.repo = repository;
        this.resolver = resolver;
        this.workMap = new Map(); // OpenAlex ID / DOI / norm title -> Work entity
        this.doiMap = new Map();  // DOI -> Work entity
    }

    ingestWorksForOrganization(orgId, rawWorks = []) {
        const org = this.repo.getEntity(orgId);
        if (!org) return { error: 'Organization not found in repository', orgId };

        const ingestedWorks = [];
        const createdClaims = [];

        for (const raw of rawWorks) {
            const openAlexId = raw.id || raw.openAlexId || null;
            const doi = raw.doi || null;
            const title = raw.title || raw.display_name || "Untitled Work";
            const normTitle = String(title).toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ").trim();

            // 1. Deduplication check
            let existingWork = null;
            if (openAlexId && this.workMap.has(openAlexId)) {
                existingWork = this.workMap.get(openAlexId);
            } else if (doi && this.doiMap.has(doi)) {
                existingWork = this.doiMap.get(doi);
            } else if (this.workMap.has(normTitle)) {
                existingWork = this.workMap.get(normTitle);
            }

            let workEntity;
            if (existingWork) {
                workEntity = existingWork;
            } else {
                const workId = `work_${openAlexId ? String(openAlexId).replace(/[^a-zA-Z0-9]/g, '_') : 'w_' + Date.now() + '_' + Math.floor(Math.random()*1000)}`;
                workEntity = new Work(
                    workId,
                    title,
                    openAlexId,
                    doi,
                    raw.publication_date || raw.publicationDate || raw.year ? `${raw.year}-01-01` : null,
                    raw.journal || (raw.primary_location && raw.primary_location.source ? raw.primary_location.source.display_name : null),
                    raw.cited_by_count != null ? raw.cited_by_count : (raw.citedByCount || 0),
                    raw.topics || (raw.concepts ? raw.concepts.map(c => c.display_name) : []),
                    raw.authors || (raw.authorships ? raw.authorships.map(a => a.author ? a.author.display_name : null).filter(Boolean) : []),
                    raw.provenance || ProvenanceType.LIVE
                );

                this.repo.saveEntity(workEntity);
                if (openAlexId) this.workMap.set(openAlexId, workEntity);
                if (doi) this.doiMap.set(doi, workEntity);
                this.workMap.set(normTitle, workEntity);
                ingestedWorks.push(workEntity);
            }

            // 2. Create evidence-backed claim linking Organization -> publishes -> Work
            const claimId = `c_pub_${orgId}_${workEntity.id}`;
            if (!this.repo.getClaim(claimId)) {
                const docId = `doc_work_${workEntity.id}`;
                const doc = new Document(
                    docId,
                    workEntity.openAlexId || workEntity.id,
                    `Publication: ${workEntity.title}`,
                    workEntity.openAlexId || `doi:${workEntity.doi}`,
                    JSON.stringify(workEntity),
                    workEntity.publicationDate,
                    "Bibliographic Record"
                );
                doc.provenance = workEntity.provenance;
                this.repo.saveDocument(doc);

                const claim = new Claim(
                    claimId,
                    orgId,
                    "PUBLISHES",
                    workEntity.id,
                    docId,
                    "SOURCE_BACKED",
                    `OpenAlex indexes published work "${workEntity.title}" affiliated with ${org.canonicalName || org.name}`,
                    "OpenAlex Bibliographic Ingestion",
                    workEntity.publicationDate,
                    new Date().toISOString(),
                    new Date().toISOString(),
                    null,
                    null,
                    "ACTIVE",
                    workEntity.provenance
                );
                this.repo.saveClaim(claim);
                createdClaims.push(claim);
            }
        }

        return {
            orgId,
            ingestedWorksCount: ingestedWorks.length,
            createdClaimsCount: createdClaims.length
        };
    }

    generateResearchProfile(orgId) {
        const org = this.repo.getEntity(orgId);
        if (!org) return null;

        const claims = this.repo.getAllClaims().filter(c => c.subjectId === orgId);
        const publishedClaims = claims.filter(c => c.predicate === "PUBLISHES");
        const topicClaims = claims.filter(c => c.predicate === "researches");

        const works = publishedClaims.map(c => this.repo.getEntity(c.objectId)).filter(Boolean);
        const topics = [...new Set(topicClaims.map(c => c.objectId))];

        const totalCitations = works.reduce((sum, w) => sum + (w.citedByCount || 0), 0);
        const yearlyWorks = {};
        works.forEach(w => {
            if (w.publicationDate) {
                const year = String(w.publicationDate).slice(0, 4);
                yearlyWorks[year] = (yearlyWorks[year] || 0) + 1;
            }
        });

        return {
            organizationId: orgId,
            name: org.canonicalName || org.name,
            worksCount: works.length,
            topicsCount: topics.length,
            totalCitations,
            yearlyWorks,
            topics,
            worksSummary: works.slice(0, 5).map(w => ({ id: w.id, title: w.title, date: w.publicationDate, citations: w.citedByCount }))
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResearchWorksEnricher };
}
if (typeof window !== 'undefined') {
    window.ORVYRA_WorksEnricher = { ResearchWorksEnricher };
}
