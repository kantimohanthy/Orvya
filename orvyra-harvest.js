#!/usr/bin/env node
/* ============================================================================
   ORVYRA — HARVEST CLI
   ----------------------------------------------------------------------------
   Resolves the seed organizations through ROR, enriches them through OpenAlex,
   and writes orvyra-live-corpus.json for the intelligence core to ingest.

   Usage:
     export OPENALEX_API_KEY=...        # free key: openalex.org/settings/api
     export ROR_CLIENT_ID=...           # optional today, required from Q3 2026
     node orvyra-harvest.js
     node orvyra-harvest.js --no-openalex     # ROR identity + geography only
     node orvyra-harvest.js --out path.json
     node orvyra-harvest.js "European Space Agency" "German Aerospace Center"

   Without a key the run still succeeds: research figures are written as
   withheld rather than guessed.
   ============================================================================ */

'use strict';
const fs = require('fs');
const path = require('path');
const { harvest, SEED_ORGANIZATIONS } = require('./orvyra-live.js');

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i+1] ? argv[i+1] : d; };
const names = argv.filter(a => !a.startsWith('--') && argv[argv.indexOf(a)-1] !== '--out');

const useOpenAlex = !flag('--no-openalex');
const apiKey = useOpenAlex ? process.env.OPENALEX_API_KEY : null;
const outPath = path.resolve(opt('--out', 'orvyra-live-corpus.json'));
const targets = names.length ? names : SEED_ORGANIZATIONS;

if (useOpenAlex && !apiKey){
  console.error('\n  OPENALEX_API_KEY is not set.');
  console.error('  Get a free key at https://openalex.org/settings/api (30 seconds, $1/day allowance).');
  console.error('  Or run with --no-openalex to harvest ROR identity and geography only.');
  console.error('  Research figures will not be invented either way.\n');
  process.exit(1);
}

(async () => {
  console.log(`\nORVYRA harvest — ${targets.length} organizations`);
  console.log(`  ROR       api.ror.org/v2`);
  console.log(`  OpenAlex  ${apiKey ? 'enabled' : 'skipped (fields will be withheld)'}\n`);

  let done = 0;
  const corpus = await harvest(targets, {
    apiKey,
    clientId: process.env.ROR_CLIENT_ID,
    onProgress: p => {
      done++;
      const mark = p.ok ? (p.ambiguous ? '~' : '✓') : '✗';
      const note = p.ok
        ? (p.ambiguous ? `ambiguous, ${p.candidates} ROR candidates — verify` : '')
        : p.reason;
      console.log(`  ${mark} [${String(done).padStart(2)}/${targets.length}] ${p.name}${note ? '  — ' + note : ''}`);
    }
  });

  fs.writeFileSync(outPath, JSON.stringify(corpus, null, 2));

  const orgs = corpus.entities.filter(e => e.kind === 'organization');
  const withheld = orgs.reduce((n, e) =>
    n + Object.values(e.attrs).filter(a => a && a.withheld).length, 0);
  const geo = orgs.filter(e => e.geo).length;

  console.log(`\n  organizations   ${orgs.length}`);
  console.log(`  topics          ${corpus.entities.length - orgs.length}`);
  console.log(`  relationships   ${corpus.edges.length}${corpus.droppedEdges ? `  (${corpus.droppedEdges} dropped: endpoint not harvested)` : ''}`);
  console.log(`  evidence        ${corpus.evidence.length}`);
  console.log(`  with coordinates${String(geo).padStart(3)}`);
  console.log(`  withheld fields ${withheld}`);
  if (corpus.unresolved.length){
    console.log(`\n  unresolved (${corpus.unresolved.length}):`);
    corpus.unresolved.forEach(u => console.log(`    · ${u.name} — ${u.reason}`));
  }
  console.log(`\n  written to ${outPath}\n`);
  console.log('  Next: serve it next to index.html. The page fetches it at load and');
  console.log('  merges LIVE records beside the synthetic corpus. Anything marked "~"');
  console.log('  above resolved to more than one ROR record — check those by hand before');
  console.log('  you trust the dossier.\n');
})().catch(e => { console.error('\n  harvest failed:', e.message, '\n'); process.exit(1); });
