# CosmoHub-Next (v0.5 Space Intelligence Terminal)

This is an experimental rewrite of CosmoHub adopting an **Ontology-First** architecture.

> **CURRENT STATUS: SPACE INTELLIGENCE TERMINAL v0.5**
> CosmoHub is evolving from an educational prototype into a "Bloomberg Terminal for Space." The current build operates a dense, keyboard-driven interface atop a vanilla JavaScript Intelligence Core graph engine.

## The Architecture Loop
The fundamental loop demonstrated in this build is:
*Click an Institution → discover a Mission → discover a Technology → discover Research → Learn about it → Opportunity.*

## What Exists Today (MVP)
* **Intelligence Core:** Pipeline logic mapping `Documents` -> `Claims` -> `Entities` -> `Relationships`. Includes Conflict detection and temporal boundaries.
* **Terminal UI:** High-density command dashboards, Canvas topology visualization, and Slide-out Context Drawers.
* **Command Bar:** Global Search (Cmd+K) indexing the entire ontology.
* **Interactive Intelligence Maps:** SVG-based geographic projections using canonical metadata.
* **Data Separation:** Strict boundaries between raw ecosystem entities (`data/core.js`) and product/synthetic paths (`data/product.js`).

## Running the Terminal
The repository is a dependency-free Static SPA.
1. Serve the `CosmoHub-Next/` directory (e.g., `python -m http.server 8000`).
2. Open `index.html`.
3. Press `Cmd+K` or `Ctrl+K` to begin exploring the network.

## Documentation
- [Product Architecture](docs/product-architecture.md)
- [Intelligence Core](docs/intelligence-core.md)
- [UI & Terminal Design System](docs/ui-architecture.md)

*Note: The original legacy CosmoHub repository remains untouched at the repository root.*
