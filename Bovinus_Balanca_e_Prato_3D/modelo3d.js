// Bovinus — visualizador 3D autoral e offline. Nenhuma biblioteca externa.
// Só geometria: balança, prato com alimentos e câmera incorporada.
(()=>{'use strict';
const canvas=document.getElementById('model');
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,depth:true});
const modelParts=[];
let seed=19;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const col=(h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
function part(name,hex,vertex,shine=0.18,alpha=1){modelParts.push({name,color:col(hex),geo:new Float32Array(vertex),shine,alpha})}
function v(x,y,z,nx,ny,nz,u=0,w=0){return [x,y,z,nx,ny,nz,u,w]}
function tri(out,a,b,c){out.push(...a,...b,...c)}
function flatTriangle(out,a,b,c){const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n)||1;n=n.map(x=>x/len);tri(out,v(...a,...n),v(...b,...n),v(...c,...n));}
function box(x,y,z,w,h,d){const out=[],x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;const faces=[[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],[ [x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]];faces.forEach(f=>{flatTriangle(out,f[0],f[1],f[2]);flatTriangle(out,f[0],f[2],f[3])});return out;}
function contourRound(w,d,r){const pts=[];for(const [cx,cz,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,90],[-w/2+r,-d/2+r,180],[w/2-r,-d/2+r,270]])for(let i=0;i<=5;i++){let a=(start+i*18)*Math.PI/180;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}return pts;}
function prismY(points,y0,y1,cx=0,cz=0){const out=[],center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length],pa=[cx+a[0],y1,cz+a[1]],pb=[cx+b[0],y1,cz+b[1]],p0=[cx+a[0],y0,cz+a[1]],p1=[cx+b[0],y0,cz+b[1]],t=[cx+center[0],y1,cz+center[1]],bt=[cx+center[0],y0,cz+center[1]];flatTriangle(out,t,pa,pb);flatTriangle(out,bt,p1,p0);flatTriangle(out,p0,p1,pb);flatTriangle(out,p0,pb,pa);}return out;}
function roundBox(x,y,z,w,h,d,r){return prismY(contourRound(w,d,r),y-h/2,y+h/2,x,z)}
function ellipsoid(cx,cy,cz,rx,ry,rz,segments=18,rings=10,ang=0){const out=[];const c=Math.cos(ang),s=Math.sin(ang);function point(a,b){const u=Math.sin(a)*Math.cos(b)*rx,v=Math.cos(a)*ry,w=Math.sin(a)*Math.sin(b)*rz;const x=u*c-w*s,z=u*s+w*c;let nx=(u/rx**2)*c-(w/rz**2)*s,ny=v/ry**2,nz=(u/rx**2)*s+(w/rz**2)*c,rl=Math.hypot(nx,ny,nz)||1;return vtx(cx+x,cy+v,cz+z,nx/rl,ny/rl,nz/rl)}function vtx(...p){return p};for(let j=0;j<rings;j++){let a0=j*Math.PI/rings,a1=(j+1)*Math.PI/rings;for(let i=0;i<segments;i++){let b0=i*2*Math.PI/segments,b1=(i+1)*2*Math.PI/segments;let p0=point(a0,b0),p1=point(a0,b1),p2=point(a1,b1),p3=point(a1,b0);tri(out,v(...p0),v(...p1),v(...p2));tri(out,v(...p0),v(...p2),v(...p3))}}return out;}
function cylinder(x,y,z,r,h,N=40){const out=[];for(let i=0;i<N;i++){let a=i*2*Math.PI/N,b=(i+1)*2*Math.PI/N;const aa=[x+r*Math.cos(a),z+r*Math.sin(a)],bb=[x+r*Math.cos(b),z+r*Math.sin(b)],nt=[Math.cos((a+b)/2),0,Math.sin((a+b)/2)];tri(out,v(x,y+h/2,z,0,1,0),v(aa[0],y+h/2,aa[1],0,1,0),v(bb[0],y+h/2,bb[1],0,1,0));tri(out,v(x,y-h/2,z,0,-1,0),v(bb[0],y-h/2,bb[1],0,-1,0),v(aa[0],y-h/2,aa[1],0,-1,0));tri(out,v(aa[0],y-h/2,aa[1],...nt),v(bb[0],y-h/2,bb[1],...nt),v(bb[0],y+h/2,bb[1],...nt));tri(out,v(aa[0],y-h/2,aa[1],...nt),v(bb[0],y+h/2,bb[1],...nt),v(aa[0],y+h/2,aa[1],...nt));}return out;}
function lathe(cx,cy,cz,profile,N=72){const out=[];for(let j=0;j<profile.length-1;j++){const [r0,h0]=profile[j],[r1,h1]=profile[j+1];for(let i=0;i<N;i++){let a=2*Math.PI*i/N,b=2*Math.PI*(i+1)/N;const p0=[cx+Math.cos(a)*r0,cy+h0,cz+Math.sin(a)*r0],p1=[cx+Math.cos(b)*r0,cy+h0,cz+Math.sin(b)*r0],p2=[cx+Math.cos(b)*r1,cy+h1,cz+Math.sin(b)*r1],p3=[cx+Math.cos(a)*r1,cy+h1,cz+Math.sin(a)*r1];flatTriangle(out,p0,p1,p2);flatTriangle(out,p0,p2,p3)}}return out;}
function beam(a,b,r){ // tube segment joining two points, with round cross section
 const out=[],d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d),dir=d.map(v=>v/len);let right=[dir[2],0,-dir[0]];if(Math.hypot(...right)<.001)right=[1,0,0];let rl=Math.hypot(...right);right=right.map(x=>x/rl);let up=[dir[1]*right[2]-dir[2]*right[1],dir[2]*right[0]-dir[0]*right[2],dir[0]*right[1]-dir[1]*right[0]];
 for(let i=0;i<14;i++){let t=i*2*Math.PI/14,u=(i+1)*2*Math.PI/14;const ring=(p,theta)=>p.map((v,j)=>v+r*(Math.cos(theta)*right[j]+Math.sin(theta)*up[j]));const p0=ring(a,t),p1=ring(a,u),p2=ring(b,u),p3=ring(b,t);flatTriangle(out,p0,p1,p2);flatTriangle(out,p0,p2,p3)}return out;
}
function foodLeaf(cx,cy,cz,len,w,angle,hue){const out=[],steps=9;const ca=Math.cos(angle),sa=Math.sin(angle);const p=(t,side)=>{let along=(t-.5)*len,spread=Math.sin(Math.PI*t)*side*w*(1+.05*Math.sin(t*14)),uu=along,zz=spread;return [cx+uu*ca-zz*sa,cy+.09*Math.sin(Math.PI*t)+.06*(1-Math.abs(side))+.035*Math.sin(t*16+side*5),cz+uu*sa+zz*ca];};for(let i=0;i<steps;i++){let t=i/steps,u=(i+1)/steps;flatTriangle(out,p(t,0),p(t,1),p(u,1));flatTriangle(out,p(t,0),p(u,1),p(u,0));flatTriangle(out,p(t,-1),p(t,0),p(u,0));flatTriangle(out,p(t,-1),p(u,0),p(u,-1));}part('Folha de salada',hue,out,.16);}
function makePlate(){const cx=-.36,cz=1.04,py=-.77;
 // Plateau + rim, concentric glaze bands, true shallow curvature
 part('Sombra do prato','#a8afb0',cylinder(cx,py-.10,cz,1.31,.045,80),.1);
 part('Prato cerâmico — base','#e8e6df',lathe(cx,py,cz,[[0,-.11],[.74,-.11],[.97,-.07],[1.18,.01],[1.29,.08],[1.30,.11]],80),.57);
 part('Prato cerâmico — face interna','#fffdf7',lathe(cx,py,cz,[[0,.04],[.64,.04],[.90,.055],[1.11,.105],[1.20,.16],[1.29,.155]],80),.42);
 part('Filete de acabamento','#d9d7d1',lathe(cx,py,cz,[[1.18,.158],[1.24,.164],[1.28,.16]],80),.52);
 const fbase=py+.06;
 // Rice mound in rear-left, with individual rice kernels
 part('Arroz branco volumétrico','#e8dac0',ellipsoid(cx-.43,fbase+.115,cz-.36,.40,.17,.32,30,16),.25);
 for(let i=0;i<96;i++){let a=rand()*2*Math.PI,rr=Math.sqrt(rand()),px=cx-.43+Math.cos(a)*.34*rr,pz=cz-.36+Math.sin(a)*.25*rr,ratio=((px-(cx-.43))/.4)**2+((pz-(cz-.36))/.32)**2,yy=fbase+.15+.10*Math.sqrt(Math.max(0,1-ratio));let shades=['#fff3d8','#f3e5c7','#e7d6ae','#fff7e8'];part('Grãos de arroz',shades[i%4],ellipsoid(px,yy,pz,.022,.013,.045,10,6,rand()*6.28),.18)}
 // Beans + sauce, separate curved beans as distinct solids
 part('Feijão — caldo','#6c3826',ellipsoid(cx-.61,fbase+.04,cz+.29,.39,.09,.31,28,12),.28);
 for(let i=0;i<24;i++){let a=rand()*Math.PI*2,rr=Math.sqrt(rand()),xx=cx-.61+Math.cos(a)*.31*rr,zz=cz+.29+Math.sin(a)*.22*rr;part('Feijões',i%3===0?'#8c513a':i%3===1?'#643727':'#a06344',ellipsoid(xx,fbase+.11+rand()*.018,zz,.055,.039,.074,14,9,rand()*6.28),.42)}
 // Grilled meat on right side: three thick uneven cuts with sear marks
 const meatPos=[[cx+.44,cz+.18,.38,.245,-.17],[cx+.54,cz+.50,.32,.21,.18],[cx+.24,cz+.59,.26,.19,.39]];
 meatPos.forEach(([xx,zz,rx,rz,ang],i)=>{const p=[];for(let j=0;j<22;j++){let a=2*Math.PI*j/22,irregular=1+.08*Math.sin(a*3+i)+.04*Math.cos(a*7+i*2);let u=rx*irregular*Math.cos(a),vv=rz*irregular*Math.sin(a);p.push([u*Math.cos(ang)-vv*Math.sin(ang),u*Math.sin(ang)+vv*Math.cos(ang)])}part('Picanha grelhada — borda','#603628',prismY(p,fbase+.02,fbase+.16,xx,zz),.25);part('Picanha grelhada — superfície',i===0?'#a56741':'#b67349',ellipsoid(xx,fbase+.157,zz,rx*.90,.034,rz*.89,26,10,ang),.33);for(let k=-1;k<=1;k++){let zoff=k*.075;const sa=Math.sin(ang+.12),ca=Math.cos(ang+.12),a=[xx-.23*ca-.06*sa,fbase+.180,zz-.23*sa+.06*ca+zoff],b=[xx+.23*ca-.06*sa,fbase+.180,zz+.23*sa+.06*ca+zoff];part('Marcas de grelha','#653827',beam(a,b,.012),.08)}});
 // salad behind steak: sculpted curled leaves + small cherry tomatoes
 const greens=['#568c4d','#6da452','#86b765','#3f7746','#92b56a','#558b60'];
 for(let i=0;i<13;i++){let a=i*2.399,rr=.12+.22*Math.sqrt((i+.6)/13),xx=cx+.29+Math.cos(a)*rr,zz=cz-.43+Math.sin(a)*rr;foodLeaf(xx,fbase+.105,zz,.23+rand()*.14,.09+rand()*.08,a+.8,greens[i%greens.length]);}
 for(let i=0;i<5;i++){let a=i*2*Math.PI/5;part('Tomates cereja',i%2?'#d85e35':'#e4412e',ellipsoid(cx+.33+Math.cos(a)*.22,fbase+.115,cz-.38+Math.sin(a)*.20,.070,.067,.073,16,10),.45)}
 // two cucumber discs tucked among leaves
 for(let i=0;i<2;i++){let xx=cx+.09+i*.19,zz=cz-.49+i*.16;part('Pepino — casca','#517e4e',cylinder(xx,fbase+.107,zz,.106,.031,28),.30);part('Pepino — polpa','#b4dba1',cylinder(xx,fbase+.130,zz,.088,.012,28),.32);part('Pepino — centro','#e1e8be',cylinder(xx,fbase+.139,zz,.036,.009,25),.15)}
 // Fine garnish on the steak
 for(let i=0;i<7;i++){let xx=cx+.26+rand()*.44,zz=cz+.06+rand()*.55;part('Temperos',i%2?'#beaa78':'#405a38',ellipsoid(xx,fbase+.207,zz,.016,.009,.025,8,5),.0)}
}
function makeScale(){
 const baseZ=.42;
 // Weight-bearing feet and coherent ceramic-metal body
 for(const x of [-1.80,1.80])for(const z of [-.73,1.55])part('Pé antiderrapante','#24292c',cylinder(x,-1.36,z,.14,.10),.12);
 part('Corpo principal — grafite','#353d42',roundBox(0,-1.17,baseZ,4.56,.27,3.35,.28),.29);
 part('Borda metálica acetinada','#9ca6a8',roundBox(0,-1.015,baseZ,4.50,.10,3.30,.27),.57);
 part('Plataforma superior','#d9e0e0',roundBox(0,-.938,baseZ,4.34,.075,3.13,.22),.43);
 part('Área de pesagem em aço','#bac8c9',roundBox(-.36,-.888,1.02,3.05,.046,2.50,.20),.62);
 // decorative front brand strip
 part('Emblema frontal','#6e2523',box(1.38,-1.055,2.09,.78,.070,.028),.28);
 // vertical pillar attached to the base at the rear-right, not floating
 part('Coluna traseira','#505a5d',roundBox(.86,-.10,-.92,.66,2.24,.48,.12),.4);
 part('Face metálica da coluna','#aab5b4',roundBox(.86,-.09,-.675,.51,2.12,.052,.08),.44);
 // compact wide display, deliberately understated so the plate dominates
 part('Estrutura do visor','#2e3639',roundBox(.55,1.24,-.98,3.37,1.67,.21,.15),.50);
 part('Vidro frontal','#0e181c',roundBox(.55,1.24,-.835,3.15,1.45,.050,.12),.82);
 part('LCD refletivo','#233638',box(.55,1.22,-.805,2.93,1.20,.018),.47);
 // lens installed flush in top bezel, mechanically connected to visor
 part('Sensor da câmera','#0d171d',cylinder(.54,1.990,-.796,.086,.022,32),.68);
 part('Reflexo da lente','#679aa8',cylinder(.54,2.009,-.796,.035,.022,24),.90);
 // lens underside tilt physically indicated by dark small depth recess
 part('Câmera integrada — carcaça','#343d42',box(.54,1.99,-.92,.45,.115,.30),.26);
 // camera above plate looking into weighing platform; no free-floating boom
}
makeScale();makePlate();
// Only minimal hardware readout as a texture on the device itself (no external software UI).
const screen=document.createElement('canvas');screen.width=640;screen.height=256;const s=screen.getContext('2d');
s.fillStyle='#1f3031';s.fillRect(0,0,640,256);s.fillStyle='#a8bec1';s.font='600 15px system-ui';s.fillText('BOVINUS  ·  PESAGEM',35,39);s.fillStyle='#e8efdf';s.font='500 76px system-ui';s.fillText('0,540',38,148);s.fillStyle='#90b49e';s.font='500 31px system-ui';s.fillText('kg',295,141);s.strokeStyle='#4e6462';s.beginPath();s.moveTo(35,180);s.lineTo(607,180);s.stroke();s.fillStyle='#a2aaa6';s.font='500 16px system-ui';s.fillText('Leitura ilustrativa',37,217);
// screen surface front: flat plane with UVs, independent of scale geometry
const q=[];tri(q,v(-.91,.69,-.789,0,0,1,0,0),v(2.01,.69,-.789,0,0,1,1,0),v(2.01,1.78,-.789,0,0,1,1,1));tri(q,v(-.91,.69,-.789,0,0,1,0,0),v(2.01,1.78,-.789,0,0,1,1,1),v(-.91,1.78,-.789,0,0,1,0,1));modelParts.push({name:'LCD da balança',geo:new Float32Array(q),color:[1,1,1],shine:0,alpha:1,tex:true});
// soft under-body contact shadow (mesh, no transparent overlay for clean offline rendering)
part('Sombra suave','#a8a198',ellipsoid(0,-1.43,.42,2.46,.020,1.83,38,10),0,.17);


window.__BOVINUS_MODEL__=modelParts.map(x=>({name:x.name,color:x.color,geometry:Array.from(x.geo)}));
// Canvas 2D software renderer: same actual triangle geometry, in case WebGL is unavailable.
// It is not a static image — the mesh responds to rotation and zoom even offline.
if(!gl){
  const c=canvas.getContext('2d',{alpha:true});
  let pitch=.48,yaw=-.40,dist=8.5,auto=false,busy=false,dirty=true,drag=null;
  const zoom=document.getElementById('zoom');
  const rgba=(rgb,a=1)=>`rgba(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)},${a})`;
  // The prism/plate underside remain fully volumetric; keep triangles for all food items.
  let raw=[];
  for(const item of modelParts){const a=item.geo;for(let i=0;i<a.length;i+=24){raw.push({p:[a[i],a[i+1],a[i+2],a[i+8],a[i+9],a[i+10],a[i+16],a[i+17],a[i+18]],n:[a[i+3],a[i+4],a[i+5]],color:item.color,alpha:item.alpha,tex:!!item.tex})}}
  function draw(){if(busy)return;busy=true;dirty=false;
    const rect=canvas.getBoundingClientRect(),scaleRatio=Math.min(1,1120/Math.max(rect.width,rect.height));
    const W=Math.max(2,Math.floor(rect.width*scaleRatio)),H=Math.max(2,Math.floor(rect.height*scaleRatio));
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
    const pix=c.createImageData(W,H),rgba=pix.data,zbuf=new Float32Array(W*H);zbuf.fill(-1);
    const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),f=H*1.1;
    const project=(x,y,z)=>{const yy=y*cp-z*sp,zz=y*sp+z*cp,xx=x*cy+zz*sy,dz=-x*sy+zz*cy;const inv=1/Math.max(1,dist-dz);return [W/2+xx*f*inv,H*.53-yy*f*inv,inv]};
    let shaded=0;
    for(const g of raw){const p=g.p;let a=project(p[0],p[1],p[2]),b=project(p[3],p[4],p[5]),d=project(p[6],p[7],p[8]);
      let minX=Math.max(0,Math.floor(Math.min(a[0],b[0],d[0]))),maxX=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],d[0]))),minY=Math.max(0,Math.floor(Math.min(a[1],b[1],d[1]))),maxY=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],d[1])));
      if(minX>=maxX||minY>=maxY)continue;
      // barycentric depth test removes diagonal painter artifacts from curved ceramic and steel
      const area=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);if(Math.abs(area)<.001)continue;
      const invArea=1/area,n=g.n,ny=n[1]*cp-n[2]*sp,nz=n[1]*sp+n[2]*cp,nx=n[0]*cy+nz*sy;
      const diff=Math.max(0,nx*-.35+ny*.84+nz*.41),light=Math.min(1.13,.72+.29*diff);
      let co=g.tex?[41,57,55]:g.color.map(v=>Math.max(0,Math.min(255,Math.round(v*light*255))));
      let R=co[0]|0,G=co[1]|0,B=co[2]|0;
      const E0x=b[1]-d[1],E0y=d[0]-b[0],E0c=b[0]*d[1]-b[1]*d[0];
      const E1x=d[1]-a[1],E1y=a[0]-d[0],E1c=a[1]*d[0]-a[0]*d[1];
      for(let y=minY;y<=maxY;y++){
        let py=y+.5;
        for(let x=minX;x<=maxX;x++){
          let px=x+.5,u=(E0x*px+E0y*py+E0c)*invArea,v=(E1x*px+E1y*py+E1c)*invArea,w=1-u-v;
          if(u<-.001||v<-.001||w<-.001)continue;
          const depth=u*a[2]+v*b[2]+w*d[2],idx=y*W+x;
          if(depth>zbuf[idx]){zbuf[idx]=depth;let o=idx*4;rgba[o]=R;rgba[o+1]=G;rgba[o+2]=B;rgba[o+3]=255}
        }
      }
    }
    c.putImageData(pix,0,0);busy=false;
  }
  function frame(){if(auto){yaw+=.013;dirty=true}if(dirty)draw();requestAnimationFrame(frame)}
  function view(p,y,d,button){pitch=p;yaw=y;dist=d;auto=false;dirty=true;zoom.value=Math.round(100*8.5/dist);document.querySelectorAll('.views button').forEach(b=>b.classList.toggle('active',b.id===button));}
  document.getElementById('angle').onclick=()=>view(.48,-.40,8.5,'angle');document.getElementById('front').onclick=()=>view(.15,0,8.5,'front');document.getElementById('top').onclick=()=>view(1.30,-.05,8.3,'top');document.getElementById('back').onclick=()=>view(.18,Math.PI,9.1,'back');document.getElementById('reset').onclick=()=>view(.48,-.40,8.5,'angle');document.getElementById('spin').onclick=()=>{auto=!auto;document.getElementById('spin').classList.toggle('active',auto)};
  zoom.oninput=()=>{dist=8.5*100/Number(zoom.value);dirty=true};
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pitch,yaw};canvas.setPointerCapture(e.pointerId);auto=false;document.getElementById('spin').classList.remove('active')});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.009;pitch=Math.max(-.85,Math.min(1.52,drag.pitch+(e.clientY-drag.y)*.009));dirty=true});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(5.8,Math.min(14.4,dist+e.deltaY*.010));zoom.value=Math.round(100*8.5/dist);dirty=true},{passive:false});
  window.addEventListener('resize',()=>dirty=true);canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='ArrowUp')pitch+=.1;if(e.key==='ArrowDown')pitch-=.1;dirty=true});
  frame();window.__BOVINUS_FALLBACK__=true;return;
}

const vs=`attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 mvp;uniform mat4 model;varying vec3 N;varying vec2 UV;void main(){gl_Position=mvp*vec4(position,1.);N=mat3(model)*normal;UV=uv;}`;
const fs=`precision mediump float;varying vec3 N;varying vec2 UV;uniform vec3 color;uniform float shine;uniform float alpha;uniform float textured;uniform sampler2D image;void main(){vec3 n=normalize(N);vec3 l1=normalize(vec3(-.38,.92,1.)),l2=normalize(vec3(.82,.63,-.7));float light=.63+.34*max(0.,dot(n,l1))+.12*max(0.,dot(n,l2));vec3 c=textured>.5?texture2D(image,UV).rgb:color;vec3 h=normalize(l1+vec3(0.,0.,1.));float spec=shine*.36*pow(max(0.,dot(n,h)),30.);gl_FragColor=vec4(min(vec3(1.),c*light+vec3(spec)),alpha);}`;
function shader(type,src){const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o}
let prog;try{prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));}catch(e){document.getElementById('error').textContent='Falha na renderização 3D: '+e.message;document.getElementById('error').style.display='block';return}
const loc={p:gl.getAttribLocation(prog,'position'),n:gl.getAttribLocation(prog,'normal'),u:gl.getAttribLocation(prog,'uv'),mvp:gl.getUniformLocation(prog,'mvp'),model:gl.getUniformLocation(prog,'model'),color:gl.getUniformLocation(prog,'color'),shine:gl.getUniformLocation(prog,'shine'),alpha:gl.getUniformLocation(prog,'alpha'),textured:gl.getUniformLocation(prog,'textured'),image:gl.getUniformLocation(prog,'image')};
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,screen);
// draw calls are grouped by material, greatly reducing overhead from rice grains and leaves
const renderItems=[];const groups=new Map();for(const item of modelParts){const key=item.tex?'tex':item.color.map(x=>x.toFixed(4)).join(',')+'|'+item.shine+'|'+item.alpha;if(!groups.has(key))groups.set(key,{...item,geo:[]});groups.get(key).geo.push(...item.geo)}
for(const group of groups.values()){const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(group.geo),gl.STATIC_DRAW);renderItems.push({...group,buf,n:group.geo.length/8});}

function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function rotateX(a){let m=identity(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
function rotateY(a){let m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
function translate(z){let m=identity();m[14]=z;return m}
function persp(a){let f=1/Math.tan(Math.PI/7.3),m=new Array(16).fill(0),n=.1,F=100;m[0]=f/a;m[5]=f;m[10]=(F+n)/(n-F);m[11]=-1;m[14]=2*F*n/(n-F);return m}
let pitch=.48,yaw=-.40,distance=8.5,goalPitch=pitch,goalYaw=yaw,goalDistance=distance,auto=false,model=identity(),last=0;
function resize(){let r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.7),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}}
function render(now){resize();if(auto)goalYaw+=.004;pitch+=(goalPitch-pitch)*.14;yaw+=(goalYaw-yaw)*.14;distance+=(goalDistance-distance)*.13;
  model=mul(rotateY(yaw),rotateX(pitch));let mvp=mul(mul(persp(canvas.width/canvas.height),translate(-distance)),model);
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(prog);
  gl.uniformMatrix4fv(loc.mvp,false,new Float32Array(mvp));gl.uniformMatrix4fv(loc.model,false,new Float32Array(model));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(loc.image,0);
  for(const item of renderItems){gl.bindBuffer(gl.ARRAY_BUFFER,item.buf);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);gl.enableVertexAttribArray(loc.u);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(loc.u,2,gl.FLOAT,false,32,24);gl.uniform3fv(loc.color,new Float32Array(item.color));gl.uniform1f(loc.shine,item.shine);gl.uniform1f(loc.alpha,item.alpha);gl.uniform1f(loc.textured,item.tex?1:0);gl.drawArrays(gl.TRIANGLES,0,item.n)}
  requestAnimationFrame(render)
}
function view(p,y,d=8.5,button){goalPitch=p;goalYaw=y;goalDistance=d;auto=false;document.querySelectorAll('.views button').forEach(b=>b.classList.toggle('active',b.id===button));document.getElementById('zoom').value=Math.round(100*8.5/d)}
document.getElementById('angle').onclick=()=>view(.48,-.40,8.5,'angle');document.getElementById('front').onclick=()=>view(.17,0,8.5,'front');document.getElementById('top').onclick=()=>view(1.27,-.11,8.3,'top');document.getElementById('back').onclick=()=>view(.20,Math.PI,9.1,'back');document.getElementById('spin').onclick=()=>{auto=!auto;document.getElementById('spin').classList.toggle('active',auto)};document.getElementById('reset').onclick=()=>view(.48,-.40,8.5,'angle');
const zoom=document.getElementById('zoom');zoom.oninput=()=>goalDistance=8.5*100/Number(zoom.value);
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,p:goalPitch,a:goalYaw};canvas.setPointerCapture(e.pointerId);auto=false;document.getElementById('spin').classList.remove('active')});canvas.addEventListener('pointermove',e=>{if(!drag)return;goalYaw=drag.a+(e.clientX-drag.x)*.0075;goalPitch=Math.max(-.95,Math.min(1.52,drag.p+(e.clientY-drag.y)*.0075))});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();goalDistance=Math.max(5.8,Math.min(14.4,goalDistance+e.deltaY*.010));zoom.value=Math.round(100*8.5/goalDistance)},{passive:false});canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')goalYaw-=.1;if(e.key==='ArrowRight')goalYaw+=.1;if(e.key==='ArrowUp')goalPitch=Math.min(1.5,goalPitch+.1);if(e.key==='ArrowDown')goalPitch=Math.max(-.9,goalPitch-.1)});
requestAnimationFrame(render);
})();
