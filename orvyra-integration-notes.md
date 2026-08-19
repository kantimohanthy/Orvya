# ORVYRA — vertical slice: what it is, and how to land it in the repo

This artifact is the integration/architecture note accompanying the Claude-built ORVYRA vertical slice. The visual frontend is intentionally treated as locked; the intelligence layer should be wired underneath it.

## 1. Intelligence behaviour

The query engine runs `parse → retrieve → traverse → gather evidence → synthesise`. Different questions should produce different answers, paths, evidence sets and subgraphs.

Structural honesty rules:

- Every relationship must have supporting evidence. Edges without evidence are rejected at load.
- Withheld fields are first-class output: `{withheld: reason}` and an answer-level `withheld[]` collection are rendered explicitly.
- Confidence is computed from contributing evidence and constrained by the weakest observation in the chain.
- Source identifiers should remain fixture URIs or real URLs; never fabricate publication names.
- The current fixture corpus is synthetic. Real-world company names may appear, but attributed facts are not real unless backed by a real source.

## 2. Earth textures

The current visual slice generates Earth textures at runtime from coarse coastlines and city coordinates so it has no external asset dependency. For the production visual, replace these with NASA Black Marble night lights, Blue Marble surface albedo, and a cloud composite. Preserve the shader interface and load progressively.

## 3. Data contracts

Keep provenance mandatory on entities, edges and evidence. Edges carry evidence IDs. Evidence carries claim, confidence, source URI, publication/observation dates, method and provenance. Answer blocks carry the question, synthesis, entities, relationship path, evidence IDs and withheld fields.

## 4. Component boundaries

When porting the single-file slice, preserve these conceptual boundaries:

- `stage/EarthStage` — Three.js context, Earth, atmosphere, clouds and orbitals.
- `nav/CommandPalette` — keyboard command palette.
- `hero/HeroQuery` — query shell and suggested queries.
- `workspace/AnswerBlock` — synthesis and inline evidence references.
- `workspace/EntityTable` — resolved entities.
- `workspace/PathView` — relationship chain.
- `workspace/EvidenceList` — expandable provenance records.
- `graph/KnowledgeGraph` — interactive graph.
- `entity/Dossier` — entity intelligence panel.

The Earth stage should remain mounted through landing → workspace transitions so the application feels like one continuous system.

## 5. Testing

Preserve the headless smoke harness. It should verify that landing sections render from the corpus, queries produce linked entities/evidence, withheld output renders correctly, traversal remains in the requested sector, nonsense input degrades gracefully, and entity interactions refocus the graph. Browser API guards such as `matchMedia` and `IntersectionObserver` must remain safe in non-browser test environments.

## 6. Known gaps

- Graph layout is currently deterministic/radial and should be upgraded to force-directed rendering only when the real corpus requires it.
- Signals and Missions are currently landing content and need product surfaces later.
- Add routing for `/`, `/intelligence`, `/graph`, `/entity/:id` when porting.
- Query parsing is currently lexicon-based rather than semantic. Later replace or augment it with a structured semantic retriever without changing the UI contracts.
- Synthesis is template-assembled intentionally to prevent unsupported claims. If a generative synthesizer is added later, preserve the evidence `refs[]` contract.

## 7. Product principle

Do NOT redesign the approved cinematic ORVYRA frontend merely to integrate intelligence. Keep the night Earth, orbital system, typography, query interface, narrative transitions and workspace visual language. Wire the existing Intelligence Core underneath it.

Target flow:

`Earth → signal → query → intelligence answer → entities → relationships → evidence → dossier → graph → gamified investigation`
