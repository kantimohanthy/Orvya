const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Source, Document, Entity, Work, Claim, SourcePriority, MatchStatus, ProvenanceType } = require('../js/core/models.js');
const { InMemoryRepository } = require('../js/core/repository.js');
const { AdvancedEntityResolver } = require('../js/core/resolver.js');
const { SpaceTaxonomy, TaxonomyClassifier } = require('../js/core/taxonomy.js');
const { InstitutionIngestionPipeline } = require('../js/ingestion/pipeline.js');
const liveAdapter = require('../orvyra-live.js');
const ORVYRA = require('../orvyra-intelligence.js');

function runPhase6Milestone2Tests() {
    console.log("=== ORVYRA Phase 6 Milestone 2 Research Intelligence Expansion Tests ===");

    // 1. Work (Research Output) Domain Model Test
    const sampleWork = new Work(
        "work_oa_12345",
        "Orbital SAR Processing for Smallsat Constellations",
        "https://openalex.org/W12345",
        "10.1016/j.actaastro.2025.01.001",
        "2025-03-15",
        "Acta Astronautica",
        42,
        ["Synthetic Aperture Radar", "Earth Observation"],
        ["Dr. A. Smith", "Dr. B. Weber"],
        ProvenanceType.LIVE
    );

    assert.strictEqual(sampleWork.entityType, "Work", "Work entityType mismatch");
    assert.strictEqual(sampleWork.citedByCount, 42, "Work citedByCount mismatch");
    assert.strictEqual(sampleWork.provenance, "LIVE", "Work provenance mismatch");
    console.log("✔ Work (Research Output) domain model instantiated correctly");

    // 2. OpenAlex Institution Normalization & Research Profile Test
    const rawOA = {
        id: "https://openalex.org/I05hkkdn48",
        display_name: "German Aerospace Center (DLR)",
        works_count: 28500,
        cited_by_count: 490000,
        summary_stats: { h_index: 210, i10_index: 1850 },
        geo: { city: "Cologne", country: "Germany", latitude: 50.8522, longitude: 7.1181 },
        counts_by_year: [
            { year: 2025, works_count: 1450, cited_by_count: 42000 },
            { year: 2024, works_count: 1520, cited_by_count: 39500 }
        ],
        topics: [
            { id: "https://openalex.org/T1001", display_name: "Planetary Science & Astronomy", count: 850 },
            { id: "https://openalex.org/T1002", display_name: "Synthetic Aperture Radar", count: 620 }
        ],
        updated_date: "2026-02-01"
    };

    const normOA = liveAdapter.normaliseOpenAlex(rawOA);
    assert.strictEqual(normOA.worksCount, 28500, "OpenAlex worksCount mismatch");
    assert.strictEqual(normOA.hIndex, 210, "OpenAlex hIndex mismatch");
    assert.strictEqual(normOA.countsByYear.length, 2, "OpenAlex countsByYear length mismatch");
    assert.strictEqual(normOA.topics.length, 2, "OpenAlex topics length mismatch");
    console.log("✔ OpenAlex institution research profile & temporal counts normalized");

    // 3. Topic Normalization & Taxonomy Mapping Test
    const oaTopicName = "Synthetic Aperture Radar";
    const mappedCategories = TaxonomyClassifier.classifyFromEvidence(oaTopicName);
    assert.ok(mappedCategories.some(c => c.id === "eo"), "Topic mapping failed to map SAR to EO taxonomy");
    console.log("✔ Topic normalization & Space Taxonomy heuristic mapping verified");

    // 4. Large Corpus Ingestion & Research Graph Test
    const repo = new InMemoryRepository();
    const resolver = new AdvancedEntityResolver();
    const pipeline = new InstitutionIngestionPipeline(repo, resolver);

    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    assert.ok(fs.existsSync(corpusFixturePath), "orvyra-live-corpus.json fixture missing");
    const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));

    pipeline.ingestCorpus(liveCorpus);
    repo.saveEntity(sampleWork);

    const pubClaim = new Claim(
        "c_pub_1",
        "org_dlr",
        "PUBLISHES",
        sampleWork.id,
        null,
        "SOURCE_BACKED",
        "DLR affiliated authors published Orbital SAR Processing",
        "OpenAlex Ingestion",
        "2025-03-15",
        new Date().toISOString(),
        new Date().toISOString(),
        null,
        null,
        "ACTIVE",
        "LIVE"
    );
    repo.saveClaim(pubClaim);

    assert.ok(repo.getEntity(sampleWork.id), "Work entity missing in repository");
    assert.strictEqual(repo.getClaim("c_pub_1").subjectId, "org_dlr", "Publication claim subject mismatch");
    console.log("✔ Research Output (Work) and claim stored cleanly in repository");

    // 5. Query Engine Research Retrieval Tests
    ORVYRA.ingest(liveCorpus);

    const qDlr = ORVYRA.query("What does DLR research?");
    assert.ok(qDlr.entities.some(e => e.id === "dlr" || e.id === "org-dlr"), "DLR query must return DLR entity");
    assert.ok(qDlr.evidence.length > 0, "DLR query must return supporting evidence");

    const qEsa = ORVYRA.query("What does ESA research?");
    assert.ok(qEsa.entities.some(e => e.id === "esa" || e.id === "org-european-space-agency"), "ESA query must return ESA entity");

    const qPlanetary = ORVYRA.query("Which organizations research planetary science?");
    assert.ok(qPlanetary.entities.length > 0, "Planetary science query must return entities");

    const qPropulsion = ORVYRA.query("Which organizations research propulsion?");
    assert.ok(qPropulsion.entities.length > 0, "Propulsion query must return entities");

    const qAstronomy = ORVYRA.query("Which organizations are active in astronomy?");
    assert.ok(qAstronomy.entities.length > 0, "Astronomy query must return entities");
    console.log("✔ Research intelligence queries (DLR, ESA, planetary science, propulsion, astronomy) passed");

    // 6. Negative Research Query Test
    const qNegResearch = ORVYRA.query("Which organization published 10000 papers on warp drive in 2026?");
    assert.strictEqual(qNegResearch.entities.length, 0, "Negative research query must return 0 entities");
    assert.strictEqual(qNegResearch.confidence, null, "Negative research query confidence must be null");
    assert.ok(qNegResearch.synthesis[0].text.includes("no verified evidence"), "Negative research query synthesis text mismatch");
    console.log("✔ Negative research query handling (WITHHELD/UNKNOWN) verified");

    console.log("\nALL PHASE 6 MILESTONE 2 RESEARCH INTELLIGENCE TESTS PASSED CLEANLY!");
}

runPhase6Milestone2Tests();
