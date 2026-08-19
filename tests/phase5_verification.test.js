const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ORVYRA = require('../orvyra-intelligence.js');
const { MatchStatus } = require('../js/core/models.js');

function runPhase5VerificationTests() {
    console.log("=== ORVYRA Phase 5 Verification & Defensibility Tests ===");

    // Ingest live corpus first to populate repository
    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    if (fs.existsSync(corpusFixturePath)) {
        const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));
        ORVYRA.ingest(liveCorpus);
    }

    // 1. Evidence Confidence Distribution Tracing
    const liveConfs = ORVYRA.evidence.filter(e => e.provenance === 'LIVE').map(e => e.confidence);
    const synthConfs = ORVYRA.evidence.filter(e => e.provenance === 'SYNTHETIC').map(e => e.confidence);

    const calcStats = (arr) => {
        if (!arr.length) return { min: 0, median: 0, mean: 0, max: 0 };
        const sorted = [...arr].sort((a,b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = +(sorted.reduce((a,b) => a + b, 0) / sorted.length).toFixed(3);
        const median = sorted[Math.floor(sorted.length / 2)];
        return { min, median, mean, max, count: sorted.length };
    };

    const liveStats = calcStats(liveConfs);
    const synthStats = calcStats(synthConfs);

    console.log("\n1. Evidence Confidence Distribution:");
    console.log(`  - LIVE Evidence (${liveStats.count} items): min=${liveStats.min}, median=${liveStats.median}, mean=${liveStats.mean}, max=${liveStats.max}`);
    console.log(`  - SYNTHETIC Evidence (${synthStats.count} items): min=${synthStats.min}, median=${synthStats.median}, mean=${synthStats.mean}, max=${synthStats.max}`);

    assert.strictEqual(liveStats.mean, 1, "LIVE evidence extraction fidelity score must equal 1.0");
    assert.ok(synthStats.min >= 0.57 && synthStats.max <= 0.95, "SYNTHETIC evidence confidence score range mismatch");

    // 2. Knowledge Graph Integrity Test
    for (const edge of ORVYRA.edges) {
        const fromEnt = ORVYRA.entity(edge.from);
        const toEnt = ORVYRA.entity(edge.to);
        assert.ok(fromEnt, `Edge ${edge.id} subject ${edge.from} missing in repository`);
        assert.ok(toEnt, `Edge ${edge.id} object ${edge.to} missing in repository`);
        assert.ok(edge.rel, `Edge ${edge.id} missing predicate`);
        assert.ok(edge.ev && edge.ev.length > 0, `Edge ${edge.id} missing supporting evidence IDs`);

        for (const evId of edge.ev) {
            const evRecord = ORVYRA.ev(evId);
            assert.ok(evRecord, `Edge ${edge.id} evidence ID ${evId} unresolvable`);
            assert.ok(evRecord.sourceUri, `Evidence ${evId} missing source URI`);
        }
    }
    console.log(`\n2. Graph Integrity Verified (${ORVYRA.edges.length} edges carry 100% valid endpoints & evidence)`);

    // 3. Canonical Entity Integrity & Alias Deduplication
    const esaRes = ORVYRA.resolverEngine.resolveAdvanced("European Space Agency");
    const esaAliasRes = ORVYRA.resolverEngine.resolveAdvanced("ESA");
    assert.strictEqual(esaRes.id, esaAliasRes.id, "ESA and European Space Agency must resolve to same canonical ID");

    const ambigRes = ORVYRA.resolverEngine.resolveAdvanced("European");
    assert.strictEqual(ambigRes.matchStatus, MatchStatus.POSSIBLE_MATCH, "Ambiguous query must return POSSIBLE_MATCH");
    console.log("3. Canonical entity resolution & alias deduplication passed");

    // 4. Live vs Synthetic Provenance Separation
    const isarEnt = ORVYRA.entity("isar");
    assert.strictEqual(isarEnt.provenance, "SYNTHETIC", "Synthetic company must retain SYNTHETIC entity provenance");

    const esaLiveEnt = ORVYRA.entities.find(e => e.id === "org-european-space-agency" || (e.attrs && e.attrs.rorId && e.attrs.rorId.v === "https://ror.org/02j6gm739"));
    assert.ok(esaLiveEnt, "Live ESA ROR entity missing in repository");
    assert.strictEqual(esaLiveEnt.provenance, "LIVE", "Live ESA ROR entity must retain LIVE entity provenance");
    console.log("4. LIVE vs SYNTHETIC provenance separation passed");

    // 5. Negative & Unsupported Query Handling Test
    const negQuery1 = ORVYRA.query("Which organizations launched a spacecraft in 2026?");
    assert.strictEqual(negQuery1.entities.length, 0, "Negative query 1 should return 0 entities");
    assert.strictEqual(negQuery1.edges.length, 0, "Negative query 1 should return 0 edges");
    assert.strictEqual(negQuery1.evidence.length, 0, "Negative query 1 should return 0 evidence items");
    assert.strictEqual(negQuery1.confidence, null, "Negative query 1 confidence should be null");
    assert.ok(negQuery1.synthesis[0].text.includes("no verified evidence"), "Negative query 1 synthesis text mismatch");

    const negQuery2 = ORVYRA.query("Which organization funded ESA in 2026?");
    assert.strictEqual(negQuery2.entities.length, 0, "Negative query 2 should return 0 entities");
    assert.strictEqual(negQuery2.confidence, null, "Negative query 2 confidence should be null");
    console.log("5. Negative / Unsupported Query handling (WITHHELD/UNKNOWN) passed");

    // 6. Query Differentiation Data-Level Test
    const resA = ORVYRA.query("Which European organizations are involved in space research?");
    const resB = ORVYRA.query("Which organizations work on satellite communications?");
    const resC = ORVYRA.query("Which organizations are connected to Earth observation?");

    const idsA = resA.entities.map(e => e.id).sort().join(',');
    const idsB = resB.entities.map(e => e.id).sort().join(',');
    const idsC = resC.entities.map(e => e.id).sort().join(',');

    assert.notStrictEqual(idsA, idsB, "Query A and B entity sets must differ");
    assert.notStrictEqual(idsB, idsC, "Query B and C entity sets must differ");
    assert.notStrictEqual(idsA, idsC, "Query A and C entity sets must differ");
    console.log("6. Data-Level Query Differentiation passed");

    console.log("\nALL PHASE 5 VERIFICATION & DEFENSIBILITY TESTS PASSED CLEANLY!");

    return {
        liveStats,
        synthStats,
        graphEdgesCount: ORVYRA.edges.length,
        liveEntitiesCount: ORVYRA.evidence.filter(e => e.provenance === 'LIVE').length
    };
}

const p5Summary = runPhase5VerificationTests();
module.exports = p5Summary;
