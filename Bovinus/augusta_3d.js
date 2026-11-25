/* Modelo 3D autoral simplificado da Bovinu's Augusta — coordenadas relativas, não levantamento arquitetônico.
   Renderizador Canvas sem bibliotecas externas: funciona offline, com arraste, zoom e hotspots dinâmicos.
   Todos os componentes abaixo são sólidos com coordenadas x/y/z; para editar o layout, altere addBox/addZone.
*/
(()=>{'use strict';
const C={floor:'#eee7db',border:'#756b5b',wall:'#b6a494',wood:'#8e583b',counter:'#a47752',gold:'#e8a82d',top:'#f4cc78',salad:'#7f9d68',hot:'#c97739',grill:'#b84632',scale:'#95b9c4',gray:'#b7b5af',stage:'#8d2c38',seat:'#6f5543',room:'#e9ddce'};
const RAD=Math.PI/180, boxes=[],zones=[],labels=[],markers={};
function box(name,x,z,w,d,h,color,y=0){boxes.push({name,x,z,w,d,h,y,color})}
function zone(name,x,z,w,d,color){zones.push({name,x,z,w,d,color})}
function label(name,x,z,y=1){labels.push({name,x,z,y})}
function marker(key,name,x,z,y){markers[key]={key,name,x,z,y}}
// Planta esquemática: fundos na parte superior, entrada/saída na parte inferior do mapa.
box('Piso',0,0,32,30,.22,C.floor,-.26);
zone('Área superior',21,3,10.8,16.8,'#f7f1e8');
zone('Salão inferior',2,3.2,9.2,12.3,'#f3e7df');
zone('Salão principal',2,16,14,6.9,'#f4eee4');
zone('Corredor do buffet',12,3.2,9.1,16.8,'#f9f5eb');
zone('Bar / espera',13,23,9.2,6,'#f0e4d2');
zone('Fundos',0.7,.4,30.6,2.2,'#e4d0bd');
zone('Banheiros',.8,23.3,5.2,5.2,'#dedbe0');
zone('Caixas',7.4,24,4.8,5,'#ecdcc9');
zone('Caixa auxiliar',27,23.5,4.2,5.8,'#ecdcc9');
// Limites baixos para visualização cortada (não representam paredes na altura real).
box('Muro esquerdo',0.2,0.2,.25,29.3,1.0,C.wall);
box('Muro direito',31.65,.2,.25,29.3,1.0,C.wall);
box('Muro fundos',.2,.2,31.6,.25,1.1,C.wall);
box('Muro frente esquerdo',.2,29.3,14,.25,1.0,C.wall);
box('Muro frente direito',20.9,29.3,10.9,.25,1.0,C.wall);
box('Divisória superior',20.9,3,.24,16.8,.48,C.border);
box('Área fundos',.7,2.6,30.6,.16,.53,C.wall);
// Palco e zona de DJ conforme desenho.
box('Palco',.8,7,2.1,8.5,.4,C.wood);
box('Cortina palco',.65,7,.2,8.5,1.75,C.stage,.4);
box('DJ',.95,3.45,2.2,2.1,.85,C.counter);
box('DJ tampo',.85,3.4,2.4,2.15,.11,C.top,.82);
label('PALCO',1.7,11,2.3);label('DJ',2.0,4.4,1.45);
// Balcão de bebidas ao fundo.
box('Copa de bebidas',6,3.3,4.5,1.25,.92,C.counter);
box('Copa de bebidas tampo',5.9,3.25,4.7,1.32,.1,C.top,.93);
label('COPA',8.2,3.8,1.55);
// Churrasqueira — bancada com brasas e pontos de corte.
box('Churrasqueira base',16.0,3.4,4.2,1.6,.97,C.wood);
box('Churrasqueira tampo',15.9,3.3,4.4,1.75,.14,C.grill,.98);
for(let c=0;c<6;c++)box('Brasa',16.2+.57*c,3.65,.38,.73,.035,c%2?'#f09d3e':'#6c2521',1.13);
label('CHURRASQUEIRA',18.1,4.1,2.15);
marker('grill','Churrasqueira',18.0,4.8,2.2);
// Balanças, representam os 3 equipamentos da reunião.
box('Bancada balanças',12.2,5.1,1.25,3.4,.93,C.wood);
box('Tampo balanças',12.08,4.95,1.49,3.7,.1,C.top,.94);
for(let j=0;j<3;j++)box('Balança '+(j+1),12.32,5.3+j*1.12,.98,.81,.11,C.scale,1.04);
marker('scale','Balanças',12.9,6.4,2.2);
// Buffet central: três grupos verticais com cubas visíveis.
const buffets=[
 {name:'Sobremesas',x:15.2,z:6.4,w:1.45,d:5.1,color:'#e6ac53',tray:'#f6e1a1'},
 {name:'Quentes',x:18.1,z:6.4,w:1.75,d:5.1,color:'#d88d39',tray:'#a8572c'},
 {name:'Saladas',x:17.0,z:13.0,w:1.75,d:5.5,color:'#82a367',tray:'#4e874b'},
];
for(const b of buffets){box(b.name+' bancada',b.x,b.z,b.w,b.d,.89,C.wood);box(b.name+' borda',b.x-.13,b.z-.12,b.w+.26,b.d+.24,.13,b.color,.9);for(let j=0;j<4;j++){box('Cuba '+b.name+' '+j,b.x+.16,b.z+.27+j*(b.d-.5)/4,b.w-.32,(b.d-.65)/4,.04,b.tray,1.045)}label(b.name.toUpperCase(),b.x+b.w/2,b.z+b.d/2,1.95)}
marker('cubas','Cubas',18.2,14.2,2.45);
// Pratos como indicado entre salão principal e buffet.
box('Pratos',14.4,20.25,3.0,.85,.8,C.counter);
box('Prateleira pratos',14.3,20.16,3.2,1.02,.11,C.top,.81);
for(let i=0;i<5;i++)box('Pilha pratos',14.63+i*.49,20.48,.35,.35,.13,'#f8f8f5',.94);
label('PRATOS',15.7,20.65,1.35);
// Espera, caixas e entrada. Não há pagamentos no projeto: apenas representação espacial.
box('Balcão bar',15.4,25.0,6.0,.9,1.0,C.wood);
box('Balcão bar tampo',15.3,24.9,6.2,1.06,.12,C.top,1.0);
for(let i=0;i<2;i++)box('Caixa principal '+i,8.0+i*1.9,25.1,1.55,1.8,1.05,C.counter);
box('Caixa auxiliar',27.9,25.15,1.55,1.8,1.05,C.counter);
label('CAIXAS',9.55,27.4,1.4);label('CAIXA AUX.',28.8,27.45,1.5);
box('Tapete entrada',15,29.05,5.4,.75,.04,C.stage,.02);
marker('entry','Entrada',17.6,28.8,2.15);
label('ENTRADA',17.6,29.35,1.1);label('SAÍDA',29.5,29.35,1.1);
// Escadas desenhadas de forma simbólica, como no mapa original.
for(const [sx,sz] of [[8.8,5.3],[11.0,9.0],[9.0,16],[12.9,22],[20.9,5.4],[21,19.3]]){
 for(let j=0;j<4;j++)box('Degrau',sx+j*.26,sz+j*.34,.44,.19,.08+j*.025,'#807367');
}
// Mesas: mantém contagem aproximada por salão da planta (20+30+40), sem afirmar dimensões reais.
function table(x,z,kind){
 const size=kind==='superior'?.66:.7;
 box('Mesa',x-size/2,z-size/2,size,size,.62,C.wood);
 box('Tampo',x-size/2-.04,z-size/2-.04,size+.08,size+.08,.07,'#d3b68d',.63);
 for(const [dx,dz] of [[-.58,0],[.58,0],[0,-.58],[0,.58]])box('Cadeira',x+dx-.17,z+dz-.15,.34,.3,.36,C.seat);
}
for(let r=0;r<5;r++)for(let c=0;c<4;c++)table(3.5+c*1.75,4.5+r*2.12,'inferior');
for(let r=0;r<5;r++)for(let c=0;c<6;c++)table(3.1+c*2.2,16.35+r*1.36,'principal');
for(let r=0;r<8;r++)for(let c=0;c<5;c++)table(22.0+c*1.82,4.0+r*1.92,'superior');
label('SALÃO INFERIOR · ≈20 MESAS',7.0,11.8,2.25);
label('SALÃO PRINCIPAL · ≈30 MESAS',9.1,18.6,2.15);
label('SALÃO SUPERIOR · ≈40 MESAS',26.0,12.1,2.25);
label('BAR / ESPERA',19.0,24.1,1.85);
label('BANHEIROS',3.2,25.4,1.4);
label('FUNDOS / COZINHA',24.0,1.25,1.4);
const hexCache=new Map();
function rgb(hex){if(!hexCache.has(hex)){let n=parseInt(hex.slice(1),16);hexCache.set(hex,[(n>>16)&255,(n>>8)&255,n&255])}return hexCache.get(hex)}
function shade(hex,m){const c=rgb(hex);return `rgb(${c.map(v=>Math.max(0,Math.min(255,Math.round(v*m)))).join(',')})`}
const statuses={grill:'green',scale:'green',cubas:'green',entry:'green'}, colors={green:'#2b965f',warn:'#e4aa36',red:'#cf4938'};
const posMap={grill:markers.grill,scale:markers.scale,cubas:markers.cubas,entry:markers.entry};
let mounted=false,canvas=null,ctx=null,root=null,layer=null,tip=null,buttons={},w=0,h=0,yaw=-.65,pitch=.91,zoom=.86,tx=16,tz=15,raf=0,selected='grill';
function project(x,y,z){let a=x-tx,b=z-tz,ca=Math.cos(yaw),sa=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);const u=a*ca-b*sa,v=a*sa+b*ca;const s=Math.min(w/47,h/36)*zoom;return {x:w/2+u*s,y:h*.55-(y*cp-v*sp)*s,depth:v*cp+y*sp}}
function addFaces(arr,b){const x=b.x,z=b.z,w=b.w,d=b.d,y=b.y,h=b.h;const pt=[[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]];
 const fs=[[[4,5,6,7],1.10],[[0,1,5,4],.87],[[1,2,6,5],.80],[[2,3,7,6],.74],[[3,0,4,7],.92]];
 for(const [idx,tint] of fs){const p=idx.map(i=>project(...pt[i]));arr.push({p,depth:p.reduce((a,q)=>a+q.depth,0)/4,color:shade(b.color,tint),stroke:b.name==='Piso'?'#e1d8cb':'#fff2',n:b.name})}}
function drawPoly(points,fill,stroke,wd=.5){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=wd;ctx.strokeStyle=stroke;ctx.stroke()}}
function draw(){if(!ctx)return;raf=0;const ratio=Math.min(2,window.devicePixelRatio||1);w=canvas.clientWidth;h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio)){canvas.width=Math.floor(w*ratio);canvas.height=Math.floor(h*ratio)}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#f4efe8');bg.addColorStop(1,'#e8ded1');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // Placas de zonas no chão, como caixas rasas.
 let floorFaces=[];for(const b of boxes){if(b.name==='Piso')addFaces(floorFaces,b)}for(const z of zones)addFaces(floorFaces,{...z,y:-.015,h:.024});floorFaces.sort((a,b)=>a.depth-b.depth);for(const f of floorFaces)drawPoly(f.p,f.color,f.stroke);let faces=[];for(const b of boxes){if(b.name!=='Piso')addFaces(faces,b)}faces.sort((a,b)=>a.depth-b.depth);for(const f of faces)drawPoly(f.p,f.color,f.stroke);
 // Etiquetas de setores: brilho branco, mantidas sobre a geometria.
 ctx.textAlign='center';ctx.textBaseline='middle';for(const l of labels){const p=project(l.x,l.y,l.z);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;const font=l.name.length>20?9:10;ctx.font=`700 ${font}px system-ui,Segoe UI,sans-serif`;const wd=Math.min(w-12,ctx.measureText(l.name).width+15);ctx.fillStyle='rgba(255,255,255,.83)';ctx.beginPath();ctx.roundRect(p.x-wd/2,p.y-10,wd,20,5);ctx.fill();ctx.fillStyle='#483d34';ctx.fillText(l.name,p.x,p.y)}
 for(const [key,b] of Object.entries(buttons)){const m=posMap[key],p=project(m.x,m.y,m.z);b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.display=p.x<16||p.x>w-16||p.y<16||p.y>h-16?'none':'flex';b.className='aug3d-hot '+(statuses[key]||'green')+(selected===key?' selected':'')}
}
function requestDraw(){draw()}
function focus(k){if(!posMap[k])return;selected=k;const p=posMap[k];tx=Math.max(8,Math.min(24,p.x));tz=Math.max(7,Math.min(22,p.z));zoom=1.32;requestDraw();if(tip)tip.textContent=p.name+' — clique no marcador para ver a situação.'}
function reset(){selected='grill';tx=16;tz=15;zoom=.86;yaw=-.65;pitch=.91;requestDraw()}
function setStatuses(s){Object.assign(statuses,s||{});requestDraw()}
function mount(target){if(mounted)return;canvas=target;root=target.parentNode;ctx=canvas.getContext('2d',{alpha:false});layer=document.createElement('div');layer.className='aug3d-layer';root.appendChild(layer);for(const [key,p] of Object.entries(posMap)){const b=document.createElement('button');b.type='button';b.dataset.point=key;b.className='aug3d-hot';b.title=p.name;b.textContent={grill:'♨',scale:'⚖',cubas:'▤',entry:'↥'}[key];b.addEventListener('click',()=>{selected=key;focus(key);if(typeof window.onAugustaHotspot==='function')window.onAugustaHotspot(key)});layer.appendChild(b);buttons[key]=b}
 tip=document.getElementById('modelInfo');let active=false,px=0,py=0;
 canvas.addEventListener('pointerdown',e=>{active=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!active)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;yaw+=dx*.008;pitch=Math.max(.44,Math.min(1.45,pitch+dy*.004));requestDraw()});
 canvas.addEventListener('pointerup',()=>active=false);canvas.addEventListener('pointercancel',()=>active=false);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.60,Math.min(2.6,zoom*(e.deltaY>0?.90:1.10)));requestDraw()},{passive:false});
 const obs=new ResizeObserver(requestDraw);obs.observe(root);mounted=true;requestDraw()}
window.Augusta3D={mount,reset,focus,setStatuses,hasPoint:k=>!!posMap[k],render:requestDraw,layout:{boxes,zones,labels,markers}};
})();
