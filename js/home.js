// Home decorations use the existing furniture PNGs; no emoji placeholders.
import { asset } from './graphics.js';
const goods = [
 ['chair','Stol',280,'basic'],['rug_purple','Teppe',420,'basic'],['potted_plant','Potteplante',240,'basic'],
 ['nightstand','Nattbord',400,'basic'],['table_flowers','Blomsterbord',550,'basic'],['sofa','Sofa',1100,'basic'],
 ['dresser','Kommode',850,'basic'],['writing_desk','Skrivebord',950,'basic'],['wardrobe','Klesskap',1250,'basic'],
 ['storage_chest','Oppbevaringskiste',600,'basic'],['mirror_gold','Gullspeil',1800,'decor'],
 ['floor_lamp','Gulvlampe',680,'decor'],['flower_vase','Blomstervase',340,'decor'],
 ['painting_castle','Slottsmaleri',1250,'decor'],['fireplace','Peis',2600,'decor'],
 ['canopy_bed','Himmelseng',3500,'decor'],['chandelier','Lysekrone',3800,'decor'],
 ['royal_throne','Trone',6000,'decor'],['grand_piano','Flygel',7500,'decor'],
 ['magic_globe','Magisk globus',2300,'extra'],['crystal_lamp','Krystallampe',1700,'extra'],
 ['vanity','Sminkebord',1500,'extra'],['toy_chest','Lekekiste',650,'extra'],
 ['castle_tapestry','Slottsvev',2400,'extra'],['bookcase_deluxe','Praktbokhylle',3100,'extra'],
 ['garden_bench','Hagebenk',1100,'garden'],['flower_bed','Blomsterbed',550,'garden'],
 ['birdbath','Fuglebad',1350,'garden'],['garden_fountain','Hagefontene',4500,'garden'],
 ['rose_arch','Rosebue',2900,'garden'],['gazebo','Lysthus',9000,'garden']
].map(([id,name,cost,group],index)=>({id,name,cost,group,index}));
const urls=Object.fromEntries(goods.map(g=>[g.id,`./assets/furniture/${g.group}/${g.id}.png`]));
const pictures={};for(const [key,url] of Object.entries(urls)){const im=new Image();im.src=url;pictures[key]=im;}
export function masteredCount(state){return Object.values(state.mastery||{}).filter(n=>Number(n)>=5).length;}
export function homeLevel(state){const n=masteredCount(state);return n>=180?5:n>=80?4:n>=40?3:n>=15?2:1;}
export function showHomeShop(openModal,state,refresh){
 state.homeItems??={};const level=homeLevel(state),mastered=masteredCount(state);
 const list=goods.map(g=>{
  const bought=!!state.homeItems[g.id],required=g.cost>=3500?3:g.cost>=1700?2:1;
  const locked=level<required,disabled=bought||locked||state.coins<g.cost;
  return `<button class="choice" data-buy="${g.id}" ${disabled?'disabled':''}>${bought?'✓ ':''}${g.name} · ${bought?'Kjøpt':locked?'Husnivå '+required:g.cost+' mynter'}</button>`;
 }).join('');
 openModal(`<h2>🛍️ Innredning til hjemmet</h2><p>🪙 ${state.coins} mynter · Husnivå ${level}/5 · ${mastered} mestrede verb</p><p class="muted">Du velger selv hva du kjøper. Dyre gjenstander låses opp gjennom mestring.</p><div class="choices" style="max-height:55vh;overflow:auto">${list}</div><p><button id="shopBack" class="primary">Tilbake til spillet</button></p>`);
 document.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>{
  const g=goods.find(v=>v.id===button.dataset.buy);
  if(!g||state.homeItems[g.id]||state.coins<g.cost||level<(g.cost>=3500?3:g.cost>=1700?2:1))return;
  state.coins-=g.cost;state.homeItems[g.id]=true;refresh();showHomeShop(openModal,state,refresh);
 });
 document.getElementById('shopBack').onclick=()=>document.getElementById('closeModal').click();
}
export function drawHomeDetails(ctx,cam,state,TILE){
 const purchased=goods.filter(g=>state.homeItems?.[g.id]);
 // A deterministic, spacious display. Never cover the entrance or player spawn.
 const spots=[];for(let y=4;y<=12;y+=3)for(let x=4;x<=20;x+=3)spots.push([x,y]);
 purchased.slice(0,spots.length).forEach((g,i)=>{
  const [x,y]=spots[i],im=pictures[g.id];if(!im?.naturalWidth)return;
  const size=g.group==='garden'?62:58;
  ctx.drawImage(im,x*TILE-cam.x-size/2,y*TILE-cam.y-size,size,size);
 });
 ctx.fillStyle='#fff3c9';ctx.font='bold 13px system-ui';ctx.textAlign='center';
 ctx.fillText(`Husnivå ${homeLevel(state)}/5`,12*TILE-cam.x,3*TILE-cam.y);
}
