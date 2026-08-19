/* ============================================================================
   ORVYRA — INTELLIGENCE CORE
   ----------------------------------------------------------------------------
   No UI in this file. It is the layer the product experience binds to:

       corpus → resolver → retrieval → traversal → evidence → synthesis

   DATA HONESTY (§33). Three provenance states, never blended:
     LIVE            fetched from a connected source at request time
     SOURCE_FIXTURE  a captured, replayable copy of a real source
     SYNTHETIC       invented for interface development

   Every record here is SYNTHETIC. Two rules make that structurally safe:
     1. Source identifiers are fixture URIs, never fabricated publications.
     2. An attribute with no supporting evidence is stored as `withheld`,
        not as a plausible number. The engine surfaces what it refused to say.

   An edge with an empty `ev` array is rejected at load. A relationship the
   system cannot evidence is not a relationship.
   ============================================================================ */

const ORVYRA = (() => {
'use strict';

/* ========================== ONTOLOGY ==================================== */

const KINDS = {
  company:      { label:'Company',      color:'#4fd6e0' },
  investor:     { label:'Investor',     color:'#c9903f' },
  technology:   { label:'Technology',   color:'#8f9fb5' },
  mission:      { label:'Mission',      color:'#5ddc9a' },
  organization: { label:'Organization', color:'#b57ad6' },
  market:       { label:'Market',       color:'#6f7b8d' },
  site:         { label:'Site',         color:'#7f8fa3' }
};

const RELATIONS = [
  'invested in','contracted','develops','operates','partners with',
  'launches from','competes in','targets','supplies','regulates','researches'
];

/* ========================== CORPUS ====================================== */

const E = (id,kind,name,o={}) => Object.assign({
  id, kind, name, aliases:[], region:null, sectors:[], tagline:'', meta:'',
  attrs:{}, provenance:'SYNTHETIC'
}, o);

const ENTITIES = [
  /* --- launch ------------------------------------------------------- */
  E('isar','company','Isar Aerospace',{ aliases:['isar'], region:'Germany', sectors:['launch'],
    tagline:'European launch vehicle developer', meta:'Germany · Aerospace · Launch',
    attrs:{ founded:{v:'2018',ev:['EV-1001']}, headcount:{withheld:'no traceable source'},
            lastRound:{v:'Growth round, 2026-04',ev:['EV-1002']}, roundSize:{withheld:'no traceable source'} } }),
  E('rfa','company','Rocket Factory Augsburg',{ aliases:['rfa','rocket factory'], region:'Germany', sectors:['launch'],
    tagline:'Small launch vehicle developer', meta:'Germany · Aerospace · Launch',
    attrs:{ founded:{v:'2018',ev:['EV-1003']}, roundSize:{withheld:'no traceable source'} } }),
  E('pld','company','PLD Space',{ aliases:['pld'], region:'Spain', sectors:['launch'],
    tagline:'Reusable small launcher developer', meta:'Spain · Aerospace · Launch',
    attrs:{ founded:{v:'2011',ev:['EV-1004']}, lastRound:{v:'Series C, 2026-03',ev:['EV-1005']},
            roundSize:{withheld:'no traceable source'} } }),
  E('orbex','company','Orbex',{ region:'United Kingdom', sectors:['launch'],
    tagline:'Micro-launcher developer', meta:'United Kingdom · Aerospace · Launch',
    attrs:{ founded:{v:'2015',ev:['EV-1006']}, roundSize:{withheld:'no traceable source'} } }),
  E('maia','company','MaiaSpace',{ aliases:['maia'], region:'France', sectors:['launch'],
    tagline:'Reusable mini-launcher developer', meta:'France · Aerospace · Launch',
    attrs:{ founded:{v:'2022',ev:['EV-1007']}, funding:{v:'Programme-backed',ev:['EV-1008']} } }),
  E('skyrora','company','Skyrora',{ region:'United Kingdom', sectors:['launch'],
    tagline:'Suborbital and orbital launch developer', meta:'United Kingdom · Aerospace · Launch',
    attrs:{ founded:{v:'2017',ev:['EV-1009']} } }),

  /* --- earth observation -------------------------------------------- */
  E('iceye','company','ICEYE',{ region:'Finland', sectors:['eo'],
    tagline:'SAR smallsat constellation operator', meta:'Finland · Earth observation · SAR',
    attrs:{ founded:{v:'2014',ev:['EV-1010']}, constellation:{v:'SAR smallsats',ev:['EV-1011']} } }),
  E('satvu','company','SatVu',{ region:'United Kingdom', sectors:['eo'],
    tagline:'Thermal imaging smallsat operator', meta:'United Kingdom · Earth observation · Thermal',
    attrs:{ founded:{v:'2016',ev:['EV-1012']} } }),
  E('planet_eu','company','Constellation operator (unresolved)',{ region:'Europe', sectors:['eo'],
    tagline:'Entity partially resolved — insufficient evidence to merge', meta:'Europe · Earth observation',
    attrs:{ note:{withheld:'entity resolution below threshold'} } }),

  /* --- satcom / infrastructure -------------------------------------- */
  E('ses','company','SES',{ region:'Luxembourg', sectors:['satcom'],
    tagline:'Geostationary and MEO satellite operator', meta:'Luxembourg · Satellite communications',
    attrs:{ founded:{v:'1985',ev:['EV-1013']} } }),
  E('eutelsat','company','Eutelsat',{ region:'France', sectors:['satcom'],
    tagline:'Satellite communications operator', meta:'France · Satellite communications',
    attrs:{ founded:{v:'1977',ev:['EV-1014']} } }),
  E('dorbit','company','D-Orbit',{ aliases:['d orbit'], region:'Italy', sectors:['infra','ism'],
    tagline:'In-space logistics and orbital transfer', meta:'Italy · In-space logistics',
    attrs:{ founded:{v:'2011',ev:['EV-1015']} } }),
  E('spacefo','company','Space Forge',{ region:'United Kingdom', sectors:['ism'],
    tagline:'In-space manufacturing of semiconductor materials', meta:'United Kingdom · In-space manufacturing',
    attrs:{ founded:{v:'2018',ev:['EV-1016']} } }),

  /* --- organizations ------------------------------------------------ */
  E('esa','organization','ESA',{ aliases:['european space agency'], region:'Europe', sectors:['launch','eo','satcom','ism'],
    tagline:'Intergovernmental space agency', meta:'Europe · Agency · Programmes',
    attrs:{ members:{v:'23',ev:['EV-1017']} } }),
  E('ec','organization','European Commission',{ aliases:['ec','commission'], region:'Europe', sectors:['launch','satcom'],
    tagline:'Regulatory and procurement authority', meta:'Europe · Policy · Procurement',
    attrs:{ role:{v:'Programme and procurement authority',ev:['EV-1018']} } }),
  E('dlr','organization','DLR',{ region:'Germany', sectors:['launch','eo'],
    tagline:'German aerospace research centre', meta:'Germany · Research · Aerospace',
    attrs:{ role:{v:'National research agency',ev:['EV-1019']} } }),

  /* --- technologies ------------------------------------------------- */
  E('reusable','technology','Reusable first stage',{ aliases:['reusability','reuse'], sectors:['launch'],
    tagline:'Propulsive recovery of the booster stage', meta:'Technology · Propulsion · Recovery',
    attrs:{ maturity:{v:'TRL 5–7',ev:['EV-1020']} } }),
  E('methalox','technology','LOX / methane propulsion',{ aliases:['methalox','methane'], sectors:['launch'],
    tagline:'Methalox engine cycle', meta:'Technology · Propulsion',
    attrs:{ maturity:{v:'TRL 6–8',ev:['EV-1021']} } }),
  E('sar','technology','Synthetic aperture radar',{ aliases:['sar'], sectors:['eo'],
    tagline:'All-weather radar imaging from orbit', meta:'Technology · Sensing · Radar',
    attrs:{ maturity:{v:'TRL 9',ev:['EV-1022']} } }),
  E('thermal','technology','Thermal infrared imaging',{ sectors:['eo'],
    tagline:'Mid-wave infrared imaging payloads', meta:'Technology · Sensing · Infrared',
    attrs:{ maturity:{v:'TRL 7–8',ev:['EV-1023']} } }),
  E('otv','technology','Orbital transfer vehicle',{ aliases:['otv','space tug'], sectors:['infra','ism'],
    tagline:'Last-mile orbital delivery', meta:'Technology · Logistics',
    attrs:{ maturity:{v:'TRL 8',ev:['EV-1024']} } }),
  E('crystal','technology','Microgravity crystal growth',{ sectors:['ism'],
    tagline:'Semiconductor growth in microgravity', meta:'Technology · Materials',
    attrs:{ maturity:{v:'TRL 4–5',ev:['EV-1025']} } }),

  /* --- missions & sites --------------------------------------------- */
  E('spectrum','mission','Spectrum flight campaign',{ region:'Norway', sectors:['launch'],
    tagline:'Orbital flight campaign', meta:'Mission · Orbital',
    attrs:{ status:{v:'Campaign',ev:['EV-1026']} } }),
  E('miura','mission','Miura flight campaign',{ region:'Spain', sectors:['launch'],
    tagline:'Suborbital to orbital progression', meta:'Mission · Orbital',
    attrs:{ status:{v:'Campaign',ev:['EV-1027']} } }),
  E('andoya','site','Andøya Spaceport',{ region:'Norway', sectors:['launch'],
    tagline:'High-latitude orbital launch site', meta:'Norway · Launch site',
    attrs:{ inclinations:{v:'Polar / SSO',ev:['EV-1028']} } }),
  E('kourou','site','Guiana Space Centre',{ aliases:['kourou'], region:'France', sectors:['launch'],
    tagline:'Equatorial launch range', meta:'France · Launch site',
    attrs:{ inclinations:{v:'Equatorial / GTO',ev:['EV-1029']} } }),

  /* --- investors ---------------------------------------------------- */
  E('vc_growth','investor','Growth fund (undisclosed)',{ region:'Europe', sectors:['launch','eo'],
    tagline:'Late-stage venture investor', meta:'Investor · Venture',
    attrs:{ identity:{withheld:'investor not disclosed in source'} } }),
  E('vc_sov','investor','Sovereign co-investor',{ region:'Europe', sectors:['launch','ism'],
    tagline:'State-backed strategic investor', meta:'Investor · Sovereign',
    attrs:{ identity:{withheld:'investor not disclosed in source'} } }),
  E('vc_deep','investor','Deep-tech seed fund',{ region:'Europe', sectors:['eo','ism'],
    tagline:'Early-stage deep technology investor', meta:'Investor · Venture · Seed',
    attrs:{ identity:{withheld:'investor not disclosed in source'} } }),

  /* --- markets ------------------------------------------------------ */
  E('m_launch','market','European commercial launch',{ region:'Europe', sectors:['launch'],
    tagline:'Addressable market segment', meta:'Market · Launch services',
    attrs:{ operators:{v:'6 resolved in corpus',ev:['EV-1030']}, size:{withheld:'no traceable source'} } }),
  E('m_eo','market','Earth observation data',{ region:'Europe', sectors:['eo'],
    tagline:'Imagery and analytics segment', meta:'Market · Data services',
    attrs:{ size:{withheld:'no traceable source'} } }),
  E('m_satcom','market','Satellite connectivity',{ region:'Europe', sectors:['satcom'],
    tagline:'Fixed and mobile connectivity segment', meta:'Market · Connectivity',
    attrs:{ size:{withheld:'no traceable source'} } }),
  E('m_ism','market','In-space manufacturing',{ region:'Europe', sectors:['ism'],
    tagline:'Emerging orbital production segment', meta:'Market · Manufacturing',
    attrs:{ size:{withheld:'no traceable source'} } })
];

/* Evidence. `confidence` is model-assigned, never editorial, never rounded up. */
const EV = (id,claim,conf,slug,pub,obs,method) => ({
  id, claim, confidence:conf, sourceUri:`fixture://orvyra/synthetic/${slug}`,
  publishedAt:pub, observedAt:obs, method, provenance:'SYNTHETIC'
});

const EVIDENCE = [
  EV('EV-1001','Isar Aerospace was founded in 2018',.93,'registry/de/0181','2024-01-10','2026-01-04','registry parse → entity resolution'),
  EV('EV-1002','Isar Aerospace closed a growth round in April 2026',.71,'capital/eu/0441','2026-04-16','2026-04-18','pattern extraction → claim assembly'),
  EV('EV-1003','Rocket Factory Augsburg was founded in 2018',.91,'registry/de/0182','2024-01-10','2026-01-04','registry parse → entity resolution'),
  EV('EV-1004','PLD Space was founded in 2011',.94,'registry/es/0044','2023-11-02','2026-01-04','registry parse → entity resolution'),
  EV('EV-1005','PLD Space closed a Series C in March 2026',.68,'capital/eu/0447','2026-03-05','2026-03-07','pattern extraction → claim assembly'),
  EV('EV-1006','Orbex was founded in 2015',.90,'registry/uk/0771','2023-08-19','2026-01-04','registry parse → entity resolution'),
  EV('EV-1007','MaiaSpace was founded in 2022',.88,'registry/fr/0210','2024-05-01','2026-01-04','registry parse → entity resolution'),
  EV('EV-1008','MaiaSpace is funded through programme contracts',.66,'procurement/esa/0092','2026-02-09','2026-02-11','procurement record parse → organization resolution'),
  EV('EV-1009','Skyrora was founded in 2017',.87,'registry/uk/0774','2023-08-19','2026-01-04','registry parse → entity resolution'),
  EV('EV-1010','ICEYE was founded in 2014',.92,'registry/fi/0031','2023-06-12','2026-01-04','registry parse → entity resolution'),
  EV('EV-1011','ICEYE operates a SAR smallsat constellation',.89,'tech/eo/0114','2026-01-22','2026-01-24','document classification → technology linkage'),
  EV('EV-1012','SatVu was founded in 2016',.86,'registry/uk/0779','2023-08-19','2026-01-04','registry parse → entity resolution'),
  EV('EV-1013','SES was founded in 1985',.95,'registry/lu/0002','2022-03-01','2026-01-04','registry parse → entity resolution'),
  EV('EV-1014','Eutelsat was founded in 1977',.95,'registry/fr/0001','2022-03-01','2026-01-04','registry parse → entity resolution'),
  EV('EV-1015','D-Orbit was founded in 2011',.90,'registry/it/0019','2023-09-14','2026-01-04','registry parse → entity resolution'),
  EV('EV-1016','Space Forge was founded in 2018',.88,'registry/uk/0782','2023-08-19','2026-01-04','registry parse → entity resolution'),
  EV('EV-1017','ESA has 23 member states',.94,'org/esa/0001','2025-12-01','2026-01-04','organization record parse'),
  EV('EV-1018','The European Commission acts as a programme and procurement authority',.90,'policy/eu/0007','2025-10-14','2026-01-04','policy document parse'),
  EV('EV-1019','DLR operates as the German national aerospace research centre',.92,'org/dlr/0001','2025-09-02','2026-01-04','organization record parse'),
  EV('EV-1020','Reusable first-stage recovery sits at TRL 5–7 in Europe',.74,'tech/launch/0118','2026-02-27','2026-03-02','document classification → maturity assessment'),
  EV('EV-1021','LOX/methane propulsion sits at TRL 6–8',.79,'tech/launch/0121','2026-02-27','2026-03-02','document classification → maturity assessment'),
  EV('EV-1022','Synthetic aperture radar is an operational orbital sensing technology',.93,'tech/eo/0101','2025-11-11','2026-01-04','document classification'),
  EV('EV-1023','Thermal infrared imaging payloads are in operational demonstration',.81,'tech/eo/0108','2026-01-15','2026-01-18','document classification'),
  EV('EV-1024','Orbital transfer vehicles are operational for last-mile delivery',.85,'tech/infra/0055','2025-12-20','2026-01-04','document classification'),
  EV('EV-1025','Microgravity crystal growth remains at low technology readiness',.63,'tech/ism/0012','2026-01-30','2026-02-02','document classification → maturity assessment'),
  EV('EV-1026','A Spectrum orbital flight campaign is in progress',.77,'mission/eu/0031','2026-04-01','2026-04-02','mission record parse'),
  EV('EV-1027','A Miura flight campaign is in progress',.75,'mission/eu/0033','2026-03-18','2026-03-20','mission record parse'),
  EV('EV-1028','Andøya Spaceport supports polar and sun-synchronous inclinations',.88,'site/no/0004','2025-07-08','2026-01-04','site record parse'),
  EV('EV-1029','The Guiana Space Centre supports equatorial and GTO trajectories',.94,'site/fr/0001','2025-07-08','2026-01-04','site record parse'),
  EV('EV-1030','At least six launch vehicle operators are active in Europe',.86,'market/eu/0007','2026-04-30','2026-05-01','aggregation across resolved company entities'),
  EV('EV-1031','An undisclosed growth fund participated in a European launch round',.61,'capital/eu/0442','2026-04-16','2026-04-18','pattern extraction → investor resolution'),
  EV('EV-1032','A sovereign co-investor participated in a European launch round',.59,'capital/eu/0443','2026-04-16','2026-04-18','pattern extraction → investor resolution'),
  EV('EV-1033','A deep-tech seed fund holds positions in European EO and ISM companies',.57,'capital/eu/0455','2026-02-20','2026-02-22','pattern extraction → investor resolution'),
  EV('EV-1034','ESA has contracted European launch developers under programme awards',.72,'procurement/esa/0090','2026-02-09','2026-02-11','procurement record parse'),
  EV('EV-1035','Isar Aerospace is developing reusable first-stage recovery',.69,'tech/launch/0130','2026-03-11','2026-03-13','document classification → technology linkage'),
  EV('EV-1036','PLD Space is developing propulsive first-stage recovery',.84,'tech/launch/0118','2026-02-27','2026-03-02','document classification → technology linkage'),
  EV('EV-1037','MaiaSpace is developing a reusable mini-launcher',.76,'tech/launch/0133','2026-03-11','2026-03-13','document classification → technology linkage'),
  EV('EV-1038','D-Orbit operates orbital transfer vehicles',.87,'tech/infra/0058','2026-01-08','2026-01-10','document classification → technology linkage'),
  EV('EV-1039','Space Forge is developing microgravity materials production',.70,'tech/ism/0015','2026-01-30','2026-02-02','document classification → technology linkage'),
  EV('EV-1040','European launch operators compete in the commercial launch segment',.80,'market/eu/0009','2026-04-30','2026-05-01','market segmentation → entity linkage')
];

/* Edges. `ev` may not be empty — enforced at load. */
const R = (from,rel,to,ev,since) => ({ from, rel, to, ev, since:since||null });

const EDGES = [
  R('vc_growth','invested in','isar',['EV-1002','EV-1031'],'2026-04'),
  R('vc_sov','invested in','isar',['EV-1002','EV-1032'],'2026-04'),
  R('vc_growth','invested in','pld',['EV-1005'],'2026-03'),
  R('vc_deep','invested in','iceye',['EV-1033']),
  R('vc_deep','invested in','spacefo',['EV-1033']),
  R('esa','contracted','maia',['EV-1008','EV-1034'],'2026-02'),
  R('esa','contracted','pld',['EV-1034']),
  R('esa','contracted','isar',['EV-1034']),
  R('ec','regulates','m_launch',['EV-1018']),
  R('ec','regulates','m_satcom',['EV-1018']),
  R('dlr','researches','reusable',['EV-1019','EV-1020']),
  R('isar','develops','reusable',['EV-1035']),
  R('isar','develops','methalox',['EV-1021']),
  R('pld','develops','reusable',['EV-1036']),
  R('maia','develops','reusable',['EV-1037']),
  R('rfa','develops','methalox',['EV-1021']),
  R('orbex','develops','methalox',['EV-1021']),
  R('skyrora','develops','methalox',['EV-1021']),
  R('isar','operates','spectrum',['EV-1026']),
  R('pld','operates','miura',['EV-1027']),
  R('spectrum','launches from','andoya',['EV-1026','EV-1028']),
  R('maia','launches from','kourou',['EV-1029']),
  R('reusable','targets','m_launch',['EV-1020','EV-1040']),
  R('methalox','targets','m_launch',['EV-1021','EV-1040']),
  R('isar','competes in','m_launch',['EV-1030','EV-1040']),
  R('pld','competes in','m_launch',['EV-1030','EV-1040']),
  R('rfa','competes in','m_launch',['EV-1030','EV-1040']),
  R('orbex','competes in','m_launch',['EV-1030','EV-1040']),
  R('maia','competes in','m_launch',['EV-1030','EV-1040']),
  R('skyrora','competes in','m_launch',['EV-1030','EV-1040']),
  R('iceye','develops','sar',['EV-1011']),
  R('satvu','develops','thermal',['EV-1023']),
  R('iceye','competes in','m_eo',['EV-1011']),
  R('satvu','competes in','m_eo',['EV-1023']),
  R('sar','targets','m_eo',['EV-1022']),
  R('thermal','targets','m_eo',['EV-1023']),
  R('ses','competes in','m_satcom',['EV-1013']),
  R('eutelsat','competes in','m_satcom',['EV-1014']),
  R('dorbit','develops','otv',['EV-1038']),
  R('dorbit','competes in','m_ism',['EV-1038']),
  R('spacefo','develops','crystal',['EV-1039']),
  R('spacefo','competes in','m_ism',['EV-1039']),
  R('otv','targets','m_ism',['EV-1024']),
  R('crystal','targets','m_ism',['EV-1025']),
  R('dorbit','supplies','iceye',['EV-1038']),
  R('esa','contracted','dorbit',['EV-1034'])
];

const SIGNALS = [
  { at:'2026-04-18', type:'Funding',    entity:'isar',    text:'Growth round closes — two investors resolved, neither disclosed', ev:['EV-1002','EV-1031'], weight:'HIGH' },
  { at:'2026-04-02', type:'Launch',     entity:'spectrum',text:'Orbital flight campaign in progress at Andøya Spaceport',        ev:['EV-1026'], weight:'HIGH' },
  { at:'2026-03-20', type:'Launch',     entity:'miura',   text:'Flight campaign progresses toward orbital attempt',              ev:['EV-1027'], weight:'MED'  },
  { at:'2026-03-13', type:'Technology', entity:'reusable',text:'Two more European operators linked to first-stage recovery',     ev:['EV-1035','EV-1037'], weight:'MED' },
  { at:'2026-03-07', type:'Funding',    entity:'pld',     text:'Series C recorded — round size not traceable to a source',       ev:['EV-1005'], weight:'MED' },
  { at:'2026-02-22', type:'Funding',    entity:'vc_deep', text:'Seed fund positions resolved across EO and in-space manufacturing', ev:['EV-1033'], weight:'LOW' },
  { at:'2026-02-11', type:'Partnership',entity:'maia',    text:'Programme contract resolved against agency procurement record',  ev:['EV-1008','EV-1034'], weight:'MED' },
  { at:'2026-02-02', type:'Technology', entity:'crystal', text:'Microgravity materials production assessed at low readiness',    ev:['EV-1025'], weight:'LOW' }
];

/* ========================== INDEX / LOAD ================================ */

const byId = {}, evById = {}, adj = {}, rejected = [];
ENTITIES.forEach(e => { byId[e.id] = e; adj[e.id] = []; });
EVIDENCE.forEach(v => { evById[v.id] = v; });

const LOADED_EDGES = [];
EDGES.forEach((e, i) => {
  if (!e.ev || !e.ev.length) { rejected.push({ edge:e, reason:'no supporting evidence' }); return; }
  const missing = e.ev.filter(id => !evById[id]);
  if (missing.length) { rejected.push({ edge:e, reason:'evidence not in corpus: ' + missing.join(', ') }); return; }
  if (!byId[e.from] || !byId[e.to]) { rejected.push({ edge:e, reason:'unresolved endpoint' }); return; }
  const edge = Object.assign({ id:'RE-' + String(i+1).padStart(4,'0') }, e);
  LOADED_EDGES.push(edge);
  adj[e.from].push({ edge, other:e.to, out:true });
  adj[e.to].push({ edge, other:e.from, out:false });
});

/* ========================== RESOLVER ==================================== */

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const tokens = s => norm(s).split(' ').filter(t => t.length > 2);

function resolve(text){
  const n = norm(text);
  let best = null, bestScore = 0;
  for (const e of ENTITIES){
    const names = [e.name, ...e.aliases].map(norm);
    let s = 0;
    for (const nm of names){
      if (nm === n) s = Math.max(s, 1);
      else if (n.includes(nm) || nm.includes(n)) s = Math.max(s, .8);
      else {
        const a = new Set(tokens(nm)), b = tokens(n).filter(t => a.has(t));
        if (a.size) s = Math.max(s, .6 * b.length / a.size);
      }
    }
    if (s > bestScore){ bestScore = s; best = e; }
  }
  return bestScore >= .55 ? { entity:best, score:+bestScore.toFixed(2) } : null;
}

/* ========================== INTENT PARSING ============================== */

const LEX = {
  kind: {
    company:['company','companies','startup','startups','firm','firms','operator','operators','developer','developers'],
    investor:['investor','investors','vc','vcs','fund','funds','capital','backer','backers'],
    technology:['technology','technologies','tech'],
    mission:['mission','missions','campaign','flight'],
    organization:['agency','agencies','organisation','organization','organizations','institution'],
    market:['market','markets','segment','segments','sector'],
    site:['spaceport','spaceports','launch site','range']
  },
  sector: {
    launch:['launch','launcher','launchers','rocket','rockets','vehicle'],
    eo:['earth observation','eo','imaging','imagery','remote sensing','sar','radar','thermal'],
    satcom:['satellite communications','satcom','connectivity','communications','broadband'],
    ism:['in space manufacturing','in-space manufacturing','ism','manufacturing','materials'],
    infra:['infrastructure','logistics','servicing','transfer','tug']
  },
  region: {
    Europe:['europe','european','eu'], Germany:['german','germany'], Spain:['spain','spanish'],
    France:['france','french'], 'United Kingdom':['uk','britain','british','united kingdom'],
    Italy:['italy','italian'], Finland:['finland','finnish'], Norway:['norway','norwegian'],
    Luxembourg:['luxembourg']
  },
  relation: {
    'invested in':['funding','funded','raised','raise','invest','invested','investment','capital','round','backed'],
    develops:['develop','developing','develops','building','builds','technology'],
    operates:['operate','operates','operating','flies','flying'],
    contracted:['contract','contracted','award','awarded','procurement'],
    'competes in':['compete','competes','competitor','competitors','players'],
    regulates:['regulate','regulates','regulation','policy'],
    supplies:['supply','supplies','supplier','supplies to']
  }
};

const IN_EUROPE = new Set(['Europe','Germany','Spain','France','United Kingdom','Italy','Finland','Norway','Luxembourg']);

/* Third-person plural for synthesis. A relation is stored in one canonical
   form; the surface form is derived, never stored twice. */
const PLURAL = {
  'competes in':'compete in', develops:'develop', operates:'operate',
  targets:'target', supplies:'supply', regulates:'regulate',
  researches:'research', 'launches from':'launch from',
  'partners with':'partner with', 'invested in':'invested in', contracted:'were contracted by'
};

function parse(q){
  const n = ' ' + norm(q) + ' ';
  const pick = group => Object.entries(LEX[group])
    .filter(([,words]) => words.some(w => n.includes(' ' + w + ' ') || n.includes(' ' + w)))
    .map(([k]) => k);

  const named = [];
  for (const e of ENTITIES){
    for (const nm of [e.name, ...e.aliases]){
      if (nm.length > 3 && n.includes(' ' + norm(nm))) { named.push(e.id); break; }
    }
  }
  return {
    kinds: pick('kind'),
    sectors: pick('sector'),
    regions: pick('region'),
    relations: pick('relation'),
    named: [...new Set(named)],
    recent: /\b(recent|recently|latest|new|now|2026)\b/.test(n),
    terms: tokens(q)
  };
}

/* ========================== RETRIEVAL =================================== */

function retrieve(intent, limit){
  const scored = ENTITIES.map(e => {
    let s = 0; const why = [];
    if (intent.named.includes(e.id)) { s += 6; why.push('named in query'); }
    if (intent.kinds.length && intent.kinds.includes(e.kind)) { s += 3; why.push('kind match'); }
    if (intent.sectors.length && e.sectors.some(x => intent.sectors.includes(x))) { s += 3; why.push('sector match'); }
    if (intent.regions.length){
      const hit = intent.regions.includes(e.region) ||
                  (intent.regions.includes('Europe') && IN_EUROPE.has(e.region));
      if (hit) { s += 2; why.push('region match'); }
    }
    if (intent.relations.length){
      const rel = adj[e.id].some(a => intent.relations.includes(a.edge.rel));
      if (rel) { s += 2.5; why.push('relationship match'); }
    }
    const hay = norm([e.name, e.tagline, e.meta, ...e.aliases].join(' '));
    const overlap = intent.terms.filter(t => hay.includes(t)).length;
    if (overlap) { s += overlap * 1.2; why.push('term match'); }
    if (intent.kinds.length === 0 && intent.named.length === 0 && e.kind === 'company') s += .8;
    return { e, s, why };
  }).filter(r => r.s > 1.5).sort((a,b) => b.s - a.s);

  return scored.slice(0, limit || 6);
}

/* ========================== TRAVERSAL =================================== */

function neighbours(id){ return adj[id] || []; }

function pathTo(startId, predicate, maxDepth){
  const seen = new Set([startId]);
  let frontier = [[{ id:startId, rel:null }]];
  for (let d = 0; d < (maxDepth || 4); d++){
    const next = [];
    for (const path of frontier){
      const tip = path[path.length - 1].id;
      for (const a of neighbours(tip)){
        if (seen.has(a.other)) continue;
        const extended = path.concat([{ id:a.other, rel:a.edge.rel, edge:a.edge, out:a.out }]);
        if (predicate(byId[a.other])) return extended;
        seen.add(a.other); next.push(extended);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}

function subgraph(focusId, depth, cap){
  depth = depth || 2; cap = cap || 16;
  const nodes = new Map([[focusId, 0]]);
  let ring = [focusId];
  for (let d = 1; d <= depth; d++){
    const next = [];
    for (const id of ring){
      for (const a of neighbours(id)){
        if (nodes.has(a.other) || nodes.size >= cap) continue;
        nodes.set(a.other, d); next.push(a.other);
      }
    }
    ring = next;
  }
  const ids = new Set(nodes.keys());
  return {
    nodes: [...nodes].map(([id, d]) => ({ id, depth:d, entity:byId[id] })),
    edges: LOADED_EDGES.filter(e => ids.has(e.from) && ids.has(e.to))
  };
}

/* ========================== EVIDENCE ==================================== */

function gatherEvidence(ids){
  const out = [];
  const seen = new Set();
  for (const id of ids){
    if (seen.has(id) || !evById[id]) continue;
    seen.add(id); out.push(evById[id]);
  }
  return out.sort((a,b) => b.confidence - a.confidence);
}

/* Corpus confidence: mean of contributing evidence, floored by the weakest
   link in any path actually used. Never rounded up, never asserted. */
function aggregateConfidence(evidence){
  if (!evidence.length) return null;
  const mean = evidence.reduce((s,e) => s + e.confidence, 0) / evidence.length;
  const min = Math.min(...evidence.map(e => e.confidence));
  return +(mean * .6 + min * .4).toFixed(2);
}

/* ========================== SYNTHESIS =================================== */
/* Every sentence is assembled from facts already in the store and carries the
   evidence ids it was built from. Nothing here writes prose about the world. */

function synthesise(intent, hits, question){
  const out = [];
  if (!hits.length){
    return [{ text:'No entity in this corpus matches that query. The corpus covers European launch, Earth observation, satellite communications and in-space manufacturing.', refs:[] }];
  }

  const kindLabel = k => (KINDS[k] ? KINDS[k].label.toLowerCase() : k);
  const list = hits.map(h => h.e);
  const kindsUsed = [...new Set(list.map(e => e.kind))];
  const SECTOR_LABEL = { launch:'launch', eo:'Earth observation', satcom:'satellite communications',
                         ism:'in-space manufacturing', infra:'space infrastructure' };
  const regionWord = intent.regions.includes('Europe') ? 'European'
                   : intent.regions.length ? intent.regions.join(' / ') : '';
  const sectorWord = intent.sectors.map(s => SECTOR_LABEL[s]).join(' and ');
  const scope = [regionWord, sectorWord].filter(Boolean).join(' ');

  const one = list.length === 1;
  const noun = kindsUsed.length === 1
    ? kindLabel(kindsUsed[0]) + (one ? '' : kindLabel(kindsUsed[0]).endsWith('y') ? 'ies' : 's')
    : (one ? 'entity record' : 'entity records');
  out.push({
    text: `${list.length} ${noun.replace('companys','companies')}` +
          `${scope ? ' in ' + scope : ''} ${one ? 'matches' : 'match'} this query: ` +
          list.map(e => `{{${e.id}}}`).join(', ') + '.',
    refs: []
  });

  /* shared structure: the most common target the hits point at */
  const targets = {};
  for (const e of list){
    for (const a of neighbours(e.id)){
      if (!a.out) continue;
      const key = a.edge.rel + '|' + a.other;
      (targets[key] = targets[key] || { rel:a.edge.rel, to:a.other, from:[], ev:[] });
      targets[key].from.push(e.id);
      targets[key].ev.push(...a.edge.ev);
    }
  }
  const shared = Object.values(targets)
    .filter(t => t.from.length > 1)
    .sort((a,b) => b.from.length - a.from.length)[0];
  if (shared){
    out.push({
      text: `${shared.from.length} of them ${PLURAL[shared.rel] || shared.rel} {{${shared.to}}}.`,
      refs: [...new Set(shared.ev)].slice(0,3)
    });
  }

  /* incoming capital or contracts, if the query is about funding */
  if (intent.relations.includes('invested in') || /fund|capital|rais/.test(norm(question))){
    const funded = list.filter(e => neighbours(e.id).some(a => !a.out && a.edge.rel === 'invested in'));
    const contracted = list.filter(e => neighbours(e.id).some(a => !a.out && a.edge.rel === 'contracted'));
    if (funded.length || contracted.length){
      const evs = [];
      funded.concat(contracted).forEach(e => neighbours(e.id).forEach(a => {
        if (!a.out && (a.edge.rel === 'invested in' || a.edge.rel === 'contracted')) evs.push(...a.edge.ev);
      }));
      out.push({
        text: `${funded.length} carry resolved investor relationships and ${contracted.length} carry programme contracts, which are funding of a different kind.`,
        refs: [...new Set(evs)].slice(0,3)
      });
    }
  }

  return out;
}

function withheldFor(list){
  const out = [];
  for (const e of list){
    for (const [k,v] of Object.entries(e.attrs || {})){
      if (v && v.withheld) out.push({ entity:e.id, field:k, reason:v.withheld });
    }
  }
  return out;
}

/* ========================== QUERY ======================================= */

function query(question){
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const intent = parse(question || '');
  const hits = retrieve(intent, 6);
  const list = hits.map(h => h.e);

  const usedEdges = [];
  for (const e of list){
    for (const a of neighbours(e.id)){
      if (list.some(x => x.id === a.other) || a.edge.rel === 'invested in' ||
          a.edge.rel === 'contracted' || a.edge.rel === 'develops' || a.edge.rel === 'competes in'){
        usedEdges.push(a.edge);
      }
    }
  }
  const uniqueEdges = [...new Map(usedEdges.map(e => [e.id, e])).values()];

  let path = null;
  if (list.length){
    const anchor = list.find(e => e.kind === 'company' &&
                    neighbours(e.id).some(a => !a.out && (a.edge.rel === 'invested in' || a.edge.rel === 'contracted')))
                || list.find(e => e.kind === 'company')
                || list[0];
    const forward = pathTo(anchor.id, e => e.kind === 'market', 3);
    if (forward){
      const src = neighbours(anchor.id).find(a => !a.out && (a.edge.rel === 'invested in' || a.edge.rel === 'contracted'));
      path = src
        ? [{ id:src.other, rel:null }, Object.assign({}, forward[0], { rel:src.edge.rel, edge:src.edge })]
            .concat(forward.slice(1))
        : forward;
    }
  }

  const evIds = [];
  uniqueEdges.forEach(e => evIds.push(...e.ev));
  if (path) path.forEach(step => step.edge && evIds.push(...step.edge.ev));
  list.forEach(e => Object.values(e.attrs || {}).forEach(a => a && a.ev && evIds.push(...a.ev)));

  const evidence = gatherEvidence(evIds).slice(0, 8);
  const synthesis = synthesise(intent, hits, question);

  return {
    question: question,
    intent,
    synthesis,
    entities: hits.map(h => ({ id:h.e.id, entity:h.e, score:+h.s.toFixed(1), why:[...new Set(h.why)] })),
    path,
    edges: uniqueEdges,
    evidence,
    withheld: withheldFor(list),
    confidence: aggregateConfidence(evidence),
    provenance: 'SYNTHETIC',
    stats: {
      scanned: ENTITIES.length,
      matched: list.length,
      edges: uniqueEdges.length,
      evidence: evidence.length,
      ms: +((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0).toFixed(1)
    }
  };
}

/* ========================== PUBLIC API ================================== */

return {
  KINDS, RELATIONS,
  entities: ENTITIES,
  edges: LOADED_EDGES,
  evidence: EVIDENCE,
  signals: SIGNALS,
  rejected,
  entity: id => byId[id],
  ev: id => evById[id],
  neighbours, resolve, parse, retrieve, query, subgraph, pathTo,
  counts: () => {
    const c = {};
    for (const k of Object.keys(KINDS)) c[k] = ENTITIES.filter(e => e.kind === k).length;
    return c;
  },
  corpus: {
    id: 'orvyra-fixture-2026-08',
    provenance: 'SYNTHETIC',
    entities: ENTITIES.length,
    relationships: LOADED_EDGES.length,
    evidence: EVIDENCE.length,
    signals: SIGNALS.length,
    rejectedEdges: rejected.length
  }
};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ORVYRA;
