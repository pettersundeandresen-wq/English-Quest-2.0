import {ready as loadGraphics} from './graphics.js';
import { verbs } from '../data/verbs.js';
import { objects, TILE, W, H, walkable, drawWorld, region, tile } from './world.js';
import { drawPlayer } from './player.js';
import { load, save, clear } from './save.js';
import { showBook } from './dictionary.js';
import { runChallenge } from './challenges.js';
import { interiors, indoorDefinitions, indoorObjects, allIndoorQuests, indoorWalkable, drawInterior, drawInteriorFurniture } from './interiors.js';
import { entrances } from './world.js';
import { homeMap } from './interiors.js';
import { showHomeShop, drawHomeDetails } from './home.js';

const state = load();
state.found ??= {};
state.done ??= {};
state.mastery ??= {};
state.position ??= { x: 7, y: 7 };
state.homeItems ??= {};
const ZOOM = 1.15;
state.coins ??= 0;
state.scene ??= 'outdoor';
if(state.scene !== 'outdoor' && !interiors[state.scene])state.scene='outdoor';
state.outdoorPosition ??= {x:7,y:7};
state.cooldowns ??= {};
// Migrer gamle type-spesifikke sperrer uten å miste eksisterende progresjon.
for(const [key,lock] of Object.entries({...state.cooldowns})){
 if(!key.includes(':'))continue;
 const id=key.split(':')[0], old=state.cooldowns[id];
 if(!old || (old.otherVerbs||[]).length>(lock.otherVerbs||[]).length)state.cooldowns[id]=lock;
 delete state.cooldowns[key];
} // Lagrer feilbesvarte oppgaver og hvilke andre verb som er forsøkt.

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const modal = $('modal');
const player = { x: state.position.x, y: state.position.y };
let scene=state.scene;
if(scene==='outdoor' && (player.x<2||player.y<2||player.x>179||player.y>129||!walkable(player.x,player.y))){player.x=7;player.y=7;}
const allObjects=[...objects,...allIndoorQuests];
const getSceneObjects=()=>scene==='outdoor'?objects:interiors[scene].objects;
const currentRegion=()=>scene==='outdoor'?region(player.x,player.y):interiors[scene].name;
const keys = new Set();
let modalOpen = false;
let mapOpen = false;
let near = null;
let prev = 0;
let lastSave = 0;
let lastArea = '';

// --------------------------------------------------
// FEM ANDRE VERBOPPGAVER MELLOM TO FORSØK
// --------------------------------------------------
const REQUIRED_OTHER_VERBS = 5;
const taskKey = (id, type) => String(id); // One lock per verb, regardless of challenge type.

function remainingLock(id, type) {
    const lock = state.cooldowns[taskKey(id)] || state.cooldowns[`${id}:${type}`];
    if (!lock) return 0;
    const distinct = new Set((lock.otherVerbs || []).map(String));
    return Math.max(0, REQUIRED_OTHER_VERBS - distinct.size);
}

function registerAnswer(id, type, correct) {
    const currentId = String(id);
    // Ett besvart spørsmål teller for alle andre aktive sperrer.
    // Samme verb teller aldri mer enn én gang for en gitt sperre.
    for (const [key, lock] of Object.entries(state.cooldowns)) {
        if (key === taskKey(id)) continue;
        const lockedVerbId = key.split(':')[0];
        if (lockedVerbId === currentId) continue;
        lock.otherVerbs ??= [];
        if (!lock.otherVerbs.map(String).includes(currentId)) {
            lock.otherVerbs.push(currentId);
        }
        if (new Set(lock.otherVerbs.map(String)).size >= REQUIRED_OTHER_VERBS) {
            delete state.cooldowns[key];
        }
    }
    // Start ny sperre etter ethvert svar, riktig eller feil.
    // Sperren gjelder verb-ID-en på tvers av verden og ordbok.
    for (const old of Object.keys(state.cooldowns)) {
        if (old.startsWith(currentId + ':')) delete state.cooldowns[old];
    }
    state.cooldowns[taskKey(id)] = { otherVerbs: [] };
    persist();
}

function questStatus(p){
 const remaining=remainingLock(p.id,p.type);
 if(remaining)return {kind:'cooldown',remaining};
 if(Number(state.mastery[p.id]||0)>=5)return {kind:'done',remaining:0};
 if(state.done[p.id])return {kind:'retry',remaining:0};
 return {kind:'new',remaining:0};
}
function lockMessage(remaining, returnToBook = null) {
    openModal(`
        <h2>⏳ Prøv igjen litt senere</h2>
        <p>Du må svare på <b>${remaining} andre verboppgaver</b> før du kan prøve denne igjen.</p>
        <p class="muted">Både riktige og feil svar teller, men hvert annet verb teller bare én gang.</p>
        <button class="primary" id="backFromLock">${returnToBook ? 'Tilbake til ordboken' : 'Tilbake til eventyret'}</button>
    `);
    $('backFromLock').onclick = () => {
        if (returnToBook) returnToBook.refresh();
        else closeModal();
    };
}

// --------------------------------------------------
// JOYSTICK OG MODALER
// --------------------------------------------------
const joystick = $('joystick');
const joystickKnob = $('joystickKnob');
let joystickX = 0;
let joystickY = 0;
let joystickPointer = null;

function resetJoystick() {
    joystickPointer = null;
    joystickX = 0;
    joystickY = 0;
    if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
}

function updateJoystick(e) {
    if (!joystick || !joystickKnob) return;
    const rect = joystick.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const maxDistance = rect.width * 0.28;
    const distance = Math.hypot(dx, dy);
    const scale = distance > maxDistance ? maxDistance / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    joystickX = x / maxDistance;
    joystickY = y / maxDistance;
    if (Math.hypot(joystickX, joystickY) < 0.15) {
        joystickX = 0;
        joystickY = 0;
    }
    joystickKnob.style.transform =
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

if (joystick) {
    joystick.addEventListener('pointerdown', e => {
        if (modalOpen || joystickPointer !== null) return;
        e.preventDefault();
        joystickPointer = e.pointerId;
        joystick.setPointerCapture(e.pointerId);
        updateJoystick(e);
    });
    joystick.addEventListener('pointermove', e => {
        if (e.pointerId !== joystickPointer) return;
        e.preventDefault();
        updateJoystick(e);
    });
    const endJoystick = e => {
        if (e.pointerId === joystickPointer) resetJoystick();
    };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        joystick.addEventListener(ev, endJoystick);
    }
    joystick.addEventListener('contextmenu', e => e.preventDefault());
}

function openModal(html) {
    modalOpen = true;
    keys.clear();
    resetJoystick();
    modal.classList.remove('hidden');
    $('modalContent').innerHTML = html;
}
function closeModal() {
    modalOpen = false;
    modal.classList.add('hidden');
    $('modalContent').innerHTML = '';
}
$('closeModal').onclick = closeModal;
modal.onclick = e => { if (e.target === modal) closeModal(); };

// --------------------------------------------------
// OMRÅDEOVERSIKT
// --------------------------------------------------
const areas = [
    { name: 'Landsbyen', icon: '🏡' },
    { name: 'Den ville skogen', icon: '🌲' },
    { name: 'Granskogen', icon: '🌲' },
    { name: 'Eikeskogen', icon: '🌳' },
    { name: 'Rosaskogen', icon: '🌸' },
    { name: 'Slottslandet', icon: '🏰' },
    { name: 'Elvedalen', icon: '🌊' },
    { name: 'Steinruinene', icon: '🪨' },
    { name: 'Den magiske lysningen', icon: '✨' },
    ...indoorDefinitions.map(d=>({name:d.name,icon:d.icon})),
    {name:'Mitt hjem',icon:'🏠'}
];
const areaObjects = new Map(areas.map(a => [a.name, []]));
for (const obj of allObjects) {
    const indoorRoom=obj.id>=124?Object.values(interiors).find(m=>m.objects.some(p=>p.id===obj.id)):null;
    const name = indoorRoom?indoorRoom.name:region(obj.x + 0.5, obj.y + 0.5);
    if (!areaObjects.has(name)) areaObjects.set(name, []);
    areaObjects.get(name).push(obj);
}
function updateAreas() {
    const container = $('areaOverview');
    if (!container) return;
    const currentArea = currentRegion();
    let total = 0;
    let done = 0;
    let html = '';
    for (const area of areas) {
        const missions = areaObjects.get(area.name) || [];
        const completed = missions.filter(o => Boolean(state.done[o.id])).length;
        total += missions.length;
        done += completed;
        const finished = missions.length > 0 && completed === missions.length;
        html += `<div class="areaRow ${area.name === currentArea ? 'current' : ''}">
            <span>${area.icon} ${area.name}</span>
            <span class="areaCount ${finished ? 'complete' : ''}">${completed}/${missions.length}${finished ? ' ✓' : ''}</span>
        </div>`;
    }
    container.innerHTML = html + `<div class="areaTotal"><span>Totalt</span><span>${done}/${total}</span></div>`;
}

function updateHUD() {
    const foundCount = verbs.filter(v => Boolean(state.found[v.id])).length;
    const doneCount = allObjects.filter(o => Boolean(state.done[o.id])).length;
    const starCount = Object.values(state.mastery).reduce((s, n) => s + Number(n || 0), 0);
    $('coins').textContent = `🪙 ${state.coins}`;
    $('found').textContent = `📖 ${foundCount}/${verbs.length}`;
    $('stars').textContent = `⭐ ${starCount}`;
    $('location').textContent = currentRegion();
    if (foundCount < 3) {
        $('questText').textContent = `Oppdag ${3 - foundCount} nye verb for å bli ordsamler.`;
    } else if (foundCount < 20) {
        $('questText').textContent = `Bra! Finn ${20 - foundCount} nye verb til.`;
    } else if (foundCount < verbs.length) {
        $('questText').textContent = `Samle alle verbene! ${verbs.length - foundCount} gjenstår.`;
    } else {
        $('questText').textContent = 'Alle verb oppdaget! Få fem stjerner på hvert ord.';
    }
    $('objective').textContent = `${foundCount} oppdaget · ${doneCount} utfordringer fullført`;
    $('questProgress').style.width = `${100 * foundCount / verbs.length}%`;
    updateAreas();
}
function persist() {
    state.scene=scene;
    state.position={x:Math.round(player.x*100)/100,y:Math.round(player.y*100)/100};
    save(state);
}

// --------------------------------------------------
// UTFORDRINGER I VERDEN
// --------------------------------------------------
function enterScene(id){
    state.outdoorPosition={x:player.x,y:player.y};
    scene=id;player.x=interiors[id].spawn.x;player.y=interiors[id].spawn.y;
    near=null;keys.clear();resetJoystick();persist();updateHUD();lastArea='';
}
function leaveScene(){
    scene='outdoor';
    player.x=state.outdoorPosition?.x ?? 7;
    player.y=state.outdoorPosition?.y ?? 7;
    near=null;keys.clear();resetJoystick();persist();updateHUD();lastArea='';
}
function interact() {
    if (modalOpen || !near) return;
    if(near.kind==='entrance'){enterScene(near.id);return;}
    if(near.kind==='shop' && scene==='shop'){showHomeShop(openModal,state,()=>{persist();updateHUD();});return;}
    if(near.kind==='exit'){leaveScene();return;}
    const p = near;
    if (state.done[p.id] && Number(state.mastery[p.id] || 0) >= 5) {
        openModal(`<h2>⭐ Mestret!</h2><p>Du har fått alle fem stjernene på dette verbet.</p><button class="primary" id="okay">Tilbake</button>`);
        $('okay').onclick = closeModal;return;
    }
    const remaining = remainingLock(p.id, p.type);
    if (remaining) {
        lockMessage(remaining);
        return;
    }
    const v = verbs[p.id];
    if (!v) return;
    const challengeType = state.done[p.id]
        ? ['chest','crystal','rune','bell','portal'][Math.min(4,Number(state.mastery[p.id]||0))]
        : p.type;
    const retry = remainingLock(p.id, challengeType);
    if(retry){lockMessage(retry);return;}
    runChallenge(openModal, closeModal, v, challengeType, ok => {
        registerAnswer(v.id, challengeType, ok);
        if (ok) {
            const first = !state.done[p.id];
            state.done[p.id] = true;
            state.found[p.id] = true;
            state.mastery[p.id] = Math.min(5, Number(state.mastery[p.id] || 0) + 1);
            state.coins += first ? 15 : 8;
        } else state.coins += 1;
        persist();
        updateHUD();
    });
}
$('actionBtn').onclick = interact;

// --------------------------------------------------
// ORDBOK – BEHOLD FILTER OG VALGT VERB
// --------------------------------------------------
$('bookBtn').onclick = () => {
    let book = null;
    book = showBook(openModal, state, v => {
        const types = ['chest', 'crystal', 'rune', 'bell', 'portal'];
        const level = Math.min(4, Number(state.mastery[v.id] || 0));
        const type = types[level];
        const remaining = remainingLock(v.id, type);
        if (remaining) {
            lockMessage(remaining, book);
            return;
        }
        runChallenge(openModal, closeModal, v, type, ok => {
            registerAnswer(v.id, type, ok);
            if (ok) {
                state.mastery[v.id] = Math.min(5, Number(state.mastery[v.id] || 0) + 1);
                state.coins += 5;
            }
            persist();
            updateHUD();
            // challenges.js lukker modalen før callbacken.
            // Åpne ordboken med samme filter og samme valgte ord.
            if (book) book.refresh();
        });
    }, remainingLock);
};

$('resetBtn').onclick = () => {
    if (confirm('Slette all fremgang på denne enheten og starte på nytt?')) {
        clear();
        location.reload();
    }
};

// --------------------------------------------------
// TASTATUR OG BEVEGELSE
// --------------------------------------------------
const directions = {
    arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'
};
window.addEventListener('keydown', e => {
    if (mapOpen && e.key === 'Escape') { document.querySelector('.mapOverlay')?.remove(); mapOpen=false; return; }
    if (modalOpen) {
        if (e.key === 'Escape') closeModal();
        return;
    }
    const k = e.key.toLowerCase();
    const dir = directions[k];
    if (dir) { e.preventDefault(); keys.add(dir); }
    if (k === ' ' || k === 'enter') { e.preventDefault(); interact(); }
    if (k === 'b') $('bookBtn').click();
});
window.addEventListener('keyup', e => {
    const dir = directions[e.key.toLowerCase()];
    if (dir) keys.delete(dir);
});
window.addEventListener('blur', () => { keys.clear(); resetJoystick(); });

function loop(now) {
    const dt = Math.min(0.045, (now - prev) / 1000 || 0);
    prev = now;
    let moving = false;
    if (!modalOpen && !mapOpen) {
        let dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0) + joystickX;
        let dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0) + joystickY;
        if (dx || dy) {
            const magnitude = Math.hypot(dx, dy);
            const strength = Math.min(1, magnitude);
            dx = dx / magnitude * strength;
            dy = dy / magnitude * strength;
            const speed = 4.2 * dt;
            const x = player.x + dx * speed;
            const y = player.y + dy * speed;
            const radius = 0.22;
            const pass=(xx,yy)=>scene==='outdoor'?walkable(xx,yy):indoorWalkable(interiors[scene],xx,yy);
            if (pass(x - radius, player.y - radius) &&
                pass(x + radius, player.y + radius)) player.x = x;
            if (pass(player.x - radius, y - radius) &&
                pass(player.x + radius, y + radius)) player.y = y;
            moving = true;
        }
    }
    const map=scene==='outdoor'?{w:W,h:H}:interiors[scene];
    const viewW=canvas.width/ZOOM,viewH=canvas.height/ZOOM;
    const cam={
        x:Math.max(0,Math.min(Math.max(0,map.w*TILE-viewW),player.x*TILE-viewW/2)),
        y:Math.max(0,Math.min(Math.max(0,map.h*TILE-viewH),player.y*TILE-viewH/2))
    };
    ctx.save();ctx.scale(ZOOM,ZOOM);
    if(scene==='outdoor')drawWorld(ctx,cam,now,state.done,questStatus);
    else drawInterior(ctx,cam,now,interiors[scene],state.done,TILE,questStatus);
    if(scene!=='outdoor')drawInteriorFurniture(ctx,cam,interiors[scene],TILE);
    if(scene==='home')drawHomeDetails(ctx,cam,state,TILE);
    drawPlayer(ctx, player.x, player.y, cam, now, moving);
    ctx.restore();
    near = null;
    let best = 1.7;
    for (const o of getSceneObjects()) {
        const distance = Math.hypot(player.x - o.x - 0.5, player.y - o.y - 0.5);
        if (distance < best) { best = distance; near = o; }
    }
    // A doorway is an interaction, not an English challenge.
    if(scene==='outdoor'){
        for(const e of entrances){
            const distance=Math.hypot(player.x-e.x-.5,player.y-e.y-.5);
            if(distance<best){best=distance;near={kind:'entrance',...e};}
        }
    }else{
        if(scene==='shop'){const d=Math.hypot(player.x-18.5,player.y-13.5);if(d<best){best=d;near={kind:'shop'};}}
        const e=interiors[scene].exit;
        const distance=Math.hypot(player.x-e.x-.5,player.y-e.y-.5);
        if(distance<best){best=distance;near={kind:'exit'};}
    }
    const names = {
        chest: 'skattekiste', crystal: 'krystall', rune: 'runestein',
        bell: 'lytteklokke', portal: 'portal'
    };
    $('nearby').textContent = !near
        ? 'Utforsk kartet og finn lysende gjenstander'
        : near.kind==='entrance' ? `🚪 Gå inn: ${near.name} · trykk Undersøk`
        : near.kind==='exit' ? '🚪 Gå ut til verden · trykk Undersøk'
        : near.kind==='shop' ? '🛒 Handle ved butikkdisken · trykk Undersøk'
        : (state.done[near.id] ? (Number(state.mastery[near.id]||0)>=5?'⭐ Mestret':'⭐ Øv videre') :
            remainingLock(near.id,near.type)
                ? `⏳ ${remainingLock(near.id,near.type)} andre oppgaver igjen`
                : '✨ Ny utfordring')+' : '+(names[near.type]||'oppgave')+' · trykk Undersøk';
    $('actionBtn').disabled = !near || modalOpen;
    $('actionBtn').style.opacity = near && !modalOpen ? '1' : '.55';
    const currentArea = currentRegion();
    if (currentArea !== lastArea) {
        lastArea = currentArea;
        $('location').textContent = currentArea;
        updateAreas();
    }
    if (now - lastSave > 3000) { lastSave = now; persist(); }
    requestAnimationFrame(loop);
}
updateHUD();
loadGraphics().then(()=>requestAnimationFrame(loop));

// Optional world overview, opened with M or the map button.
function showWorldMap(){
 const holder=document.createElement('div');holder.className='mapOverlay';
 holder.innerHTML='<div class="mapCard"><button id="closeWorldMap" class="pill">Lukk kart ✕</button><h2>🗺️ English Quest 2.0</h2><canvas id="overviewCanvas" width="720" height="520"></canvas><p>Blå markør = deg · Gule punkter = oppgaver · Røde hus = bygninger</p></div>';
 document.body.appendChild(holder);mapOpen=true;keys.clear();resetJoystick();holder.onclick=e=>{if(e.target===holder||e.target.id==='closeWorldMap'){holder.remove();mapOpen=false;}};
 const c=holder.querySelector('canvas'),g=c.getContext('2d'),sx=c.width/W,sy=c.height/H;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=tile(x,y);g.fillStyle=t==='water'?'#4c9fb9':t==='path'?'#ddc18c':t==='tree'?'#438057':t==='rock'?'#8c9586':'#a4c78a';g.fillRect(x*sx,y*sy,sx+1,sy+1)}
 for(const o of objects){g.fillStyle=state.done[o.id]?'#4a9659':'#f6d36a';g.fillRect(o.x*sx-2,o.y*sy-2,4,4)}
 for(const e of entrances){g.fillStyle='#b75060';g.fillRect(e.x*sx-4,e.y*sy-4,8,8)}
 if(scene==='outdoor'){g.beginPath();g.arc(player.x*sx,player.y*sy,6,0,7);g.fillStyle='#2867df';g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke()}
}
document.getElementById('mapBtn')?.addEventListener('click',showWorldMap);
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'&&!modalOpen&&!mapOpen){e.preventDefault();showWorldMap()}});
