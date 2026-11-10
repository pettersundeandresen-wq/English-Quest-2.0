import { asset } from './graphics.js';
// Four explorable interior maps. The 56 quests here use IDs 124–179.
// These IDs are not duplicated outdoors, and all saved progress is preserved.
export const indoorDefinitions = [
  {id:'library', name:'Det magiske biblioteket', icon:'📚', floor:'#bd8c57', wall:'#644d48', accent:'#e4c78c', seed:13},
  {id:'maze', name:'Den gamle labyrinten', icon:'🧩', floor:'#9ca99c', wall:'#455f5c', accent:'#d9b36d', seed:37},
  {id:'tower', name:'Trollmannstårnet', icon:'🧙', floor:'#9c88c5', wall:'#544577', accent:'#e6c6f7', seed:71},
  {id:'cave', name:'Ekko-hulen', icon:'🔔', floor:'#6a9eaa', wall:'#2b5769', accent:'#9be9ee', seed:101}
];
const WIDTH=31, HEIGHT=23;
const hash=(x,y,seed)=>{const n=Math.sin(x*127.1+y*311.7+seed*73.13)*43758.5453;return n-Math.floor(n)};
function makeMap(def, index){
  const tiles=Array.from({length:HEIGHT},()=>Array(WIDTH).fill('wall'));
  // DFS maze: every carved cell is reachable from the entrance.
  const stack=[[15,19]];
  tiles[19][15]='floor';
  const visited=new Set(['15,19']);
  while(stack.length){
    const [x,y]=stack[stack.length-1];
    const directions=[[2,0],[-2,0],[0,2],[0,-2]].sort((a,b)=>hash(x+a[0],y+a[1],def.seed)-hash(x+b[0],y+b[1],def.seed));
    const next=directions.map(([dx,dy])=>[x+dx,y+dy,dx,dy]).find(([nx,ny])=>nx>1&&ny>1&&nx<WIDTH-2&&ny<HEIGHT-2&&!visited.has(`${nx},${ny}`));
    if(!next){stack.pop();continue;}
    const [nx,ny,dx,dy]=next;
    visited.add(`${nx},${ny}`);
    tiles[y+dy/2][x+dx/2]='floor';tiles[ny][nx]='floor';stack.push([nx,ny]);
  }
  // Small rooms create landmarks, intersections and alternative paths.
  const rooms=[[5,5],[25,5],[5,15],[25,15],[15,9]];
  for(const [cx,cy] of rooms){
    for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++)tiles[y][x]='floor';
  }
  // Entrance courtyard and exit tile.
  for(let y=17;y<=20;y++)for(let x=13;x<=17;x++)tiles[y][x]='floor';
  const reachable=new Set();const queue=[[15,19]];
  while(queue.length){const [x,y]=queue.shift();const key=`${x},${y}`;if(reachable.has(key)||tiles[y]?.[x]!=='floor')continue;reachable.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
  const candidates=[...reachable].map(s=>{const [x,y]=s.split(',').map(Number);return{x,y}})
    .filter(p=>p.y<17&&p.x>2&&p.x<WIDTH-3)
    .sort((a,b)=>hash(a.x,a.y,def.seed+5)-hash(b.x,b.y,def.seed+5));
  const positions=[];
  for(const p of candidates){if(positions.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=2.6))positions.push(p);if(positions.length===14)break;}
  if(positions.length!==14)throw Error(`Not enough accessible quest positions in ${def.id}`);
  const objects=positions.map((p,i)=>({id:124+index*14+i,x:p.x,y:p.y,type:['chest','crystal','rune','bell','portal'][(124+index*14+i)%5]}));
  return {...def,w:WIDTH,h:HEIGHT,tiles,objects,exit:{x:15,y:19},spawn:{x:15.5,y:18.5},reachable};
}
export const interiors=Object.fromEntries(indoorDefinitions.map((d,i)=>[d.id,makeMap(d,i)]));
export const indoorObjects=indoorDefinitions.flatMap(d=>interiors[d.id].objects); // updated below via allIndoorQuests
export function indoorWalkable(map,x,y){return map.tiles[Math.floor(y)]?.[Math.floor(x)]==='floor';}
export function drawInterior(ctx,camera,time,map,done,tileSize=40,statusFor){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.fillStyle='#151f2a';ctx.fillRect(0,0,w,h);
  const x0=Math.max(0,Math.floor(camera.x/tileSize)-1),x1=Math.min(map.w,Math.ceil((camera.x+w)/tileSize)+1);
  const y0=Math.max(0,Math.floor(camera.y/tileSize)-1),y1=Math.min(map.h,Math.ceil((camera.y+h)/tileSize)+1);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const px=x*tileSize-camera.x,py=y*tileSize-camera.y,wall=map.tiles[y][x]==='wall';
    ctx.fillStyle=wall?map.wall:map.floor;ctx.fillRect(px,py,tileSize+1,tileSize+1);
    if(wall){ctx.fillStyle='#ffffff13';ctx.fillRect(px+2,py+2,tileSize-4,3);ctx.fillStyle='#00000035';ctx.fillRect(px,py+tileSize-6,tileSize,6);}
    else {
      ctx.strokeStyle='#ffffff19';ctx.strokeRect(px+1,py+1,tileSize-2,tileSize-2);
      if(hash(x,y,map.seed)>.84){ctx.fillStyle=map.accent;ctx.globalAlpha=.55;ctx.fillRect(px+14,py+16,5,5);ctx.globalAlpha=1;}
      if(map.id==='library'&&hash(x,y,map.seed+7)>.93){ctx.fillStyle='#805a3a';ctx.fillRect(px+8,py+8,24,7);ctx.fillStyle='#d8c58b';ctx.fillRect(px+11,py+8,4,7);}
      if(map.id==='cave'&&hash(x,y,map.seed+7)>.94){ctx.fillStyle='#a7f6ff';ctx.beginPath();ctx.moveTo(px+20,py+7);ctx.lineTo(px+12,py+29);ctx.lineTo(px+27,py+26);ctx.fill();}
      if(map.id==='tower'&&hash(x,y,map.seed+7)>.94){ctx.fillStyle='#e9c8ff';ctx.beginPath();ctx.arc(px+20,py+18,4+Math.sin(time/550)*1.5,0,Math.PI*2);ctx.fill();}
    }
  }
  const ex=map.exit;
  ctx.font='27px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  asset(ctx, map.id==='castle'?'door_castle':map.id==='tower'?'portal_magic':'door_wood',(ex.x+.5)*tileSize-camera.x,(ex.y+1)*tileSize-camera.y,52,70);
  for(const p of map.objects){
    const px=(p.x+.5)*tileSize-camera.x,py=(p.y+.5)*tileSize-camera.y;
    if(px<-40||py<-40||px>w+40||py>h+40)continue;
    const completed=!!done[p.id];ctx.font='27px system-ui';asset(ctx,({chest:'chest',crystal:'crystal',rune:'runestone',bell:'magic_book',portal:'star_altar'}[p.type]||'chest'),px,py+20,48,48);
    const st=statusFor?statusFor(p):{kind:completed?'done':'new',remaining:0};
    const statusName=st.kind==='cooldown'?'status_cooldown':st.kind==='retry'?'status_retry':st.kind==='done'?'status_done':'status_new';
    asset(ctx,statusName,px,py-21+(st.kind==='new'?Math.sin(time/320+p.id)*3:0),30,30);
    if(st.kind==='cooldown'){
      ctx.fillStyle='#40374b';ctx.beginPath();ctx.arc(px,py-42,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(String(st.remaining),px,py-38);
    }
  }
  ctx.font='bold 17px system-ui';ctx.textAlign='left';ctx.fillStyle='#ffffff';ctx.fillText(map.icon+' '+map.name,14,25);
}

// Player home: a safe explorable room, no English questions.
const homeTiles=Array.from({length:19},(_,y)=>Array.from({length:25},(_,x)=>x===0||y===0||x===24||y===18?'wall':'floor'));
export const homeMap={id:'home',name:'Mitt hjem',icon:'🏠',floor:'#c7a476',wall:'#745a66',accent:'#ffe0a4',seed:19,w:25,h:19,tiles:homeTiles,objects:[],exit:{x:12,y:16},spawn:{x:12.5,y:15.5}};
interiors.home=homeMap;

// Additional enterable buildings without extra verb IDs (all 180 IDs remain stable).
for(const [id,name,icon,floor,wall] of [
 ['shop','Eventyrbutikken','🛒','#bda07c','#70533e'],
 ['school','Skolehuset','🏫','#c8b38b','#54677d'],
 ['castle','Eventyrslottet','🏰','#d6c4a1','#665a86']]){
 const tiles=Array.from({length:19},(_,y)=>Array.from({length:25},(_,x)=>x===0||y===0||x===24||y===18?'wall':'floor'));
 interiors[id]={id,name,icon,floor,wall,accent:'#e9d7ac',seed:43,w:25,h:19,tiles,objects:[],exit:{x:12,y:16},spawn:{x:12.5,y:15.5}};
}

// Transfer 12 existing quest IDs into school and castle. Total stays 180.
// The other 44 indoor quests retain their IDs and locations.
for(const [from,to] of [['maze','school'],['cave','castle']]){
 const moved=interiors[from].objects.splice(-6);
 const positions=[[6,6],[12,6],[18,6],[6,10],[12,10],[18,10]];
 moved.forEach((o,i)=>{o.x=positions[i][0];o.y=positions[i][1];});
 interiors[to].objects.push(...moved);
}
export const allIndoorQuests=Object.values(interiors).flatMap(m=>m.objects);

export function drawInteriorFurniture(ctx,camera,map,tileSize=40){
 const furniture={
  home:[['bed',5,6],['bookshelf',20,5]],
  library:[['bookshelf',5,5],['bookshelf',23,5],['writing_desk',15,8]],
  shop:[['wardrobe',5,6],['bookshelf',20,6],['storage_chest',8,12]],
  school:[['writing_desk',6,6],['bookshelf',20,6],['chair',12,11],['chair',17,11]],
  castle:[['sofa',6,6],['rug_purple',12,10],['bookshelf',20,5]],
  tower:[['writing_desk',6,6],['bookshelf',20,6]],
  maze:[['bookshelf',5,5]],cave:[['storage_chest',6,6]]
 };
 if(map.id==='shop')asset(ctx,'shop_counter',18.5*tileSize-camera.x,13.5*tileSize-camera.y,145,118);
 for(const [name,x,y] of furniture[map.id]||[]){const im=indoorAssets[name];if(im?.naturalWidth)ctx.drawImage(im,x*tileSize-camera.x-32,y*tileSize-camera.y-66,65,65);}
}
const indoorAssets={};for(const name of ['bed','bookshelf','rug_purple','sofa','wardrobe','storage_chest','table_flowers','writing_desk','chair']){const im=new Image();im.src='./assets/furniture/basic/'+name+'.png';indoorAssets[name]=im;}
