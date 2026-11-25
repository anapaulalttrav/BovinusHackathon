/* Bovinus — tablet tridimensional real (WebGL nativo, sem CDN).
   A interface é uma textura viva dentro do modelo, e os toques são convertidos
   em coordenadas de tela por interseção com a superfície projetada do tablet.
   Escopo: atendimento de salão, bebidas, feedback. */
(()=>{'use strict';
const canvas=document.getElementById('viewer'),scene=document.getElementById('scene'),fallback=document.getElementById('fallback');
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
if(!gl){
  fallback.style.display='flex';
  let x=-12,y=-22,z=1,sp=false;const dev=document.getElementById('fallbackDevice');
  function redraw(){dev.style.transform=`scale(${z}) rotateX(${x}deg) rotateY(${y}deg)`}
  function pos(a,b){x=a;y=b;sp=false;document.getElementById('spin').classList.remove('active');redraw()}
  document.getElementById('front').onclick=()=>pos(0,0);
  document.getElementById('back').onclick=()=>pos(0,180);
  document.getElementById('angle').onclick=()=>pos(-12,-22);
  document.getElementById('reset').onclick=()=>{pos(-12,-22);z=1;document.getElementById('zoom').value='100';redraw()};
  document.getElementById('spin').onclick=()=>{sp=!sp;document.getElementById('spin').classList.toggle('active',sp)};
  document.getElementById('zoom').oninput=e=>{z=Number(e.target.value)/100;redraw()};
  setInterval(()=>{if(sp){y+=2;redraw()}},45);
  let start=null;fallback.addEventListener('pointerdown',e=>{if(e.target.closest('iframe'))return;start={px:e.clientX,py:e.clientY,x,y};fallback.setPointerCapture(e.pointerId)});
  fallback.addEventListener('pointermove',e=>{if(!start)return;y=start.y+(e.clientX-start.px)*.35;x=Math.max(-80,Math.min(80,start.x+(e.clientY-start.py)*.35));redraw()});
  fallback.addEventListener('pointerup',()=>start=null);
  fallback.addEventListener('pointercancel',()=>start=null);
  fallback.addEventListener('wheel',e=>{e.preventDefault();z=Math.min(1.45,Math.max(.65,z-e.deltaY*.0007));document.getElementById('zoom').value=String(Math.round(z*100));redraw()},{passive:false});
  const qs=new URLSearchParams(location.search);let mesa=Number(qs.get('mesa')||12);if(!Number.isInteger(mesa)||mesa<1||mesa>90)mesa=12;
  document.getElementById('mesa').value=mesa;document.getElementById('mesa-label').textContent=String(mesa).padStart(2,'0');
  document.getElementById('trocar').onclick=()=>{const m=Number(document.getElementById('mesa').value);if(!Number.isInteger(m)||m<1||m>90)return alert('Escolha uma mesa de 1 a 90.');mesa=m;document.getElementById('mesa-label').textContent=String(m).padStart(2,'0');document.getElementById('fallbackFrame').src='/tablet?mesa='+m;history.replaceState(null,'','/tablet-3d?mesa='+m)};
  redraw();return;
}
const q=new URLSearchParams(location.search);let mesa=Number(q.get('mesa')||12);if(!Number.isInteger(mesa)||mesa<1||mesa>90)mesa=12;
const $=id=>document.getElementById(id);$('mesa').value=mesa;$('mesa-label').textContent=String(mesa).padStart(2,'0');
const screen=document.createElement('canvas');screen.width=1280;screen.height=800;const cx=screen.getContext('2d');let hits=[];
let tab='atendimento',selectedDrink='agua',qty=1,feedback={atendimento:null,espera_longa:null,mesa_limpa:null},statusText='',statusUntil=0,requests=[];
let rx=-0.19,ry=-0.37,targetX=rx,targetY=ry,zoom=1,targetZoom=1,spinning=false;
const colors={auburn:'#82312e',ink:'#28221f',muted:'#80756c',cream:'#f7f5f0',gold:'#edb94b',line:'#e8e0d8'};
const calls=[['garcom','CHAMAR GARÇOM','🔔'],['talheres','TALHERES','🍴'],['guardanapos','GUARDANAPOS','▤'],['limpeza','LIMPAR MESA','✦'],['prato','TROCAR PRATO','◉'],['ajuda','PEDIR AJUDA','?']];
const drinks=[['agua','ÁGUA','💧'],['refrigerante','REFRIGERANTE','🥤'],['suco','SUCO','🍊'],['cafe','CAFÉ','☕']];
const answers=[['atendimento','Como está o atendimento?',[['otimo','Ótimo'],['bom','Bom'],['ruim','Ruim']]],['espera_longa','Está esperando há muito tempo?',[['false','Não'],['true','Sim']]],['mesa_limpa','A mesa está limpa?',[['true','Sim'],['false','Não']]]];
function round(x,y,w,h,r,fill,stroke=null,lw=1){cx.beginPath();cx.roundRect(x,y,w,h,r);if(fill){cx.fillStyle=fill;cx.fill();}if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw;cx.stroke()}}
function txt(t,x,y,size=24,color=colors.ink,bold=false,align='left'){cx.textAlign=align;cx.textBaseline='middle';cx.font=`${bold?'700':'500'} ${size}px Inter,Segoe UI,Arial,sans-serif`;cx.fillStyle=color;cx.fillText(t,x,y)}
function register(x,y,w,h,func){hits.push({x,y,w,h,func})}
function button(x,y,w,h,text,onClick,active=false){round(x,y,w,h,15,active?'#82312e':'#ffffff',active?null:'#e3d9ce',2);txt(text,x+w/2,y+h/2,21,active?'#ffffff':'#603e34',true,'center');register(x,y,w,h,onClick)}
function toast(msg){statusText=msg;statusUntil=Date.now()+3800;paint()}
async function api(path,options={}){let r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});let j;try{j=await r.json()}catch{throw new Error('Não foi possível conectar ao servidor.')};if(!r.ok)throw new Error(typeof j.detail==='string'?j.detail:'Ocorreu um erro.');return j}
async function call(tipo,bebida=null,quantidade=null){try{const body={mesa,tipo};if(tipo==='bebida'){body.bebida=bebida;body.quantidade=quantidade;}const r=await api('/api/salao/chamados',{method:'POST',body:JSON.stringify(body)});toast(r.ja_existia?'Essa solicitação já está aberta.':'Solicitação enviada aos garçons!');refresh()}catch(e){toast(e.message)}}
async function sendFeedback(){if(Object.values(feedback).some(v=>v===null)){toast('Responda as três perguntas.');return;}try{await api('/api/salao/avaliacoes',{method:'POST',body:JSON.stringify({mesa,atendimento:feedback.atendimento,espera_longa:feedback.espera_longa==='true',mesa_limpa:feedback.mesa_limpa==='true'})});feedback={atendimento:null,espera_longa:null,mesa_limpa:null};toast('Obrigado! Feedback enviado.')}catch(e){toast(e.message)}}
async function refresh(){try{const r=await api('/api/salao/mesa/'+mesa+'/chamados');requests=r.chamados.filter(x=>x.status!=='concluido').slice(0,2);paint();$('status').textContent='Tela conectada';$('status').classList.remove('error')}catch(e){$('status').textContent='Sem conexão';$('status').classList.add('error')}}
function paint(){
 hits=[];cx.clearRect(0,0,1280,800);round(0,0,1280,800,0,colors.cream);
 round(0,0,1280,108,0,colors.auburn);txt('BOVINUS',57,48,40,'#ffffff',true);txt('ATENDIMENTO À MESA · AUGUSTA',59,84,16,'#f7d9be',true);
 round(1031,29,195,54,17,'#ffffff23','#ffffff4b');txt('MESA '+String(mesa).padStart(2,'0'),1128,56,24,'#ffffff',true,'center');
 round(22,117,1236,78,17,'#fff','#e5ddd4');
 [['atendimento','ATENDIMENTO'],['bebidas','BEBIDAS'],['feedback','FEEDBACK']].forEach(([key,name],i)=>{
   let x=32+i*410;round(x,128,392,56,12,tab===key?'#f8e7d8':'#ffffff');txt(name,x+196,156,24,tab===key?colors.auburn:colors.muted,true,'center');register(x,128,392,56,()=>{tab=key;paint()});
 });
 if(tab==='atendimento'){
  txt('Como podemos ajudar?',57,248,34,colors.ink,true);txt('Toque em uma opção. O chamado chega ao painel da equipe.',57,285,19,colors.muted);
  calls.forEach(([key,name,emoji],i)=>{const x=57+(i%3)*405,y=324+Math.floor(i/3)*154;round(x,y,380,133,18,'#ffffff','#e8ddd3',2);round(x+18,y+17,58,58,16,'#f9eee4');txt(emoji,x+47,y+46,33,colors.auburn,true,'center');txt(name,x+94,y+64,21,colors.ink,true);txt('Toque para solicitar',x+94,y+93,16,colors.muted);register(x,y,380,133,()=>call(key))});
 } else if(tab==='bebidas'){
  txt('O que deseja beber?',57,248,34,colors.ink,true);txt('Selecione a bebida e informe a quantidade.',57,285,19,colors.muted);
  drinks.forEach(([key,name,icon],i)=>{let x=56+i*305,y=330;round(x,y,290,172,19,selectedDrink===key?'#fff0e5':'#fff',selectedDrink===key?colors.auburn:'#e8ddd3',selectedDrink===key?4:2);txt(icon,x+145,y+57,48,colors.auburn,true,'center');txt(name,x+145,y+124,22,colors.ink,true,'center');register(x,y,290,172,()=>{selectedDrink=key;paint()})});
  txt('Quantidade',58,577,25,colors.ink,true);
  button(214,541,74,70,'−',()=>{qty=Math.max(1,qty-1);paint()});txt(String(qty),335,575,30,colors.ink,true,'center');button(380,541,74,70,'+',()=>{qty=Math.min(5,qty+1);paint()});button(845,535,376,78,'SOLICITAR BEBIDA',()=>call('bebida',selectedDrink,qty),true);
 } else {
  txt('Sua opinião importa.',57,244,32,colors.ink,true);txt('Três perguntas rápidas sobre sua experiência.',57,282,18,colors.muted);
  answers.forEach(([key,title,opts],i)=>{const y=304+i*116;txt(title,57,y+19,21,colors.ink,true);let x=650;opts.forEach(([v,t],j)=>{let bx=x+j*184;button(bx,y,171,52,t,()=>{feedback[key]=v;paint()},feedback[key]===v)})});
  button(880,600,339,68,'ENVIAR AVALIAÇÃO',sendFeedback,true);
 }
 round(37,680,1206,98,15,'#f0ece6');txt('PEDIDOS ABERTOS',58,710,18,colors.auburn,true);
 if(!requests.length){txt('Nenhuma solicitação em aberto nesta mesa.',58,751,18,colors.muted);}else{
  requests.forEach((r,i)=>{let x=58+i*590;let desc=r.descricao+(r.tipo==='bebida'&&r.bebida_nome?' · '+r.quantidade+'× '+r.bebida_nome:'');txt(desc.substring(0,42),x,745,18,colors.ink,true);});
 }
 if(Date.now()<statusUntil){round(372,616,560,50,12,'#2f7156');txt(statusText.substring(0,56),652,640,20,'#fff',true,'center')}
 screenDirty=true;
}
// Geometria real, com espessura, frente/verso, quinas arredondadas e botões externos.
const vs=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aUV;uniform mat4 uMVP;uniform mat4 uModel;varying vec2 vUV;varying vec3 vN;void main(){gl_Position=uMVP*vec4(aP,1.0);vUV=aUV;vN=mat3(uModel)*aN;}`;
const fs=`precision mediump float;varying vec2 vUV;varying vec3 vN;uniform sampler2D uTex;uniform float uTextured;uniform vec3 uColor;void main(){vec3 n=normalize(vN);vec3 light=normalize(vec3(-0.32,0.8,1.3));float diffuse=0.76+0.24*max(dot(n,light),0.0);vec3 base=uTextured>0.5?texture2D(uTex,vUV).rgb:uColor;gl_FragColor=vec4(base*diffuse,1.0);}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
let program;try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program))}catch(e){fallback.style.display='block';console.error(e);return;}
gl.useProgram(program);const AP=gl.getAttribLocation(program,'aP'),AN=gl.getAttribLocation(program,'aN'),AUV=gl.getAttribLocation(program,'aUV');const umvp=gl.getUniformLocation(program,'uMVP'),umodel=gl.getUniformLocation(program,'uModel'),utex=gl.getUniformLocation(program,'uTex'),utextured=gl.getUniformLocation(program,'uTextured'),ucolor=gl.getUniformLocation(program,'uColor');
const vb=gl.createBuffer();const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(utex,0);
let screenDirty=true;
function push(arr,x,y,z,nx,ny,nz,u=0,v=0){arr.push(x,y,z,nx,ny,nz,u,v)}
function tri(arr,a,b,c){[a,b,c].forEach(p=>push(arr,...p))}
function plane(w,h,z,normal=1){let a=[],x=w/2,y=h/2;let p0=[-x,-y,z,0,0,normal,0,0],p1=[x,-y,z,0,0,normal,1,0],p2=[x,y,z,0,0,normal,1,1],p3=[-x,y,z,0,0,normal,0,1];if(normal>0){tri(a,p0,p1,p2);tri(a,p0,p2,p3);}else{tri(a,p0,p2,p1);tri(a,p0,p3,p2);}return new Float32Array(a)}
function box(w,h,d,x,y,z){let A=[],hw=w/2,hh=h/2,hd=d/2;const faces=[[[x-hw,y-hh,z+hd],[x+hw,y-hh,z+hd],[x+hw,y+hh,z+hd],[x-hw,y+hh,z+hd],[0,0,1]],[[x+hw,y-hh,z-hd],[x-hw,y-hh,z-hd],[x-hw,y+hh,z-hd],[x+hw,y+hh,z-hd],[0,0,-1]],[[x-hw,y+hh,z+hd],[x+hw,y+hh,z+hd],[x+hw,y+hh,z-hd],[x-hw,y+hh,z-hd],[0,1,0]],[[x+hw,y-hh,z+hd],[x-hw,y-hh,z+hd],[x-hw,y-hh,z-hd],[x+hw,y-hh,z-hd],[0,-1,0]],[[x+hw,y+hh,z+hd],[x+hw,y-hh,z+hd],[x+hw,y-hh,z-hd],[x+hw,y+hh,z-hd],[1,0,0]],[[x-hw,y-hh,z+hd],[x-hw,y+hh,z+hd],[x-hw,y+hh,z-hd],[x-hw,y-hh,z-hd],[-1,0,0]]];for(const f of faces){let pts=f.slice(0,4).map((p,i)=>[...p,...f[4],i===1||i===2?1:0,i>=2?1:0]);tri(A,pts[0],pts[1],pts[2]);tri(A,pts[0],pts[2],pts[3])}return new Float32Array(A)}
function outline(w,h,r,steps=9){let pts=[];for(const [x,y,start] of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,90],[-w/2+r,-h/2+r,180],[w/2-r,-h/2+r,270]]){for(let i=0;i<=steps;i++){const a=(start+i*90/steps)*Math.PI/180;pts.push([x+r*Math.cos(a),y+r*Math.sin(a)])}}return pts}
function roundedBody(w,h,r,z1,z2){let a=[],outlinePts=outline(w,h,r);for(let i=0;i<outlinePts.length;i++){const p=outlinePts[i],q=outlinePts[(i+1)%outlinePts.length],dx=q[0]-p[0],dy=q[1]-p[1],nn=Math.hypot(dx,dy)||1,nx=dy/nn,ny=-dx/nn;
 tri(a,[0,0,z2,0,0,1,0,0],[...p,z2,0,0,1,0,0],[...q,z2,0,0,1,0,0]);
 tri(a,[0,0,z1,0,0,-1,0,0],[...q,z1,0,0,-1,0,0],[...p,z1,0,0,-1,0,0]);
 tri(a,[...p,z1,nx,ny,0,0,0],[...q,z1,nx,ny,0,1,0],[...q,z2,nx,ny,0,1,1]);
 tri(a,[...p,z1,nx,ny,0,0,0],[...q,z2,nx,ny,0,1,1],[...p,z2,nx,ny,0,0,1]);
 }return new Float32Array(a)}
function disk(x,y,z,r,colorNormal=1){let a=[],n=36;for(let i=0;i<n;i++){let t=i*Math.PI*2/n,u=(i+1)*Math.PI*2/n;tri(a,[x,y,z,0,0,colorNormal,0,0],[x+Math.cos(t)*r,y+Math.sin(t)*r,z,0,0,colorNormal,0,0],[x+Math.cos(u)*r,y+Math.sin(u)*r,z,0,0,colorNormal,0,0])}return new Float32Array(a)}
const meshes=[{geo:roundedBody(6.20,4.12,.27,-.18,.125),col:[.19,.20,.21]},{geo:roundedBody(6.03,3.95,.22,.128,.153),col:[.045,.047,.052]},{geo:roundedBody(5.47,3.56,.10,.155,.174),col:[.005,.007,.010]},{geo:box(.74,.07,.13,1.53,2.054,-.016),col:[.27,.28,.29]},{geo:box(.46,.055,.13,2.43,2.054,-.016),col:[.27,.28,.29]},{geo:disk(-2.93,0,.165,.074),col:[.27,.30,.31]},{geo:disk(-2.93,0,.168,.034),col:[.06,.09,.12]},{geo:disk(-2.63,1.72,-.19,.17,-1),col:[.35,.37,.38]},{geo:disk(-2.63,1.72,-.194,.09,-1),col:[.055,.064,.08]}];
const display={geo:plane(5.30,3.40,.181),tex:true,col:[1,1,1]};meshes.push(display);
// Back branding is a live texture built separately in the same rendering pipeline.
const backCanvas=document.createElement('canvas');backCanvas.width=600;backCanvas.height=400;const bc=backCanvas.getContext('2d');bc.fillStyle='#363b3e';bc.fillRect(0,0,600,400);bc.textAlign='center';bc.textBaseline='middle';bc.font='bold 58px Georgia';bc.fillStyle='#b5b8b7';bc.fillText('BOVINUS',300,208);bc.font='22px Segoe UI';bc.fillText('AUGUSTA · TABLET DE MESA',300,253);
const backTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,backTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,backCanvas);
meshes.splice(1,0,{geo:plane(5.25,3.24,-.183,-1),tex:backTexture,col:[1,1,1]});
function I(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function M(a,b){let o=new Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o}
function rotX(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
function rotY(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
function translate(z){let m=I();m[14]=z;return m}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),m=new Array(16).fill(0);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m}
let mvp=I();function transform(p,m){let x=p[0],y=p[1],z=p[2];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]]}
let projected=[];const sw=5.30/2,sh=3.40/2;
function updateProjection(){let res=canvas.getBoundingClientRect(),aspect=Math.max(.5,res.width/res.height);let proj=perspective(Math.PI/3.35,aspect,.1,100);let model=M(rotY(ry),rotX(rx));let view=translate(-7.5/zoom);mvp=M(M(proj,view),model);
 const corners=[[-sw,-sh,.181],[sw,-sh,.181],[sw,sh,.181],[-sw,sh,.181]];projected=corners.map(p=>{const v=transform(p,mvp);return {x:(v[0]/v[3]+1)*canvas.width/2,y:(1-v[1]/v[3])*canvas.height/2,w:v[3]}});return model}
function color(hex){return [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]}
function render(){const r=canvas.getBoundingClientRect();let w=Math.max(2,Math.floor(r.width*(window.devicePixelRatio||1))),h=Math.max(2,Math.floor(r.height*(window.devicePixelRatio||1)));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 if(spinning){targetY+=.008}rx+=(targetX-rx)*.11;ry+=(targetY-ry)*.11;zoom+=(targetZoom-zoom)*.11;
 const model=updateProjection();gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
 gl.useProgram(program);gl.uniformMatrix4fv(umvp,false,new Float32Array(mvp));gl.uniformMatrix4fv(umodel,false,new Float32Array(model));gl.activeTexture(gl.TEXTURE0);if(screenDirty){gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,screen);screenDirty=false;}
 gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.enableVertexAttribArray(AP);gl.enableVertexAttribArray(AN);gl.enableVertexAttribArray(AUV);gl.vertexAttribPointer(AP,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(AN,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(AUV,2,gl.FLOAT,false,32,24);
 for(const mesh of meshes){gl.bufferData(gl.ARRAY_BUFFER,mesh.geo,gl.STATIC_DRAW);gl.uniform3fv(ucolor,new Float32Array(mesh.col));gl.uniform1f(utextured,mesh.tex?1:0);gl.bindTexture(gl.TEXTURE_2D,mesh.tex===true?texture:mesh.tex||texture);gl.drawArrays(gl.TRIANGLES,0,mesh.geo.length/8)}
 requestAnimationFrame(render)}
function bary(x,y,a,b,c){let den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-6)return null;let l1=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,l2=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,l3=1-l1-l2;if(Math.min(l1,l2,l3)<-.0001)return null;return [l1,l2,l3]}
function screenHit(x,y){const pts=projected;const uv=[[0,0],[1,0],[1,1],[0,1]];for(const t of [[0,1,2],[0,2,3]]){let l=bary(x,y,pts[t[0]],pts[t[1]],pts[t[2]]);if(!l)continue;let denominator=0,u=0,v=0;for(let k=0;k<3;k++){let i=t[k],p=l[k]/pts[i].w;denominator+=p;u+=uv[i][0]*p;v+=uv[i][1]*p;}u/=denominator;v/=denominator;return{x:u*screen.width,y:(1-v)*screen.height+18}}return null}
let start=null;function local(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const p=local(e);start={screen:p,x:e.clientX,y:e.clientY,rx:targetX,ry:targetY,drag:false};spinning=false;$('spin').classList.remove('active')});
canvas.addEventListener('pointermove',e=>{if(!start)return;let dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)start.drag=true;if(start.drag){targetY=start.ry+dx*.009;targetX=Math.max(-1.3,Math.min(1.3,start.rx+dy*.009));canvas.classList.add('dragging')}});
canvas.addEventListener('pointerup',e=>{if(!start)return;const s=start;start=null;canvas.classList.remove('dragging');if(s.drag)return;const p=local(e),tap=screenHit(p.x,p.y);if(!tap)return;
 const normal=transform([0,0,1,0],M(rotY(ry),rotX(rx)));if(normal[2]<.12)return;
 let hit=hits.find(h=>tap.x>=h.x&&tap.x<h.x+h.w&&tap.y>=h.y&&tap.y<h.y+h.h);if(hit)hit.func();});
canvas.addEventListener('pointercancel',()=>{start=null;canvas.classList.remove('dragging')});
canvas.addEventListener('wheel',e=>{e.preventDefault();targetZoom=Math.min(1.65,Math.max(.6,targetZoom-e.deltaY*.0007));$('zoom').value=Math.round(targetZoom*100)},{passive:false});
function orient(x,y){targetX=x;targetY=y;spinning=false;$('spin').classList.remove('active')}
$('front').onclick=()=>orient(0,0);$('back').onclick=()=>orient(0,Math.PI);$('angle').onclick=()=>orient(-.18,-.42);$('reset').onclick=()=>{orient(-.19,-.37);targetZoom=1;$('zoom').value='100'};$('spin').onclick=()=>{spinning=!spinning;$('spin').classList.toggle('active',spinning)};
$('zoom').oninput=e=>targetZoom=Number(e.target.value)/100;
$('trocar').onclick=()=>{let n=Number($('mesa').value);if(!Number.isInteger(n)||n<1||n>90){toast('Escolha uma mesa de 1 a 90.');return}mesa=n;$('mesa-label').textContent=String(n).padStart(2,'0');history.replaceState(null,'','/tablet-3d?mesa='+n);requests=[];paint();refresh()};
$('mesa').onkeydown=e=>{if(e.key==='Enter')$('trocar').click()};
window.addEventListener('keydown',e=>{if(e.key==='Escape')$('reset').click()});
paint();refresh();setInterval(refresh,5000);render();
})();
