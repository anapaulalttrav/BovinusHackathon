/* Bovinus — balança 3D WebGL autocontida.
   Modelo/visor autoral: gira, zoom, frente/traseira; visor é textura dinâmica tocável.
   Captura real: getUserMedia (exige localhost ou HTTPS), sem upload até comando Analisar IA.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id),cats=['carne','acompanhamentos','saladas','outros'];
const names={carne:'Carnes',acompanhamentos:'Acompanhamentos',saladas:'Saladas',outros:'Outros'};
const palette={carne:'#965340',acompanhamentos:'#d5aa50',saladas:'#78a170',outros:'#a7a3a0'};
const scenarios={equilibrado:{peso:540,mix:{carne:40,acompanhamentos:30,saladas:20,outros:10}},carne:{peso:680,mix:{carne:70,acompanhamentos:15,saladas:10,outros:5}},salada:{peso:440,mix:{carne:15,acompanhamentos:20,saladas:60,outros:5}}};
let weight=540,price=119,costs={carne:65,acompanhamentos:18,saladas:14,outros:28};
let mix={...scenarios.equilibrado.mix},source='demo',observation='Cenário demonstrativo — não é leitura por IA.',confidence=null;
let captured=null,image=null,stream=null,cameraLive=false,apiEnabled=false,tab='pesagem',notice='Selecione a câmera ou um cenário demonstrativo.',busy=false;
let foodMeshes=[];
let rx=.43,ry=-.35,tx=rx,ty=ry,z=.88,tz=.88,spinning=false,hits=[],screenDirty=true,lastPaint=0;
const canvas=$('viewer'),stage=$('stage'),fallback=$('fallback'),video=$('video'),photo=$('photo'),liveContext=document.createElement('canvas').getContext('2d');
const cnv=document.createElement('canvas');cnv.width=1152;cnv.height=720;const ctx=cnv.getContext('2d');
const currency=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const rounded=v=>Math.round(v*100)/100;
function totalCost(){return Object.entries(mix).reduce((s,[k,p])=>s+weight/1000*p/100*costs[k],0)}
function metrics(){const receita=weight/1000*price,custo=totalCost();return{receita,custo,cmv:receita?100*custo/receita:0,contrib:cats.map(k=>({k,gramas:weight*mix[k]/100,custo:weight/1000*mix[k]/100*costs[k]})).sort((a,b)=>b.custo-a.custo)}}
function setMessage(msg,error=false){notice=msg;$('status').textContent=msg;$('status').classList.toggle('error',error);paint();}
function toast(msg){const e=$('toast');e.textContent=msg;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',3500)}
function normalizeMix(inp){const a=Object.fromEntries(cats.map(k=>[k,Math.max(0,Number(inp[k])||0)]));let s=cats.reduce((t,k)=>t+a[k],0);if(!s)return{carne:0,acompanhamentos:0,saladas:0,outros:100};cats.forEach(k=>a[k]=Math.round(a[k]*1000/s)/10);a.outros=Math.round((a.outros+100-cats.reduce((t,k)=>t+a[k],0))*10)/10;return a}
function changePct(key,delta){let target=Math.max(0,Math.min(100,Math.round((mix[key]+delta)*10)/10));const rest=cats.filter(k=>k!==key);let sum=rest.reduce((s,k)=>s+mix[k],0);let other={...mix,[key]:target};rest.forEach(k=>other[k]=sum>0?Math.round((100-target)*mix[k]/sum*10)/10:Math.round((100-target)/rest.length*10)/10);other[rest[rest.length-1]]=Math.round((other[rest[rest.length-1]]+100-cats.reduce((s,k)=>s+other[k],0))*10)/10;mix=normalizeMix(other);syncControls();refreshFood();setMessage('Composição visual ajustada manualmente.');}
function syncControls(){const m=metrics();$('weight').value=weight;$('price').value=price;$('revenue').textContent=currency(m.receita);$('cost').textContent=currency(m.custo);$('cmv').textContent=m.cmv.toFixed(1)+'%';
  $('source').textContent=`Origem: ${source==='ia_real'?'análise visual por IA':source==='demo'?'cenário ilustrativo':'estimativa corrigida manualmente'}. ${observation}`;
  cats.forEach(k=>{const cost=document.querySelector(`[data-cost="${k}"]`),pct=document.querySelector(`[data-pct="${k}"]`);if(cost)cost.value=costs[k];if(pct)pct.value=mix[k]});paint()}
function buildFields(){let holder=$('costs');holder.innerHTML='<div class="costrow" style="font-size:10px;color:#8e8174;font-weight:800"><span>Categoria</span><span>Custo R$/kg</span><span>Mix %</span></div>';
 cats.forEach(k=>{const row=document.createElement('div');row.className='costrow';row.innerHTML=`<label for="c-${k}">${names[k]}</label><input id="c-${k}" data-cost="${k}" type="number" min="0" max="1000" step="0.5" value="${costs[k]}" aria-label="Custo kg ${names[k]}"><input id="p-${k}" data-pct="${k}" type="number" min="0" max="100" step="1" value="${mix[k]}" aria-label="Percentual ${names[k]}">`;holder.appendChild(row);
 row.querySelector('[data-cost]').onchange=e=>{costs[k]=Math.max(0,Math.min(1000,Number(e.target.value)||0));syncControls()};
 row.querySelector('[data-pct]').onchange=e=>{let v=Number(e.target.value);if(Number.isFinite(v))changePct(k,v-mix[k])};
 });}
function loadDemo(){const d=scenarios[$('scenario').value];weight=d.peso;mix={...d.mix};source='demo';captured=null;image=null;observation='Dados 100% ilustrativos para demonstrar o cálculo de CMV.';confidence=null;showPhoto();refreshFood();syncControls();setMessage('Cenário demonstrativo carregado — não houve análise por IA.');}
function showPhoto(){video.style.display=cameraLive?'block':'none';photo.style.display=captured&&!cameraLive?'block':'none';if(captured)photo.src=captured;$('video-placeholder').style.display=cameraLive||captured?'none':'block';$('capture-btn').disabled=!cameraLive;$('analyze-btn').disabled=!captured||busy;}
async function toggleCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;cameraLive=false;video.srcObject=null;$('camera-btn').textContent='Ligar câmera';$('camera-badge').textContent='Câmera desligada';$('camera-badge').className='tag warn';showPhoto();paint();return;}
 try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Câmera exige HTTPS ou localhost, além de navegador compatível.');stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});video.srcObject=stream;await video.play();cameraLive=true;$('camera-btn').textContent='Desligar câmera';$('camera-badge').textContent='Câmera real ativa';$('camera-badge').className='tag ok';setMessage('Câmera real conectada. Enquadre somente o prato e clique Fotografar.');showPhoto();}
 catch(e){setMessage('Não foi possível ativar a câmera: '+String(e.message||e),true);}
}
function imageToJpeg(img,finish){let w=img.naturalWidth||img.videoWidth||900,h=img.naturalHeight||img.videoHeight||700;let scale=Math.min(1,960/Math.max(w,h));const can=document.createElement('canvas');can.width=Math.max(2,Math.round(w*scale));can.height=Math.max(2,Math.round(h*scale));const c=can.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,can.width,can.height);c.drawImage(img,0,0,can.width,can.height);finish(can.toDataURL('image/jpeg',.78));}
function acceptPhoto(url){captured=url;image=new Image();image.onload=()=>paint();image.src=url;cameraLive=false;showPhoto();source='demo';observation='Foto real capturada, mas os percentuais continuam demonstrativos até análise por IA ou correção manual.';setMessage('Fotografia capturada. Clique em Analisar com IA para reconhecer visualmente.');}
function capture(){if(!stream||video.readyState<2){setMessage('A câmera ainda não está pronta.',true);return}imageToJpeg(video,acceptPhoto);stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;$('camera-btn').textContent='Ligar câmera';$('camera-badge').textContent='Foto capturada';$('camera-badge').className='tag ok';showPhoto()}
async function uploadFile(file){if(!file)return;if(!file.type.startsWith('image/')){setMessage('Selecione uma imagem de prato.',true);return;}const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{imageToJpeg(img,acceptPhoto);URL.revokeObjectURL(url)};img.onerror=()=>{URL.revokeObjectURL(url);setMessage('Não foi possível abrir a foto.',true)};img.src=url}
async function analyze(){if(!captured){setMessage('Fotografe o prato ou selecione uma imagem primeiro.',true);return}if(!apiEnabled){setMessage('IA indisponível: configure OPENAI_API_KEY no terminal do VS Code. A câmera real já está funcionando.',true);return}busy=true;$('analyze-btn').disabled=true;setMessage('IA analisando a fotografia real…');
 try{const res=await fetch('/api/analisar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imagem:captured})});const data=await res.json();if(!res.ok)throw Error(data.detail||`HTTP ${res.status}`);
 mix=normalizeMix(data.percentuais);source='ia_real';confidence=data.confianca;observation=data.observacao;tab='composicao';refreshFood();syncControls();setMessage('IA concluiu estimativa visual. Confira e corrija os percentuais antes de salvar.');}
 catch(e){setMessage('Não foi possível analisar: '+String(e.message),true)}finally{busy=false;showPhoto()}}
async function save(){const payload={peso_g:weight,preco_kg:price,percentuais:mix,custos_kg:costs,origem:source,observacao:observation};try{const res=await fetch('/api/pesagens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail));setMessage(`Pesagem #${data.id} salva. CMV estimado: ${data.cmv_percent}%`);toast('Pesagem registrada no painel de custos.');tab='gastos';paint();}
 catch(e){setMessage('Falha ao salvar: '+String(e.message),true)}}
$('weight').oninput=e=>{weight=Math.round(Math.max(1,Math.min(2000,Number(e.target.value)||1)));syncControls()};$('price').oninput=e=>{price=Math.max(1,Math.min(1000,Number(e.target.value)||1));syncControls()};
$('camera-btn').onclick=toggleCamera;$('capture-btn').onclick=capture;$('analyze-btn').onclick=analyze;$('save-btn').onclick=save;$('demo-btn').onclick=loadDemo;$('upload').onchange=e=>uploadFile(e.target.files?.[0]);
buildFields();syncControls();showPhoto();fetch('/api/health').then(r=>r.json()).then(d=>{apiEnabled=d.ia_habilitada;$('ia-badge').textContent=apiEnabled?'IA configurada':'IA sem chave (modo demo)';$('ia-badge').className='tag '+(apiEnabled?'ok':'warn');}).catch(()=>{$('ia-badge').textContent='Servidor indisponível'});
window.addEventListener('beforeunload',()=>{stream?.getTracks().forEach(t=>t.stop())});
// Live surface graphics: all touchscreen actions happen inside the physically projected 3D display.
function rect(x,y,w,h,r,fill,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke()}}
function label(t,x,y,size=23,color='#292723',bold=false,align='left'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${bold?800:500} ${size}px Segoe UI,Arial,sans-serif`;ctx.fillStyle=color;ctx.fillText(String(t),x,y)}
function btn(x,y,w,h,text,fn,active=false,disabled=false){rect(x,y,w,h,15,active?'#8b302c':disabled?'#ddd8d1':'#ffffff',active?null:'#e5ded4');label(text,x+w/2,y+h/2,22,active?'#fff':disabled?'#a5a19c':'#65423b',true,'center');if(!disabled)hits.push({x,y,w,h,fn})}
function screenPaint(){hits=[];rect(0,0,1152,720,0,'#f8f7f3');rect(0,0,1152,103,0,'#742f2b');label('BOVINUS',34,42,43,'#ffffff',true);label('BALANÇA INTELIGENTE 3D',35,79,17,'#f6d8bc');rect(894,20,224,60,13,'#fff2');label(`${weight} g`,1007,50,34,'#fff',true,'center');
  rect(20,116,1112,61,13,'#ffffff','#e7ded4');[['pesagem','PESAGEM'],['composicao','COMPOSIÇÃO'],['gastos','CUSTOS']].forEach(([id,t],i)=>{const x=27+i*367;rect(x,124,356,45,10,tab===id?'#efe1da':'#ffffff');label(t,x+178,147,19,tab===id?'#832c28':'#776e66',true,'center');hits.push({x,y:124,w:356,h:45,fn:()=>{tab=id;paint()}})});
 const m=metrics();
 if(tab==='pesagem'){
  label('Imagem do prato',35,224,30,'#292623',true);
  rect(33,256,578,292,15,'#eee9df','#e3d7c9');
  if(cameraLive&&video.readyState>=2){ctx.save();ctx.beginPath();ctx.roundRect(42,264,561,274,10);ctx.clip();const aspect=video.videoWidth/video.videoHeight||1.5;let w=561,h=w/aspect;if(h<274){h=274;w=h*aspect}ctx.drawImage(video,42+(561-w)/2,264+(274-h)/2,w,h);ctx.restore();}
  else if(image&&image.complete&&captured){const sc=Math.min(552/image.width,270/image.height);ctx.drawImage(image,42+(561-image.width*sc)/2,267+(274-image.height*sc)/2,image.width*sc,image.height*sc)}
  else{label('PRATO A SER ANALISADO',322,374,24,'#988a7b',true,'center');label('Ative a webcam ou escolha uma foto',322,421,18,'#a29487',false,'center')}
  rect(638,256,475,292,16,'#ffffff','#e7ded4');label('PESO INFORMADO',664,286,19,'#80746b',true);label(`${weight} g`,665,355,70,'#262923',true);label('PREÇO POR KG',664,412,18,'#80746b',true);label(currency(price),665,456,35,'#8c3530',true);label('Sem integração com sensor físico',665,505,17,'#aa8063');
  btn(36,576,256,64,cameraLive?'FOTOGRAFAR':'LIGAR CÂMERA',cameraLive?capture:toggleCamera,true);
  btn(307,576,256,64,'ANALISAR COM IA',analyze,false,!captured||!apiEnabled||busy);
  btn(580,576,253,64,'CENÁRIO DEMO',loadDemo);
  btn(849,576,267,64,'SALVAR PESAGEM',save,true);
 }else if(tab==='composicao'){
  label('Composição visual estimada',33,222,30,'#26251f',true);
  label('Corrija a distribuição antes de usar os valores gerenciais.',33,259,18,'#776b61');
  cats.forEach((cat,i)=>{let y=301+i*77;rect(34,y,1082,68,12,'#ffffff','#e8e0d6');rect(46,y+14,11,40,4,palette[cat]);label(names[cat],75,y+29,23,'#3a3731',true);label(`${mix[cat].toFixed(1)}%`,699,y+30,26,'#8c3530',true,'right');btn(780,y+10,70,50,'−',()=>changePct(cat,-5));btn(858,y+10,70,50,'+',()=>changePct(cat,5));label(currency(m.contrib.find(c=>c.k===cat)?.custo||0),1096,y+30,22,'#3b3d37',true,'right')});
  rect(35,634,1080,60,13,'#f0e8dc');label(`Fonte: ${source==='ia_real'?'IA visual':source==='demo'?'DEMONSTRAÇÃO':'AJUSTE MANUAL'}`,52,665,21,'#74513c',true);btn(839,639,266,49,'REGISTRAR',save,true);
 }else{
  label('Resumo do custo alimentar',35,225,30,'#252522',true);
  const blocks=[['RECEITA ESTIMADA',currency(m.receita)],['CUSTO ALIMENTAR',currency(m.custo)],['CMV ESTIMADO',m.cmv.toFixed(1)+'%']];blocks.forEach(([t,val],i)=>{let x=35+i*366;rect(x,268,345,163,17,'#fff','#e9e2d9');label(t,x+17,302,18,'#8f7769',true);label(val,x+17,359,39,i===1?'#913d35':'#2c3028',true)});
  const biggest=m.contrib[0];rect(35,461,1081,119,15,'#f2e8df');label('MAIOR CONTRIBUIÇÃO PARA O GASTO NESTE PRATO',56,492,17,'#816453',true);label(`${names[biggest.k]}  ·  ${currency(biggest.custo)}`,56,539,33,'#822d2a',true);
  btn(35,601,355,70,'CORRIGIR COMPOSIÇÃO',()=>{tab='composicao';paint()});btn(410,601,343,70,'SALVAR PESAGEM',save,true);btn(777,601,337,70,'NOVO CENÁRIO',loadDemo);
 }
 // fixed footer and operating status
 rect(0,693,1152,27,0,'#eee9e2');label((source==='ia_real'?'IA VISUAL · ESTIMATIVA':source==='demo'?'DADOS DEMONSTRATIVOS':'CORRIGIDO MANUALMENTE')+'     ·     '+(cameraLive?'CÂMERA AO VIVO':captured?'FOTO CAPTURADA':'SEM FOTO'),20,706,14,'#76655a',true);
 screenDirty=true;
}
function paint(){screenPaint()}
// WebGL without external libraries; preview works offline on localhost, camera still requires browser consent.
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
if(!gl){
 // CSS 3D fallback preserves a touchable live screen when WebGL is blocked.
 fallback.style.display='flex'; $('render-status').textContent='3D compatível';
 const css=document.createElement('style');css.textContent=`
 .fallback{inset:0;overflow:hidden;display:flex;perspective:1200px;touch-action:none;background:transparent;border:0}
 .fb-obj{position:relative;width:min(83%,650px);height:min(82%,530px);transform-style:preserve-3d;transform:rotateX(11deg) rotateY(-11deg) scale(.95);filter:drop-shadow(11px 25px 22px #3e342a40);transition:transform .06s linear}
 .fb-display{position:absolute;z-index:3;top:2%;left:9%;width:82%;height:53%;padding:13px;border:12px solid #30383b;border-radius:19px;background:#151b1e;box-shadow:inset 0 0 0 3px #a7aaab,0 8px 0 #707577,0 11px 0 #464c4e;transform:translateZ(-12px)}
 .fb-display:before{content:'';position:absolute;left:calc(50% - 16px);top:-11px;width:32px;height:11px;border-radius:0 0 10px 10px;background:#171f22;box-shadow:inset 0 0 0 2px #424b50}
 .fb-display:after{content:'';position:absolute;left:calc(50% - 4px);top:-9px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 38% 38%,#98bfd0 0 22%,#1b3848 35% 57%,#050d15 65%)}
 .fb-display canvas{display:block;width:100%;height:100%;cursor:pointer;background:#f5f4f1;border-radius:4px;touch-action:none}
 .fb-stem{position:absolute;z-index:1;top:54%;left:47%;width:6%;height:31%;background:linear-gradient(90deg,#454c50 0%,#a9aeb0 45%,#464d50 100%);transform:translateZ(-45px);box-shadow:4px 0 8px #17212a22}
 .fb-base{position:absolute;z-index:2;bottom:2%;left:7%;width:86%;height:25%;border:9px solid #555e61;background:linear-gradient(160deg,#e6e8e6,#aeb6b8 48%,#7e898e);border-radius:24px;transform:rotateX(52deg) translateZ(42px);box-shadow:0 12px 0 #41484a,0 24px 14px #33292324}
 .fb-base:after{content:'BOVINUS';position:absolute;right:19px;bottom:2px;color:#536065;font-size:10px;font-weight:900;letter-spacing:3px}
 .fb-plate{position:absolute;z-index:4;bottom:8%;left:33%;width:34%;height:10%;border-radius:50%;background:#eef0eb;border:10px solid #d2d7d5;transform:rotateX(59deg) translateZ(74px);box-shadow:0 7px 0 #9fa6a4,0 15px 12px #393c3b30}
 .fb-food{position:absolute;z-index:5;bottom:7%;left:37%;width:26%;height:9%;border-radius:50%;transform:rotateX(58deg) translateZ(89px);pointer-events:none}
 .fb-food i{position:absolute;display:block;filter:drop-shadow(1px 2px 1px #3d352e35);border:1px solid #ffffff44}
 .fb-food i:nth-child(1){left:12%;top:9%;width:35%;height:46%;border-radius:50% 45% 41% 42%;background:linear-gradient(128deg,#ae7656,#75422e 59%,#c28e67);transform:rotate(-14deg)}
 .fb-food i:nth-child(2){left:51%;top:11%;width:35%;height:49%;border-radius:45%;background:radial-gradient(circle at 36% 43%,#f6e2a6,#d9b771);transform:rotate(13deg)}
 .fb-food i:nth-child(3){left:12%;top:45%;width:41%;height:39%;border-radius:56% 22% 54% 21%;background:linear-gradient(130deg,#467d56,#a0c77b,#569264)}
 .fb-food i:nth-child(4){left:52%;top:55%;width:27%;height:29%;border-radius:53%;background:linear-gradient(140deg,#d6ad62,#bd7c45,#d9b871)}
 .fb-camlabel{position:absolute;z-index:5;top:2%;left:50%;transform:translateX(-50%) translateZ(4px);width:27px;height:6px;border-radius:5px;background:#0c161a;pointer-events:none}
 .fb-guide{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);padding:6px 12px;border-radius:20px;background:#fffdf1e8;font-size:10px;color:#695448;pointer-events:none;white-space:nowrap}
 @media(max-width:670px){.fb-obj{width:96%;height:66%}.fb-display{border-width:6px;padding:5px}.fb-guide{bottom:5px}}
 `;document.head.appendChild(css);
 fallback.innerHTML='<div class="fb-obj" id="fb-obj"><div class="fb-display" id="fb-display"></div><div class="fb-stem"></div><div class="fb-base"></div><div class="fb-plate" id="fb-plate" title="Prato ilustrativo"></div><div class="fb-food" id="fb-food"><i></i><i></i><i></i><i></i></div><div class="fb-camlabel"></div></div><div class="fb-guide">CÂMERA EMBUTIDA NO VISOR · GIRE E CLIQUE NA TELA</div>';
 $('fb-display').appendChild(cnv);
 let fax=11,fay=-11,fzoom=.95,drag=null;const device=$('fb-obj');
 function draw(){device.style.transform=`rotateX(${fax}deg) rotateY(${fay}deg) scale(${fzoom})`}
 function fbset(a,b){fax=a;fay=b;draw();spinning=false;$('spin').classList.remove('active')}
 $('front').onclick=()=>fbset(0,0);$('angle').onclick=()=>fbset(11,-11);$('top').onclick=()=>fbset(43,-12);$('back').onclick=()=>fbset(0,180);
 $('reset').onclick=()=>{fbset(11,-11);fzoom=.95;$('zoom').value='95';draw()};$('zoom').oninput=e=>{fzoom=Number(e.target.value)/100;draw()};
 $('spin').onclick=()=>{spinning=!spinning;$('spin').classList.toggle('active',spinning)};
 setInterval(()=>{if(spinning){fay+=1.2;draw()}if(cameraLive)paint()},160);
 cnv.addEventListener('pointerdown',e=>{cnv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ax:fax,ay:fay,moved:false}});
 cnv.addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;if(drag.moved){fax=Math.max(-72,Math.min(72,drag.ax+dy*.3));fay=drag.ay+dx*.3;draw()}});
 cnv.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved)return;const r=cnv.getBoundingClientRect(),x=(e.clientX-r.left)*cnv.width/r.width,y=(e.clientY-r.top)*cnv.height/r.height;let hit=hits.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);if(hit)hit.fn()});
 fallback.addEventListener('wheel',e=>{e.preventDefault();fzoom=Math.max(.65,Math.min(1.55,fzoom-e.deltaY*.0007));$('zoom').value=Math.round(fzoom*100);draw()},{passive:false});
 refreshFood();paint();draw();return;
}
const vs=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aUV;uniform mat4 uMVP;uniform mat4 uModel;varying vec2 vUV;varying vec3 vN;void main(){gl_Position=uMVP*vec4(aP,1.0);vUV=aUV;vN=mat3(uModel)*aN;}`;
const fs=`precision mediump float;varying vec2 vUV;varying vec3 vN;uniform sampler2D uTex;uniform float uTextured;uniform vec3 uColor;void main(){vec3 n=normalize(vN);vec3 light=normalize(vec3(-.28,.9,1.18));float dif=.76+.24*max(dot(n,light),0.);vec3 col=uTextured>.5?texture2D(uTex,vUV).rgb:uColor;gl_FragColor=vec4(col*dif,1.);}`;
function shader(kind,src){const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}catch(e){console.error(e);fallback.style.display='flex';$('render-status').textContent='Erro WebGL';return}
gl.useProgram(program);const ap=gl.getAttribLocation(program,'aP'),an=gl.getAttribLocation(program,'aN'),auv=gl.getAttribLocation(program,'aUV'),umvp=gl.getUniformLocation(program,'uMVP'),umodel=gl.getUniformLocation(program,'uModel'),utext=gl.getUniformLocation(program,'uTextured'),ucol=gl.getUniformLocation(program,'uColor'),utex=gl.getUniformLocation(program,'uTex');
const buf=gl.createBuffer(),tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(utex,0);
function t(A,a,b,c){A.push(...a,...b,...c)}
function cube(w,h,d,x,y,z){const A=[],hw=w/2,hh=h/2,hd=d/2;let faces=[[[x-hw,y-hh,z+hd],[x+hw,y-hh,z+hd],[x+hw,y+hh,z+hd],[x-hw,y+hh,z+hd],[0,0,1]],[[x+hw,y-hh,z-hd],[x-hw,y-hh,z-hd],[x-hw,y+hh,z-hd],[x+hw,y+hh,z-hd],[0,0,-1]],[[x-hw,y+hh,z+hd],[x+hw,y+hh,z+hd],[x+hw,y+hh,z-hd],[x-hw,y+hh,z-hd],[0,1,0]],[[x+hw,y-hh,z+hd],[x-hw,y-hh,z+hd],[x-hw,y-hh,z-hd],[x+hw,y-hh,z-hd],[0,-1,0]],[[x+hw,y+hh,z+hd],[x+hw,y-hh,z+hd],[x+hw,y-hh,z-hd],[x+hw,y+hh,z-hd],[1,0,0]],[[x-hw,y-hh,z+hd],[x-hw,y+hh,z+hd],[x-hw,y+hh,z-hd],[x-hw,y-hh,z-hd],[-1,0,0]]];for(const f of faces){const p=f.slice(0,4).map((v,i)=>[...v,...f[4],i==1||i==2?1:0,i>=2?1:0]);t(A,p[0],p[1],p[2]);t(A,p[0],p[2],p[3])}return new Float32Array(A)}
function plane(w,h,x,y,z){const a=[],l=x-w/2,r=x+w/2,b=y-h/2,tp=y+h/2;let p0=[l,b,z,0,0,1,0,0],p1=[r,b,z,0,0,1,1,0],p2=[r,tp,z,0,0,1,1,1],p3=[l,tp,z,0,0,1,0,1];t(a,p0,p1,p2);t(a,p0,p2,p3);return new Float32Array(a)}
// Local camera forward (+Z) is aimed at the plate centre; body and optical lens share its axis.
function orientedGeometry(geo,origin,target){
 const len=Math.hypot(target[0]-origin[0],target[1]-origin[1],target[2]-origin[2]);
 const forward=[(target[0]-origin[0])/len,(target[1]-origin[1])/len,(target[2]-origin[2])/len];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)};
 const right=norm(cross([0,1,0],forward)),up=cross(forward,right);
 const A=new Float32Array(geo.length);
 for(let i=0;i<geo.length;i+=8){const x=geo[i],y=geo[i+1],z=geo[i+2],nx=geo[i+3],ny=geo[i+4],nz=geo[i+5];
  for(let k=0;k<3;k++){A[i+k]=origin[k]+right[k]*x+up[k]*y+forward[k]*z;A[i+3+k]=right[k]*nx+up[k]*ny+forward[k]*nz;}
  A[i+6]=geo[i+6];A[i+7]=geo[i+7];
 }
 return A;
}
function circleZ(r,depth){const A=[],N=32,z=depth/2;for(let i=0;i<N;i++){
 const a=i*Math.PI*2/N,b=(i+1)*Math.PI*2/N;
 t(A,[0,0,z,0,0,1,0,0],[Math.cos(a)*r,Math.sin(a)*r,z,0,0,1,0,0],[Math.cos(b)*r,Math.sin(b)*r,z,0,0,1,0,0]);
 }return new Float32Array(A)}
function circleY(x,y,z,r,h){let A=[],N=48;for(let i=0;i<N;i++){let q=i*Math.PI*2/N,s=(i+1)*Math.PI*2/N;let x1=x+Math.cos(q)*r,z1=z+Math.sin(q)*r,x2=x+Math.cos(s)*r,z2=z+Math.sin(s)*r;t(A,[x,y+h/2,z,0,1,0,0,0],[x1,y+h/2,z1,0,1,0,0,0],[x2,y+h/2,z2,0,1,0,0,0]);t(A,[x1,y-h/2,z1,0,-1,0,0,0],[x,y-h/2,z,0,-1,0,0,0],[x2,y-h/2,z2,0,-1,0,0,0]);const nx=Math.cos((q+s)/2),nz=Math.sin((q+s)/2);t(A,[x1,y-h/2,z1,nx,0,nz,0,0],[x2,y-h/2,z2,nx,0,nz,1,0],[x2,y+h/2,z2,nx,0,nz,1,1]);t(A,[x1,y-h/2,z1,nx,0,nz,0,0],[x2,y+h/2,z2,nx,0,nz,1,1],[x1,y+h/2,z1,nx,0,nz,0,1]);}return new Float32Array(A)}
function sectorY(start,share,col){let A=[],cx=0,y=-1.415,cz=1.27,r=.93,N=Math.max(3,Math.ceil(share/4)),from=start*Math.PI*2,to=(start+share)*Math.PI*2;for(let i=0;i<N;i++){let a=from+(to-from)*i/N,b=from+(to-from)*(i+1)/N;t(A,[cx,y,cz,0,1,0,0,0],[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r,0,1,0,0,0],[cx+Math.cos(b)*r,y,cz+Math.sin(b)*r,0,1,0,0,0])}return {geo:new Float32Array(A),col:hex(col)}}
function hex(s){return[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255]}
// Redesigned countertop scale: a single elegant spine, low platform and flush optical sensor.
// Dimensions are concept proportions, not certified product dimensions.
function ellipsoid(cx,cy,cz,rx,ry,rz){const A=[],L=8,N=14;
 const pos=(a,b)=>{const sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b);const x=rx*sa*cb,y=ry*ca,z=rz*sa*sb;const nx=x/(rx*rx),ny=y/(ry*ry),nz=z/(rz*rz),dl=Math.hypot(nx,ny,nz)||1;return[cx+x,cy+y,cz+z,nx/dl,ny/dl,nz/dl,0,0]};
 for(let j=0;j<L;j++){const a0=Math.PI*j/L,a1=Math.PI*(j+1)/L;for(let i=0;i<N;i++){const b0=2*Math.PI*i/N,b1=2*Math.PI*(i+1)/N;const p0=pos(a0,b0),p1=pos(a0,b1),p2=pos(a1,b1),p3=pos(a1,b0);t(A,p0,p1,p2);t(A,p0,p2,p3)}}return new Float32Array(A)}
const mesh=[
 // compact dark graphite base with stainless-steel lip and spacious top deck
 {geo:cube(5.10,.25,3.56,0,-1.92,.91),col:hex('#3d494e')},
 {geo:cube(5.08,.09,3.52,0,-1.77,.91),col:hex('#9da8ab')},
 {geo:cube(4.94,.075,3.36,0,-1.695,.91),col:hex('#dce1df')},
 {geo:cube(3.32,.065,2.70,0,-1.61,1.10),col:hex('#b9c5c8')},
 {geo:cube(3.22,.035,2.60,0,-1.565,1.10),col:hex('#d7dddd')},
 // solid, slim pedestal physically joined to the back of the base and to the display
 {geo:cube(.60,1.35,.48,0,-.96,-.62),col:hex('#626b6f')},
 {geo:cube(.52,1.33,.36,0,-.95,-.38),col:hex('#b2bbbc')},
 // screen housing: minimal graphite frame / flush white bezel / LCD interactive surface
 {geo:cube(4.77,3.08,.24,0,.95,-.79),col:hex('#323c41')},
 {geo:cube(4.57,2.86,.055,0,.95,-.645),col:hex('#e4e7e5')},
 {geo:cube(4.48,2.80,.025,0,.95,-.604),col:hex('#20282b')},
 {geo:plane(4.40,2.75,0,.95,-.575),col:[1,1,1],tex:true},
 // miniature sensor embedded into the upper bezel: no external boom or hanging arm
 {geo:cube(.53,.095,.11,0,2.447,-.62),col:hex('#1c272c')},
 {geo:orientedGeometry(circleZ(.068,.006),[0,2.441,-.548],[0,-1.36,1.11]),col:hex('#80b7c1')},
 {geo:orientedGeometry(circleZ(.034,.016),[0,2.441,-.541],[0,-1.36,1.11]),col:hex('#172c3c')},
 // realistic looking food plate centred directly under camera's downward optical axis
 {geo:circleY(0,-1.48,1.23,1.09,.095),col:hex('#f3f3ed')},
 {geo:circleY(0,-1.43,1.23,.93,.018),col:hex('#f8f9f5')},
];

function refreshFood(){
 // Distinct food clusters make the digital twin resemble a meal rather than a 3D pie chart.
 const zones={carne:[-.39,1.34],acompanhamentos:[.36,1.38],saladas:[.02,.72],outros:[.43,.85]};
 const realColors={carne:['#99543a','#7c4631','#af6a4a'],acompanhamentos:['#e7c26f','#dcb46a','#f1d898'],saladas:['#598a56','#7baa63','#45805d'],outros:['#c77c43','#af914f','#bdb789']};
 foodMeshes=[];
 cats.forEach((k,ki)=>{const pc=mix[k];if(pc<1)return;const count=Math.max(1,Math.min(7,Math.round(pc/12)));const loc=zones[k];for(let i=0;i<count;i++){
   const a=i*2.399+ki*.31,rad=.06+Math.sqrt((i+.5)/count)*.22;
   const xx=loc[0]+Math.cos(a)*rad,zz=loc[1]+Math.sin(a)*rad;
   const f=Math.max(.55,Math.min(1.25,pc/35));
   const rx=(k==='saladas'?.19:.21)*f,ry=(k==='saladas'?.095:.10)*f,rz=(k==='carne'?.24:.18)*f;
   foodMeshes.push({geo:ellipsoid(xx,-1.352+ry*.42,zz,rx,ry,rz),col:hex(realColors[k][i%3])});
 }});
 const fp=document.getElementById('fb-food');if(fp){[...fp.querySelectorAll('i')].forEach((el,i)=>{const pct=mix[cats[i]];el.style.opacity=pct>1?'1':'0';el.style.scale=String(Math.max(.45,Math.min(1.35,pct/35)));});}screenDirty=true;
}
refreshFood();
function I(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function mat(a,b){let o=new Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o}
function rotX(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
function rotY(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
function tzf(a){let m=I();m[14]=a;return m}
function projection(aspect){let f=1/Math.tan(Math.PI/7),n=.1,far=100,m=new Array(16).fill(0);m[0]=f/aspect;m[5]=f;m[10]=(far+n)/(n-far);m[11]=-1;m[14]=2*far*n/(n-far);return m}
function transform(p,m){const[x,y,z,w=1]=p;return[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w]}
let mvp=I(),projCorners=[],model=I();const width3d=4.40,height3d=2.75;
function updateProjection(){model=mat(rotY(ry),rotX(rx));const aspect=canvas.width/canvas.height;mvp=mat(mat(projection(aspect),tzf(-10.6/z)),model);const corners=[[-width3d/2, .95-height3d/2,-.575],[width3d/2, .95-height3d/2,-.575],[width3d/2, .95+height3d/2,-.575],[-width3d/2, .95+height3d/2,-.575]];projCorners=corners.map(p=>{let a=transform(p,mvp);return{x:(a[0]/a[3]+1)*canvas.width/2,y:(1-a[1]/a[3])*canvas.height/2,w:a[3]}})}
function paintFrame(now){const rect=canvas.getBoundingClientRect(),dpr=Math.min(1.7,window.devicePixelRatio||1);let w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 if(spinning)ty+=.0045;rx+=(tx-rx)*.13;ry+=(ty-ry)*.13;z+=(tz-z)*.12;
 if(cameraLive&&now-lastPaint>125){screenPaint();lastPaint=now}
 updateProjection();gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.uniformMatrix4fv(umvp,false,new Float32Array(mvp));gl.uniformMatrix4fv(umodel,false,new Float32Array(model));gl.activeTexture(gl.TEXTURE0);
 if(screenDirty){gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cnv);screenDirty=false}
 gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(ap);gl.enableVertexAttribArray(an);gl.enableVertexAttribArray(auv);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(an,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(auv,2,gl.FLOAT,false,32,24);
 for(const item of [...mesh,...foodMeshes]){gl.bufferData(gl.ARRAY_BUFFER,item.geo,gl.STATIC_DRAW);gl.uniform3fv(ucol,new Float32Array(item.col));gl.uniform1f(utext,item.tex?1:0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.drawArrays(gl.TRIANGLES,0,item.geo.length/8)}
 requestAnimationFrame(paintFrame)}
function bary(x,y,a,b,c){const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-8)return null;let l=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,m=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,n=1-l-m;if(Math.min(l,m,n)<-.0001)return null;return[l,m,n]}
function targetTap(x,y){const pts=projCorners,uv=[[0,0],[1,0],[1,1],[0,1]];for(const tri of [[0,1,2],[0,2,3]]){let q=bary(x,y,pts[tri[0]],pts[tri[1]],pts[tri[2]]);if(!q)continue;let den=0,u=0,v=0;tri.forEach((i,j)=>{let factor=q[j]/pts[i].w;den+=factor;u+=uv[i][0]*factor;v+=uv[i][1]*factor});return{x:u/den*cnv.width,y:(1-v/den)*cnv.height}}return null}
function local(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
let start=null;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const p=local(e);start={x:e.clientX,y:e.clientY,tx,ty,drag:false,p};spinning=false;$('spin').classList.remove('active')});canvas.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)start.drag=true;if(start.drag){ty=start.ty+dx*.008;tx=Math.max(-1.45,Math.min(1.45,start.tx+dy*.008));canvas.classList.add('dragging')}});canvas.addEventListener('pointerup',e=>{if(!start)return;let s=start;start=null;canvas.classList.remove('dragging');if(s.drag)return;
 let normal=transform([0,0,1,0],model);if(normal[2]<.28)return;let p=local(e),u=targetTap(p.x,p.y);if(!u)return;const hit=hits.find(h=>u.x>=h.x&&u.x<h.x+h.w&&u.y>=h.y&&u.y<h.y+h.h);if(hit)hit.fn();});canvas.addEventListener('pointercancel',()=>{start=null;canvas.classList.remove('dragging')});canvas.addEventListener('wheel',e=>{e.preventDefault();tz=Math.max(.65,Math.min(1.55,tz-e.deltaY*.0007));$('zoom').value=Math.round(tz*100)},{passive:false});
function orient(a,b){tx=a;ty=b;spinning=false;$('spin').classList.remove('active')}
$('front').onclick=()=>orient(0,0);$('angle').onclick=()=>orient(.43,-.35);$('top').onclick=()=>orient(.91,-.15);$('back').onclick=()=>orient(.10,Math.PI);$('spin').onclick=()=>{spinning=!spinning;$('spin').classList.toggle('active',spinning)};$('reset').onclick=()=>{orient(.43,-.35);tz=.88;$('zoom').value='88'};$('zoom').oninput=e=>tz=Number(e.target.value)/100;
paint();requestAnimationFrame(paintFrame);
})();
