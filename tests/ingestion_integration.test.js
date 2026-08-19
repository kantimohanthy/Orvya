const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Source, Document, Entity, Claim, SourcePriority, MatchStatus, ProvenanceType } = require('../js/core/models.js');
const { InMemoryRepository } = require('../js/core/repository.js');
const { EntityResolver, AdvancedEntityResolver } = require('../js/core/resolver.js');
const { QueryEngine } = require('../js/core/query.js');
const { DocumentParser, EntityNormalizer, ClaimBuilder, Validator, InstitutionIngestionPipeline } = require('../js/ingestion/pipeline.js');
const { FixtureConnector, HttpConnector, IngestionError } = require('../js/ingestion/connectors.js');
const liveAdapter = require('../orvyra-live.js');
const ORVYRA = require('../orvyra-intelligence.js');

function runPhase3Tests() {
    console.log("=== ORVYRA Phase 3 Ingestion & Validation Pipeline Tests ===");

    // 1. ROR Normalization Test
    const rawRor = {
        id: "https://ror.org/02j6gm739",
        names: [
          { value: "European Space Agency", types: ["ror_display", "label"] },
          { value: "ESA", types: ["acronym"] }
        ],
        types: ["government"],
        established: 1975,
        locations: [{ geonames_details: { country_name: "France", country_code: "FR", name: "Paris", lat: 48.8566, lng: 2.3522 } }],
        links: [{ type: "website", value: "https://www.esa.int" }],
        admin: { last_modified: { date: "2026-01-01" } },
        relationships: [{ type: "Child", label: "ESRIN", id: "https://ror.org/05hkkdn48" }]
    };
    const rorNorm = liveAdapter.normaliseRor(rawRor);

    assert.strictEqual(rorNorm.canonicalName, "European Space Agency", "ROR canonicalName mismatch");
    assert.ok(rorNorm.acronyms.includes("ESA"), "ROR acronym missing");
    assert.strictEqual(rorNorm.country, "France", "ROR country mismatch");
    assert.strictEqual(rorNorm.latitude, 48.8566, "ROR latitude mismatch");
    console.log("✔ ROR Normalization passed");

    // 2. OpenAlex Normalization Test
    const rawOA = {
        id: "https://openalex.org/I12345",
        display_name: "European Space Agency",
        works_count: 14200,
        cited_by_count: 320000,
        summary_stats: { h_index: 185 },
        geo: { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
        topics: [{ id: "https://openalex.org/T1", display_name: "Space Systems", count: 420 }]
    };
    const oaNorm = liveAdapter.normaliseOpenAlex(rawOA);

    assert.strictEqual(oaNorm.worksCount, 14200, "OpenAlex worksCount mismatch");
    assert.strictEqual(oaNorm.hIndex, 185, "OpenAlex hIndex mismatch");
    assert.strictEqual(oaNorm.topics.length, 1, "OpenAlex topics count mismatch");
    console.log("✔ OpenAlex Normalization passed");

    // 3. Organization Resolution & Alias Match (ESA vs European Space Agency)
    const resolver = new AdvancedEntityResolver();
    const esaEnt = new Entity("org_esa", "European Space Agency", "Organization", ["ESA"]);
    resolver.registerEntity(esaEnt);

    const matchEsa1 = resolver.resolveAdvanced("European Space Agency");
    assert.strictEqual(matchEsa1.matchStatus, MatchStatus.MATCH, "Exact name resolution failed");
    assert.strictEqual(matchEsa1.id, "org_esa", "Exact name ID mismatch");

    const matchEsa2 = resolver.resolveAdvanced("ESA");
    assert.strictEqual(matchEsa2.matchStatus, MatchStatus.MATCH, "Acronym resolution failed");
    assert.strictEqual(matchEsa2.id, "org_esa", "Acronym ID mismatch");
    console.log("✔ Canonical resolution (ESA -> European Space Agency) passed");

    // 4. Ambiguous Match (No Auto-Merge on Substring Overlap)
    const matchAmbiguous = resolver.resolveAdvanced("European");
    assert.strictEqual(matchAmbiguous.matchStatus, MatchStatus.POSSIBLE_MATCH, "Ambiguous substring should return POSSIBLE_MATCH");
    assert.ok(matchAmbiguous.reasons.length > 0, "Match reasons missing");
    console.log("✔ Ambiguous resolution handling passed");

    // 5. Ingestion Pipeline & Validation
    const repo = new InMemoryRepository();
    const pipeline = new InstitutionIngestionPipeline(repo, resolver);

    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    assert.ok(fs.existsSync(corpusFixturePath), "orvyra-live-corpus.json fixture missing");

    const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));
    const metrics = pipeline.ingestCorpus(liveCorpus);

    assert.ok(metrics.entities > 0, "Ingestion created zero entities");
    assert.strictEqual(metrics.relationships, 136, "Ingestion relationships count mismatch");
    assert.strictEqual(metrics.rejected, 8, "Unevidenced/unharvested endpoint edges should be 8");
    console.log(`✔ InstitutionIngestionPipeline ingested live corpus (${metrics.entities} new entities, ${metrics.relationships} valid relationships, ${metrics.rejected} rejected unharvested endpoint edges, ${metrics.skipped} skipped duplicates)`);

    // 6. Unevidenced Claim Rejection Test
    const badCorpus = {
        entities: [
            { id: "org_a", name: "Org A", kind: "Organization" },
            { id: "org_b", name: "Org B", kind: "Organization" }
        ],
        evidence: [],
        edges: [
            { from: "org_a", rel: "researches", to: "org_b", ev: [] } // empty evidence array!
        ]
    };
    const badMetrics = pipeline.ingestCorpus(badCorpus);
    assert.strictEqual(badMetrics.rejected, 1, "Pipeline failed to reject unevidenced edge");
    console.log("✔ Unevidenced claim rejection passed");

    // 7. Synthetic + Live Provenance Integrity Test
    ORVYRA.ingest(liveCorpus);
    const liveStats = ORVYRA.stats();
    assert.ok(liveStats.entities > 0, "ORVYRA entities count invalid");
    assert.ok(liveStats.provenance.LIVE > 0, "ORVYRA missing LIVE entities");
    assert.ok(liveStats.provenance.SYNTHETIC > 0, "ORVYRA missing SYNTHETIC entities");

    const qRes = ORVYRA.query("Which European launch companies raised funding recently?");
    assert.ok(qRes.entities.length > 0, "Query failed after pipeline integration");
    assert.ok(qRes.withheld.length > 0, "Withheld fields missing from query response");
    console.log("✔ Provenance integrity & withheld attribute tracking passed");

    console.log("\nALL PHASE 3 INGESTION & PIPELINE TESTS PASSED CLEANLY!");

    return {
        canonicalEntities: repo.getAllEntities().length,
        claims: repo.getAllClaims().length,
        evidenceRecords: repo.getAllDocuments().length,
        relationships: metrics.relationships,
        rejectedRelationships: metrics.rejected + badMetrics.rejected,
        ambiguousEntities: pipeline.stats.ambiguousEntities,
        provenanceDistribution: liveStats.provenance
    };
}

const summaryMetrics = runPhase3Tests();
module.exports = summaryMetrics;
