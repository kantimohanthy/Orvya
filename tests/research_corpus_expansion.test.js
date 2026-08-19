const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Source, Document, Entity, Work, Claim, SourcePriority, MatchStatus, ProvenanceType } = require('../js/core/models.js');
const { InMemoryRepository } = require('../js/core/repository.js');
const { AdvancedEntityResolver } = require('../js/core/resolver.js');
const { SpaceTaxonomy, TaxonomyClassifier } = require('../js/core/taxonomy.js');
const { ResearchWorksEnricher } = require('../js/ingestion/works_enricher.js');
const { InstitutionIngestionPipeline } = require('../js/ingestion/pipeline.js');
const ORVYRA = require('../orvyra-intelligence.js');

function runPhase7Tests() {
    console.log("=== ORVYRA Phase 7 Research Corpus Expansion Tests ===");

    const repo = new InMemoryRepository();
    const resolver = new AdvancedEntityResolver();
    const enricher = new ResearchWorksEnricher(repo, resolver);
    const pipeline = new InstitutionIngestionPipeline(repo, resolver);

    // Ingest live corpus
    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    assert.ok(fs.existsSync(corpusFixturePath), "orvyra-live-corpus.json fixture missing");
    const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));
    pipeline.ingestCorpus(liveCorpus);

    // 1. Ingest Bounded Representative Works
    const rawWorksESA = [
        {
            id: "https://openalex.org/W43891001",
            doi: "10.1016/j.actaastro.2025.02.010",
            title: "Sentinel-6 Michael Freilich Precision Altimetry Calibration",
            publication_date: "2025-02-10",
            year: 2025,
            primary_location: { source: { display_name: "IEEE Transactions on Geoscience and Remote Sensing" } },
            cited_by_count: 84,
            topics: ["Earth Observation", "Radar Altimetry", "Oceanography"],
            authorships: [{ author: { display_name: "Dr. H. ESA-Lead" } }, { author: { display_name: "Dr. K. Co-Author" } }]
        },
        {
            id: "https://openalex.org/W43891002",
            doi: "10.1016/j.actaastro.2024.08.012",
            title: "Biomass P-band SAR Mission Performance Analysis",
            publication_date: "2024-08-15",
            year: 2024,
            primary_location: { source: { display_name: "Acta Astronautica" } },
            cited_by_count: 56,
            topics: ["Synthetic Aperture Radar", "Forest Biomass", "Earth Observation"],
            authorships: [{ author: { display_name: "Dr. M. Scientist" } }]
        }
    ];

    const rawWorksDLR = [
        {
            id: "https://openalex.org/W43892001",
            doi: "10.1016/j.actaastro.2025.01.005",
            title: "TanDEM-X 3D Elevation Modeling and Polarimetric Interferometry",
            publication_date: "2025-01-05",
            year: 2025,
            primary_location: { source: { display_name: "ISPRS Journal of Photogrammetry and Remote Sensing" } },
            cited_by_count: 112,
            topics: ["Synthetic Aperture Radar", "Interferometry", "Earth Observation"],
            authorships: [{ author: { display_name: "Dr. G. DLR-Researcher" } }]
        },
        {
            id: "https://openalex.org/W43891001", // Duplicate DOI / OpenAlex ID to test deduplication!
            doi: "10.1016/j.actaastro.2025.02.010",
            title: "Sentinel-6 Michael Freilich Precision Altimetry Calibration",
            publication_date: "2025-02-10",
            year: 2025,
            primary_location: { source: { display_name: "IEEE Transactions on Geoscience and Remote Sensing" } },
            cited_by_count: 84,
            topics: ["Earth Observation", "Radar Altimetry"],
            authorships: [{ author: { display_name: "Dr. H. ESA-Lead" } }]
        }
    ];

    const targetOrgId = repo.getAllEntities().find(e => e.canonicalName === "European Space Agency" || e.name === "European Space Agency").id;
    const targetDlrId = repo.getAllEntities().find(e => e.canonicalName === "German Aerospace Center" || e.name === "German Aerospace Center" || e.id.includes("dlr")).id;

    const resESA = enricher.ingestWorksForOrganization(targetOrgId, rawWorksESA);
    const resDLR = enricher.ingestWorksForOrganization(targetDlrId, rawWorksDLR);

    // 2. Audit & Measurement Assertions
    const allWorks = repo.getAllEntities().filter(e => e.entityType === 'Work');
    const worksWithDoi = allWorks.filter(w => w.doi);
    const worksWithDate = allWorks.filter(w => w.publicationDate);
    const worksWithAuthors = allWorks.filter(w => w.authors && w.authors.length > 0);
    const worksWithCitations = allWorks.filter(w => w.citedByCount > 0);
    const worksWithOpenAlex = allWorks.filter(w => w.openAlexId);
    const worksWithJournal = allWorks.filter(w => w.journal);

    console.log("\n1. Audit of Current Work Corpus:");
    console.log(`  - Total Work Records: ${allWorks.length}`);
    console.log(`  - Works per Enriched Org: ESA (${resESA.ingestedWorksCount}), DLR (${resDLR.ingestedWorksCount})`);
    console.log(`  - Works with OpenAlex ID: ${worksWithOpenAlex.length} / ${allWorks.length}`);
    console.log(`  - Works with DOI: ${worksWithDoi.length} / ${allWorks.length}`);
    console.log(`  - Works with Publication Date: ${worksWithDate.length} / ${allWorks.length}`);
    console.log(`  - Works with Authors: ${worksWithAuthors.length} / ${allWorks.length}`);
    console.log(`  - Works with Citations: ${worksWithCitations.length} / ${allWorks.length}`);
    console.log(`  - Works with Journal Info: ${worksWithJournal.length} / ${allWorks.length}`);

    assert.strictEqual(allWorks.length, 3, "Total unique Work entities should be 3 due to deduplication of Sentinel-6 work");
    assert.strictEqual(worksWithDoi.length, 3, "Works with DOI mismatch");
    assert.strictEqual(worksWithOpenAlex.length, 3, "Works with OpenAlex ID mismatch");
    console.log("✔ Work corpus audit & deduplication passed cleanly");

    // 3. Research Profile Generation & Temporal Signals
    const esaProfile = enricher.generateResearchProfile(targetOrgId);
    assert.ok(esaProfile, "ESA research profile generation failed");
    assert.strictEqual(esaProfile.worksCount, 2, "ESA worksCount mismatch");
    assert.ok(esaProfile.totalCitations > 0, "ESA totalCitations mismatch");
    assert.ok(esaProfile.yearlyWorks["2025"] > 0, "ESA 2025 yearlyWorks missing");
    assert.ok(esaProfile.yearlyWorks["2024"] > 0, "ESA 2024 yearlyWorks missing");
    console.log(`✔ Research Profile generated for ${esaProfile.name} (${esaProfile.worksCount} works, ${esaProfile.totalCitations} citations, yearly: 2024=${esaProfile.yearlyWorks["2024"]}, 2025=${esaProfile.yearlyWorks["2025"]})`);

    // 4. Performance & Scalability Measurement
    const t0 = Date.now();
    const sampleQueries = [
        "What does DLR research?",
        "Which organizations research Earth observation?",
        "Which European organizations publish research on satellite communications?"
    ];
    for (const q of sampleQueries) {
        ORVYRA.query(q);
    }
    const duration = Date.now() - t0;
    const memUsageMB = +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    console.log("\n4. Performance & Scalability Measurements:");
    console.log(`  - Sample Queries Execution Time: ${duration} ms`);
    console.log(`  - Memory Heap Used: ${memUsageMB} MB`);
    console.log(`  - Repository Size: ${repo.getAllEntities().length} entities, ${repo.getAllClaims().length} claims, ${repo.getAllDocuments().length} documents`);

    assert.ok(duration < 500, "Query performance benchmark failed (>500ms)");
    assert.ok(memUsageMB < 500, "Memory footprint benchmark failed (>500MB)");

    console.log("\nALL PHASE 7 RESEARCH CORPUS EXPANSION TESTS PASSED CLEANLY!");
}

runPhase7Tests();
