const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Source, Document, Entity, Claim, Conflict, MatchStatus, ProvenanceType } = require('../js/core/models.js');
const { InMemoryRepository } = require('../js/core/repository.js');
const { EntityResolver, AdvancedEntityResolver } = require('../js/core/resolver.js');
const { QueryEngine } = require('../js/core/query.js');
const ORVYRA = require('../orvyra-intelligence.js');

function runPhase2Tests() {
    console.log("=== ORVYRA Phase 2 Core Integration Tests ===");

    // 1. Model Instantiation Test
    const src = new Source("src_1", "ESA", "Press Release", "http://esa.int", "2026-01-01", "Primary", 1);
    const doc = new Document("doc_1", "src_1", "ESA Doc", "http://esa.int/doc", "{ \"info\": \"esa\" }", "2026-01-01", "JSON");
    const claim = new Claim("c_1", "org_esa", "FUNDS", "isar", "doc_1", "SOURCE_BACKED", "ESA funded Isar", "JSON Parser", "2026-01-01", "2026-01-02", "2026-01-02", null, null, "ACTIVE", "LIVE");

    assert.strictEqual(src.publisher, "ESA", "Source publisher mismatch");
    assert.strictEqual(doc.id, "doc_1", "Document ID mismatch");
    assert.strictEqual(claim.predicate, "FUNDS", "Claim predicate mismatch");
    assert.strictEqual(claim.provenance, "LIVE", "Claim provenance mismatch");
    console.log("✔ Domain models instantiated correctly");

    // 2. Repository CRUD Test
    const repo = new InMemoryRepository();
    const ent1 = new Entity("org_esa", "European Space Agency", "Organization", ["ESA"]);
    repo.saveEntity(ent1);
    repo.saveClaim(claim);
    repo.saveSource(src);
    repo.saveDocument(doc);

    assert.strictEqual(repo.getEntity("org_esa").canonicalName, "European Space Agency", "Repository getEntity failed");
    assert.strictEqual(repo.getAllEntities().length, 1, "Repository getAllEntities length mismatch");
    assert.strictEqual(repo.getClaim("c_1").objectId, "isar", "Repository getClaim failed");
    console.log("✔ InMemoryRepository operations passed");

    // 3. Advanced Resolver Test
    const resolver = new AdvancedEntityResolver();
    resolver.registerEntity(ent1);

    const match1 = resolver.resolveAdvanced("European Space Agency");
    assert.strictEqual(match1.matchStatus, MatchStatus.MATCH, "Exact match failed");
    assert.strictEqual(match1.id, "org_esa", "Exact match ID mismatch");

    const match2 = resolver.resolveAdvanced("ESA");
    assert.strictEqual(match2.matchStatus, MatchStatus.MATCH, "Alias match failed");
    assert.strictEqual(match2.id, "org_esa", "Alias match ID mismatch");

    const match3 = resolver.resolveAdvanced("European Space");
    assert.strictEqual(match3.matchStatus, MatchStatus.POSSIBLE_MATCH, "Substring match failed");

    const match4 = resolver.resolveAdvanced("SpaceX");
    assert.strictEqual(match4.matchStatus, MatchStatus.NO_MATCH, "No match failed");
    console.log("✔ AdvancedEntityResolver deduplication passed");

    // 4. QueryEngine Test
    const engine = new QueryEngine([ent1], [claim], [src], [doc]);
    assert.strictEqual(engine.getEntity("org_esa").id, "org_esa", "QueryEngine getEntity failed");
    assert.strictEqual(engine.getClaimsForEntity("org_esa").length, 1, "QueryEngine getClaimsForEntity failed");
    assert.strictEqual(engine.getRelatedEntities("org_esa").length, 1, "QueryEngine getRelatedEntities failed");
    console.log("✔ QueryEngine claims traversal passed");

    // 5. ORVYRA API Public Contract Test
    assert.ok(ORVYRA.KINDS.company, "ORVYRA.KINDS missing company");
    assert.ok(Array.isArray(ORVYRA.RELATIONS), "ORVYRA.RELATIONS is not array");
    assert.ok(ORVYRA.entities.length > 0, "ORVYRA.entities empty");
    assert.ok(ORVYRA.edges.length > 0, "ORVYRA.edges empty");

    const qRes = ORVYRA.query("Which European launch companies raised funding recently?");
    assert.ok(qRes.entities.length > 0, "ORVYRA.query() returned no entities");
    assert.ok(qRes.synthesis.length > 0, "ORVYRA.query() returned no synthesis");
    assert.ok(Array.isArray(qRes.evidence), "ORVYRA.query() evidence is not array");
    assert.ok(typeof qRes.confidence === 'number' || qRes.confidence === null, "ORVYRA.query() confidence type error");
    console.log("✔ ORVYRA.query() contract verified");

    const sg = ORVYRA.subgraph("isar", 2, 16);
    assert.ok(sg.nodes.length > 0, "ORVYRA.subgraph() returned no nodes");
    assert.ok(Array.isArray(sg.edges), "ORVYRA.subgraph() edges is not array");
    console.log("✔ ORVYRA.subgraph() contract verified");

    const stats = ORVYRA.stats();
    assert.ok(stats.entities > 0, "ORVYRA.stats() entities count zero");
    assert.strictEqual(stats.dominant, "SYNTHETIC", "Initial stats dominant provenance error");
    console.log("✔ ORVYRA.stats() contract verified");

    // 6. Live Corpus Ingest via Promoted Core Test
    const corpusFile = path.join(__dirname, '../orvyra-live-corpus.json');
    if (fs.existsSync(corpusFile)) {
        const liveCorpus = JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
        const ingestRes = ORVYRA.ingest(liveCorpus);
        assert.ok(ingestRes.entities > 0, "Live corpus ingest added zero entities");
        assert.strictEqual(ORVYRA.stats().dominant, "MIXED", "Post-ingest dominant status should be MIXED");
        console.log(`✔ Live corpus ingested into core (${ingestRes.entities} entities, ${ingestRes.relationships} edges)`);
    }

    console.log("\nALL PHASE 2 INTEGRATION TESTS PASSED CLEANLY!");
}

runPhase2Tests();
