# ORVYRA — vertical slice: what it is, and how to land it in the repo

Files:

- `orvyra-slice.html` — the built, self-contained page. Open it directly in a browser.
- `orvyra-intelligence.js` — the intelligence core. The HTML inlines it at build time;
  edit the module, not the copy inside the HTML.
- `orvyra-live.js` — the LIVE source adapter for ROR and OpenAlex. Server-side only.
- `orvyra-harvest.js` — CLI that runs the adapter and writes `orvyra-live-corpus.json`.
- `test-live.js` — adapter tests against mocked API responses (28 assertions).
- `smoke.js` — runs the built page under jsdom (32 assertions).

It covers the loop from §37 of the brief:

> home → night Earth → orbital system → ask → answer → entities → relationships → evidence
> → entity dossier → knowledge graph

Everything else in the brief (Signals as a product surface, Missions as a real progression
system, `/explore`, `/settings`) is represented on the landing page as narrative, not built out.
That is deliberate — §37 says build one slice well before expanding.

---

## 1. What is actually real here, and what is not

**Real:**
- The Earth is genuine WebGL. Sphere geometry, custom GLSL, night-side city lights, an
  independent cloud sphere, a back-side atmosphere shell with a sun-dependent rim, and five
  orbital planes at different inclinations whose particles are occluded by the planet because
  they are actually behind it in Z. No CSS circles, no flat images.
- The interaction model is real: keyboard (`⌘K`, `/`, `Esc`), focus states, progressive
  disclosure in the graph, expandable evidence, click-through from any entity name to its dossier.
- The provenance system is real, in the sense that it is structural rather than cosmetic.

The layer under the UI is now an actual engine rather than a fixture: 33 entities, 46
evidenced relationships, 40 evidence records, and a pipeline of
`parse → retrieve → traverse → gather evidence → synthesise`. Different questions produce
genuinely different answers, paths, evidence sets and graphs. Every sentence in an answer
is assembled from records in the store; no sentence about the world is written by hand
in the UI layer.

**Not real:**
- Every record is `SYNTHETIC`. Company names are real companies; nothing attributed to them is.
- **Withheld fields are a first-class output, not a caveat.** An attribute with no supporting
  evidence is stored as `{withheld: reason}`, and every answer carries a `withheld[]` array that
  the workspace renders as its own block. The European launch query returns six of them. This is
  the single most important behaviour to preserve when you wire in real data — it is much easier
  to keep an honest system honest than to retrofit honesty later.
- **An edge with no evidence is rejected at load.** `LOADED_EDGES` filters any relationship whose
  `ev` array is empty or references evidence not in the corpus, into `ORVYRA.rejected`. A
  relationship the system cannot evidence is not a relationship. Current rejection count: 0.
- **Confidence is computed, never asserted.** `aggregateConfidence` weights the mean of
  contributing evidence against its weakest link (0.6 / 0.4), so a chain is never more confident
  than the thinnest observation in it.
- Source identifiers are fixture URIs (`fixture://orvyra/synthetic/...`), never fabricated
  publication names. A fake `Reuters, 16 Apr 2026` in a demo is indistinguishable from a real
  citation once it is screenshotted into a pitch deck. Fixture URIs cannot be mistaken for one.

---

## 2. Textures — the one thing to replace first

`buildEarthTextures()` rasterises the Earth at runtime from coarse coastline rings and ~115 real
city coordinates. This exists so the file has zero external asset dependencies. It reads
convincingly at orbital distance but it is not a real Earth map.

In the repo, replace it with:

| Layer | Source | Target |
|---|---|---|
| Night lights | NASA Black Marble (2016, public domain) | 4096×2048, KTX2/Basis |
| Surface albedo | NASA Blue Marble (public domain) | 2048×1024, KTX2/Basis |
| Clouds | Blue Marble cloud composite | 2048×1024, alpha-only |

Keep the shader as-is; it expects exactly these three maps. Budget ≈2.5 MB total after Basis
compression, loaded progressively (a 512px night map first, upgraded on load) so the hero paints
before the full texture arrives. §31 will not survive uncompressed PNGs.

---

## 3. Data contracts

These are the shapes the UI binds to. Making `provenance` a required field — not an optional
one — is what stops §33 from eroding.

```ts
type Provenance = 'LIVE' | 'SOURCE_FIXTURE' | 'SYNTHETIC';

type EntityKind =
  | 'company' | 'investor' | 'technology' | 'mission'
  | 'organization' | 'market' | 'site' | 'person' | 'satellite';

interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  tagline: string;
  meta: string;                  // "Germany · Aerospace · Launch"
  stats: [label: string, value: string][];
  provenance: Provenance;        // required
}

interface Edge {
  from: string;
  to: string;
  rel: 'invested in' | 'operates' | 'develops' | 'partners with'
     | 'launched' | 'acquired' | 'researches' | 'supplies'
     | 'founded by' | 'contracted' | 'regulates' | 'competes in' | 'targets';
  evidenceIds: string[];         // required — an edge with no evidence is not an edge
  provenance: Provenance;
}

interface Evidence {
  id: string;                    // "EV-4471"
  claim: string;                 // one assertion, one sentence, independently scorable
  confidence: number;            // 0–1, model-assigned; never editorial, never rounded up
  sourceUri: string;             // fixture:// or https://
  publishedAt: string;           // ISO date — when the source said it
  observedAt: string;            // ISO date — when the pipeline saw it
  method: string;                // how the claim was derived
  provenance: Provenance;
}

interface AnswerBlock {
  question: string;
  synthesis: string;             // may contain <ref data-ev="EV-…"> markers
  entities: string[];
  path: { entityId: string; rel: string | null }[];
  evidenceIds: string[];
  withheld?: string[];           // fields the system refused to state — surfaced in the UI
}
```

The `withheld` array is worth keeping. Rendering *what the system declined to say* is more
persuasive to a serious user than any confidence score.

---

## 4. Component boundaries when you port this

The single file maps onto these modules:

```
components/
  stage/EarthStage.ts         initStage, buildEarthTextures, animate, layout
  nav/CommandPalette.tsx      ⌘K, fuzzy list, entity + query items
  hero/HeroQuery.tsx          query shell, chips, submit → route
  workspace/AnswerBlock.tsx   synthesis + inline evidence refs
  workspace/EntityTable.tsx   resolved entities
  workspace/PathView.tsx      relationship chain
  workspace/EvidenceList.tsx  expandable provenance records
  graph/KnowledgeGraph.tsx    canvas radial layout, focus/expand
  entity/Dossier.tsx          entity panel
```

`EarthStage` should be the only thing that owns the Three.js context. The landing→workspace
transition works by lerping `target.{x,z,scale}` — the planet is never unmounted and remounted,
which is what makes the transition read as moving deeper into one system rather than a page change
(§16). Preserve that; it is the hardest thing to get back once lost.

---

## 5. The live path (ROR + OpenAlex)

The corpus ships empty of live records **on purpose**. Run the harvest yourself:

```bash
export OPENALEX_API_KEY=...      # free, 30 seconds, openalex.org/settings/api
node orvyra-harvest.js           # or: node orvyra-harvest.js --no-openalex
```

It writes `orvyra-live-corpus.json`. Serve that next to `index.html` and the page
fetches it at load, merges the records beside the synthetic ones, and re-renders.
Opening the page from disk skips this — `fetch` cannot read `file://`.

**Why it is empty and not pre-filled.** The environment this was built in cannot reach
`api.ror.org` or `api.openalex.org`. Rather than seed the corpus with plausible-looking
ROR IDs and works counts, it ships with none. A fabricated identifier is indistinguishable
from a real one three months later, and the entire architecture exists to prevent exactly
that. The adapter is tested against mocked responses shaped to the documented schemas;
the *data* comes from your harvest run or from nowhere.

### What `confidence` means for a live record

For synthetic evidence it is model-assigned extraction confidence. For a live registry
read it means **fidelity of extraction, not truth of the claim**: 1.0 says "this value was
read directly from the source record", never "this is true about the world". The evidence
drawer relabels it accordingly. A field absent from the source is withheld, never defaulted.

### What the adapter refuses to build

Only two edge types are derivable from ROR and OpenAlex:

| Edge | Source |
|---|---|
| `researches` → topic | OpenAlex institution topics |
| `part of` / `related to` → organization | ROR relationships |

`participated_in`, `developed`, `operated` and `contributed_to` have no source in either
API. They stay unbuilt. The impact chain — research → technology → mission → societal
outcome — is not implemented and should not be until a primary source per edge exists;
it is the fastest way to turn an evidence system into a machine that invents causality.

Note also that `sectors` comes back empty for live organizations. Tagging DLR as "launch"
is a curation decision, not a source fact, so the adapter will not make it for you. Until
you supply a sector taxonomy, live organizations match on name, region and topic only.

### Operational notes

- OpenAlex requires an API key for all requests as of 13 Feb 2026; a free key carries
  $1/day, which covers roughly 10k filter calls. Singleton lookups by ID are free, and
  the adapter uses singleton lookups. Keep the key server-side — it is stripped from
  every `sourceUri` before evidence is written.
- ROR allows 2,000 requests / 5 min per IP with no registration today, but from Q3 2026
  a `Client-Id` header is required to keep that; unidentified traffic drops to 50 / 5 min.
  Registration is paused while ROR updates the service — set `ROR_CLIENT_ID` when it reopens.
- For anything beyond a few hundred organizations, stop using the APIs and take the
  snapshots. Both are CC0 and both projects tell you to.
- Ambiguous ROR matches are flagged `~` in the harvest output and are not silently
  accepted as correct. Check them by hand.

## 6. Testing

`smoke.js` runs the built page under jsdom and asserts the intelligence reaches the interface:
landing sections render from the corpus, a query produces linked entities and evidence refs,
the withheld block appears and disappears correctly, traversal stays inside the queried sector,
nonsense input degrades gracefully, and entity clicks re-focus the graph. Currently 32 assertions,
0 console errors, including live-corpus ingest, provenance badges and edge rejection.
`test-live.js` covers the adapter separately with 28 assertions against mocked responses.
Three real bugs were caught this way — an unguarded `matchMedia` that threw
before any content rendered, a missing `IntersectionObserver` guard, and a `const`-scoped
core that never attached to `window`, which would have made the live loader a silent no-op.

Keep this harness when you port. It is the cheapest way to notice that the intelligence layer
has quietly stopped reaching the UI.

## 7. Known gaps

- The graph layout is radial and deterministic, not force-directed. This is a feature at
  ≤20 nodes and a limitation above ~40. Swap in d3-force with a fixed node budget when the
  real corpus lands, but keep the two-degree cap.
- Signals and Missions are landing-page content only. Neither has a product surface yet.
- No routing. Add `/`, `/intelligence`, `/graph`, `/entity/:id` when you port.
- Query parsing is lexicon-based, not semantic: it matches kinds, sectors, regions, relations
  and named entities against a keyword table. It handles the six suggested queries and anything
  phrased near them; it will not handle a genuinely novel question. Replace `parse()` with an
  embedding retriever when the real corpus lands — the interface below it does not change.
- Synthesis is template-assembled from graph structure. That is deliberate at this stage: a
  template cannot hallucinate. When you swap in a generative synthesiser, keep the `refs[]`
  contract, or the evidence trail breaks silently.
- Not tested on Safari < 16 (`backdrop-filter`, `100svh`).

---

## 8. Before you show this to anyone

Run the §40 test honestly. My own read:

- Generic AI website? No — no purple gradients, no glass everywhere, no floating cards.
- Generic space website? Closest risk. The mitigation is that nothing on screen is decorative:
  the orbital particles carry no labels, the numbers are structural, the copy is about
  method rather than wonder.
- Dashboard? The workspace is close. It survives because the answer comes first and the
  metrics are subordinate to it. If you add a metrics grid above the answer, it fails.
- Does the Earth look like a stock image? It should not — it rotates at roughly one revolution
  per eight minutes and the clouds drift independently, so the first impression is stillness.
