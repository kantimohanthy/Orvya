const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ORVYRA = require('../orvyra-intelligence.js');
const { MatchStatus } = require('../js/core/models.js');

function runPhase4QueryTests() {
    console.log("=== ORVYRA Phase 4 Query Engine Integration Tests ===");

    // Ingest live corpus first to ensure live + synthetic state
    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    if (fs.existsSync(corpusFixturePath)) {
        const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));
        ORVYRA.ingest(liveCorpus);
    }

    const testQueries = [
        { id: "A", q: "Which European organizations are involved in space research?" },
        { id: "B", q: "Which organizations work on satellite communications?" },
        { id: "C", q: "Which organizations are connected to Earth observation?" },
        { id: "D", q: "What do you know about the European Space Agency?" },
        { id: "E", q: "Tell me about DLR." },
        { id: "F", q: "Which organizations are located in France?" },
        { id: "G", q: "Which organizations have research related to astronomy?" }
    ];

    const queryResults = {};

    for (const item of testQueries) {
        const res = ORVYRA.query(item.q);
        queryResults[item.id] = res;

        assert.ok(res, `Query ${item.id} returned null/undefined`);
        assert.strictEqual(res.question, item.q, `Query ${item.id} question mismatch`);
        assert.ok(Array.isArray(res.synthesis), `Query ${item.id} synthesis must be an array`);
        assert.ok(Array.isArray(res.entities), `Query ${item.id} entities must be an array`);
        assert.ok(Array.isArray(res.evidence), `Query ${item.id} evidence must be an array`);
        assert.ok(Array.isArray(res.edges), `Query ${item.id} edges must be an array`);
        assert.ok(Array.isArray(res.withheld), `Query ${item.id} withheld must be an array`);

        // Validate that evidence IDs resolve to actual evidence records
        for (const ev of res.evidence) {
            assert.ok(ev.id, `Evidence object missing ID in Query ${item.id}`);
            assert.ok(ev.claim, `Evidence object missing claim in Query ${item.id}`);
            assert.ok(ev.confidence != null, `Evidence object missing confidence in Query ${item.id}`);
        }

        // Validate that edges carry non-empty evidence
        for (const edge of res.edges) {
            assert.ok(edge.ev && edge.ev.length > 0, `Edge ${edge.id} missing evidence in Query ${item.id}`);
        }

        const subgraph = ORVYRA.subgraph(res.entities.length ? res.entities[0].id : "esa", 2, 16);
        assert.ok(subgraph && Array.isArray(subgraph.nodes), `Subgraph invalid for Query ${item.id}`);

        console.log(`\n✔ Query ${item.id}: "${item.q}"`);
        console.log(`  - Matched Entities (${res.entities.length}): ${res.entities.map(e => e.id).join(', ')}`);
        console.log(`  - Edges (${res.edges.length}), Evidence (${res.evidence.length}), Confidence: ${res.confidence}`);
        console.log(`  - Provenance: ${res.provenance}, Withheld fields: ${res.withheld.length}`);
    }

    // Material Difference Verification between Queries A, B, and C
    const entitiesA = new Set(queryResults["A"].entities.map(e => e.id));
    const entitiesB = new Set(queryResults["B"].entities.map(e => e.id));
    const entitiesC = new Set(queryResults["C"].entities.map(e => e.id));

    assert.notDeepStrictEqual(entitiesA, entitiesB, "Query A and Query B must retrieve different entities");
    assert.notDeepStrictEqual(entitiesB, entitiesC, "Query B and Query C must retrieve different entities");
    assert.notDeepStrictEqual(entitiesA, entitiesC, "Query A and Query C must retrieve different entities");
    console.log("\n✔ Material Retrieval Difference verified (Query A != Query B != Query C)");

    // Query D (European Space Agency Resolution Test)
    const resD = queryResults["D"];
    assert.ok(resD.entities.some(e => e.id === "esa" || e.id === "org-european-space-agency"), "Query D must retrieve European Space Agency entity");
    console.log("✔ Query D resolved European Space Agency canonically");

    // Query E (DLR Resolution Test)
    const resE = queryResults["E"];
    assert.ok(resE.entities.some(e => e.id === "dlr" || e.id === "org-german-aerospace-center-dlr"), "Query E must retrieve DLR entity");
    console.log("✔ Query E resolved DLR canonically");

    // Provenance Verification
    const stats = ORVYRA.stats();
    assert.ok(stats.provenance.LIVE > 0, "LIVE entities count must be > 0");
    assert.ok(stats.provenance.SYNTHETIC > 0, "SYNTHETIC entities count must be > 0");
    assert.ok(typeof stats.rejectedEdges === 'number', "Rejected edges metric must be a number");
    console.log(`✔ Provenance states (LIVE: ${stats.provenance.LIVE}, SYNTHETIC: ${stats.provenance.SYNTHETIC}) and rejected edges verified`);

    // Resolver Alias Test
    const esaRes = ORVYRA.resolverEngine.resolveAdvanced("ESA");
    assert.strictEqual(esaRes.matchStatus, MatchStatus.MATCH, "ESA alias match failed");
    console.log("✔ AdvancedEntityResolver ESA alias resolution passed");

    console.log("\nALL PHASE 4 QUERY ENGINE INTEGRATION TESTS PASSED CLEANLY!");

    return queryResults;
}

const results = runPhase4QueryTests();
module.exports = results;
