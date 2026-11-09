/* Compos Volley */
'use strict';
const KEY = 'vb-lineup-builder-v1';
const NB = ' ';
const ROLE_KEYS = ['S','OH','MB','OPP','L'];
/* clés internes inchangées (compatibilité de sauvegarde), affichage en français */
const LAB = {S:'P', OH:'R4', MB:'C', OPP:'Pt', L:'L'};
const ROLE_NAME = {S:'Passeur', OH:'Réceptionneur-attaquant', MB:'Central', OPP:'Pointu', L:'Libéro'};
const COURT_NAME = {S:'Passeur', OH:'R4', MB:'Central', OPP:'Pointu', L:'Libéro'};
const ROLE_PLURAL = {S:'passeurs', OH:'réceptionneurs-attaquants', MB:'centraux', OPP:'pointus', L:'libéros'};
const SYSTEMS = [
  {id:'5-1', name:'5-1', blurb:'Un seul passeur organise le jeu tout le match. Il faut un passeur solide.',
   slots:[['S',1],['OH',2],['MB',3],['OPP',4],['OH',5],['MB',6]]},
  {id:'4-2', name:'4-2', blurb:'Deux passeurs opposés&nbsp;; celui qui est à l’avant fait la passe. Le plus simple pour des niveaux mélangés.',
   slots:[['S',1],['OH',2],['MB',3],['S',4],['OH',5],['MB',6]]},
];
/* formations proposées : 5-1, 5-1 + libéro, 4-2 */
const FORMATIONS = [['5-1',false],['5-1',true],['4-2',false]];
const POS_HINT = {
  flex:'Un joueur peut être placé hors de ses postes si cela aide à compléter le terrain.',
  strict:'Chacun joue uniquement aux postes qu’il a annoncés (quel que soit le rang). Certains joueront moins de sets. Un joueur sans poste indiqué peut aller partout.'
};
const MODE_HINT = {
  best:'Le même six le plus fort à chaque set. Les joueurs du banc sont indiqués comme remplaçants.',
  balanced:'Fait tourner le banc d’un set à l’autre tout en gardant chacun proche de ses postes.',
  equal:'Chacun joue le même nombre de sets autant que possible, quitte à jouer hors poste.'
};
const MODE_W = {best:0, balanced:1.3, equal:7};

const uid = () => Math.random().toString(36).slice(2,9);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function examplePlayers(){
  return [
    ['Inès',['S','OPP']],['Hugo',['OH','OPP']],['Camille',['MB']],['Yanis',['OH','L']],
    ['Léa',['L','OH']],['Thomas',['MB','OPP']],['Sarah',['OPP','OH']],['Mehdi',['S']],
    ['Julie',['OH'],false],['Antoine',['MB','OH']]
  ].map(([name,pos,present=true]) => ({id:uid(), name, pos, present}));
}
function exampleState(){ return {example:true, positions:'flex', sets:3, mode:'balanced', midset:'off', setterLock:'lock', selected:null, players:examplePlayers()}; }
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY));
    if(s && Array.isArray(s.players)){
      if(!s.positions) s.positions = 'flex';
      if(!MODE_W.hasOwnProperty(s.mode)) s.mode = 'balanced';
      if(!s.midset) s.midset = 'off';
      if(!s.setterLock) s.setterLock = 'lock';
      return s;
    }
  }catch(e){}
  return null;
}
/* Saved teams. 6×6 and 4×4 teams are separate lists; the active 6×6 team's data is `state`,
   the active 4×4 team's data is read through g4(). Older single-squad saves (KEY) are migrated
   once into the first team of each list and left in place untouched. */
const LIB_KEY = 'vb-compos-equipes-v1';
function blank6(){ return {example:false, positions:'flex', sets:3, mode:'balanced', midset:'off', setterLock:'lock', selected:null, players:[]}; }
function blank4(){ return {sets:3, mode:'twist', history:[], adj:{}, overrides:{}, players:[], noMB:true}; }
function norm6(s){
  if(!Array.isArray(s.players)) s.players = [];
  if(!s.positions) s.positions = 'flex';
  if(!MODE_W.hasOwnProperty(s.mode)) s.mode = 'balanced';
  if(!s.midset) s.midset = 'off';
  if(!s.setterLock) s.setterLock = 'lock';
  if(!s.sets) s.sets = 3;
  return s;
}
function loadLib(){
  try{
    const l = JSON.parse(localStorage.getItem(LIB_KEY));
    if(l && Array.isArray(l.t6) && l.t6.length && Array.isArray(l.t4) && l.t4.length){ l.t6.forEach(t => norm6(t.data)); return l; }
  }catch(e){}
  const s6 = load() || exampleState();
  const g = s6.g4 || null; delete s6.g4;
  const id6 = uid(), id4 = uid();
  return {cur6:id6, cur4:id4,
    t6:[{id:id6, name: s6.example ? 'Équipe exemple' : 'Mon équipe 6×6', data:s6}],
    t4:[{id:id4, name:'Mon équipe 4×4', data:g}]};     // data null = built from the 6×6 squad on first open
}
let lib = loadLib();
const team6 = () => lib.t6.find(t => t.id===lib.cur6) || lib.t6[0];
const team4 = () => lib.t4.find(t => t.id===lib.cur4) || lib.t4[0];
function save(){ try{ team6().data = state; localStorage.setItem(LIB_KEY, JSON.stringify(lib)); }catch(e){} }

let state = team6().data;
const tabs = {};
const views = {};

function displayName(p){ const i = state.players.indexOf(p); return (p.name||'').trim() || `Joueur ${i+1}`; }

/* ---------- score ---------- */
function roleCost(p, r){
  const prefs = p.pos;
  const i = prefs.indexOf(r);
  if(i >= 0) return i;                    // 1er choix 0, 2e 1, ...
  if(!prefs.length) return 2;             // joueur polyvalent
  if(prefs.every(x => x==='L')) return r==='L' ? 0 : 5;
  if(r==='S') return 6;                   // passer hors poste est le plus difficile
  if(r==='L') return 3.5;
  const hit = ['OH','OPP'];
  if(hit.includes(r) && prefs.some(x => hit.includes(x))) return 2.5;
  return 3.5;
}
/* prefCost: how well the role matches what the player announced (drives "hors poste").
   cost: prefCost adjusted by the coach's level for that role (1–5, unset counts as 3). */
function prefCost(p, role){
  if(state.positions==='strict' && p.pos.length && !p.pos.includes(role)) return Infinity;
  return roleCost(p, role);
}
const LV_W = {best:0.9, balanced:0.6, equal:0.35};
const lvOf = (p, role) => (p.lv && p.lv[role]) || 0;
function cost(p, role){
  const c = prefCost(p, role);
  const lv = lvOf(p, role);
  return lv ? c + (3 - lv) * (LV_W[state.mode] ?? 0.6) : c;
}
const anyLevels = list => list.some(p => p.lv && Object.keys(p.lv).length);
const fmtLv = v => v.toFixed(1).replace('.', ',');
function shortfall(c, pr){
  const need = {};
  c.slots.forEach(s => need[s.role] = (need[s.role]||0) + 1);
  const miss = [];
  for(const r of Object.keys(need)){
    const have = pr.filter(p => cost(p, r) < Infinity).length;
    if(have < need[r]){ const k = need[r]-have; miss.push(`${k} ${k>1 ? ROLE_PLURAL[r] : ROLE_NAME[r].toLowerCase()}`); }
  }
  return miss.length ? `Il manque ${miss.join(', ')}` : 'Pas assez de joueurs différents pour couvrir tous les postes';
}
const fitCat = c => c < 1 ? 'first' : c < 2.5 ? 'listed' : 'out';

/* affectation exacte à coût minimal : programmation dynamique sur les joueurs, masque des postes remplis (≤ 7) */
function assign(n, m, costFn){
  if(n < m) return null;
  const FULL = (1<<m) - 1;
  let dp = new Float64Array(1<<m).fill(Infinity); dp[0] = 0;
  const choice = [];
  for(let i=0;i<n;i++){
    const nd = new Float64Array(1<<m).fill(Infinity);
    const ch = new Int8Array(1<<m).fill(-2);
    for(let mask=0; mask<=FULL; mask++){
      const v = dp[mask]; if(v===Infinity) continue;
      if(v < nd[mask]){ nd[mask] = v; ch[mask] = -1; }
      for(let s=0;s<m;s++){
        if(mask & (1<<s)) continue;
        const nm = mask | (1<<s), c = v + costFn(i,s);
        if(c < nd[nm] - 1e-9){ nd[nm] = c; ch[nm] = s; }
      }
    }
    choice.push(ch); dp = nd;
  }
  const map = new Array(m).fill(-1); let mask = FULL;
  for(let i=n-1;i>=0;i--){ const s = choice[i][mask]; if(s >= 0){ map[s] = i; mask ^= (1<<s); } }
  return {total: dp[FULL], map};
}

function present(){ return state.players.filter(p => p.present); }

function getConfigs(){
  const pr = present();
  return FORMATIONS.map(([id, lib]) => {
    const sys = SYSTEMS.find(s => s.id===id);
    const slots = sys.slots.map(([role,pos]) => ({role,pos}));
    if(lib) slots.push({role:'L', pos:'L'});
    let best = assign(pr.length, slots.length, (i,s) => cost(pr[i], slots[s].role));
    let blocked = '';
    if(best && !isFinite(best.total)){ blocked = shortfall({slots}, pr); best = null; }
    return {key: sys.id + (lib?'+L':''), sys, lib, slots, best, blocked, size: slots.length};
  });
}

/* Plan set by set. With mid-set swaps, each set has two halves: a bench player can take
   the exact rotation spot of an on-court player at the halfway point (one change per spot).
   The libero stays; the setter stays too unless the user unlocks it.
   `played` counts sets, or half-sets when mid-set swaps are on. */
function buildPlan(c, pr){
  const w = MODE_W[state.mode] ?? 0;
  const half = state.midset==='on';
  const unit = half ? 2 : 1;
  const m = c.slots.length;
  const played = pr.map(() => 0);
  const sets = [];
  const jit = (i,k) => w ? 0.001*((i*7 + k*5) % pr.length) : 0;
  const idx = id => pr.findIndex(p => p.id===id);
  for(let k=0;k<state.sets;k++){
    const pin = pinsOf(c.key, k);
    const pS = {}, pE = {};
    Object.entries(pin.start || {}).forEach(([s,id]) => { const i = idx(id); if(i >= 0) pS[s] = i; });
    Object.entries(pin.end || {}).forEach(([s,id]) => { const i = idx(id); if(i >= 0) pE[s] = i; });
    const base = (i,s) => cost(pr[i], c.slots[s].role) + w*played[i]/unit + jit(i,k);
    let r = assign(pr.length, m, (i,s) => s in pS ? (pS[s]===i ? 0 : Infinity) : base(i,s));
    let pinError = false;
    if(!isFinite(r.total)){ pinError = true; r = assign(pr.length, m, base); Object.keys(pE).forEach(x => delete pE[x]); }
    r.map.forEach(i => played[i]++);
    if(!half){ sets.push({start:r.map, end:null, swaps:[], pinError, pinned:{start:pS, end:{}}}); continue; }

    const onA = new Set(r.map);
    const cand = [...r.map.map((pi,s) => ({pi, own:s})), ...pr.map((_,i) => i).filter(i => !onA.has(i)).map(pi => ({pi, own:-1}))];
    const locked = sl => sl.role==='L' || (sl.role==='S' && state.setterLock!=='free');
    const SWAP = 0.6;
    const endCost = (j,s) => {
      const cd = cand[j], sl = c.slots[s];
      if(s in pE) return (cd.pi===pE[s] && (cd.own===s || cd.own<0)) ? 0 : Infinity;
      if(cd.own >= 0) return cd.own===s ? cost(pr[cd.pi], sl.role) + w*played[cd.pi]/unit : Infinity;
      if(locked(sl)) return Infinity;
      return cost(pr[cd.pi], sl.role) + w*played[cd.pi]/unit + SWAP + jit(cd.pi,k);
    };
    let r2 = assign(cand.length, m, endCost);
    if(!isFinite(r2.total)){ pinError = true; Object.keys(pE).forEach(x => delete pE[x]); r2 = assign(cand.length, m, endCost); }
    const end = r2.map.map(j => cand[j].pi);
    end.forEach(i => played[i]++);
    const swaps = end.map((pi,s) => pi!==r.map[s] ? {s, out:r.map[s], in:pi} : null).filter(Boolean);
    sets.push({start:r.map, end, swaps, pinError, pinned:{start:pS, end:pE}});
  }
  return {sets, played, half};
}
function pinsOf(key, k){ return (state.pins && state.pins[key] && state.pins[key][k]) || {}; }
const edits = {};                    // which lineup cards have the "Modifier les joueurs" editor open
const swapPoints = k => (state.sets===5 && k===4) ? 8 : 13;

/* ---------- affichage : effectif ---------- */
let rosterMode = 'pos';                // 'pos' = preferred positions, 'lv' = coach's levels
function lvEditor(p, keys, labels, colors, nameFn){
  return keys.map(r => {
    const lv = (p.lv && p.lv[r]) || 0;
    const dots = [1,2,3,4,5].map(n => `<button class="lvdot${n<=lv?' on':''}" data-action="lv" data-role="${r}" data-n="${n}" aria-label="${nameFn(r)} niveau ${n}${n===lv?' (touchez pour effacer)':''}" aria-pressed="${n===lv}"></button>`).join('');
    return `<span class="lvbox" style="--c:${colors(r)}"><b>${labels[r]}</b><span class="lvdots">${dots}</span><span class="lvnum">${lv || '–'}</span></span>`;
  }).join('');
}
function rowHTML(p, i){
  const chips = rosterMode==='lv'
    ? lvEditor(p, ROLE_KEYS, LAB, r => `var(--r-${({S:'s',OH:'oh',MB:'mb',OPP:'opp',L:'l'})[r]})`, r => ROLE_NAME[r])
    : ROLE_KEYS.map(r => {
    const rank = p.pos.indexOf(r);
    return `<button class="chip c-${r}" data-action="pos" data-role="${r}" aria-pressed="${rank>=0}" title="${ROLE_NAME[r]}">${LAB[r]}${rank>=0?`<sup>${rank+1}</sup>`:''}</button>`;
  }).join('');
  return `<li class="row ${p.present?'':'is-absent'}" data-id="${p.id}">
    <button class="here" data-action="present" aria-pressed="${p.present}" aria-label="${p.present?'Présent':'Absent'}${NB}: changer">${p.present?'Présent':'Absent'}</button>
    <input class="name" id="name-${p.id}" value="${esc(p.name)}" placeholder="Joueur ${i+1}" aria-label="Nom du joueur" autocomplete="off">
    <button class="del" data-action="remove" aria-label="Retirer ${esc(displayName(p))}">×</button>
    <div class="chips" role="group" aria-label="${rosterMode==='lv' ? 'Niveaux par poste' : 'Postes préférés'}">${chips}</div>
  </li>`;
}
const LV_HINT = 'Niveau de 1 (débutant) à 5 (confirmé) à chaque poste, donné par l’entraîneur. Touchez un point pour choisir, le même point pour effacer. Sans niveau, le joueur compte comme 3. Le niveau départage les joueurs : il pèse plus en «\u00a0Six meilleurs\u00a0» qu’en «\u00a0Temps de jeu égal\u00a0».';
const POSPREF_HINT = 'Touchez les postes par ordre de préférence\u00a0: le petit chiffre indique le rang. Un joueur sans poste peut jouer partout.';
function renderRoster(){
  document.querySelectorAll('[data-action="rmode"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val===rosterMode)));
  $('#roster-hint').textContent = rosterMode==='lv' ? LV_HINT : POSPREF_HINT;
  const ul = $('#roster');
  ul.innerHTML = state.players.length
    ? state.players.map(rowHTML).join('')
    : `<li class="empty">Aucun joueur pour l’instant. Utilisez le bouton + ou «${NB}Ajouter un joueur${NB}».</li>`;
  $('#size-out').textContent = state.players.length;
  $('#total-count').textContent = state.players.length;
  $('#present-count').textContent = present().length;
  $('#example-note').hidden = !state.example;
}
function renderSettings(){
  document.querySelectorAll('[data-action="set"]').forEach(b => b.setAttribute('aria-pressed', String(state[b.dataset.key]===b.dataset.val)));
  $('#sets-out').textContent = state.sets;
  $('#mode-hint').textContent = MODE_HINT[state.mode];
  $('#pos-hint').textContent = POS_HINT[state.positions];
  $('#lock-row').hidden = state.midset!=='on';
  $('#mid-hint').textContent = state.midset==='on'
    ? `À mi-set (vers 13 points, 8 au 5e set), un remplaçant prend la place exacte d’un joueur dans la rotation. Le libéro reste en place.${state.mode==='best' ? ' Choisissez « Équilibrée » ou « Temps de jeu égal » pour que des changements soient proposés.' : ''}`
    : 'Les changements se font seulement entre les sets.';
}

/* ---------- affichage : formations ---------- */
const roleLabel = r => LAB[r] || r;

function fitChips(c, pr, r){
  const counts = {first:0, listed:0, out:0};
  c.slots.forEach((sl,s) => { counts[fitCat(prefCost(pr[r.map[s]], sl.role))]++; });
  let h = '';
  if(counts.first) h += `<span class="fit good">${counts.first} au 1er choix</span>`;
  if(counts.listed) h += `<span class="fit ok">${counts.listed} à un autre choix</span>`;
  if(counts.out) h += `<span class="fit bad">${counts.out} hors poste</span>`;
  return h;
}

function resolveSelected(configs){
  if(Array.isArray(state.selected) && state.selected.length===1 && state.selected[0]==='__none__') return [];
  const valid = configs.filter(c => c.best);
  const keys = new Set(configs.map(c => c.key));
  let sel = Array.isArray(state.selected) ? state.selected.slice() : null;
  if(sel){
    sel = sel.map(k => keys.has(k) ? k : (keys.has(k.replace('+L','')) ? k.replace('+L','') : (keys.has(k+'+L') ? k+'+L' : null)))
             .filter((k,i,a) => k && a.indexOf(k)===i);
  }
  if(!sel || !sel.length){
    const ranked = valid.slice().sort((a,b) => a.best.total - b.best.total);
    sel = ranked.length ? [ranked[0].key] : [];
  }
  return sel;
}

function renderResults(){
  const pr = present();
  const configs = getConfigs();
  const ranked = configs.filter(c => c.best).sort((a,b) => a.best.total - b.best.total);
  const bestKey = ranked[0]?.key;
  const sel = resolveSelected(configs);

  const minNeeded = Math.min(...configs.map(c => c.size));
  const st = $('#status');
  if(pr.length < minNeeded){
    st.className = 'status warn';
    st.textContent = `Marquez au moins ${minNeeded} joueurs présents pour créer une compo. Pour l’instant${NB}: ${plural(pr.length, 'présent', 'présents')}.`;
  } else {
    st.className = 'status';
    st.textContent = state.positions==='strict'
      ? `${plural(pr.length, 'joueur présent', 'joueurs présents')}. Personne n’est placé hors des postes annoncés.`
      : `${plural(pr.length, 'joueur présent', 'joueurs présents')}. Chaque formation respecte au mieux les préférences de chacun.`;
  }

  $('#cards').innerHTML = configs.map(c => {
    const on = sel.includes(c.key) && !!c.best;
    const benchN = pr.length - c.size;
    const fit = c.best ? fitChips(c, pr, c.best) : '';
    const bench = c.best
      ? `<span class="fit plain">${benchN} sur le banc</span>`
      : `<span class="fit bad">${c.blocked || `Il manque ${plural(c.size - pr.length, 'joueur', 'joueurs')}`}</span>`;
    return `<button class="fcard ${on?'is-on':''}" data-action="pick" data-key="${c.key}" role="checkbox" aria-checked="${on}" ${c.best?'':'disabled'}>
      <span class="fcard-top"><span class="fname">${c.sys.name}</span>${c.lib?'<span class="tag lib">+ Libéro</span>':''}${c.key===bestKey?'<span class="tag best">Meilleur choix</span>':''}</span>
      <span class="tick" aria-hidden="true"></span>
      <span class="fsize">${c.size} sur le terrain${c.lib?' · 6 + L':''}</span>
      <span class="fblurb">${c.sys.blurb}</span>
      <span class="ffit">${fit}${bench}</span>
    </button>`;
  }).join('');

  const chosen = configs.filter(c => c.best && sel.includes(c.key));
  $('#lineups').innerHTML = chosen.map(c => lineupHTML(c, pr)).join('');
}

function tokenHTML(p, slot, fresh, pinned){
  const out = fitCat(prefCost(p, slot.role))==='out';
  const lv = lvOf(p, slot.role);
  return `<div class="tok${fresh?' is-new':''}${pinned?' is-pinned':''}" data-fit="${out?'out':'ok'}">
    <span class="jersey c-${slot.role}">${slot.pos}</span>
    <span class="tok-name">${esc(displayName(p))}</span>
    <span class="tok-role">${COURT_NAME[slot.role]}${lv ? ` · niv. ${lv}` : ''}</span>
    ${out?'<span class="tok-flag">hors poste</span>':''}${fresh?'<span class="tok-new">entre</span>':''}
  </div>`;
}

function miniPrefs(p){
  if(!p.pos.length) return '<span class="mini"><b style="--c:var(--r-any)">Tous</b></span>';
  return `<span class="mini">${p.pos.map(r => `<b class="c-${r}">${LAB[r]}</b>`).join('')}</span>`;
}

function bestSub(p, c, map, pr){
  let bestS = -1, bestC = Infinity;
  c.slots.forEach((sl,s) => {
    if(sl.role==='L' && !p.pos.includes('L')) return;
    const cc = cost(p, sl.role);
    if(cc < bestC - 1e-9){ bestC = cc; bestS = s; }
  });
  if(bestS < 0 || !isFinite(bestC)) return 'aucun poste correspondant dans cette formation';
  const sl = c.slots[bestS], occ = pr[map[bestS]];
  const where = sl.pos==='L' ? 'au poste de libéro' : `position ${sl.pos} · ${ROLE_NAME[sl.role].toLowerCase()}`;
  return `meilleur remplaçant de ${esc(displayName(occ))} (${where})`;
}

function lineupHTML(c, pr){
  const plan = buildPlan(c, pr);
  const k = Math.min(tabs[c.key] || 0, state.sets - 1);
  const st = plan.sets[k];
  const half = !!st.end;
  const view = half && views[c.key]==='end' ? 'end' : 'start';
  const map = view==='end' ? st.end : st.start;
  const onStart = new Set(st.start);
  const swappedIn = new Set(st.swaps.map(x => x.in));
  const bench = pr.map((_,i) => i).filter(i => !onStart.has(i));
  const N = i => esc(displayName(pr[i]));

  const tabBtns = plan.sets.map((_,i) =>
    `<button role="tab" aria-selected="${i===k}" data-action="tab" data-key="${c.key}" data-n="${i}" ${state.sets > 1 ? `data-drag="6" data-drop="6" aria-description="Glisser pour changer l’ordre des sets, ou Alt + flèche"` : ''}>${state.sets > 1 ? '<span class="grip" aria-hidden="true"></span>' : ''}Set ${i+1}</button>`).join('');

  const viewSeg = half ? `<div class="seg" role="group" aria-label="Moment du set">
      <button data-action="view" data-key="${c.key}" data-val="start" aria-pressed="${view==='start'}">Début du set</button>
      <button data-action="view" data-key="${c.key}" data-val="end" aria-pressed="${view==='end'}">Après le changement</button>
    </div>` : '';

  const fullPin = Object.keys(st.pinned.start).length === c.slots.length;
  const cells = [4,3,2,5,6,1].map(pos => {
    const s = c.slots.findIndex(x => x.pos===pos);
    const fresh = view==='end' && st.swaps.some(x => x.s===s);
    const pinned = !fullPin && (view==='end' ? (s in st.pinned.end) : (s in st.pinned.start));
    return `<div class="cell">${tokenHTML(pr[map[s]], c.slots[s], fresh, pinned)}</div>`;
  }).join('');

  let lib = '';
  if(c.lib){
    const s = c.slots.findIndex(x => x.role==='L');
    const p = pr[map[s]];
    const out = fitCat(prefCost(p,'L'))==='out';
    lib = `<div class="libero">
      <span class="jersey c-L">L</span>
      <div><strong>${esc(displayName(p))}</strong>${out?' <span class="fit bad">hors poste</span>':''}
      <p>Libéro, avec un maillot de couleur différente. Joue uniquement à l’arrière${NB}: remplace chaque central quand il passe en zone arrière.</p></div>
    </div>`;
  }

  let swapBlock = '';
  if(half){
    swapBlock = `<section class="bench"><h4>Changement à mi-set · vers ${swapPoints(k)} points</h4>${
      st.swaps.length ? `<ul class="blist">${st.swaps.map(x => {
        const sl = c.slots[x.s];
        return `<li><span class="who">${N(x.in)}</span><span class="swap-arrow" aria-hidden="true">⇄</span><span class="who out">${N(x.out)}</span><span class="what">position ${sl.pos} · ${ROLE_NAME[sl.role].toLowerCase()}</span></li>`;
      }).join('')}</ul><p class="foot">Le remplaçant prend exactement la place du joueur dans la rotation.</p>`
      : `<p class="sitting">Aucun changement à mi-set pour ce set.</p>`}</section>`;
  }

  const benchList = bench.length ? `<ul class="blist">${bench.map(b => {
    const p = pr[b];
    const what = swappedIn.has(b) ? 'entre à mi-set' : bestSub(p, c, st.start, pr);
    return `<li><span class="who">${N(b)}</span>${miniPrefs(p)}<span class="what">${what}</span></li>`;
  }).join('')}</ul>` : `<p class="sitting">Personne sur le banc pour ce set.</p>`;

  const libS = c.lib ? c.slots.findIndex(x => x.role==='L') : -1;
  const time = pr.map((p,i) => {
    const dots = plan.sets.map(s2 => {
      const parts = s2.end ? [s2.start, s2.end] : [s2.start];
      const cls = parts.map(mp => { const s = mp.indexOf(i); return s<0 ? '' : (s===libS ? 'lib' : 'on'); });
      return s2.end ? `<span class="pair"><i class="h ${cls[0]}"></i><i class="h ${cls[1]}"></i></span>` : `<i class="${cls[0]}"></i>`;
    }).join('');
    const n = plan.half ? plan.played[i]/2 : plan.played[i];
    return `<div class="trow"><span class="n">${esc(displayName(p))}</span><span class="dots" aria-label="${String(n).replace('.',',')} sets sur ${state.sets}">${dots}</span></div>`;
  }).join('');

  const sittingNames = bench.map(N).join(', ');

  let avg = '';
  if(anyLevels(state.players)){
    const vals = c.slots.map((sl,s) => lvOf(pr[map[s]], sl.role) || 3);
    avg = `<span class="fit plain">Niveau moyen ${fmtLv(vals.reduce((a,b) => a+b, 0) / vals.length)}</span>`;
  }

  const pinCount = Object.keys(st.pinned.start).length + Object.keys(st.pinned.end).length;
  let editor = '';
  if(edits[c.key]){
    const order = [1,2,3,4,5,6,...(c.lib ? ['L'] : [])];
    const rows = order.map(pos => {
      const s = c.slots.findIndex(x => x.pos===pos), sl = c.slots[s];
      const cur = map[s];
      const choices = view==='end'
        ? pr.map((_,i) => i).filter(i => i===st.start[s] || !onStart.has(i))
        : pr.map((_,i) => i);
      const opts = choices.map(i => `<option value="${pr[i].id}" ${i===cur?'selected':''}>${N(i)}${lvOf(pr[i], sl.role) ? ` (niv. ${lvOf(pr[i], sl.role)})` : ''}${fitCat(prefCost(pr[i], sl.role))==='out' ? ' · hors poste' : ''}</option>`).join('');
      const pinned = !fullPin && (view==='end' ? (s in st.pinned.end) : (s in st.pinned.start));
      return `<div class="ed-row">
        <span class="ed-tag c-${sl.role}">${pos==='L' ? 'L' : pos} · ${LAB[sl.role]}</span>
        <select id="ed-${c.key}-${k}-${view}-${s}" data-edit-key="${c.key}" data-set="${k}" data-view="${view}" data-slot="${s}" aria-label="${pos==='L' ? 'Libéro' : 'Position ' + pos} · ${ROLE_NAME[sl.role]}">${opts}</select>
        ${pinned ? '<span class="q4-pin">fixé</span>' : ''}
      </div>`;
    }).join('');
    editor = `<section class="editor">
      <h4>Modifier les joueurs · set ${k+1}${half ? (view==='end' ? ' · après le changement' : ' · début du set') : ''}</h4>
      <p class="foot">${view==='end' ? 'Après le changement, chaque place peut garder son titulaire ou recevoir un joueur du banc.' : 'Choisir un joueur déjà sur le terrain échange les deux places.'} Les sets suivants s’ajustent pour le temps de jeu.</p>
      ${st.pinError ? '<p class="status warn">Ce choix ne permet pas de remplir toutes les places en respectant les postes annoncés : il a été ignoré.</p>' : ''}
      <div class="ed-grid">${rows}</div>
      ${pinCount ? `<button class="btn ghost" data-action="unpin6" data-key="${c.key}" data-n="${k}">Revenir au choix auto pour ce set</button>` : ''}
    </section>`;
  }

  return `<article class="lineup" aria-label="${c.sys.name}${c.lib?' avec libéro':''}">
    <div class="lineup-head">
      <div class="t"><h3>${c.sys.name}</h3>${c.lib?'<span class="tag lib">+ Libéro</span>':''}</div>
      <div class="toolbar">
        <button class="btn" data-action="rot-open" data-key="${c.key}">Rotations</button>
        <button class="btn" data-action="copy" data-key="${c.key}">Copier en texte</button>
      </div>
    </div>
    <div class="set-row">
      <div class="tabs" role="tablist" aria-label="Sets">${tabBtns}</div>
      ${state.sets > 1 ? `<span class="drag-hint">Glissez un set pour changer l’ordre</span>` : ''}
    </div>
    ${bench.length ? `<p class="sitting">Sur le banc au début du set ${k+1}${NB}: <strong>${sittingNames}</strong></p>` : ''}
    <div class="lineup-tools">${viewSeg}<button class="btn${edits[c.key] ? ' primary' : ''}" data-action="edit6" data-key="${c.key}" aria-pressed="${!!edits[c.key]}">Modifier les joueurs${fullPin ? ' · set fixé' : pinCount ? ` · ${pinCount} fixé${pinCount>1?'s':''}` : ''}</button>${avg}</div>
    <div class="court-wrap">
      <div class="net-label"><span>Filet</span><span>Adversaires en face</span></div>
      <div class="net" aria-hidden="true"></div>
      <div class="court">
        <div class="attack" aria-hidden="true"><span>3 m</span></div>
        <div class="cgrid">${cells}</div>
      </div>
      <p class="court-cap">Votre demi-terrain (9 × 9 m). Positions de départ du set. La position 1 sert en premier. À chaque reprise de service, tournez dans le sens des aiguilles d’une montre${NB}: 2 → 1 → 6 → 5 → 4 → 3.</p>
    </div>
    ${editor}
    ${lib}
    ${swapBlock}
    <section class="bench"><h4>Banc · set ${k+1}</h4>${benchList}</section>
    <section class="time"><h4>Temps de jeu${plan.half ? ' par demi-set' : ' par set'}${c.lib?' (orange = en libéro)':''}</h4><div class="tgrid">${time}</div></section>
    <div class="copy-slot" data-key="${c.key}"></div>
  </article>`;
}

function lineupText(c, pr){
  const plan = buildPlan(c, pr);
  const lines = [`${c.sys.name}${c.lib?' + libéro':''} (${plural(pr.length, 'joueur', 'joueurs')})`];
  plan.sets.forEach((st,k) => {
    lines.push('', `Set ${k+1}`);
    [1,2,3,4,5,6].forEach(pos => {
      const s = c.slots.findIndex(x => x.pos===pos);
      lines.push(`  ${pos}  ${roleLabel(c.slots[s].role).padEnd(3)} ${displayName(pr[st.start[s]])}`);
    });
    if(c.lib){ const s = c.slots.findIndex(x => x.role==='L'); lines.push(`  L  Libéro ${displayName(pr[st.start[s]])}`); }
    if(st.end){
      if(st.swaps.length){
        lines.push(`  À mi-set (vers ${swapPoints(k)} points) :`);
        st.swaps.forEach(x => lines.push(`    ${displayName(pr[x.in])} remplace ${displayName(pr[x.out])} (position ${c.slots[x.s].pos})`));
      } else lines.push('  À mi-set : pas de changement');
    }
    const on = new Set(st.start);
    const b = pr.filter((_,i) => !on.has(i)).map(displayName);
    lines.push(`  Banc au début : ${b.length ? b.join(', ') : 'personne'}`);
  });
  return lines.join('\n');
}

/* ---------- effectif en texte ---------- */
const POS_WORDS = {
  P:'S', PASSEUR:'S', PASSEUSE:'S', PASSE:'S', S:'S', SETTER:'S',
  R4:'OH', RA:'OH', RECEPTIONNEUR:'OH', RECEPTIONNEUSE:'OH', 'RECEPTIONNEUR-ATTAQUANT':'OH', 'RECEPTIONNEUSE-ATTAQUANTE':'OH', OH:'OH', OUTSIDE:'OH',
  C:'MB', CENTRAL:'MB', CENTRALE:'MB', CENTRE:'MB', MB:'MB', MIDDLE:'MB',
  PT:'OPP', POINTU:'OPP', POINTUE:'OPP', OPP:'OPP', OPPOSITE:'OPP',
  L:'L', LIBERO:'L'
};
const POS4_WORDS = {'4':'A4', A4:'A4', '2':'A2', A2:'A2', ARR:'AR', ARRIERE:'AR', AR:'AR', DEF:'AR', P:'P4', PASSEUR:'P4', PASSEUSE:'P4'};
const lvText = (p, keys, labels) => {
  const parts = keys.filter(r => p.lv && p.lv[r]).map(r => `${labels[r]} ${p.lv[r]}`);
  return parts.length ? ` · niveaux : ${parts.join(', ')}` : '';
};
/* "niveaux : P 4, Pt 3" → {S:4, OPP:3}; returns the line without that part */
function splitLevels(line, words){
  const m = line.match(/·?\s*niveaux?\s*:?(.*)$/i);
  if(!m) return {line, lv: undefined};
  const lv = {};
  m[1].split(/[,;]/).forEach(part => {
    const mm = part.trim().match(/^(.+?)\s*[=:]?\s*([1-5])$/);
    if(!mm) return;
    const r = words[mm[1].trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()];
    if(r) lv[r] = +mm[2];
  });
  return {line: line.slice(0, m.index).trim(), lv};
}
function squadText(){
  return state.players.map(p => `${displayName(p)} : ${p.pos.map(r => LAB[r]).join(', ')}${lvText(p, ROLE_KEYS, LAB)}${p.present ? '' : ' (absent)'}`).join('\n');
}
function parseSquad(text){
  const awayRe = /\((away|absente?)\)/ig;
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const away = /\((away|absente?)\)/i.test(line);
    line = line.replace(awayRe, '').trim();
    const sl = splitLevels(line, POS_WORDS); line = sl.line;
    let pos4 = undefined;
    const bar = line.indexOf('|');
    if(bar >= 0){
      pos4 = [];
      line.slice(bar + 1).replace(/^\s*4\s*[x×]\s*4\s*:?/i, '').split(/[\s,;\/]+/).forEach(w => {
        const k = POS4_WORDS[w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()];
        if(k && !pos4.includes(k)) pos4.push(k);
      });
      line = line.slice(0, bar).trim();
    }
    const ci = line.indexOf(':');
    const name = (ci >= 0 ? line.slice(0, ci) : line).trim();
    const raw = ci >= 0 ? line.slice(ci + 1) : '';
    const pos = [];
    raw.split(/[\s,;\/]+/).forEach(w => {
      const k = w.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
      const r = POS_WORDS[k];
      if(r && !pos.includes(r)) pos.push(r);
    });
    const pl = {id: uid(), name, pos, present: !away}; if(pos4) pl.pos4 = pos4; if(sl.lv) pl.lv = sl.lv; return pl;
  }).filter(p => p.name);
}

/* ---------- aide-mémoire des rotations ----------
   Positions taken from js/vbRotations.js in rotazionivolley by Maurizio Napolitano
   (https://github.com/napo/rotazionivolley, commit a4285e7, January 2019, then licensed under
   Apache-2.0), itself based on VBRotations by Andy Edwards (https://github.com/monkeysppp/VBRotations,
   Apache-2.0). Napolitano corrected 25 of the 180 positions (serve-receive P1–P5 and attack
   approaches); the other 155 are unchanged from VBRotations. See LICENCES/SOURCES-rotations.md.
   Licensed under the Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
   Changes made here: kept as data in centimetres-at-50px/m, French labels, libero swap for the back-row
   middle, 4-2 derived from the 5-1 rotation with the same front-row setter zone.
   Units: 50 px = 1 m; x 0 = left sideline (zones 4/5), y 0 = net. Keys "1".."6" = setter zone. */
const VB = {"base":{"1":{"s":[350,300],"h1":[350,50],"m1":[225,50],"o":[100,50],"h2":[100,300],"m2":[225,350]},"2":{"s":[350,50],"h1":[225,50],"m1":[100,50],"o":[100,300],"h2":[225,350],"m2":[350,300]},"3":{"s":[225,50],"h1":[100,50],"m1":[100,300],"o":[225,350],"h2":[350,300],"m2":[350,50]},"4":{"s":[100,50],"h1":[100,300],"m1":[225,350],"o":[350,300],"h2":[350,50],"m2":[225,50]},"5":{"s":[100,300],"h1":[225,350],"m1":[350,300],"o":[350,50],"h2":[225,50],"m2":[100,50]},"6":{"s":[225,350],"h1":[350,300],"m1":[350,50],"o":[225,50],"h2":[100,50],"m2":[100,300]}},"serve":{"1":{"s":[350,475],"h1":[290,50],"m1":[225,50],"o":[160,50],"h2":[100,300],"m2":[225,350]},"2":{"s":[290,50],"h1":[225,50],"m1":[160,50],"o":[100,300],"h2":[225,350],"m2":[350,475]},"3":{"s":[225,50],"h1":[160,50],"m1":[100,300],"o":[225,350],"h2":[350,475],"m2":[290,50]},"4":{"s":[160,50],"h1":[100,300],"m1":[225,350],"o":[350,475],"h2":[290,50],"m2":[225,50]},"5":{"s":[100,300],"h1":[225,350],"m1":[350,475],"o":[290,50],"h2":[225,50],"m2":[160,50]},"6":{"s":[225,350],"h1":[350,475],"m1":[290,50],"o":[225,50],"h2":[160,50],"m2":[100,300]}},"switchServe":{"1":{"s":[350,300],"h1":[100,50],"m1":[225,50],"o":[350,50],"h2":[225,350],"m2":[100,300]},"2":{"s":[350,50],"h1":[100,50],"m1":[225,50],"o":[350,300],"h2":[225,350],"m2":[100,300]},"3":{"s":[350,50],"h1":[100,50],"m1":[100,300],"o":[350,300],"h2":[225,350],"m2":[225,50]},"4":{"s":[350,50],"h1":[225,350],"m1":[100,300],"o":[350,300],"h2":[100,50],"m2":[225,50]},"5":{"s":[350,300],"h1":[225,350],"m1":[100,300],"o":[350,50],"h2":[100,50],"m2":[225,50]},"6":{"s":[350,300],"h1":[225,350],"m1":[225,50],"o":[350,50],"h2":[100,50],"m2":[100,300]}},"receive":{"1":{"s":[400,385],"h1":[370,300],"m1":[240,140],"o":[50,150],"h2":[100,300],"m2":[230,330]},"2":{"s":[350,50],"h1":[100,300],"m1":[20,80],"o":[130,380],"h2":[225,350],"m2":[350,300]},"3":{"s":[300,50],"h1":[100,300],"m1":[225,350],"o":[300,380],"h2":[350,300],"m2":[370,100]},"4":{"s":[30,30],"h1":[225,350],"m1":[350,300],"o":[380,380],"h2":[100,300],"m2":[70,70]},"5":{"s":[120,140],"h1":[225,350],"m1":[350,300],"o":[420,50],"h2":[100,300],"m2":[70,50]},"6":{"s":[255,85],"h1":[350,300],"m1":[350,70],"o":[280,30],"h2":[100,300],"m2":[225,350]}},"set":{"1":{"s":[300,50],"h1":[450,150],"m1":[225,150],"o":[0,150],"h2":[225,350],"m2":[125,300]},"2":{"s":[300,50],"h1":[0,150],"m1":[225,150],"o":[400,250],"h2":[225,300],"m2":[100,250]},"3":{"s":[300,50],"h1":[0,150],"m1":[125,300],"o":[400,250],"h2":[225,280],"m2":[225,150]},"4":{"s":[300,50],"h1":[225,250],"m1":[150,300],"o":[400,250],"h2":[0,150],"m2":[225,150]},"5":{"s":[300,50],"h1":[225,350],"m1":[100,250],"o":[450,150],"h2":[0,150],"m2":[225,150]},"6":{"s":[300,50],"h1":[225,250],"m1":[225,150],"o":[450,150],"h2":[0,150],"m2":[150,250]}}};
const VB_IDS = ['s','h1','m1','o','h2','m2'];      // slot order = zones 1..6 when the setter is in 1
const ROT = {sys:'5-1', lib:true, phase:'recv', t:0, names:null, namesSys:null, namesLib:false, src:''};
const BASE_ROLES = {'5-1':['S','OH','MB','OPP','OH','MB'], '4-2':['S','OH','MB','S','OH','MB']};
const isFront = z => z>=2 && z<=4;
const zoneOf = (slot,t) => (((slot - t) % 6) + 6) % 6 + 1;
const ROLE_COLOR = {S:'var(--r-s)', OH:'var(--r-oh)', MB:'var(--r-mb)', OPP:'var(--r-opp)', L:'var(--r-l)'};
const PHASE_DATA = {serve:['serve','switchServe'], recv:['receive','set'], atk:['set',null], def:['switchServe',null]};

function rotLayout(sys, lib, phase, t){
  /* 5-1: data key = setter zone. 4-2: same ring structure as the 5-1 rotation whose setter
     sits in the front-row setter's zone, so players are matched zone by zone. */
  const key = sys==='5-1' ? zoneOf(0,t) : [0,3].map(sl => zoneOf(sl,t)).find(isFront);
  const tk = [0,1,2,3,4,5].find(x => zoneOf(0,x)===key);
  const idAtZone = {};
  VB_IDS.forEach((id,i) => idAtZone[zoneOf(i,tk)] = id);
  const [from, to] = PHASE_DATA[phase];
  const pt = (ph, id) => { const v = VB[ph][key][id]; return [v[0]/50, v[1]/50]; };

  const ps = BASE_ROLES[sys].map((role,slot) => {
    const zone = zoneOf(slot,t), front = isFront(zone), id = idAtZone[zone];
    let kind;
    if(role==='S') kind = (sys==='5-1' || front) ? 'setter' : 'rb';
    else if(role==='OPP') kind = front ? 'rf' : 'rb';
    else if(role==='OH') kind = front ? 'ohf' : 'ohb';
    else kind = front ? 'mbf' : 'mbb';
    return {slot, nameIdx:slot, role, zone, front, kind, label:LAB[role], s:pt(from,id), d: to ? pt(to,id) : null};
  });
  const server = ps.find(p => p.zone===1);
  let liberoOff = false;
  if(lib){
    const mbb = ps.find(p => p.kind==='mbb');
    if(phase==='serve' && mbb===server) liberoOff = true;
    else { mbb.role = 'L'; mbb.kind = 'lib'; mbb.label = 'L'; mbb.nameIdx = 6; }
  }
  return {ps, server, liberoOff};
}

function rotTabs(){
  return [0,1,2,3,4,5].map(t => {
    const sz = zoneOf(BASE_ROLES[ROT.sys].indexOf('S'), t);
    let lab;
    if(ROT.sys==='5-1') lab = `P en ${sz}`;
    else { const front = [0,3].map(sl => zoneOf(sl,t)).find(isFront); lab = `P avant en ${front}`; }
    return `<button role="tab" aria-selected="${t===ROT.t}" data-action="rot-t" data-n="${t}"><b>Rot. ${t+1}</b> ${lab}</button>`;
  }).join('');
}

/* The court is built once; each player keeps the same circle (keyed by rotation slot) and
   glides to its new spot when the phase, rotation, system or libero setting changes. */
function rotBuild(){
  let g = '';
  g += `<rect x="-1" y="-0.35" width="11" height="11.2" class="sv-free"/>`;
  g += `<rect x="0" y="0" width="9" height="9" class="sv-court"/>`;
  g += `<line x1="0" y1="3" x2="9" y2="3" class="sv-line"/>`;
  g += `<text x="8.9" y="2.82" class="sv-small" text-anchor="end">3 m</text>`;
  [[4,1.5,1.5],[3,4.5,1.5],[2,7.5,1.5],[5,1.5,6],[6,4.5,6],[1,7.5,6]].forEach(([z,x,y]) =>
    g += `<text x="${x}" y="${y+0.45}" class="sv-zone" text-anchor="middle">${z}</text>`);
  g += `<rect x="-0.6" y="-0.2" width="10.2" height="0.2" class="sv-net"/>`;
  g += `<text x="4.5" y="-0.55" class="sv-small sv-strong" text-anchor="middle">FILET</text>`;
  g += `<text id="rot-serve-l" x="6.5" y="9.8" class="sv-small" text-anchor="end">service →</text>`;
  g += `<g id="rot-arrows"></g><g id="rot-players">`;
  for(let i=0;i<6;i++) g += `<g class="sv-tok" data-slot="${i}">
      <circle r="0.44" class="sv-disc"/>
      <text y="0.12" text-anchor="middle" class="sv-lab"></text>
      <circle cx="0.38" cy="-0.36" r="0.19" class="sv-zb"/>
      <text x="0.38" y="-0.28" text-anchor="middle" class="sv-zt"></text>
      <text y="0.8" text-anchor="middle" class="sv-name"></text>
    </g>`;
  g += `</g>`;
  const markers = `<marker id="rot-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="sv-head"/></marker>`;
  $('#rot-court').innerHTML = `<svg viewBox="-1 -1 11 11.8" class="rot-svg is-still" role="img"><defs>${markers}</defs>${g}</svg>`;
}
function rotSVG(){
  const lay = rotLayout(ROT.sys, ROT.lib, ROT.phase, ROT.t);
  const {ps} = lay;
  if(!$('#rot-court svg')) rotBuild();
  const svg = $('#rot-court svg');
  const useNames = ROT.names && ROT.namesSys===ROT.sys;
  const nameOf = p => {
    if(!useNames) return '';
    if(p.nameIdx===6) return ROT.namesLib ? ROT.names[6] : 'Libéro';
    return ROT.names[p.nameIdx] || '';
  };
  svg.setAttribute('aria-label', `Placement ${ROT.sys}, ${phaseName()}, rotation ${ROT.t+1}`);
  $('#rot-serve-l').style.display = ROT.phase==='serve' ? '' : 'none';
  ps.forEach(p => {
    const tok = svg.querySelector(`.sv-tok[data-slot="${p.slot}"]`);
    const [x,y] = p.s;
    tok.style.transform = `translate(${x}px, ${y}px)`;
    tok.querySelector('.sv-disc').style.fill = ROLE_COLOR[p.role];
    tok.querySelector('.sv-lab').textContent = p.label;
    tok.querySelector('.sv-zt').textContent = p.zone;
    const nm = nameOf(p);
    tok.querySelector('.sv-name').textContent = nm.length > 11 ? nm.slice(0,10)+'…' : nm;
  });
  // arrows appear once the players have arrived
  let a = '';
  ps.forEach(p => {
    if(!p.d) return;
    const [x1,y1] = p.s, [x2,y2] = p.d;
    const L = Math.hypot(x2-x1, y2-y1); if(L < 0.6) return;
    const ux = (x2-x1)/L, uy = (y2-y1)/L;
    a += `<circle cx="${x2}" cy="${y2}" r="0.3" class="sv-ghost"/>`;
    a += `<line x1="${(x1+ux*0.48).toFixed(2)}" y1="${(y1+uy*0.48).toFixed(2)}" x2="${(x2-ux*0.4).toFixed(2)}" y2="${(y2-uy*0.4).toFixed(2)}" class="sv-arrow" marker-end="url(#rot-ah)"/>`;
  });
  $('#rot-arrows').innerHTML = a;
  if(svg.classList.contains('is-still')) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('is-still')));
  return lay;
}
const phaseName = () => ({serve:'service', recv:'réception', atk:'attaque', def:'défense'})[ROT.phase];

function rotNotes(ps, server, liberoOff){
  const out = [];
  const setterFront = ps.some(p => p.kind==='setter' && p.front);
  if(ROT.phase==='serve'){
    out.push(`Le joueur en position 1 (${server.label}${ROT.names && ROT.namesSys===ROT.sys ? ', ' + esc(ROT.names[server.nameIdx]||'') : ''}) sert. Jusqu’à la frappe du service, tout le monde respecte l’ordre de rotation. Ensuite chacun rejoint son poste de défense (flèches).`);
  } else if(ROT.phase==='recv'){
    out.push(`Trois réceptionneurs${NB}: les deux R4 et ${ROT.lib ? 'le libéro' : 'le central arrière'}. Chaque R4 réceptionne du côté où il va attaquer. Le passeur et les joueurs qui ne réceptionnent pas se regroupent pour libérer la zone de réception. Pendant la réception, chacun rejoint son point de départ d’élan pour attaquer (flèches), et le passeur va à la cible.`);
    out.push(`Placements conformes aux chevauchements${NB}: à l’avant 4-3-2 de gauche à droite, à l’arrière 5-6-1, chaque arrière derrière son avant (4/5, 3/6, 2/1). Les petits numéros sont les positions de rotation.`);
  } else if(ROT.phase==='atk'){
    out.push(`Position d’attaque${NB}: chaque attaquant est à son point de départ d’élan, les arrières derrière la ligne des 3 m, et le passeur à la cible. Les joueurs qui n’attaquent pas se rapprochent pour couvrir l’attaquant.`);
  } else {
    out.push(`Défense de base après permutation${NB}: au filet, R4 à gauche, central au centre, ${ROT.sys==='4-2' ? 'passeur avant' : (setterFront ? 'passeur' : 'pointu')} à droite. Derrière, ${ROT.lib ? 'libéro' : 'central'} en 5, R4 arrière en 6, ${ROT.sys==='4-2' ? 'passeur arrière' : (setterFront ? 'pointu' : 'passeur')} en 1.`);
  }
  if(ROT.sys==='5-1') out.push(setterFront ? 'Passeur à l’avant&nbsp;: seulement deux attaquants au filet (R4 et central), le pointu peut attaquer de l’arrière.' : 'Passeur à l’arrière&nbsp;: trois attaquants au filet.');
  else out.push('En 4-2, le passeur qui est à l’avant fait la passe. Le passeur arrière défend en 1.');
  if(ROT.lib) out.push(liberoOff ? 'Le central arrière est au service&nbsp;: il sert, et le libéro le remplace au prochain arrêt de jeu (selon votre règlement, le libéro peut parfois servir).' : 'Le libéro remplace le central qui est à l’arrière. Ses entrées et sorties ne comptent pas comme des changements.');
  return out.map(x => `<li>${x}</li>`).join('');
}

function renderRot(){
  document.querySelectorAll('#rot [data-action="rot-set"]').forEach(b => {
    const v = b.dataset.val, k = b.dataset.key;
    b.setAttribute('aria-pressed', String(k==='lib' ? String(ROT.lib)===v : ROT[k]===v));
  });
  $('#rot-tabs').innerHTML = rotTabs();
  const {ps, server, liberoOff} = rotSVG();
  $('#rot-notes').innerHTML = rotNotes(ps, server, liberoOff);
  $('#rot-play').textContent = rotTimer ? '■ Arrêter' : (ROT.phase==='serve' ? '▶ Enchaîner : service → défense' : '▶ Enchaîner : réception → attaque → défense');
  const nm = $('#rot-names');
  if(ROT.names && ROT.namesSys===ROT.sys){
    nm.innerHTML = `Noms de votre compo ${esc(ROT.src)}. <button class="btn ghost" data-action="rot-nonames">Afficher seulement les postes</button>`;
    nm.hidden = false;
  } else nm.hidden = true;
}

let rotTimer = null;
function stopRotPlay(){ if(rotTimer){ clearTimeout(rotTimer); rotTimer = null; } }
function playRot(){
  if(rotTimer){ stopRotPlay(); renderRot(); return; }
  const seq = ROT.phase==='serve' ? ['serve','def'] : ['recv','atk','def'];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const step = () => {
    ROT.phase = seq[i]; i++;
    rotTimer = i < seq.length ? setTimeout(step, reduce ? 1600 : 1900) : null;
    renderRot();
  };
  step();
}
let rotReturnFocus = null;
function openRot(c){
  if(c){
    const pr = present();
    const plan = buildPlan(c, pr);
    const k = Math.min(tabs[c.key] || 0, state.sets - 1);
    const map = plan.sets[k].start;
    const names = new Array(7).fill('');
    c.slots.forEach((sl,s) => { names[sl.pos==='L' ? 6 : sl.pos-1] = displayName(pr[map[s]]); });
    Object.assign(ROT, {sys:c.sys.id, lib:c.lib, names, namesSys:c.sys.id, namesLib:c.lib, src:`${c.sys.name}${c.lib?' + libéro':''}, départ du set ${k+1}`, t:0});
  }
  rotReturnFocus = document.activeElement;
  $('#rot').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#rot-court').innerHTML = '';
  renderRot();
  $('#rot-close').focus();
}
function closeRot(){
  stopRotPlay();
  $('#rot').hidden = true;
  document.body.style.overflow = '';
  if(rotReturnFocus && rotReturnFocus.focus) rotReturnFocus.focus();
}
document.addEventListener('keydown', e => { if(e.key!=='Escape') return; if(!$('#rot').hidden) closeRot(); else if(!$('#q4').hidden) closeQ4(); });

/* ---------- 4 contre 4 ----------
   Separate squad (active 4×4 team: players {id, name, pos4, present}), a plan for the next match and
   a history of validated matches. Balance uses absolute sets played: a player who missed
   matches is pushed to catch up. "Écart" = sets played minus the squad average. */
const Q4 = ['A4','P4','A2','AR'];                       // display order: 4, passeur, 2, arrière
const Q4_LAB = {A4:'4', A2:'2', AR:'Arr', P4:'P'};
const Q4_NAME = {A4:'Attaquant 4', A2:'Attaquant 2', AR:'Arrière', P4:'Passeur'};
const Q4_COLOR = {A4:'var(--r-oh)', A2:'var(--r-opp)', AR:'var(--r-l)', P4:'var(--r-s)'};
const Q4_KEYS = ['A4','A2','AR','P4'];                  // chip order in the roster
const Q4_FROM6 = {S:'P4', OH:'A4', OPP:'A2', L:'AR'};          // no central in 4×4
const Q4_FROM6_OLD = {S:'P4', OH:'A4', OPP:'A2', MB:'A2', L:'AR'};
const Q4_W = 3;                                         // weight of one set of imbalance
const Q4_MODE_HINT = {
  strict:'Chacun joue uniquement aux postes qu’il a choisis. Le temps de jeu est équilibré entre les joueurs de chaque poste.',
  twist:'Un joueur peut être placé hors de ses postes quand c’est le seul moyen de faire jouer ceux qui ont moins joué. Les postes hors préférence sont signalés.'
};
let q4ResetArmed = 0;

function derive4(pos, map){
  const out = [];
  pos.forEach(r => { const q = map[r]; if(q && !out.includes(q)) out.push(q); });
  return out;
}
/* true when a 4×4 list is exactly what the old automatic mapping produced (central → 2) */
const autoOld = (pos, pos4) => pos.includes('MB') && pos4.join() === derive4(pos, Q4_FROM6_OLD).join();
function from6(p){
  let pos4 = Array.isArray(p.pos4) ? p.pos4.slice() : [];
  if(!pos4.length || autoOld(p.pos, pos4)) pos4 = derive4(p.pos, Q4_FROM6);
  return {id: p.id, name: displayName(p), pos4, present: p.present};
}
function g4(){
  const t = team4();
  if(!t.data) t.data = {sets:3, mode:'twist', history:[], adj:{}, overrides:{}};
  const g = t.data;
  if(!g.history) g.history = []; if(!g.adj) g.adj = {}; if(!g.overrides) g.overrides = {};
  if(!g.sets) g.sets = 3; if(!g.mode) g.mode = 'twist';
  if(!Array.isArray(g.players)) g.players = state.players.map(from6);   // start from the 6×6 squad, same ids
  if(!g.noMB){                                                          // one-time: undo automatic central → 2
    g.players.forEach(q => {
      const p6 = state.players.find(x => x.id===q.id);
      if(p6 && autoOld(p6.pos, q.pos4 || [])) q.pos4 = derive4(p6.pos, Q4_FROM6);
    });
    g.noMB = true;
  }
  return g;
}
const q4Present = () => g4().players.filter(p => p.present);
const q4Name = p => (p.name||'').trim() || `Joueur ${g4().players.indexOf(p)+1}`;
const byId = id => g4().players.find(p => p.id===id);
const nameById = id => { const p = byId(id); return p ? q4Name(p) : 'Ancien joueur'; };
const half = v => Math.round(v * 2) / 2;
const fmtSets = v => String(half(v)).replace('.', ',');
/* set a player's total (in half-sets) by storing the difference with the validated matches */
function setPlayed(id, total){
  const g = g4();
  const now = (q4Totals()[id] || {played:0}).played;
  const fromHistory = now - (g.adj[id] || 0);
  const adj = half(Math.max(0, total) - fromHistory);
  if(adj) g.adj[id] = adj; else delete g.adj[id];
}
document.addEventListener('change', e => {
  if(!e.target.classList.contains('q4-num')) return;
  const id = e.target.id.slice(4);
  const v = parseFloat(e.target.value.replace(',', '.'));
  if(!isNaN(v)) setPlayed(id, v);
  save(); renderQ4();
  const again = document.getElementById(e.target.id); if(again){ again.focus(); again.select(); }
});
const fmtGap = v => (Math.abs(v) < 0.05 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ','));

function pref4(p, slot){
  const pr = p.pos4 || [];
  const i = pr.indexOf(slot);
  if(i >= 0) return i;
  if(!pr.length) return 1;
  if(g4().mode==='strict') return Infinity;
  return slot==='P4' ? 4 : 2.5;
}
function cost4(p, slot){
  const c = pref4(p, slot), lv = lvOf(p, slot);
  return lv ? c + (3 - lv) * 0.6 : c;
}
const fit4 = (p, slot) => { const c = pref4(p, slot); return c < 1 ? 'first' : c < 2.5 ? 'listed' : 'out'; };
let rosterMode4 = 'pos';

/* sets played per player id from validated matches (+ manual adjustments) */
function q4Totals(){
  const t = {};
  const get = id => t[id] || (t[id] = {played:0, off:0});
  g4().history.forEach(m => m.sets.forEach((set,k) => Q4.forEach((slot,s) => {
    const id = set[s]; if(!id) return;
    const e = get(id); e.played++;
    if(m.off && m.off.includes(`${k}:${s}`)) e.off++;
  })));
  Object.entries(g4().adj).forEach(([id,v]) => get(id).played += v);
  return t;
}

function buildPlan4(){
  const pr = q4Present();
  const g = g4();
  const tot = q4Totals();
  const n = pr.length;
  if(n < 4) return {pr, sets:[], blocked:`Il faut au moins 4 joueurs présents (${n} pour l’instant).`};
  const m = pr.map(p => (tot[p.id] || {played:0}).played);
  const base = Math.min(...m); for(let i=0;i<n;i++) m[i] -= base;
  const sets = [];
  for(let k=0;k<g.sets;k++){
    const pins = g.overrides[k] || {};
    const r = assign(n, 4, (i,s) => {
      const pin = pins[Q4[s]];
      if(pin && pr.some(p => p.id===pin)) return pr[i].id===pin ? 0 : Infinity;
      return cost4(pr[i], Q4[s]) + Q4_W*m[i] + 0.001*((i*7 + k*5) % n);
    });
    if(!r || !isFinite(r.total)) return {pr, sets, blocked: q4Shortfall(pr, pins)};
    r.map.forEach(i => m[i] += 1);
    sets.push(r.map.map(i => pr[i].id));
  }
  return {pr, sets, blocked:''};
}
function q4Shortfall(pr, pins){
  const miss = Q4.filter(s => !pins[s] && !pr.some(p => cost4(p,s) < Infinity)).map(s => Q4_NAME[s].toLowerCase());
  return miss.length ? `Personne ne joue ${miss.join(', ')} parmi les présents. Ajoutez ce poste à un joueur ou choisissez « Adapter pour le temps de jeu ».`
    : 'Impossible de remplir les 4 postes en respectant les postes choisis. Choisissez « Adapter pour le temps de jeu ».';
}

function renderQ4Roster(){
  const g = g4(), tot = q4Totals();
  const all = g.players;
  const avg = all.length ? all.reduce((a,p) => a + ((tot[p.id]||{}).played||0), 0) / all.length : 0;
  $('#q4-present').textContent = q4Present().length;
  $('#q4-total').textContent = all.length;
  $('#q4-size-out').textContent = all.length;
  $('#q4-roster').innerHTML = all.length ? all.map((p,i) => {
    const played = (tot[p.id]||{}).played || 0;
    const gap = played - avg;
    const chips = rosterMode4==='lv'
      ? lvEditor(p, Q4_KEYS, Q4_LAB, k => Q4_COLOR[k], k => Q4_NAME[k]).replace(/data-action="lv"/g, 'data-action="q4-lv"')
      : Q4_KEYS.map(k => {
      const rank = (p.pos4||[]).indexOf(k);
      return `<button class="chip" style="--c:${Q4_COLOR[k]}" data-action="q4-pos" data-role="${k}" aria-pressed="${rank>=0}" title="${Q4_NAME[k]}">${Q4_LAB[k]}${rank>=0?`<sup>${rank+1}</sup>`:''}</button>`;
    }).join('');
    return `<li class="q4-row ${p.present?'':'is-absent'}" data-q4id="${p.id}">
      <button class="here" data-action="q4-present" aria-pressed="${p.present}">${p.present?'Présent':'Absent'}</button>
      <input class="name q4-name-in" id="q4n-${p.id}" value="${esc(p.name)}" placeholder="Joueur ${i+1}" aria-label="Nom du joueur" autocomplete="off">
      <span class="q4-count">
        <button class="mini-btn" data-action="q4-adj" data-d="-0.5" aria-label="Un demi-set de moins pour ${esc(q4Name(p))}">−</button>
        <input class="q4-num" id="q4c-${p.id}" inputmode="decimal" value="${fmtSets(played)}" title="Sets joués (par demi-set)" aria-label="Sets joués par ${esc(q4Name(p))}" autocomplete="off">
        <button class="mini-btn" data-action="q4-adj" data-d="0.5" aria-label="Un demi-set de plus pour ${esc(q4Name(p))}">+</button>
        <span class="q4-gap ${gap < -0.5 ? 'neg' : gap > 0.5 ? 'pos' : ''}" title="Écart avec la moyenne de l’équipe">${fmtGap(gap)}</span>
      </span>
      <div class="chips" role="group" aria-label="Postes 4×4">${chips}<button class="del q4-del" data-action="q4-remove" aria-label="Retirer ${esc(q4Name(p))}">×</button></div>
    </li>`;
  }).join('') : `<li class="empty">Aucun joueur. Ajoutez-en ou reprenez l’effectif 6×6.</li>`;
  $('#q4-reset').hidden = !g.history.length && !Object.keys(g.adj).length;
  document.querySelectorAll('[data-action="q4-rmode"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val===rosterMode4)));
  $('#q4-roster-hint').textContent = rosterMode4==='lv'
    ? 'Niveau de 1 (débutant) à 5 (confirmé) à chaque poste, donné par l’entraîneur. Touchez un point pour choisir, le même point pour effacer. Sans niveau, le joueur compte comme 3. Le niveau départage les joueurs mais l’équilibre du temps de jeu reste prioritaire.'
    : 'Touchez les postes par ordre de préférence. «\u00a0Sets\u00a0» = sets joués sur tous les matchs validés, par demi-set (1, 1,5, 2…) : tapez une valeur ou utilisez −/+. «\u00a0Écart\u00a0» compare à la moyenne de l’équipe : un joueur qui a manqué des matchs joue davantage ensuite pour rattraper.';
}

function renderQ4Plan(){
  const g = g4();
  document.querySelectorAll('[data-action="q4-mode"]').forEach(b => b.setAttribute('aria-pressed', String(g.mode===b.dataset.val)));
  $('#q4-mode-hint').textContent = Q4_MODE_HINT[g.mode];
  $('#q4-sets-out').textContent = g.sets;
  $('#q4-matchno').textContent = g.history.length + 1;
  const plan = buildPlan4();
  const st = $('#q4-status');
  st.className = plan.blocked ? 'status warn' : 'status';
  st.textContent = plan.blocked || `${plan.pr.length} joueurs présents · ${plan.pr.length - 4} sur le banc à chaque set. Changez un nom pour forcer un choix : les sets suivants s’ajustent. Glissez un set par sa poignée pour changer l’ordre.`;
  $('#q4-validate').disabled = !!plan.blocked;
  const opts = (sel, slot) => plan.pr.map(p => `<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(q4Name(p))}${lvOf(p, slot) ? ` (niv. ${lvOf(p, slot)})` : ''}</option>`).join('');
  const showLv = anyLevels(g.players);
  $('#q4-plan').innerHTML = plan.sets.map((ids,k) => {
    const pins = g.overrides[k] || {};
    const bench = plan.pr.filter(p => !ids.includes(p.id)).map(p => esc(q4Name(p)));
    const rows = Q4.map((slot,s) => {
      const p = byId(ids[s]);
      const off = fit4(p, slot)==='out';
      return `<div class="q4-slot${off?' is-off':''}">
        <span class="q4-tag" style="--c:${Q4_COLOR[slot]}">${Q4_LAB[slot]}</span>
        <select id="q4-${k}-${slot}" data-q4set="${k}" data-slot="${slot}" aria-label="Set ${k+1}, ${Q4_NAME[slot]}">${opts(ids[s], slot)}</select>
        ${off?'<span class="q4-off">hors poste</span>':''}${pins[slot] && Object.keys(pins).length < 4 ?'<span class="q4-pin" title="Choix forcé">fixé</span>':''}
      </div>`;
    }).join('');
    return `<div class="q4-set" data-drop="4" data-n="${k}">
      <div class="q4-set-head"><span class="q4-move">${plan.sets.length > 1 ? `<button class="grip-btn" data-drag="4" data-n="${k}" aria-label="Déplacer le set ${k+1} : glisser, ou Alt + flèche"><span class="grip" aria-hidden="true"></span></button>` : ''}<strong>Set ${k+1}${showLv ? ` <span class="q4-avg">niv. moyen ${fmtLv(Q4.reduce((a,slot,s) => a + (lvOf(byId(ids[s]), slot) || 3), 0) / 4)}</span>` : ''}</strong></span>${Object.keys(pins).length?`<button class="btn ghost q4-unpin" data-action="q4-unpin" data-n="${k}">${Object.keys(pins).length===4 ? 'Set fixé · revenir à l’auto' : 'Revenir au choix auto'}</button>`:''}</div>
      ${rows}
      <p class="q4-bench">Banc${NB}: ${bench.length ? bench.join(', ') : 'personne'}</p>
    </div>`;
  }).join('');
}

function renderQ4History(){
  const h = g4().history;
  $('#q4-history').innerHTML = h.length ? `<ol class="q4-hist" reversed>${h.slice().reverse().map((m,ri) => {
    const i = h.length - 1 - ri;
    const d = new Date(m.date);
    const when = isNaN(d) ? '' : d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
    const sets = m.sets.map((ids,k) => `<li>Set ${k+1}${NB}: ${Q4.map((slot,s) => `${Q4_LAB[slot]} ${esc(nameById(ids[s]))}`).join(' · ')}</li>`).join('');
    return `<li><details><summary>Match ${i+1}${when ? ' · ' + when : ''} · ${m.sets.length} set${m.sets.length>1?'s':''} · ${m.present.length} présents</summary><ul>${sets}</ul></details></li>`;
  }).join('')}</ol>
  <div class="toolbar"><button class="btn ghost" data-action="q4-undo">Annuler le dernier match</button></div>`
  : `<p class="hint">Aucun match validé pour l’instant. Après chaque match, touchez « Valider ce match comme joué » : les sets comptent pour les matchs suivants.</p>`;
}

function renderQ4(){ if($('#q4').hidden) return; renderTeamBar('4'); renderQ4Roster(); renderQ4Plan(); renderQ4History(); }

function q4Text(){
  const plan = buildPlan4();
  const lines = [`4 contre 4 · match ${g4().history.length + 1}`];
  plan.sets.forEach((ids,k) => {
    lines.push('', `Set ${k+1}`);
    Q4.forEach((slot,s) => lines.push(`  ${Q4_LAB[slot].padEnd(3)} ${nameById(ids[s])}`));
    const bench = plan.pr.filter(p => !ids.includes(p.id)).map(q4Name);
    lines.push(`  Banc : ${bench.length ? bench.join(', ') : 'personne'}`);
  });
  return lines.join('\n');
}
function q4SquadText(){
  return g4().players.map(p => `${q4Name(p)} : ${(p.pos4||[]).map(k => Q4_LAB[k]).join(', ')}${lvText(p, Q4_KEYS, Q4_LAB)}${p.present ? '' : ' (absent)'}`).join('\n');
}
function q4ParseSquad(text){
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const away = /\((away|absente?)\)/i.test(line);
    line = line.replace(/\((away|absente?)\)/ig, '').replace(/\|\s*4\s*[x×]\s*4\s*:?/i, ':').trim();
    const sl = splitLevels(line, POS4_WORDS); line = sl.line;
    const ci = line.indexOf(':');
    const name = (ci >= 0 ? line.slice(0, ci) : line).trim();
    const pos4 = [];
    (ci >= 0 ? line.slice(ci + 1) : '').split(/[\s,;\/]+/).forEach(w => {
      const k = POS4_WORDS[w.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()];
      if(k && !pos4.includes(k)) pos4.push(k);
    });
    const pl = {id: uid(), name, pos4, present: !away}; if(sl.lv) pl.lv = sl.lv; return pl;
  }).filter(p => p.name);
}

let q4ReturnFocus = null;
function openQ4(){
  g4(); save();
  q4ReturnFocus = document.activeElement;
  $('#q4').hidden = false;
  document.body.style.overflow = 'hidden';
  renderQ4();
  $('#q4-close').focus();
}
function closeQ4(){
  $('#q4').hidden = true;
  document.body.style.overflow = '';
  if(q4ReturnFocus && q4ReturnFocus.focus) q4ReturnFocus.focus();
}

function q4Click(b){
  const a = b.dataset.action, g = g4();
  const row = b.closest('[data-q4id]');
  const p = row && g.players.find(x => x.id===row.dataset.q4id);
  const msg = t => { $('#q4-msg').textContent = t; };
  switch(a){
    case 'q4-open': openQ4(); return true;
    case 'q4-close': closeQ4(); return true;
    case 'q4-present': p.present = !p.present; break;
    case 'q4-pos': {
      const r = b.dataset.role; p.pos4 = p.pos4 || [];
      const i = p.pos4.indexOf(r); if(i >= 0) p.pos4.splice(i,1); else p.pos4.push(r);
      break;
    }
    case 'q4-remove': g.players = g.players.filter(x => x !== p); break;
    case 'q4-add': {
      const np = {id: uid(), name: '', pos4: [], present: true};
      g.players.push(np); save(); renderQ4();
      const inp = document.getElementById('q4n-' + np.id); if(inp) inp.focus();
      return true;
    }
    case 'q4-rmode': rosterMode4 = b.dataset.val; renderQ4Roster(); return true;
    case 'q4-lv': {
      const r = b.dataset.role, n = +b.dataset.n;
      p.lv = p.lv || {};
      if(p.lv[r]===n) delete p.lv[r]; else p.lv[r] = n;
      break;
    }
    case 'q4-size': {
      if(+b.dataset.d > 0) g.players.push({id: uid(), name: '', pos4: [], present: true});
      else if(g.players.length) g.players.pop();
      break;
    }
    case 'q4-allhere': g.players.forEach(x => x.present = true); break;
    case 'q4-from6': {
      const have = new Set(g.players.map(x => x.id));
      const names = new Set(g.players.map(x => q4Name(x).toLowerCase()));
      const add = state.players.filter(x => !have.has(x.id) && !names.has(displayName(x).toLowerCase())).map(from6);
      g.players.push(...add);
      msg(add.length ? `${plural(add.length, 'joueur ajouté', 'joueurs ajoutés')} depuis l’effectif 6×6.` : 'Tous les joueurs de l’effectif 6×6 sont déjà dans l’équipe 4×4.');
      break;
    }
    case 'q4-export': {
      const text = q4SquadText(), box = $('#q4-import-box');
      const fallback = () => { box.value = text; box.focus(); box.select(); msg('L’équipe est dans la zone de texte, déjà sélectionnée. Copiez-la avec Ctrl+C / Cmd+C.'); };
      if(!g.players.length){ msg('L’équipe 4×4 est vide.'); return true; }
      try{ navigator.clipboard.writeText(text).then(() => msg(`${plural(g.players.length, 'joueur copié', 'joueurs copiés')}.`), fallback); }
      catch(err){ fallback(); }
      return true;
    }
    case 'q4-import': {
      const list = q4ParseSquad($('#q4-import-box').value);
      if(!list.length){ msg('Collez au moins un joueur, un par ligne, par exemple « Inès : P, 2 ».'); return true; }
      if(b.dataset.how==='replace') g.players = list; else g.players.push(...list);
      g.overrides = {};
      $('#q4-import-box').value = '';
      msg(`${plural(list.length, 'joueur', 'joueurs')} ${b.dataset.how==='replace' ? (list.length>1?'chargés':'chargé') : (list.length>1?'ajoutés':'ajouté')}. Les compteurs des joueurs retirés restent dans l’historique.`);
      break;
    }
    case 'q4-adj': {
      const now = (q4Totals()[p.id] || {played:0}).played;
      setPlayed(p.id, now + (+b.dataset.d));
      break;
    }
    case 'q4-sets': g.sets = Math.max(1, Math.min(5, g.sets + (+b.dataset.d))); break;
    case 'q4-mode': g.mode = b.dataset.val; break;
    case 'q4-unpin': delete g.overrides[b.dataset.n]; break;
    case 'q4-validate': {
      const plan = buildPlan4(); if(plan.blocked) return true;
      const off = [];
      plan.sets.forEach((ids,k) => Q4.forEach((slot,s) => { if(fit4(byId(ids[s]), slot)==='out') off.push(`${k}:${s}`); }));
      g.history.push({date: new Date().toISOString(), present: plan.pr.map(x => x.id), sets: plan.sets, off});
      g.overrides = {};
      msg(`Match ${g.history.length} enregistré. Le prochain match tient compte de ces sets.`);
      break;
    }
    case 'q4-undo': g.history.pop(); msg('Dernier match annulé.'); break;
    case 'q4-reset': {
      if(Date.now() - q4ResetArmed > 4000){
        q4ResetArmed = Date.now(); b.textContent = 'Confirmer : tout remettre à zéro';
        setTimeout(() => { if(b.isConnected) b.textContent = 'Remettre les compteurs à zéro'; }, 4000);
        return true;
      }
      q4ResetArmed = 0; g.history = []; g.adj = {}; g.overrides = {};
      msg('Compteurs remis à zéro.');
      break;
    }
    case 'q4-copy': {
      const text = q4Text();
      const showBox = () => {
        const slot = $('#q4-copy-slot');
        slot.innerHTML = `<textarea class="copybox" readonly aria-label="Plan 4 contre 4 en texte"></textarea><p class="foot">La copie automatique est bloquée ici. Le texte est sélectionné, copiez-le vous-même.</p>`;
        const ta = slot.querySelector('textarea'); ta.value = text; ta.focus(); ta.select();
      };
      try{ navigator.clipboard.writeText(text).then(() => { b.textContent = 'Copié'; setTimeout(() => b.textContent = 'Copier en texte', 1500); }, showBox); }
      catch(err){ showBox(); }
      return true;
    }
    default: return false;
  }
  save(); renderQ4(); return true;
}

document.addEventListener('change', e => {
  const sel = e.target.closest('select[data-q4set]'); if(!sel) return;
  const k = +sel.dataset.q4set, slot = sel.dataset.slot, id = sel.value, g = g4();
  const plan = buildPlan4();
  const ids = plan.sets[k] || [];
  const pins = g.overrides[k] = Object.assign({}, g.overrides[k] || {});
  const other = ids.indexOf(id), prev = ids[Q4.indexOf(slot)];
  pins[slot] = id;
  if(other >= 0 && Q4[other] !== slot) pins[Q4[other]] = prev;   // swap the two players
  save(); renderQ4();
  const again = document.getElementById(`q4-${k}-${slot}`); if(again) again.focus();
});
document.addEventListener('input', e => {
  if(!e.target.classList.contains('q4-name-in')) return;
  const p = byId(e.target.closest('[data-q4id]').dataset.q4id); if(!p) return;
  p.name = e.target.value;
  save(); renderQ4Plan(); renderQ4History();
});

/* ---------- équipes enregistrées ---------- */
const TEAM_LABEL = {'6':'Équipe 6×6', '4':'Équipe 4×4'};
const teamList = k => k==='6' ? lib.t6 : lib.t4;
const teamCur = k => k==='6' ? team6() : team4();
const teamDelArmed = {'6':0, '4':0};
function renderTeamBar(k){
  const bar = document.getElementById(`team${k}-bar`); if(!bar) return;
  const cur = teamCur(k), list = teamList(k);
  const count = t => { const d = t.data; return d && Array.isArray(d.players) ? d.players.length : (k==='4' ? state.players.length : 0); };
  bar.innerHTML = `
    <label class="field-label" for="team${k}-sel">${TEAM_LABEL[k]}</label>
    <select id="team${k}-sel" data-team-kind="${k}">${list.map(t =>
      `<option value="${t.id}" ${t.id===cur.id?'selected':''}>${esc(t.name || 'Sans nom')} · ${plural(count(t), 'joueur', 'joueurs')}</option>`).join('')}</select>
    <input id="team${k}-name" class="team-name" data-team-kind="${k}" value="${esc(cur.name)}" aria-label="Nom de l’équipe" placeholder="Nom de l’équipe" autocomplete="off">
    <div class="toolbar">
      <button class="btn" data-action="team-new" data-kind="${k}">Nouvelle équipe</button>
      <button class="btn ghost" data-action="team-dup" data-kind="${k}">Dupliquer</button>
      <button class="btn ghost" data-action="team-del" data-kind="${k}">Supprimer</button>
    </div>`;
}
function afterTeamChange(k){
  if(k==='6'){
    state = team6().data;
    Object.keys(tabs).forEach(x => delete tabs[x]); Object.keys(views).forEach(x => delete views[x]);
    renderSettings(); renderRoster(); renderResults(); renderTeamBar('6');
  } else {
    $('#q4-msg').textContent = '';
    renderQ4();
  }
  save();
}
function teamClick(b){
  const k = b.dataset.kind, list = teamList(k), cur = teamCur(k);
  const setCur = id => { if(k==='6') lib.cur6 = id; else lib.cur4 = id; };
  switch(b.dataset.action){
    case 'team-new': {
      const t = {id: uid(), name: `Équipe ${list.length + 1}`, data: k==='6' ? blank6() : blank4()};
      list.push(t); setCur(t.id); afterTeamChange(k);
      const inp = document.getElementById(`team${k}-name`); if(inp){ inp.focus(); inp.select(); }
      return true;
    }
    case 'team-dup': {
      if(k==='4') g4();
      const t = {id: uid(), name: `${cur.name} (copie)`, data: JSON.parse(JSON.stringify(cur.data))};
      if(k==='4') t.data.overrides = {};
      list.push(t); setCur(t.id); afterTeamChange(k);
      return true;
    }
    case 'team-del': {
      if(Date.now() - teamDelArmed[k] > 4000){
        teamDelArmed[k] = Date.now(); b.textContent = `Confirmer : supprimer «\u00a0${cur.name}\u00a0»`;
        setTimeout(() => { if(b.isConnected) b.textContent = 'Supprimer'; }, 4000);
        return true;
      }
      teamDelArmed[k] = 0;
      const i = list.indexOf(cur); list.splice(i, 1);
      if(!list.length) list.push({id: uid(), name: 'Équipe 1', data: k==='6' ? blank6() : blank4()});
      setCur(list[Math.max(0, i-1)].id); afterTeamChange(k);
      return true;
    }
  }
  return false;
}
document.addEventListener('change', e => {
  const sel = e.target.closest('select[data-team-kind]'); if(!sel) return;
  const k = sel.dataset.teamKind;
  if(k==='6') lib.cur6 = sel.value; else lib.cur4 = sel.value;
  afterTeamChange(k);
  const again = document.getElementById(`team${k}-sel`); if(again) again.focus();
});
document.addEventListener('input', e => {
  if(!e.target.classList.contains('team-name')) return;
  const k = e.target.dataset.teamKind;
  teamCur(k).name = e.target.value;
  const opt = document.querySelector(`#team${k}-sel option[value="${teamCur(k).id}"]`);
  if(opt) opt.textContent = opt.textContent.replace(/^.*( · \d+ joueurs?)$/, (m, tail) => (e.target.value || 'Sans nom') + tail);
  save();
});

/* ---------- glisser-déposer des sets ----------
   Moving set `from` to position `to` fixes every set in between to its current lineup, in the
   new order. Playing time over the match is unchanged, so the sets outside that range stay the same. */
function moveSet6(key, from, to){
  const c = getConfigs().find(x => x.key===key); if(!c || from===to || to < 0 || to >= state.sets) return;
  const pr = present();
  const plan = buildPlan(c, pr);
  const snap = st => {
    const o = {start:{}, end:{}};
    st.start.forEach((i,sl) => o.start[sl] = pr[i].id);
    if(st.end) st.end.forEach((i,sl) => o.end[sl] = pr[i].id);
    return o;
  };
  const order = plan.sets.map((_,i) => i);
  order.splice(to, 0, order.splice(from, 1)[0]);
  state.pins = state.pins || {};
  const pk = state.pins[key] = state.pins[key] || {};
  for(let i = Math.min(from,to); i <= Math.max(from,to); i++) pk[i] = snap(plan.sets[order[i]]);
  tabs[key] = to;
  refresh(false);
}
function moveSet4(from, to){
  const g = g4(), plan = buildPlan4();
  if(plan.blocked || from===to || to < 0 || to >= plan.sets.length) return;
  const snap = ids => { const o = {}; Q4.forEach((slot,s) => o[slot] = ids[s]); return o; };
  const order = plan.sets.map((_,i) => i);
  order.splice(to, 0, order.splice(from, 1)[0]);
  for(let i = Math.min(from,to); i <= Math.max(from,to); i++) g.overrides[i] = snap(plan.sets[order[i]]);
  save(); renderQ4();
}
function doMove(h, to){
  const from = +h.dataset.n;
  if(h.dataset.drag==='6') moveSet6(h.dataset.key, from, to); else moveSet4(from, to);
}

let drag = null, swallowClick = false;
function dropTarget(x, y){
  const el = document.elementFromPoint(x, y);
  const t = el && el.closest(`[data-drop="${drag.kind}"]`);
  if(!t) return null;
  if(drag.kind==='6' && t.dataset.key !== drag.key) return null;
  return t;
}
function endDrag(){
  if(!drag) return;
  if(drag.ghost) drag.ghost.remove();
  document.querySelectorAll('.drop-on,.is-dragging').forEach(el => el.classList.remove('drop-on','is-dragging'));
  document.body.classList.remove('dragging-set');
  drag = null;
}
document.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-drag]');
  if(!h || e.button > 0 || e.target.closest('select,input')) return;
  drag = {h, kind:h.dataset.drag, key:h.dataset.key, x0:e.clientX, y0:e.clientY, started:false, target:null};
});
document.addEventListener('pointermove', e => {
  if(!drag) return;
  if(!drag.started){
    if(Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.started = true;
    const src = drag.kind==='6' ? drag.h : drag.h.closest('.q4-set');
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.textContent = `Set ${+drag.h.dataset.n + 1}`;
    document.body.appendChild(g);
    drag.ghost = g; drag.src = src;
    src.classList.add('is-dragging');
    document.body.classList.add('dragging-set');
  }
  e.preventDefault();
  drag.ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
  const t = dropTarget(e.clientX, e.clientY);
  if(t !== drag.target){
    if(drag.target) drag.target.classList.remove('drop-on');
    if(t && t !== drag.src) t.classList.add('drop-on');
    drag.target = t;
  }
}, {passive:false});
document.addEventListener('pointerup', e => {
  if(!drag) return;
  const d = drag;
  if(d.started){
    swallowClick = true; setTimeout(() => swallowClick = false, 0);
    const t = dropTarget(e.clientX, e.clientY);
    endDrag();
    if(t) doMove(d.h, +t.dataset.n);
    const back = document.querySelector(d.kind==='6' ? `[data-drag="6"][data-key="${d.key}"][aria-selected="true"]` : `.q4-set[data-n] [data-drag="4"]`);
    if(back && d.kind==='6') back.focus();
  } else endDrag();
});
document.addEventListener('pointercancel', endDrag);
document.addEventListener('click', e => { if(swallowClick){ e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
document.addEventListener('keydown', e => {
  const h = e.target.closest && e.target.closest('[data-drag]');
  if(!h || !e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  const to = +h.dataset.n + (e.key==='ArrowLeft' ? -1 : 1);
  doMove(h, to);
  const sel = h.dataset.drag==='6' ? `[data-drag="6"][data-key="${h.dataset.key}"][data-n="${to}"]` : `[data-drag="4"][data-n="${to}"]`;
  const nb = document.querySelector(sel); if(nb) nb.focus();
});

/* ---------- événements ---------- */
function touched(){ if(state.example){ state.example = false; $('#example-note').hidden = true; } }
function refresh(roster=true){ if(roster){ renderRoster(); renderTeamBar('6'); } renderResults(); save(); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if(!b) return;
  const a = b.dataset.action;
  if(a.startsWith('q4-') && q4Click(b)) return;
  if(a.startsWith('team-') && teamClick(b)) return;
  const row = b.closest('[data-id]');
  const p = row && state.players.find(x => x.id===row.dataset.id);
  switch(a){
    case 'present': p.present = !p.present; touched(); refresh(); break;
    case 'pos': {
      const r = b.dataset.role, i = p.pos.indexOf(r);
      if(i >= 0) p.pos.splice(i,1); else p.pos.push(r);
      touched(); refresh(); break;
    }
    case 'remove': state.players = state.players.filter(x => x !== p); touched(); refresh(); break;
    case 'add': {
      const np = {id:uid(), name:'', pos:[], present:true};
      state.players.push(np); touched(); refresh();
      const inp = document.getElementById('name-'+np.id); if(inp) inp.focus();
      break;
    }
    case 'size': {
      const d = +b.dataset.d;
      if(d > 0) state.players.push({id:uid(), name:'', pos:[], present:true});
      else if(state.players.length) state.players.pop();
      touched(); refresh(); break;
    }
    case 'allhere': state.players.forEach(x => x.present = true); refresh(); break;
    case 'clear': state.players = []; state.example = false; state.selected = null; refresh(); break;
    case 'example': state = exampleState(); team6().data = state; renderSettings(); refresh(); break;
    case 'set': state[b.dataset.key] = b.dataset.val; renderSettings(); refresh(false); break;
    case 'sets': state.sets = Math.max(1, Math.min(5, state.sets + (+b.dataset.d))); renderSettings(); refresh(false); break;
    case 'pick': {
      const cur = resolveSelected(getConfigs());
      const k = b.dataset.key;
      state.selected = cur.includes(k) ? cur.filter(x => x!==k) : [...cur, k];
      if(!state.selected.length) state.selected = ['__none__'];
      refresh(false); break;
    }
    case 'tab': tabs[b.dataset.key] = +b.dataset.n; renderResults(); break;
    case 'rot-open': {
      const c = b.dataset.key ? getConfigs().find(x => x.key===b.dataset.key && x.best) : null;
      if(!c) ROT.names = null;
      openRot(c); break;
    }
    case 'rot-close': closeRot(); break;
    case 'rot-play': playRot(); break;
    case 'rot-set': stopRotPlay(); if(b.dataset.key==='lib') ROT.lib = b.dataset.val==='true'; else ROT[b.dataset.key] = b.dataset.val; renderRot(); break;
    case 'rot-t': stopRotPlay(); ROT.t = +b.dataset.n; renderRot(); break;
    case 'rot-nonames': ROT.names = null; renderRot(); break;
    case 'view': views[b.dataset.key] = b.dataset.val; renderResults(); break;
    case 'rmode': rosterMode = b.dataset.val; renderRoster(); break;
    case 'lv': {
      const r = b.dataset.role, n = +b.dataset.n;
      p.lv = p.lv || {};
      if(p.lv[r]===n) delete p.lv[r]; else p.lv[r] = n;
      touched(); refresh(); break;
    }
    case 'edit6': edits[b.dataset.key] = !edits[b.dataset.key]; renderResults(); break;
    case 'unpin6': {
      const pk = state.pins && state.pins[b.dataset.key];
      if(pk) delete pk[b.dataset.n];
      refresh(false); break;
    }
    case 'export': {
      const text = squadText();
      const box = $('#import-box'), msg = $('#import-msg');
      const fallback = () => { box.value = text; box.focus(); box.select(); msg.textContent = `L’effectif est dans la zone ci-dessus, déjà sélectionné. Copiez-le avec Ctrl+C / Cmd+C.`; };
      if(!state.players.length){ msg.textContent = 'L’effectif est vide.'; break; }
      try{
        navigator.clipboard.writeText(text).then(() => { msg.textContent = `${plural(state.players.length, 'joueur copié', 'joueurs copiés')}. Collez-les dans l’autre page, ou dans une note pour les garder.`; }, fallback);
      }catch(err){ fallback(); }
      break;
    }
    case 'import': {
      const list = parseSquad($('#import-box').value);
      const msg = $('#import-msg');
      if(!list.length){ msg.textContent = `Collez au moins un joueur, un par ligne, par exemple «${NB}Inès : P, Pt${NB}».`; break; }
      if(b.dataset.how==='replace') state.players = list;
      else state.players.push(...list);
      state.example = false; state.selected = null;
      $('#import-box').value = '';
      msg.textContent = `${plural(list.length, 'joueur', 'joueurs')} ${b.dataset.how==='replace' ? (list.length>1?'chargés':'chargé') : (list.length>1?'ajoutés':'ajouté')}.`;
      refresh(); break;
    }
    case 'copy': {
      const c = getConfigs().find(x => x.key===b.dataset.key); if(!c) break;
      const text = lineupText(c, present());
      const showBox = () => {
        const slot = document.querySelector(`.copy-slot[data-key="${c.key}"]`);
        if(!slot) return;
        slot.innerHTML = `<textarea class="copybox" readonly aria-label="Compo en texte"></textarea><p class="foot">La copie automatique est bloquée ici. Le texte est sélectionné, copiez-le vous-même.</p>`;
        const ta = slot.querySelector('textarea'); ta.value = text; ta.focus(); ta.select();
      };
      try{
        navigator.clipboard.writeText(text).then(() => { b.textContent = 'Copié'; setTimeout(() => b.textContent = 'Copier en texte', 1500); }, showBox);
      }catch(err){ showBox(); }
      break;
    }
  }
});

document.addEventListener('click', e => { if(e.target===$('#rot')) closeRot(); if(e.target===$('#q4')) closeQ4(); });

document.addEventListener('change', e => {
  const sel = e.target.closest('select[data-edit-key]'); if(!sel) return;
  const key = sel.dataset.editKey, k = +sel.dataset.set, view = sel.dataset.view, s = +sel.dataset.slot, id = sel.value;
  const c = getConfigs().find(x => x.key===key); if(!c) return;
  const pr = present();
  const st = buildPlan(c, pr).sets[k];
  state.pins = state.pins || {};
  const pk = state.pins[key] = state.pins[key] || {};
  const pin = pk[k] = pk[k] || {};
  const part = pin[view] = Object.assign({}, pin[view] || {});
  const map = view==='end' ? st.end : st.start;
  const ids = map.map(i => pr[i].id);
  const prev = ids[s], other = ids.indexOf(id);
  part[s] = id;
  if(other >= 0 && other !== s){
    if(view==='start') part[other] = prev;                       // swap the two places
    else part[other] = pr[st.start[other]].id;                   // that place keeps its starter
  }
  refresh(false);
  const again = document.getElementById(sel.id); if(again) again.focus();
});

document.addEventListener('input', e => {
  if(!e.target.classList.contains('name') || e.target.classList.contains('q4-name-in')) return;
  const row = e.target.closest('[data-id]');
  const p = state.players.find(x => x.id===row.dataset.id);
  if(!p) return;
  p.name = e.target.value; touched();
  renderResults(); save();
});

renderTeamBar('6');
renderSettings();
renderRoster();
renderResults();

/* ==========================================================================
   Version installable (PWA) : sauvegarde complète dans un fichier,
   restauration, mise hors ligne et mises à jour.
   ========================================================================== */

/* ---------- sauvegarde complète dans un fichier ---------- */
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const int15 = v => { const n = Math.round(+v); return n >= 1 && n <= 5 ? n : 0; };
function cleanKeys(list, keys){ return Array.isArray(list) ? list.filter((k,i,a) => keys.includes(k) && a.indexOf(k)===i) : []; }
function cleanLv(lv, keys){
  const o = {};
  if(lv && typeof lv === 'object') keys.forEach(k => { const n = int15(lv[k]); if(n) o[k] = n; });
  return o;
}
function cleanIds(list){ return Array.isArray(list) ? list.filter(x => typeof x === 'string' && SAFE_ID.test(x)) : []; }
function cleanMap(obj){ return obj && typeof obj === 'object' && !Array.isArray(obj) ? JSON.parse(JSON.stringify(obj)) : {}; }
function cleanPlayer(p, six){
  if(!p || typeof p !== 'object' || !SAFE_ID.test(p.id)) throw new Error('joueur');
  const o = {id: p.id, name: String(p.name ?? '').slice(0, 60), present: p.present !== false};
  if(six){
    o.pos = cleanKeys(p.pos, ROLE_KEYS);
    o.lv = cleanLv(p.lv, ROLE_KEYS);
    if(Array.isArray(p.pos4)) o.pos4 = cleanKeys(p.pos4, Q4_KEYS);
  } else {
    o.pos4 = cleanKeys(p.pos4, Q4_KEYS);
    o.lv = cleanLv(p.lv, Q4_KEYS);
  }
  return o;
}
const clampSets = v => Math.max(1, Math.min(5, Math.round(+v) || 3));
function cleanTeam6(d){
  if(!d || !Array.isArray(d.players)) throw new Error('équipe 6×6');
  return norm6({
    example: false,
    positions: d.positions === 'strict' ? 'strict' : 'flex',
    sets: clampSets(d.sets),
    mode: MODE_W.hasOwnProperty(d.mode) ? d.mode : 'balanced',
    midset: d.midset === 'on' ? 'on' : 'off',
    setterLock: d.setterLock === 'free' ? 'free' : 'lock',
    selected: Array.isArray(d.selected) ? d.selected.filter(x => typeof x === 'string').slice(0, 10) : null,
    pins: cleanMap(d.pins),
    players: d.players.map(p => cleanPlayer(p, true))
  });
}
function cleanTeam4(d){
  if(d === null) return null;
  if(!d || !Array.isArray(d.players)) throw new Error('équipe 4×4');
  const adj = {};
  Object.entries(cleanMap(d.adj)).forEach(([id,v]) => { if(SAFE_ID.test(id) && isFinite(+v)) adj[id] = Math.round(+v * 2) / 2; });
  return {
    sets: clampSets(d.sets),
    mode: d.mode === 'strict' ? 'strict' : 'twist',
    noMB: true,
    adj,
    overrides: cleanMap(d.overrides),
    history: (Array.isArray(d.history) ? d.history : []).map(m => ({
      date: typeof m.date === 'string' ? m.date.slice(0, 40) : '',
      present: cleanIds(m.present),
      sets: (Array.isArray(m.sets) ? m.sets : []).map(cleanIds),
      off: Array.isArray(m.off) ? m.off.filter(x => typeof x === 'string' && /^\d+:\d+$/.test(x)) : []
    })),
    players: d.players.map(p => cleanPlayer(p, false))
  };
}
function cleanLib(raw){
  const l = raw && raw.lib ? raw.lib : raw;
  if(!l || !Array.isArray(l.t6) || !l.t6.length || !Array.isArray(l.t4) || !l.t4.length) throw new Error('format');
  const team = (t, fn) => {
    if(!t || !SAFE_ID.test(t.id)) throw new Error('équipe');
    return {id: t.id, name: String(t.name ?? '').slice(0, 60), data: fn(t.data)};
  };
  const out = {t6: l.t6.map(t => team(t, cleanTeam6)), t4: l.t4.map(t => team(t, cleanTeam4))};
  out.cur6 = out.t6.some(t => t.id === l.cur6) ? l.cur6 : out.t6[0].id;
  out.cur4 = out.t4.some(t => t.id === l.cur4) ? l.cur4 : out.t4[0].id;
  return out;
}

function backupName(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `compos-volley-sauvegarde-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.json`;
}
const backupMsg = t => { $('#backup-msg').textContent = t; };
function saveBackup(){
  save();
  const data = {app: 'compos-volley', format: 1, saved: new Date().toISOString(), lib};
  const blob = new Blob([JSON.stringify(data, null, 1)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = backupName();
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  backupMsg(`Sauvegarde enregistrée : ${a.download}. Gardez ce fichier en lieu sûr (ordinateur, cloud, e-mail à vous-même).`);
}
let pendingLib = null;
function askRestore(l){
  pendingLib = l;
  const box = $('#backup-confirm');
  box.querySelector('.bc-text').textContent =
    `Ce fichier contient ${plural(l.t6.length, 'équipe 6×6', 'équipes 6×6')} et ${plural(l.t4.length, 'équipe 4×4', 'équipes 4×4')}. Elles remplaceront toutes les équipes enregistrées sur cet appareil.`;
  box.hidden = false;
  box.querySelector('[data-action="backup-apply"]').focus();
}
function applyRestore(){
  if(!pendingLib) return;
  lib = pendingLib; pendingLib = null;
  state = team6().data;
  Object.keys(tabs).forEach(x => delete tabs[x]);
  Object.keys(views).forEach(x => delete views[x]);
  Object.keys(edits).forEach(x => delete edits[x]);
  save();
  renderTeamBar('6'); renderSettings(); renderRoster(); renderResults();
  $('#backup-confirm').hidden = true;
  backupMsg('Sauvegarde restaurée.');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if(!b) return;
  switch(b.dataset.action){
    case 'backup-save': saveBackup(); break;
    case 'backup-open': $('#backup-file').click(); break;
    case 'backup-apply': applyRestore(); break;
    case 'backup-cancel': pendingLib = null; $('#backup-confirm').hidden = true; backupMsg('Restauration annulée.'); break;
    case 'app-reload': location.reload(); break;
  }
});
document.addEventListener('change', e => {
  if(e.target.id !== 'backup-file') return;
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!f) return;
  if(f.size > 5e6){ backupMsg('Ce fichier est trop gros pour être une sauvegarde Compos Volley.'); return; }
  const r = new FileReader();
  r.onload = () => {
    try{ askRestore(cleanLib(JSON.parse(r.result))); }
    catch(err){ backupMsg('Ce fichier n’est pas une sauvegarde Compos Volley valide. Rien n’a été modifié.'); }
  };
  r.onerror = () => backupMsg('Impossible de lire ce fichier. Rien n’a été modifié.');
  r.readAsText(f);
});

/* ---------- hors ligne, installation et mises à jour ---------- */
try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(hadController) $('#update-toast').hidden = false;
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
