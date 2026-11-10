export const TILE=40, W=180, H=130;
const rand=(x,y,z=0)=>{let n=Math.sin(x*127.1+y*311.7+z*83.13)*43758.5453;return n-Math.floor(n)};
const grid=Array.from({length:H},()=>Array(W).fill('grass'));
const paths=[[7,7],[20,9],[29,19],[46,19],[46,9],[68,9],[68,28],[88,28],[88,12],[111,12],[111,34],[135,34],[135,17],[165,17],[165,55],[146,55],[146,86],[165,86],[165,114],[125,114],[125,95],[95,95],[95,118],[58,118],[58,95],[26,95],[26,118],[8,118],[8,68],[28,68],[28,45],[7,45],[7,7]];
function carve(x,y,r=2,t='path'){for(let yy=Math.max(1,y-r);yy<Math.min(H-1,y+r+1);yy++)for(let xx=Math.max(1,x-r);xx<Math.min(W-1,x+r+1);xx++)if(Math.hypot(xx-x,yy-y)<=r+.2)grid[yy][xx]=t;}
function route(a,b,r=2){let n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*2);for(let i=0;i<=n;i++){let t=i/n;carve(Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),r)}}
for(let i=1;i<paths.length;i++)route(paths[i-1],paths[i]);
for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
 if(grid[y][x]==='path')continue;
 if((x>=73&&x<=79&&y<67)||(x>=115&&x<=121&&y>55)){grid[y][x]='water';continue;}
 let q=rand(x,y), forest=x>32||y>33, ruins=x>110&&y>75;
 if(ruins&&q<.32)grid[y][x]='rock';else if(forest&&q<.41)grid[y][x]='tree';else if(q<.10)grid[y][x]='bush';
}
// Lake and winding tributaries; original path tiles remain walkable bridges.
function waterDisk(cx,cy,r){for(let yy=Math.max(1,Math.floor(cy-r));yy<Math.min(H-1,Math.ceil(cy+r));yy++)for(let xx=Math.max(1,Math.floor(cx-r));xx<Math.min(W-1,Math.ceil(cx+r));xx++)if(Math.hypot(xx-cx,yy-cy)<=r&&grid[yy][xx]!=='path')grid[yy][xx]='water';}
function waterLine(points,r){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*3);for(let j=0;j<=n;j++){const t=j/n;waterDisk(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,r);}}}
waterLine([[76,1],[72,18],[79,36],[74,52],[81,69],[76,90],[84,110],[78,129]],2.6);
for(let y=75;y<112;y++)for(let x=104;x<148;x++){let q=((x-126)/20)**2+((y-94)/16)**2;if(q<1+Math.sin(x*.55+y*.35)*.10&&grid[y][x]!=='path')grid[y][x]='water';}
waterLine([[80,69],[92,75],[106,87]],1.2);waterLine([[147,99],[155,110],[164,120]],1);
waterLine([[24,35],[40,42],[60,37],[74,52]],.85);waterLine([[95,8],[87,18],[79,36]],.9);
// Bridges and scenic side paths keep every region connected.
for(const [a,b] of [[[75,26],[77,33]],[[118,92],[119,101]]])route(a,b,3);
const branchPoints=[[20,9],[29,19],[46,19],[68,28],[88,28],[111,34],[135,34],[146,55],[146,86],[125,95],[95,95],[58,95],[26,95],[28,68]];
for(let i=0;i<branchPoints.length;i++){const a=branchPoints[i],dx=(i%2?1:-1)*(8+i%5),dy=(i%3-1)*10;route(a,[Math.max(4,Math.min(W-5,a[0]+dx)),Math.max(4,Math.min(H-5,a[1]+dy))],1);}
export const entrances=[
 {id:'home',name:'Mitt hjem',x:13,y:10,icon:'🏠'},
 {id:'library',name:'Det magiske biblioteket',x:44,y:19,icon:'📚'},
 {id:'maze',name:'Labyrinten',x:91,y:29,icon:'🧩'},
 {id:'tower',name:'Trollmannstårnet',x:133,y:35,icon:'🧙'},
 {id:'cave',name:'Ekko-hulen',x:147,y:87,icon:'🔔'},
 {id:'shop',name:'Eventyrbutikken',x:25,y:95,icon:'🛒'},
 {id:'school',name:'Skolehuset',x:60,y:95,icon:'🏫'},
 {id:'castle',name:'Eventyrslottet',x:160,y:114,icon:'🏰'}
];
for(const e of entrances){carve(e.x,e.y,4,'clearing');}
export const objects=[];
// Stable IDs: 0..123 outdoors; 124..179 remain indoors.
const candidates=[];
for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++)if(['path','clearing'].includes(grid[y][x]))candidates.push({x,y});
candidates.sort((a,b)=>rand(a.x,a.y,77)-rand(b.x,b.y,77));
for(const c of candidates){if(objects.length>=124)break;
 if(entrances.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<6))continue;
 if(objects.some(o=>Math.hypot(c.x-o.x,c.y-o.y)<5.8))continue;
 objects.push({...c,id:objects.length,type:['chest','crystal','rune','bell','portal'][objects.length%5]});carve(c.x,c.y,1,'clearing');
}
if(objects.length!==124)throw new Error('Not enough quest positions: '+objects.length);
export const landmarks=[{x:7,y:7,name:'Landsbyen'},{x:50,y:19,name:'Skogstien'},{x:87,y:28,name:'Elvedalen'},{x:130,y:40,name:'Nordskogen'},{x:155,y:95,name:'Ruinene'},{x:28,y:110,name:'Magisk lysning'}];
export function tile(x,y){return grid[Math.floor(y)]?.[Math.floor(x)]||'water'}
export function walkable(x,y){return !['water','tree','rock'].includes(tile(x,y))}
export function region(x,y){if(x>115&&y>72)return 'Steinruinene';if(y>75)return 'Den magiske lysningen';if(x>77)return 'Elvedalen';if(y>32||x>33)return 'Den ville skogen';return 'Landsbyen'}
import { asset, pattern, ready } from './graphics.js';
const dims={oak:[155,150],spruce:[112,155],birch:[145,157],blossom:[157,148],bush:[79,62],rock:[90,62]};
const questArt=['chest','crystal','runestone','magic_book','quest_board','magic_mushroom','locked_gate','star_altar'];
const buildingArt={home:'building_home',library:'building_library',maze:'building_school',tower:'building_wizard_tower',cave:'building_castle',shop:'building_shop',school:'building_school',castle:'building_castle'};
const artType=t=>({chest:0,crystal:1,rune:2,bell:3,portal:4})[t]??0;
export function drawWorld(ctx,camera,time,done){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.fillStyle=pattern(ctx,'grass')||'#7cad6a';ctx.fillRect(0,0,w,h);
 const x0=Math.max(0,Math.floor(camera.x/TILE)-5),x1=Math.min(W,Math.ceil((camera.x+w)/TILE)+5);
 const y0=Math.max(0,Math.floor(camera.y/TILE)-5),y1=Math.min(H,Math.ceil((camera.y+h)/TILE)+5);
 const draw=[];
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const t=grid[y][x],px=x*TILE-camera.x,py=y*TILE-camera.y,q=rand(x,y);
  if(t==='path'||t==='water'){
    ctx.fillStyle=pattern(ctx,t==='path'?'path':'water')||(t==='path'?'#c49a60':'#298ca5');
    ctx.fillRect(px,py,TILE+1,TILE+1);
  }
  if(t==='tree'||t==='rock'||t==='bush'){
    const species=x<33?'birch':x<70?'spruce':x<106?'oak':x<143?'blossom':'spruce';
    const type=t==='tree'?species:t==='rock'?'rock':'bush';
    draw.push({kind:'nature',type,x:(x+.5)*TILE-camera.x,y:(y+.9)*TILE-camera.y,depth:y+.9});
  }
  if(t==='grass'&&q>.982){const d=x>100&&x<145?'detail_pink_flowers':x<70?'detail_daisies':'detail_fern';draw.push({kind:'detail',type:d,x:(x+.5)*TILE-camera.x,y:(y+.85)*TILE-camera.y,depth:y+.85});}
  if(t==='grass'&&q>.969&&q<.975){draw.push({kind:'detail',type:'detail_grass_tuft',x:(x+.5)*TILE-camera.x,y:(y+.85)*TILE-camera.y,depth:y+.85});}
 }
 for(const e of entrances){const x=(e.x+.5)*TILE-camera.x,y=(e.y+.5)*TILE-camera.y;if(x>-260&&x<w+260&&y>-260&&y<h+260)draw.push({kind:'building',type:buildingArt[e.id],x,y,depth:e.y+.5});}
 for(const p of objects){const x=(p.x+.5)*TILE-camera.x,y=(p.y+.5)*TILE-camera.y;if(x>-90&&x<w+90&&y>-90&&y<h+90)draw.push({kind:'quest',type:questArt[p.id%8],x,y,depth:p.y+.5,p});}
 draw.sort((a,b)=>a.depth-b.depth);
 for(const o of draw){
  if(o.kind==='nature'){const [ww,hh]=dims[o.type];asset(ctx,o.type,o.x,o.y,ww,hh);}
  else if(o.kind==='detail')asset(ctx,o.type,o.x,o.y,40,35);
  else if(o.kind==='building')asset(ctx,o.type,o.x,o.y,o.type==='building_castle'?260:205,o.type==='building_castle'?235:175);
  else {asset(ctx,o.type,o.x,o.y,57,53);const complete=!!done[o.p.id];const s=complete?'status_done':(o.p.id%13===0?'status_special':'status_new');const bob=complete?0:Math.sin(time/320+o.p.id)*4;asset(ctx,s,o.x,o.y-51+bob,31,31);}
 }
}
