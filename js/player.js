import {asset} from './graphics.js';
let lastX=0,lastY=0,dir='down';
export function drawPlayer(ctx,x,y,camera,time,moving){const dx=x-lastX,dy=y-lastY;if(moving){if(Math.abs(dx)>Math.abs(dy))dir=dx>0?'right':'left';else if(Math.abs(dy)>.0001)dir=dy>0?'down':'up';}lastX=x;lastY=y;
const px=x*40-camera.x,py=y*40-camera.y;const pose=moving?(Math.floor(time/170)%2?'step_left':'step_right'):'idle';asset(ctx,`avatar_${dir}_${pose}`,px,py+16,61,81);
ctx.save();ctx.strokeStyle='#fff2a4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py+16,15,6,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
