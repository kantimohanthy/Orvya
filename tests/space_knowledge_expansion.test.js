const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Source, Document, Entity, Claim, SourcePriority, MatchStatus, ProvenanceType } = require('../js/core/models.js');
const { InMemoryRepository } = require('../js/core/repository.js');
const { AdvancedEntityResolver } = require('../js/core/resolver.js');
const { SpaceTaxonomy, TaxonomyClassifier } = require('../js/core/taxonomy.js');
const { GeoNormalizer } = require('../js/core/geo.js');
const { InstitutionIngestionPipeline } = require('../js/ingestion/pipeline.js');
const ORVYRA = require('../orvyra-intelligence.js');

function runPhase6Tests() {
    console.log("=== ORVYRA Phase 6 Space Economy Knowledge Expansion Tests ===");

    // 1. Space Economy Taxonomy & Classification Test
    const evText1 = "OpenAlex associates 420 works with synthetic aperture radar and remote sensing payloads";
    const matches1 = TaxonomyClassifier.classifyFromEvidence(evText1);
    assert.ok(matches1.some(m => m.id === "eo"), "Taxonomy classifier failed to detect Earth Observation category");
    console.log("✔ Space Economy Taxonomy classification passed");

    // 2. Geographic Normalization Test
    const rawLocation = { city: "Paris", country: "France", countryCode: "FR", lat: 48.8566, lng: 2.3522, source: "ROR" };
    const normGeo = GeoNormalizer.normalizeLocation(rawLocation);
    assert.strictEqual(normGeo.city, "Paris", "Geo city mismatch");
    assert.strictEqual(normGeo.country, "France", "Geo country mismatch");
    assert.strictEqual(normGeo.lat, 48.8566, "Geo latitude mismatch");

    const rawLocationMissingCoords = { city: "Unknown", country: "Space", source: "Registry" };
    const normGeoMissing = GeoNormalizer.normalizeLocation(rawLocationMissingCoords);
    assert.strictEqual(normGeoMissing.coordinates, null, "Missing coords should be null");
    assert.ok(normGeoMissing.withheld, "Missing coords should record withheld reason");
    console.log("✔ Geographic normalization passed");

    // 3. Source Priority Tiers Test
    assert.strictEqual(SourcePriority.PRIMARY_OFFICIAL, 1, "Source priority tier 1 mismatch");
    assert.strictEqual(SourcePriority.SCIENTIFIC_DATABASE, 7, "Source priority tier 7 mismatch");
    console.log("✔ Source priority architecture verified");

    // 4. Large-Corpus Ingestion & Evidence-Backed Topics Test
    const repo = new InMemoryRepository();
    const resolver = new AdvancedEntityResolver();
    const pipeline = new InstitutionIngestionPipeline(repo, resolver);

    const corpusFixturePath = path.join(__dirname, '../orvyra-live-corpus.json');
    assert.ok(fs.existsSync(corpusFixturePath), "orvyra-live-corpus.json fixture missing");
    const liveCorpus = JSON.parse(fs.readFileSync(corpusFixturePath, 'utf8'));

    const ingestMetrics = pipeline.ingestCorpus(liveCorpus);
    assert.ok(ingestMetrics.entities > 0, "Ingestion created zero entities");
    assert.ok(repo.getAllEntities().length > 90, "Large corpus repository entity count lower than expected");
    console.log(`✔ Ingested ${repo.getAllEntities().length} entities & ${repo.getAllClaims().length} claims into core repository`);

    // 5. Unsupported Relationship Withholding Test
    const unevidencedClaim = new Claim("c_unsupported_1", "org_esa", "OPERATES", "unsupported_facility", null, "SOURCE_BACKED", "", "Manual", null, null, null, null, null, "ACTIVE", "SYNTHETIC");
    const isClaimValid = pipeline.validator.validateClaim(unevidencedClaim, repo);
    assert.strictEqual(isClaimValid, false, "Unevidenced relationship must be rejected by validator");
    console.log("✔ Unsupported relationship withholding verified");

    // 6. Query Engine Retrieval Over Taxonomy Categories Test
    ORVYRA.ingest(liveCorpus);

    const qEO = ORVYRA.query("Which organizations are connected to Earth observation?");
    assert.ok(qEO.entities.length > 0, "EO query returned zero entities");
    assert.ok(qEO.evidence.length > 0, "EO query returned zero evidence");

    const qSatcom = ORVYRA.query("Which organizations work on satellite communications?");
    assert.ok(qSatcom.entities.length > 0, "Satcom query returned zero entities");

    const qNeg = ORVYRA.query("Which organization funded ESA in 2026?");
    assert.strictEqual(qNeg.entities.length, 0, "Negative query must return 0 entities");
    assert.strictEqual(qNeg.confidence, null, "Negative query confidence must be null");
    console.log("✔ Query engine retrieval over space taxonomy passed");

    console.log("\nALL PHASE 6 SPACE KNOWLEDGE EXPANSION TESTS PASSED CLEANLY!");
}

runPhase6Tests();
