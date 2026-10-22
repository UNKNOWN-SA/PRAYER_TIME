/* NOOR: cinematic living background. Sections: Prefs · Scenes · Clock · Art · Render · Quality · Audio · UI */
(()=>{
'use strict';
if(window.NOOR)return;
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sm=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const mq=matchMedia('(prefers-reduced-motion: reduce)'),L=[];
const on=(t,e,f,o)=>{t.addEventListener(e,f,o);L.push([t,e,f,o])};

/* ── PREFS ── */
const P={on:true,scene:'auto',inten:70,dens:60,audio:false,preset:'high',rm:mq.matches,idle:30,vol:60,tilt:false};
try{Object.assign(P,JSON.parse(localStorage.getItem('noor_prefs')||'{}'))}catch{}
P.audio=false;
const save=()=>{try{localStorage.setItem('noor_prefs',JSON.stringify(P))}catch{}};
const Q={ultra:{dpr:2,stars:2600,motes:90,cloud:9,rows:56,fps:0},high:{dpr:1.5,stars:1700,motes:60,cloud:7,rows:40,fps:0},balanced:{dpr:1.1,stars:900,motes:34,cloud:5,rows:24,fps:0},saver:{dpr:.75,stars:350,motes:12,cloud:3,rows:12,fps:30}};
const ORDER=['saver','balanced','high','ultra'],NAMES={saver:'Battery saver',balanced:'Balanced',high:'High',ultra:'Ultra'};
let eff=ORDER.indexOf(P.preset);if(eff<0)eff=2;let cfg=Q[ORDER[eff]];

/* ── SCENES ── */
const hx=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
const def=(top,mid,bot,haze,glow,cloud,n)=>({top:hx(top),mid:hx(mid),bot:hx(bot),haze:hx(haze),glow:hx(glow),cloud:hx(cloud),...n});
const SC={
 night:  def('#03060f','#071228','#0c1d3a','#12305a','#1a4a7a','#1b2c52',{stars:1,moon:1,lamp:.9,win:.9,cA:.3,veil:.3,sun:0,hz:.25}),
 fajr:   def('#0c1138','#2a2f73','#6f6fa8','#5fa0c8','#8fb8e8','#4a5590',{stars:.45,moon:.55,lamp:.8,win:.7,cA:.4,veil:.28,sun:.1,hz:.5}),
 sunrise:def('#3a4f9a','#c8708a','#ffbf8a','#ffc8a0','#ffd29a','#ffb0a0',{stars:0,moon:.1,lamp:.5,win:.4,cA:.7,veil:.22,sun:1,hz:.7}),
 dhuhr:  def('#2f6fc2','#5da4e0','#bfe3f5','#e8f4fb','#fff5d0','#ffffff',{stars:0,moon:0,lamp:0,win:0,cA:.85,veil:.2,sun:1,hz:.35}),
 asr:    def('#3b78c0','#8fb7da','#f3dcae','#f6d9a0','#ffd980','#fff1d6',{stars:0,moon:0,lamp:.15,win:.1,cA:.8,veil:.2,sun:1,hz:.5}),
 maghrib:def('#251a5c','#8a3f7e','#ff8a4a','#ff9a5a','#ffb070','#ff7a5a',{stars:.1,moon:.35,lamp:.8,win:.8,cA:.8,veil:.25,sun:.5,hz:.75}),
 isha:   def('#040a1c','#0a1c40','#16336a','#1c4f8a','#4aa8d8','#24407a',{stars:1,moon:1,lamp:1,win:1,cA:.35,veil:.3,sun:0,hz:.35})
};
const cur=JSON.parse(JSON.stringify(SC.night));
function mixInto(o,a,b,u){for(const k in a){if(Array.isArray(a[k])){for(let i=0;i<3;i++)o[k][i]=a[k][i]+(b[k][i]-a[k][i])*u}else o[k]=a[k]+(b[k]-a[k])*u}}
const rgba=(c,a,m=1)=>`rgba(${c[0]*m|0},${c[1]*m|0},${c[2]*m|0},${a})`;

/* ── CLOCK (reads the app's own prayer times; never hardcoded) ── */
function sched(){
  const g=k=>{const v=typeof PT!=='undefined'&&PT[k];return v&&v!=='--:--'?toMins(v):null};
  const f=g('Fajr')??300;let sr=g('Sunrise')??375,d=g('Dhuhr')??740,a=g('Asr')??950,m=g('Maghrib')??1085,i=g('Isha')??1170;
  sr=Math.max(sr,f+20);d=Math.max(d,sr+60);a=Math.max(a,d+60);m=Math.max(m,a+45);i=Math.max(i,m+40); // polar / odd-season repair
  return{f,sr,d,a,m,i};
}
const PREVIEW={fajr:s=>s.f+20,sunrise:s=>s.sr+12,dhuhr:s=>s.d,asr:s=>s.a+35,maghrib:s=>s.m+6,isha:s=>s.i+60};
let vt=null,label='night';
function sceneAt(n,s){
  const k=[[s.f-50,'night'],[s.f,'fajr'],[s.sr+5,'sunrise'],[s.d,'dhuhr'],[s.a,'asr'],[s.m+8,'maghrib'],[s.i+10,'isha'],[s.i+130,'night']];
  let a='night',b='night',u=0;
  if(n>k[0][0]&&n<k[7][0])for(let j=1;j<8;j++)if(n<=k[j][0]){a=k[j-1][1];b=k[j][1];u=sm(k[j-1][0],k[j][0],n);break}
  mixInto(cur,SC[a],SC[b],u);label=u<.5?a:b;
}

/* ── ART (pre-rendered, cached) ── */
const cv=document.createElement('canvas');cv.id='noor';cv.setAttribute('aria-hidden','true');
document.body.insertBefore(cv,document.querySelector('.bgp')?.nextSibling||document.body.firstChild);
const cx=cv.getContext('2d');
let W=0,H=0,DPR=1,u=1,hy=0,wy=0,L0,L1,FG,CL,moonS,gAmber,gSun,gMoon;
let lights=[[],[]],lamps=[],clouds=[],SX,SY,SR,SP,SS,MX,MY,MZ,MP,nStars=0,nMotes=0,rip=[{},{},{},{},{},{}],shoot=null,palms=[],wind=0,gust=0,mistPh=0,pulses=[],pigeons=[],ppl=[],ul=[],ps={},psT=0,lastEv='',crowdForce=0,idleOn=false,bedside=false,prevEff=2,lastAct=0,tiltOn=false,lastWake=0,audT=0;
const SYN=29.530588853;
function moonPhase(d=new Date()){const age=(((d.getTime()-Date.UTC(2000,0,6,18,14))/864e5)%SYN+SYN)%SYN,ph=age/SYN;return{ph,age,ill:(1-Math.cos(2*Math.PI*ph))/2,name:ph<.03||ph>.97?'New Moon':ph<.22?'Waxing Crescent':ph<.28?'First Quarter':ph<.47?'Waxing Gibbous':ph<.53?'Full Moon':ph<.72?'Waning Gibbous':ph<.78?'Last Quarter':'Waning Crescent'}}
function drawMoon(c,ph,r,lit,dark){c.fillStyle=dark;c.beginPath();c.arc(0,0,r,0,6.3);c.fill();const w=ph>.5,p=w?1-ph:ph,k=Math.cos(2*Math.PI*p);c.save();if(w)c.scale(-1,1);c.fillStyle=lit;c.beginPath();c.arc(0,0,r,-Math.PI/2,Math.PI/2,false);c.ellipse(0,0,Math.abs(k)*r,r,0,Math.PI/2,-Math.PI/2,k>0);c.closePath();c.fill();c.restore()}
let moonInfo=moonPhase(),lastMoon=0;
function buildMoon(){moonInfo=moonPhase();moonS=moonS||mk(160,160);const g=moonS.getContext('2d');g.clearRect(0,0,160,160);g.save();g.translate(80,80);const q=g.createRadialGradient(-10,-10,5,0,0,58);q.addColorStop(0,'#fffdf2');q.addColorStop(1,'#cfe0ff');drawMoon(g,moonInfo.ph,56,q,'rgba(120,145,200,.16)');g.restore()}
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c};
function glowSpr(r,g,b){const c=mk(128,128),x=c.getContext('2d'),q=x.createRadialGradient(64,64,0,64,64,64);q.addColorStop(0,`rgba(${r},${g},${b},1)`);q.addColorStop(.25,`rgba(${r},${g},${b},.42)`);q.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=q;x.fillRect(0,0,128,128);return c}
function dome(c,x,y,r){c.beginPath();c.moveTo(x-r,y);c.bezierCurveTo(x-r,y-r*.9,x-r*.35,y-r*1.15,x,y-r*1.5);c.bezierCurveTo(x+r*.35,y-r*1.15,x+r,y-r*.9,x+r,y);c.closePath();c.fill();c.fillRect(x-1.4*u,y-r*1.5-14*u,2.8*u,16*u)}
function minaret(c,x,b,h,w){c.fillRect(x-w/2,b-h,w,h);c.fillRect(x-w*.85,b-h*.74,w*1.7,w*.35);c.fillRect(x-w*.7,b-h*.92,w*1.4,w*.3);c.beginPath();c.moveTo(x-w*.62,b-h*.92);c.bezierCurveTo(x-w*.62,b-h-w*1.2,x-w*.1,b-h-w*1.5,x,b-h-w*2.7);c.bezierCurveTo(x+w*.1,b-h-w*1.5,x+w*.62,b-h-w*1.2,x+w*.62,b-h*.92);c.fill();c.fillRect(x-.8*u,b-h-w*2.7-12*u,1.6*u,14*u)}

function buildArt(){
  seed=11;u=H/1000;hy=H*.6;wy=H*.84;lights=[[],[]];const LW=W*1.12;let c;
  // far skyline
  L0=mk(LW,wy+6);c=L0.getContext('2d');c.fillStyle='#0d1c3c';
  for(let x=0;x<LW;){const w=(26+rnd()*46)*u,h=(90+rnd()*170)*u;c.fillRect(x,wy-h,w,h+6);const r=rnd();
    if(r<.3)dome(c,x+w/2,wy-h,w*.36);else if(r<.45)minaret(c,x+w/2,wy-h+2,(70+rnd()*90)*u,5*u);
    for(let k=0;k<2;k++)if(rnd()<.45)lights[0].push([x+rnd()*(w-4*u),wy-h+8*u+rnd()*(h-14*u),2.2*u,3*u,rnd()*6.28]);x+=w+rnd()*10*u}
  // midground: houses, small mosque, grand mosque
  L1=mk(LW,wy+6);c=L1.getContext('2d');c.fillStyle='#060f26';const mx=LW*.62,lx=LW*.2;
  c.fillRect(lx-110*u,wy-130*u,220*u,130*u);dome(c,lx,wy-130*u,70*u);minaret(c,lx+150*u,wy,300*u,13*u);
  for(let x=0;x<LW;){const w=(40+rnd()*60)*u,h=(60+rnd()*90)*u;
    if(Math.abs(x-mx)>340*u&&Math.abs(x-lx)>200*u){c.fillRect(x,wy-h,w,h+6);if(rnd()<.3)dome(c,x+w/2,wy-h,w*.3);
      for(let k=0;k<2;k++)if(rnd()<.6)lights[1].push([x+rnd()*(w-6*u),wy-h+10*u+rnd()*(h-24*u),4*u,6*u,rnd()*6.28])}x+=w+rnd()*6*u}
  c.fillRect(mx-300*u,wy-210*u,600*u,214*u);c.fillRect(mx-120*u,wy-300*u,240*u,100*u);
  dome(c,mx,wy-300*u,130*u);dome(c,mx-200*u,wy-210*u,70*u);dome(c,mx+200*u,wy-210*u,70*u);
  [[-330,430],[330,430],[-440,300],[440,300]].forEach(([dx,h])=>{minaret(c,mx+dx*u,wy,h*u,16*u);lights[1].push([mx+dx*u-2.5*u,wy-h*u*.62,5*u,11*u,dx,0],[mx+dx*u-2.5*u,wy-h*u*.36,5*u,11*u,dx+2,0])});
  for(let i=-5;i<=5;i++)lights[1].push([mx+i*50*u-9*u,wy-120*u,18*u,50*u,i*1.3,1]);
  for(let i=-1;i<=1;i++)lights[1].push([mx+i*60*u-8*u,wy-270*u,16*u,36*u,i*2,1]);
  // foreground: carved arch with lattice, balustrade, palms
  FG=mk(W,H);c=FG.getContext('2d');const Lx=W*.03,Rx=W*.97,top=H*.02,ay=H*.52;
  const path=()=>{c.beginPath();c.moveTo(Lx,H);c.lineTo(Lx,ay);c.bezierCurveTo(Lx,ay-.24*H,W*.4,top+.03*H,W/2,top);c.bezierCurveTo(W*.6,top+.03*H,Rx,ay-.24*H,Rx,ay);c.lineTo(Rx,H)};
  c.fillStyle='#04091a';c.fillRect(0,0,W,H);c.strokeStyle='rgba(214,170,90,.07)';c.lineWidth=Math.max(1,u);
  const cell=54*u;for(let y=0;y<H;y+=cell)for(let x=0;x<W;x+=cell){c.save();c.translate(x+cell/2,y+cell/2);c.strokeRect(-cell*.3,-cell*.3,cell*.6,cell*.6);c.rotate(Math.PI/4);c.strokeRect(-cell*.3,-cell*.3,cell*.6,cell*.6);c.restore()}
  c.globalCompositeOperation='destination-out';path();c.fill();
  c.globalCompositeOperation='source-atop';path();c.lineWidth=16*u;c.strokeStyle='rgba(110,180,255,.10)';c.stroke();
  c.globalCompositeOperation='source-over';path();c.lineWidth=2.5*u;c.strokeStyle='rgba(222,178,92,.55)';c.stroke();
  c.fillStyle='#02050d';c.fillRect(0,H*.9,W,H*.1);c.fillRect(0,H*.9,W,5*u);for(let x=0;x<W;x+=30*u)c.fillRect(x,H*.9,9*u,H*.1);
  const frond=(x,y,a,len)=>{c.strokeStyle='#020610';c.lineCap='round';c.lineWidth=5*u;const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len,qx=x+Math.cos(a)*len*.5,qy=y+Math.sin(a)*len*.5-len*.35;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(qx,qy,ex,ey);c.stroke();
    for(let i=1;i<14;i++){const t=i/14,px=(1-t)*(1-t)*x+2*t*(1-t)*qx+t*t*ex,py=(1-t)*(1-t)*y+2*t*(1-t)*qy+t*t*ey,l=len*.2*(1-t*.6);
      for(const s of[-1,1]){c.lineWidth=2.2*u;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a+s*1.2)*l,py+Math.sin(a+s*1.2)*l+8*u);c.stroke()}}};
  {const keep=c;palms=[];[[0,.02,0],[0,.02,1],[1,.98,0],[1,.98,1]].forEach(([sd,fx,k])=>{const S0=Math.round(640*u),pv=mk(S0,S0);c=pv.getContext('2d');const px=sd?S0-24*u:24*u,py=S0-24*u;for(let i=0;i<4;i++){const a2=sd?-1.45-(i+k*.5)*.52:-1.7+(i+k*.5)*.52;frond(px,py,a2,(300+rnd()*200)*u)}palms.push({cv:pv,px,py,x:W*fx,y:H*.97,ph:k*1.9+sd*.7})});c=keep}
  const archY=x=>top+(ay-top)*Math.pow(Math.abs(x-W/2)/(W/2-Lx),1.6);
  lamps=[[.06,200],[.17,110],[.955,240],[.89,120]].map(([f,len],i)=>({x:W*f,y:archY(W*f)+2,len:len*u,p:i*2.1}));
  lampsAll=lamps.concat(Array.from({length:9},(_,i)=>{const f=.1+i*.1;return{x:W*f,y:archY(W*f)+2,len:(36+(i%3)*26)*u,p:i*1.7+.5,s:.6}}));
  // moon, clouds
  buildMoon();let g;
  CL=[0,1,2,3].map(()=>{const k=mk(520,210),g=k.getContext('2d');
    for(let i=0;i<26;i++){const x=70+rnd()*380,y=95+(rnd()-.5)*90*(1-Math.abs(x-260)/300),r=30+rnd()*55,q=g.createRadialGradient(x,y,0,x,y,r);
      q.addColorStop(0,'rgba(255,255,255,.5)');q.addColorStop(.6,'rgba(255,255,255,.18)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(x-r,y-r,2*r,2*r)}
    g.globalCompositeOperation='source-atop';const sh=g.createLinearGradient(0,40,0,200);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(30,50,110,.55)');g.fillStyle=sh;g.fillRect(0,0,520,210);return k});
  mistS=mk(W,Math.round(150*u));{const mg=mistS.getContext('2d');for(let b=0;b<16;b++){const x=rnd()*W,y=(.3+rnd()*.4)*mistS.height,rx=(160+rnd()*260)*u;for(const dx of[-W,0,W]){mg.save();mg.translate(x+dx,y);mg.scale(1,.28);const q=mg.createRadialGradient(0,0,0,0,0,rx);q.addColorStop(0,'rgba(222,234,255,.55)');q.addColorStop(1,'rgba(222,234,255,0)');mg.fillStyle=q;mg.fillRect(-rx,-rx,2*rx,2*rx);mg.restore()}}}
  sl=Array.from({length:14},()=>({x:rnd()*W,y:wy-rnd()*wy*.95,v:(10+rnd()*14)*u,p:rnd()*6.28,s:.7+rnd()*.7}));
  ff=Array.from({length:24},()=>({cx:rnd()<.5?.02+rnd()*.2:.78+rnd()*.2,cy:.6+rnd()*.32,fx:.3+rnd()*.5,fy:.3+rnd()*.5,rx:30+rnd()*70,ry:14+rnd()*30,b:1+rnd()*1.6,p:rnd()*6.28}));
  boat.x=W*.3;flock=null;
  // star + mote + cloud pools (typed arrays, reused every frame)
  nStars=cfg.stars;SX=new Float32Array(nStars);SY=new Float32Array(nStars);SR=new Float32Array(nStars);SP=new Float32Array(nStars);SS=new Float32Array(nStars);
  for(let i=0;i<nStars;i++){SX[i]=rnd()*W*1.1;SY[i]=Math.pow(rnd(),1.3)*hy*.98;SR[i]=rnd()<.04?1.8:rnd()<.25?1.2:.8;SP[i]=rnd()*6.28;SS[i]=.4+rnd()*1.4}
  nMotes=cfg.motes;MX=new Float32Array(nMotes);MY=new Float32Array(nMotes);MZ=new Float32Array(nMotes);MP=new Float32Array(nMotes);
  for(let i=0;i<nMotes;i++){MX[i]=rnd()*W;MY[i]=rnd()*H;MZ[i]=.2+rnd()*.8;MP[i]=rnd()*6.28}
  clouds=Array.from({length:cfg.cloud},(_,i)=>({x:rnd()*W,y:H*(.04+rnd()*.42),s:(.5+rnd()*.9)*u*(1+i%3*.25),d:.1+(i%3)*.12,v:(3+rnd()*7)*(.5+(i%3)*.4),k:i%4,p:rnd()*6.28}));
}
function size(){
  DPR=Math.min(devicePixelRatio||1,cfg.dpr);W=cv.width=Math.round(innerWidth*DPR);H=cv.height=Math.round(innerHeight*DPR);
  gFly=gFly||glowSpr(214,255,120);gAmber=gAmber||glowSpr(255,176,80);gSun=gSun||glowSpr(255,226,160);gMoon=gMoon||glowSpr(150,210,255);
  buildArt();setMotes();
  CLc.width=Math.round(W/2);CLc.height=Math.round(hy/2);
}
const CLc=mk(2,2),CLx=CLc.getContext('2d');

/* ── RENDER ── */
const pt={x:0,y:0,tx:0,ty:0,px:-999,py:-999};
let flock=null,boat={x:0},sl=[],ff=[],mistS,gFly,lampsAll=[],ramOn=false,paused=false,calm=0,calmT=0,viewOn=false,tt=0,run=false,raf=0,tmo=0,last=0,ema=.0167,lastQ=0,hud=0;
function draw(dt,now){
  calm+=(calmT-calm)*Math.min(1,dt*.8);if(now-lastMoon>3.6e6){lastMoon=now;buildMoon()}const amp=P.inten/100*(viewOn?1.5:1)*(1-.55*calm)*(bedside?.6:1),rm=P.rm,s=sched(),real=new Date();
  const rn=real.getHours()*60+real.getMinutes()+real.getSeconds()/60;
  const target=P.scene==='auto'?rn:PREVIEW[P.scene](s)%1440;
  if(vt==null)vt=rn;const diff=((target-vt+2160)%1440)-720;vt=(vt+diff*(rm?1:1-Math.exp(-dt*2.4))+1440)%1440;
  sceneAt(vt,s);const S=cur;
  if(!rm){tt+=dt*(.25+1.1*amp);pt.x+=(pt.tx-pt.x)*Math.min(1,dt*3);pt.y+=(pt.ty-pt.y)*Math.min(1,dt*3)}
  const camX=rm?0:(Math.sin(tt*.07)*10+pt.x*16)*amp*DPR,camY=rm?0:(Math.cos(tt*.05)*5+pt.y*8)*amp*DPR,t=tt;
  const sunS=(vt-s.sr)/(s.m-s.sr),nn=vt<s.sr?vt+1440:vt,nS=(nn-s.m)/(s.sr+1440-s.m);
  const wv=(Math.sin(t*.31)+.7*Math.sin(t*.13+1.3)+.5*Math.sin(t*.07+4))/2.2;wind=rm?0:wv*amp;gust=Math.max(0,wind);if(!rm)mistPh+=dt*(1+1.6*gust);
  const winOn=ph=>{const th=Math.abs(Math.sin(ph*12.9898)*43758.5453)%1;return clamp((S.win-th*.7)/.3,0,1)};
  psRefresh(now);
  // sky
  let g=cx.createLinearGradient(0,0,0,wy);g.addColorStop(0,rgba(S.top,1));g.addColorStop(.55,rgba(S.mid,1));g.addColorStop(1,rgba(S.bot,1));cx.globalAlpha=1;cx.fillStyle=g;cx.fillRect(0,0,W,H);
  // horizon glow
  g=cx.createLinearGradient(0,hy-.34*H,0,hy+.05*H);g.addColorStop(0,rgba(S.glow,0));g.addColorStop(1,rgba(S.glow,S.hz*.7));cx.fillStyle=g;cx.fillRect(0,hy-.34*H,W,.4*H);
  // stars
  const sd=rm?0:(t*2.2*DPR)%(W*1.1);if(S.stars>.01){cx.fillStyle='#dfeaff';for(let i=0;i<nStars;i++){const y=SY[i],fade=1-sm(hy*.55,hy,y),tw=rm?1:1-.35*Math.sin(t*SS[i]+SP[i]);
    cx.globalAlpha=S.stars*fade*tw*(SR[i]>1?1:.7);if(cx.globalAlpha<.02)continue;const r=SR[i]*DPR;cx.fillRect(((SX[i]+sd)%(W*1.1))-camX*.04-W*.05,y,r,r)}cx.globalAlpha=1}
  if(!rm&&S.stars>.6&&!shoot&&Math.random()<.0025*amp)shoot={x:W*(.2+rnd()*.6),y:H*rnd()*.25,l:0,v:.6+rnd()*.5};
  if(shoot){shoot.l+=dt*shoot.v;const x=shoot.x+shoot.l*500*DPR,y=shoot.y+shoot.l*210*DPR,q=cx.createLinearGradient(x,y,x-150*DPR,y-63*DPR);q.addColorStop(0,'rgba(255,255,255,.85)');q.addColorStop(1,'rgba(255,255,255,0)');
    cx.globalAlpha=Math.sin(Math.min(1,shoot.l)*3.14);cx.strokeStyle=q;cx.lineWidth=1.5*DPR;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x-150*DPR,y-63*DPR);cx.stroke();cx.globalAlpha=1;if(shoot.l>1)shoot=null}
  // sun & moon
  cx.globalCompositeOperation='lighter';let bx=-1,by=0,bt=0;
  const sv=sm(-.06,.04,sunS)*sm(1.06,.96,sunS);
  if(sv>.01){const x=W*(.12+.76*clamp(sunS,0,1))-camX*.1,y=hy+.04*H-Math.sin(Math.PI*clamp(sunS,0,1))*H*.46,k=1-Math.sin(Math.PI*clamp(sunS,0,1));
    cx.globalAlpha=sv*(.55+.3*k);cx.drawImage(gSun,x-420*u,y-420*u,840*u,840*u);cx.globalAlpha=sv;cx.drawImage(gSun,x-60*u,y-60*u,120*u,120*u);bx=x;by=y;bt=sv*.8}
  const mv=S.moon*sm(-.02,.06,nS)*sm(1.02,.94,nS);
  if(mv>.01){const f=clamp(nS,0,1),x=W*(.15+.7*f)-camX*.08,y=hy+.04*H-Math.sin(Math.PI*f)*H*.42,sz=170*u+20;
    cx.globalAlpha=mv*.5*(.3+.7*moonInfo.ill);cx.drawImage(gMoon,x-sz*2.2,y-sz*2.2,sz*4.4,sz*4.4);cx.globalAlpha=mv*.22;cx.drawImage(gMoon,x-sz*4.5,y-sz*4.5,sz*9,sz*9);
    cx.globalCompositeOperation='source-over';cx.globalAlpha=mv;cx.save();cx.translate(x,y);cx.rotate(-.5);cx.drawImage(moonS,-sz/2,-sz/2,sz,sz);cx.restore();cx.globalCompositeOperation='lighter';if(!bt){bx=x;by=y;bt=mv*.7}}
  cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
  // volumetric-looking clouds (half-res layer, tinted + horizon-lit)
  CLx.globalCompositeOperation='source-over';CLx.clearRect(0,0,CLc.width,CLc.height);
  for(const c of clouds){if(!rm){c.x+=c.v*dt*DPR*(.45+1.1*amp)*(1+.9*gust)}const w=520*c.s*DPR*.5;if(c.x>W+w*2)c.x=-w*2;
    CLx.globalAlpha=(.55+.45*Math.sin(t*.1+c.p))*(.7+.3*c.d*3);CLx.drawImage(CL[c.k],(c.x-camX*c.d)/2,c.y/2,w,210*c.s*DPR*.5)}
  CLx.globalAlpha=1;CLx.globalCompositeOperation='source-atop';CLx.fillStyle=rgba(S.cloud,.8);CLx.fillRect(0,0,CLc.width,CLc.height);
  const cg=CLx.createLinearGradient(0,0,0,CLc.height);cg.addColorStop(.3,rgba(S.glow,0));cg.addColorStop(1,rgba(S.glow,.75));CLx.fillStyle=cg;CLx.fillRect(0,0,CLc.width,CLc.height);
  cx.globalAlpha=S.cA;cx.drawImage(CLc,0,0,W,hy);cx.globalAlpha=1;
  // crepuscular sun rays when the sun is low
  if(sv>.01&&S.sun>.2){const sp=clamp(sunS,0,1),low=clamp(1-Math.sin(Math.PI*sp)*1.8,0,1);
    if(low>.05){const rx=W*(.12+.76*sp)-camX*.1,ry=hy+.04*H-Math.sin(Math.PI*sp)*H*.46,len=H*1.3,rg=cx.createRadialGradient(rx,ry,0,rx,ry,len);rg.addColorStop(0,rgba(S.glow,.34*low*sv));rg.addColorStop(1,rgba(S.glow,0));
      cx.globalCompositeOperation='lighter';cx.fillStyle=rg;
      for(let k=0;k<7;k++){const a=-Math.PI+.18+k*(Math.PI-.36)/6+Math.sin(t*.12+k*1.7)*.03,w=.035+.02*Math.sin(t*.2+k*2.3);cx.beginPath();cx.moveTo(rx,ry);cx.lineTo(rx+Math.cos(a-w)*len,ry+Math.sin(a-w)*len);cx.lineTo(rx+Math.cos(a+w)*len,ry+Math.sin(a+w)*len);cx.closePath();cx.fill()}
      cx.globalCompositeOperation='source-over'}}
  // flocks of birds crossing the daytime sky
  const dayish=S.sun>.15&&S.stars<.6;
  if(!rm){if(!flock&&dayish&&Math.random()<.0012*(.5+amp))spawnFlock();if(flock){flock.x+=flock.v*dt;if(flock.x<-220*u||flock.x>W+220*u)flock=null}}
  if(flock&&dayish){const dir=Math.sign(flock.v);cx.strokeStyle='rgba(8,16,36,.72)';cx.lineWidth=1.7*u;cx.lineCap='round';
    for(let i=0;i<flock.n;i++){const rk=(i+1)>>1,sd2=i&1?1:-1,bx=flock.x-dir*rk*17*u,by=flock.y+Math.sin(t*.6+flock.bob)*10*u+(i?sd2*rk*9*u:0),fl=Math.sin(t*10+flock.ph+i*.7)*5*u;
      cx.beginPath();cx.moveTo(bx-9*u,by+fl*.6);cx.quadraticCurveTo(bx-4*u,by-4*u-fl,bx,by);cx.quadraticCurveTo(bx+4*u,by-4*u-fl,bx+9*u,by+fl*.6);cx.stroke()}}
  // skyline layers with atmospheric haze between
  const hz=.3+.35*S.sun,hazeG=a=>{const q=cx.createLinearGradient(0,hy-.1*H,0,wy);q.addColorStop(0,rgba(S.haze,0));q.addColorStop(1,rgba(S.haze,a));return q};
  const M=.06*W;cx.drawImage(L0,-M-camX*.15,camY*.1);cx.fillStyle=hazeG(hz);cx.fillRect(0,hy-.1*H,W,wy-hy+.1*H);
  drawMist(t,rm,wy-190*u,9,(.07+.13*S.sun)*(.75+.25*Math.sin(t*.1)));
  const f2=S.win*(.6+.4*Math.sin(t*.3)),amber='#ffb860';
  cx.globalCompositeOperation='lighter';cx.fillStyle=amber;
  for(const l of lights[0]){cx.globalAlpha=winOn(l[4])*.55*(.6+.4*Math.sin(t*.8+l[4]));cx.fillRect(l[0]-M-camX*.15,l[1]+camY*.1,l[2],l[3])}
  cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
  cx.drawImage(L1,-M-camX*.35,camY*.2);cx.fillStyle=hazeG(hz*.45);cx.fillRect(0,hy-.1*H,W,wy-hy+.1*H);
  cx.globalCompositeOperation='lighter';
  for(const l of lights[1]){const fl=.7+.3*Math.sin(t*(.7+(l[4]%1)*.3)+l[4]*3),x=l[0]-M-camX*.35,y=l[1]+camY*.2;cx.globalAlpha=winOn(l[4])*.8*fl;cx.fillStyle=amber;cx.fillRect(x,y,l[2],l[3]);
    if(l[5]){cx.globalAlpha=winOn(l[4])*.22*fl;cx.drawImage(gAmber,x-l[2]*1.6,y-l[3]*.4,l[2]*4.2,l[3]*1.8)}}
  cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
  // people walking to and from the mosque around prayer time
  {const door=W*.6344-camX*.35,sy=wy-3*u+camY*.2,mode=crowdForce?'arrive':ps.next&&ps.next.left<=25?'arrive':ps.prev&&ps.prev.since<=14?'leave':'',maxN=Math.round(cfg.cloud*1.1),
      want=crowdForce?crowdForce:mode==='arrive'?Math.round(clamp((25-ps.next.left)/22,0,1)*maxN):mode==='leave'?Math.round(clamp((14-ps.prev.since)/12,0,1)*maxN):0;
    while(ppl.length<12)ppl.push({a:0,o:0,v:0,dir:1,ph:Math.random()*6,on:false,mode:''});
    let act=0;for(const q of ppl)if(q.on&&q.mode===mode)act++;
    for(const q of ppl){
      if(!q.on&&act<want){act++;q.on=true;q.mode=mode;q.dir=Math.random()<.5?-1:1;q.v=(11+Math.random()*7)*u;q.o=crowdForce?q.dir*(60+Math.random()*260)*u:mode==='arrive'?q.dir*(W*.5+Math.random()*180*u):q.dir*8*u;q.a=mode==='leave'&&!crowdForce?0:1}
      if(!q.on)continue;
      if(!rm){if(q.mode==='arrive'){q.o-=q.dir*q.v*dt;if(Math.abs(q.o)<8*u)q.a-=dt*2}else{q.o+=q.dir*q.v*dt;q.a=Math.min(1,q.a+dt)}}
      if(q.mode!==mode&&!crowdForce)q.a-=dt*.8;
      if(q.a<=0||Math.abs(q.o)>W*.62){q.on=false;q.a=0;continue}
      const sx=door+q.o,s=u*1.9,sw2=rm?0:Math.sin(t*7+q.ph)*2.2*s;cx.globalCompositeOperation='lighter';cx.globalAlpha=Math.min(1,q.a)*(.22+.3*S.win);cx.drawImage(gAmber,sx-22*s,sy-24*s,44*s,34*s);cx.globalCompositeOperation='source-over';cx.globalAlpha=Math.min(1,q.a)*.92;cx.fillStyle='#02050c';cx.strokeStyle='#03070f';cx.lineWidth=1.4*s;
      cx.beginPath();cx.arc(sx,sy-12.5*s,2.1*s,0,6.3);cx.fill();cx.fillRect(sx-1.7*s,sy-10.5*s,3.4*s,6.5*s);cx.beginPath();cx.moveTo(sx,sy-4*s);cx.lineTo(sx+sw2,sy);cx.moveTo(sx,sy-4*s);cx.lineTo(sx-sw2,sy);cx.stroke()}
    cx.globalAlpha=1}
  // a ring of light spreads from the dome when a prayer begins
  for(let i=pulses.length-1;i>=0;i--){const p=pulses[i],age=t-p.t0;if(age>6.5){pulses.splice(i,1);continue}
    const px=W*.6344-camX*.35,py=wy-330*u+camY*.2,pr=age/6.5*W*.55,al=Math.pow(1-age/6.5,2);cx.globalCompositeOperation='lighter';
    const pg=cx.createRadialGradient(px,py,Math.max(0,pr*.8),px,py,pr+1);pg.addColorStop(0,'rgba(255,214,140,0)');pg.addColorStop(.75,`rgba(255,214,140,${.32*al})`);pg.addColorStop(1,'rgba(255,214,140,0)');cx.fillStyle=pg;cx.fillRect(0,0,W,wy);
    if(age<2.2){cx.globalAlpha=(1-age/2.2)*.5;cx.drawImage(gAmber,px-220*u,py-220*u,440*u,440*u)}cx.globalAlpha=1;cx.globalCompositeOperation='source-over'}
  // pigeons lifting off the minaret
  if(pigeons.length){cx.strokeStyle=S.stars>.3?'rgba(236,241,255,.9)':'rgba(30,42,72,.85)';cx.lineWidth=1.5*u;cx.lineCap='round';
    for(let i=pigeons.length-1;i>=0;i--){const g2=pigeons[i];g2.life-=dt;if(g2.life<=0){pigeons.splice(i,1);continue}
      g2.x+=g2.vx*dt;g2.y+=g2.vy*dt;g2.vy+=(-6*u-g2.vy)*dt*.2;const fl=Math.sin(t*14+g2.ph)*4*u,bx2=g2.x-camX*.35;cx.globalAlpha=Math.min(1,g2.life/1.5);
      cx.beginPath();cx.moveTo(bx2-7*u,g2.y+fl*.5);cx.quadraticCurveTo(bx2-3*u,g2.y-3*u-fl,bx2,g2.y);cx.quadraticCurveTo(bx2+3*u,g2.y-3*u-fl,bx2+7*u,g2.y+fl*.5);cx.stroke()}cx.globalAlpha=1}
  drawMist(t,rm,wy-90*u,15,(.1+.16*S.sun)*(.75+.25*Math.sin(t*.13+2)));
  // floating sky lanterns that rise from the water
  {const nl=Math.min(sl.length,Math.round(cfg.cloud*.9*(ramOn?1.7:1))),lv=S.lamp*(ramOn?1:.75);
    if(lv>.15){cx.globalCompositeOperation='lighter';
      for(let i=0;i<nl;i++){const sk=sl[i];if(sk.y<-50*u){sk.x=W*(.04+Math.random()*.92);sk.y=wy-Math.random()*30*u;sk.v=(10+Math.random()*14)*u;sk.p=Math.random()*6.28;sk.s=.7+Math.random()*.7}
        if(!rm)sk.y-=sk.v*dt;const kk=u*sk.s,x=sk.x+(Math.sin(t*.5+sk.p)*14+wind*20)*kk-camX*.3,fd=clamp((wy-sk.y)/(60*u),0,1)*clamp(sk.y/(H*.25),0,1);
        cx.globalAlpha=lv*fd*.35;cx.drawImage(gAmber,x-34*kk,sk.y-34*kk,68*kk,68*kk);cx.globalAlpha=lv*fd*.95;cx.fillStyle='#ffc46a';cx.fillRect(x-4*kk,sk.y-6*kk,8*kk,12*kk);cx.fillStyle='#ffe2a0';cx.fillRect(x-2.5*kk,sk.y-3*kk,5*kk,6*kk)}
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1}}
  // lanterns released by tapping the scene
  {let any=false;for(const q of ul)if(q.on){any=true;break}
    if(any){cx.globalCompositeOperation='lighter';
      for(const q of ul){if(!q.on)continue;if(!rm)q.y-=q.v*dt;if(q.y<-60*u){q.on=false;continue}const kk=u*1.35,x=q.x+(Math.sin(t*.6+q.p)*16+wind*22)*kk-camX*.3,fd=clamp(q.age/1.2,0,1)*clamp(q.y/(H*.2),0,1);q.age+=dt;
        cx.globalAlpha=fd*.45;cx.drawImage(gAmber,x-46*kk,q.y-46*kk,92*kk,92*kk);cx.globalAlpha=fd;cx.fillStyle='#ffc46a';cx.fillRect(x-4.5*kk,q.y-7*kk,9*kk,14*kk);cx.fillStyle='#fff0c0';cx.fillRect(x-2.6*kk,q.y-3.5*kk,5.2*kk,7*kk)}
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1}}
  if(viewOn&&pt.py>wy&&now-lastWake>260){lastWake=now;const rr=rip.find(z=>!z.a||z.a<=0);if(rr){rr.x=pt.px;rr.y=pt.py;rr.r=2*DPR;rr.a=.3}}
  // a dhow sailing slowly across the water
  {if(!rm){boat.x-=16*u*dt;if(boat.x<-130*u)boat.x=W+130*u}const bx=boat.x-camX*.35,by=wy+2*u,s=u;
    cx.fillStyle='#050c1e';cx.beginPath();cx.moveTo(bx-46*s,by-10*s);cx.quadraticCurveTo(bx-20*s,by+5*s,bx+46*s,by-13*s);cx.lineTo(bx+40*s,by-15*s);cx.quadraticCurveTo(bx,by-7*s,bx-46*s,by-10*s);cx.fill();
    cx.fillRect(bx-1*s,by-54*s,2*s,45*s);cx.fillStyle='#0c1832';cx.beginPath();cx.moveTo(bx,by-52*s);cx.lineTo(bx-36*s,by-15*s);cx.lineTo(bx+31*s,by-14*s);cx.closePath();cx.fill();
    if(S.lamp>.2){cx.globalCompositeOperation='lighter';cx.globalAlpha=S.lamp*(.7+.3*Math.sin(t*5));cx.drawImage(gAmber,bx+34*s,by-34*s,26*s,26*s);cx.globalCompositeOperation='source-over';cx.globalAlpha=1}}
  // waterfront: base, reflected strips of the scene above, glints, ripples
  g=cx.createLinearGradient(0,wy,0,H);g.addColorStop(0,rgba(S.bot,1,.55));g.addColorStop(1,rgba(S.top,1,.7));cx.fillStyle=g;cx.fillRect(0,wy,W,H-wy);
  const rows=cfg.rows,rh=(H-wy)/rows;
  for(let r=0;r<rows;r++){const k=r/rows,off=rm?0:Math.sin(t*1.3+r*.8)*(1+r*.45)*DPR*(.5+amp);cx.globalAlpha=.5*Math.pow(1-k,1.3);
    cx.drawImage(cv,0,wy-(r+1)*rh,W,rh,off,wy+r*rh,W,rh+.5)}
  cx.globalAlpha=1;
  if(bt>0){cx.globalCompositeOperation='lighter';cx.fillStyle=bx>0&&sv>.01?'#ffe2a0':'#a8d8ff';
    for(let r=0;r<rows;r+=2){const k=r/rows,w=(30+60*k)*DPR*(.6+.4*Math.sin(t*2+r)),o=rm?0:Math.sin(t*1.7+r*1.3)*10*DPR*k;cx.globalAlpha=bt*.5*(1-k);cx.fillRect(bx-w/2+o,wy+r*rh,w,Math.max(1,rh*.6))}
    for(let k=0;k<(rm?0:26);k++){const ph=k*2.399,yy=wy+(H-wy)*(.06+.92*((k*.381)%1)),dd=(yy-wy)/(H-wy),ww=(6+26*dd)*DPR,xx=bx+Math.sin(t*(.5+(k%5)*.13)+ph)*ww*1.6;cx.globalAlpha=(.3+.7*Math.max(0,Math.sin(t*3.1+ph)))*bt*(1-dd*.6)*.8;cx.fillRect(xx-ww*.25,yy,ww*.5,Math.max(1,DPR))}
    cx.globalCompositeOperation='source-over';cx.globalAlpha=1}
  if(!rm){cx.strokeStyle='#b4dcff';for(const r of rip){if(!r.a||r.a<=0){if(Math.random()<.03){r.x=W*(.15+rnd()*.7);r.y=wy+(H-wy)*(.15+rnd()*.5);r.r=2*DPR;r.a=.3}continue}
    r.r+=dt*26*DPR;r.a-=dt*.1;cx.globalAlpha=Math.max(0,r.a)*(.5+S.stars*.5);cx.lineWidth=DPR;cx.beginPath();cx.ellipse(r.x,r.y,r.r,r.r*.22,0,0,6.3);cx.stroke()}cx.globalAlpha=1}
  // foreground arch + lanterns (strongest parallax, slight overscan)
  const zs=1.05+(rm?0:.012*Math.sin(t*.035)+(viewOn?.012:0));cx.save();cx.translate(W/2-camX*.9,H/2-camY*.9);cx.scale(zs,zs);cx.drawImage(FG,-W/2,-H/2);
  for(const pm of palms){const sw=rm?0:(Math.sin(t*.9+pm.ph)*.018+Math.sin(t*2.3+pm.ph*2)*.008+wind*.05)*(.6+amp*.6);cx.save();cx.translate(pm.x-W/2,pm.y-H/2);cx.rotate(sw);cx.drawImage(pm.cv,-pm.px,-pm.py);cx.restore()}
  cx.globalCompositeOperation='lighter';
  for(const l of (ramOn?lampsAll:lamps)){const k=u*(l.s||1);const fl=rm?.85:.74+.14*Math.sin(t*7.3+l.p)+.08*Math.sin(t*13.1+l.p*2.1)+.04*Math.sin(t*23+l.p*3),a=Math.min(1,S.lamp*fl*(1+.35*calm+(ramOn?.25:0))*(l.s?.75:1)),sw=rm?0:(Math.sin(t*.6+l.p)*4*amp+wind*10)*k,x=l.x-W/2+sw,y=l.y-H/2;
    cx.globalAlpha=1;cx.strokeStyle='rgba(170,130,60,.8)';cx.lineWidth=2*k;cx.beginPath();cx.moveTo(l.x-W/2,y);cx.lineTo(x,y+l.len);cx.stroke();
    cx.globalAlpha=a*.2;cx.drawImage(gAmber,x-300*k,y+l.len-300*k,600*k,600*k);cx.globalAlpha=a*.6;cx.drawImage(gAmber,x-90*k,y+l.len-60*k,180*k,180*k);
    cx.globalAlpha=Math.min(1,a+.15);cx.fillStyle='#ffc46a';cx.fillRect(x-12*k,y+l.len+4*k,24*k,44*k);cx.globalAlpha=.95;cx.fillStyle='#8a5e22';cx.fillRect(x-17*k,y+l.len-6*k,34*k,9*k);cx.fillRect(x-6*k,y+l.len-16*k,12*k,10*k);cx.fillRect(x-17*k,y+l.len+48*k,34*k,7*k);cx.fillRect(x-1.5*k,y+l.len+55*k,3*k,9*k)}
  cx.restore();cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
  if(!rm&&S.stars>.35){const nf=Math.min(ff.length,Math.round(cfg.motes*.3*P.dens/60));cx.globalCompositeOperation='lighter';
    for(let i=0;i<nf;i++){const f=ff[i];let x=W*f.cx+Math.cos(t*f.fx+f.p)*f.rx*u-camX*.8,y=H*f.cy+Math.sin(t*f.fy+f.p*1.3)*f.ry*u;if(viewOn&&pt.px>0){const dx=pt.px-x,dy=pt.py-y,dd=Math.hypot(dx,dy),R=240*DPR;if(dd<R){const k2=(1-dd/R)*.5;x+=dx*k2;y+=dy*k2}}const bl=Math.max(0,Math.sin(t*f.b+f.p*2));if(bl<.05)continue;cx.globalAlpha=S.stars*bl*.9;cx.drawImage(gFly,x-9*u,y-9*u,18*u,18*u)}
    cx.globalCompositeOperation='source-over';cx.globalAlpha=1}
  // depth-aware dust motes (dimmed behind the content column)
  const night=Math.max(S.stars,S.lamp*.6);cx.fillStyle=night>.4?'#ffd9a0':'#fff4d8';
  for(let i=0;i<nMotes;i++){const z=MZ[i];if(!rm){MY[i]-=(4+z*14)*dt*DPR*(.3+amp);MX[i]+=(Math.sin(t*.4+MP[i])*8+wind*26)*z*dt*DPR;
      const dx=MX[i]-pt.px,dy=MY[i]-pt.py,d=Math.hypot(dx,dy),R=130*DPR;if(d<R&&d>1){const p=(1-d/R)*40*dt*z*DPR;MX[i]+=dx/d*p;MY[i]+=dy/d*p}
      if(MY[i]<-10){MY[i]=H+10;MX[i]=rnd()*W}if(MX[i]<-10)MX[i]=W+10;if(MX[i]>W+10)MX[i]=-10}
    const col=viewOn?1:.3+.7*sm(.12,.32,Math.abs(MX[i]/W-.55));cx.globalAlpha=(.1+.4*z*Math.abs(Math.sin(t*.6+MP[i])))*col*(.4+.6*amp)*(.4+night*.6);
    cx.beginPath();cx.arc(MX[i]-camX*z*.5,MY[i],(.7+z*2.2)*DPR,0,6.3);cx.fill()}
  cx.globalAlpha=1;
  // ambient-light overlay: keeps the dashboard calm and readable
  const lt=document.documentElement.getAttribute('data-theme')==='light';
  if(lt&&S.stars>.03){cx.globalCompositeOperation='screen';cx.fillStyle=`rgba(125,145,205,${.3*S.stars})`;cx.fillRect(0,0,W,H);cx.globalCompositeOperation='source-over'}
  g=cx.createRadialGradient(W*.55,H*.5,0,W*.55,H*.5,Math.max(W,H)*.8);
  g.addColorStop(0,`rgba(3,8,20,${viewOn?0:(lt?.03:S.veil*.95)+calm*.2})`);g.addColorStop(1,`rgba(3,8,20,${viewOn?.18:(lt?.16:S.veil*.3)+calm*.25})`);cx.fillStyle=g;cx.fillRect(0,0,W,H);
  if(Aud.c&&now-audT>400){audT=now;Aud.update(S,gust)}
  // adaptive quality + HUD
  if(!rm&&dt<.2){ema=ema*.95+dt*.05;if(ema>.028&&eff>0&&now-lastQ>4000){eff--;lastQ=now;ema=.0167;applyQ()}
    else if(ema<.0125&&eff<ORDER.indexOf(P.preset)&&now-lastQ>14000){eff++;lastQ=now;ema=.0167;applyQ()}}
  if(now-hud>1000){hud=now;const h=$('noorStat');if(h)h.textContent=(P.scene==='auto'?'Now: ':'Preview: ')+label[0].toUpperCase()+label.slice(1)+' · '+NAMES[ORDER[eff]]}
}
function psRefresh(now){if(now-psT<500)return;psT=now;const m=k=>{const v=typeof PT!=='undefined'&&PT&&PT[k];return v&&v!=='--:--'?toMins(v):null},d=new Date(),cm=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;let next=null,prev=null;
  for(const p of['Fajr','Dhuhr','Asr','Maghrib','Isha']){const v=m(p);if(v==null)continue;if(v>cm){if(!next)next={p,left:v-cm}}else prev={p,since:cm-v}}
  if(!next){const f=m('Fajr');if(f!=null)next={p:'Fajr',left:f+1440-cm}}
  ps={next,prev};if(prev&&prev.since<.5&&!P.rm&&P.on){const key=d.toDateString()+prev.p;if(key!==lastEv){lastEv=key;prayerEvent()}}}
function prayerEvent(){pulses.push({t0:tt});for(let i=0;i<9;i++)pigeons.push({x:W*.6344+330*u+(Math.random()-.5)*14*u,y:wy-440*u+(Math.random()-.5)*10*u,vx:(20+Math.random()*90)*u*(Math.random()<.25?-1:1),vy:-(25+Math.random()*60)*u,ph:Math.random()*6,life:7+Math.random()*3})}
function releaseLantern(x,y){let q=ul.find(z=>!z.on);if(!q){if(ul.length<16){q={};ul.push(q)}else q=ul[0]}Object.assign(q,{on:true,x,y:Math.min(y,wy-8*u),v:(16+Math.random()*10)*u,p:Math.random()*6.28,age:0});
  if(y>wy){const rr=rip.find(z=>!z.a||z.a<=0)||rip[0];rr.x=x;rr.y=y;rr.r=2*DPR;rr.a=.55}}
function setBedside(v){if(v&&!bedside){prevEff=eff;eff=0;bedside=true;applyQ()}else if(!v&&bedside){bedside=false;eff=prevEff;applyQ()}}
const tiltH=e=>{if(e.gamma==null)return;pt.tx=clamp(e.gamma/22,-1,1);pt.ty=clamp((e.beta-50)/28,-1,1)};
function setTilt(on){tiltOn=on;if(on){const go=()=>addEventListener('deviceorientation',tiltH,true);if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().then(x=>{if(x==='granted')go();else{tiltOn=false;P.tilt=false;const c=$('nTilt');if(c)c.checked=false}}).catch(()=>{tiltOn=false});else go()}else removeEventListener('deviceorientation',tiltH,true)}
function spawnFlock(fx){const dir=Math.random()<.5?1:-1;flock={x:fx!=null?W*fx:dir>0?-60*u:W+60*u,y:H*(.1+Math.random()*.25),v:dir*(55+Math.random()*35)*u,n:cfg.cloud>=5?5+(Math.random()*5|0):4,ph:Math.random()*6,bob:Math.random()*6}}
function drawMist(t,rm,yy,spd,al){if(!mistS||al<.01)return;const w=mistS.width,x0=-((rm?0:mistPh*spd*DPR)%w);cx.globalAlpha=al;for(let x=x0;x<W;x+=w)cx.drawImage(mistS,x,yy);cx.globalAlpha=1}
function loop(now){raf=0;if(!run)return;const dtMs=now-last;
  const cap=bedside?15:cfg.fps;if(cap&&dtMs<1000/cap-2&&!P.rm){raf=requestAnimationFrame(loop);return}
  last=now;draw(Math.min(.05,dtMs/1000),now);
  if(P.rm)tmo=setTimeout(()=>{tmo=0;if(run)raf=requestAnimationFrame(loop)},1500);else raf=requestAnimationFrame(loop)}
function start(){if(run||!P.on||paused||document.hidden)return;run=true;last=performance.now();raf=requestAnimationFrame(loop)}
function stop(){run=false;cancelAnimationFrame(raf);clearTimeout(tmo);raf=tmo=0}
function applyQ(){cfg=Q[ORDER[eff]];size()}

/* ── AUDIO (off by default; synthesized, no files) ── */
const Aud={c:null,M:null,n:[],tm:0,wG:null,cG:null,day:0,
  noise(c,sec,brown){const b=c.createBuffer(1,c.sampleRate*sec,c.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w*.5}const s=c.createBufferSource();s.buffer=b;s.loop=true;return s},
  on(){try{const c=this.c=new(window.AudioContext||window.webkitAudioContext)(),M=this.M=c.createGain();M.gain.value=0;M.connect(c.destination);
    const wd=this.noise(c,4,true),wf=c.createBiquadFilter();wf.type='bandpass';wf.frequency.value=420;wf.Q.value=.6;const wG=this.wG=c.createGain();wG.gain.value=.03;wd.connect(wf);wf.connect(wG);wG.connect(M);wd.start();
    const wt=this.noise(c,5,false),lf=c.createBiquadFilter();lf.type='lowpass';lf.frequency.value=800;const aG=c.createGain();aG.gain.value=.035;const l1=c.createOscillator(),l1g=c.createGain();l1.frequency.value=.13;l1g.gain.value=.02;l1.connect(l1g);l1g.connect(aG.gain);wt.connect(lf);lf.connect(aG);aG.connect(M);wt.start();l1.start();
    const o=c.createOscillator();o.frequency.value=4300;const a1=c.createGain();a1.gain.value=.5;const l2=c.createOscillator(),l2g=c.createGain();l2.frequency.value=19;l2g.gain.value=.5;l2.connect(l2g);l2g.connect(a1.gain);
    const a2=c.createGain();a2.gain.value=.5;const l3=c.createOscillator(),l3g=c.createGain();l3.frequency.value=.23;l3g.gain.value=.5;l3.connect(l3g);l3g.connect(a2.gain);const cG=this.cG=c.createGain();cG.gain.value=0;o.connect(a1);a1.connect(a2);a2.connect(cG);cG.connect(M);o.start();l2.start();l3.start();
    this.n=[wd,wt,l1,o,l2,l3];M.gain.setTargetAtTime(P.vol/100,c.currentTime,1.5);this.chirps()}catch{}},
  chirps(){clearTimeout(this.tm);const c=this.c;if(!c)return;if(this.day>.3){const f=2400+Math.random()*1400,k=2+(Math.random()*3|0);for(let i=0;i<k;i++){const o=c.createOscillator(),g=c.createGain(),t0=c.currentTime+i*.14;o.type='sine';o.frequency.setValueAtTime(f,t0);o.frequency.exponentialRampToValueAtTime(f*1.3,t0+.09);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.02*P.vol/60,t0+.02);g.gain.linearRampToValueAtTime(0,t0+.1);o.connect(g);g.connect(this.M);o.start(t0);o.stop(t0+.12)}}this.tm=setTimeout(()=>this.chirps(),2000+Math.random()*5000)},
  update(S,gs){const c=this.c;if(!c)return;const t=c.currentTime;this.day=S.sun*(1-S.stars);this.wG.gain.setTargetAtTime(.012+.07*gs,t,.5);this.cG.gain.setTargetAtTime(S.stars*.014,t,1);this.M.gain.setTargetAtTime(P.vol/100,t,.4)},
  off(){const c=this.c;if(!c)return;clearTimeout(this.tm);try{this.M.gain.cancelScheduledValues(0);this.M.gain.setTargetAtTime(0,c.currentTime,.25);setTimeout(()=>{this.n.forEach(x=>{try{x.stop()}catch{}});c.close()},900)}catch{}this.c=null}};

/* ── UI ── */
function ui(){
  const w=document.createElement('div');w.id='noorUI';
  w.innerHTML=`<button id="noorEye" aria-label="View the scene without the interface" title="View scene">👁</button><div id="noorHint" aria-live="polite">Scene view · tap to release a lantern · press Esc or Back to return</div><button id="noorBack" aria-label="Back to the app">✕ Back</button><div id="noorIdle" aria-hidden="true"><div id="niClock"></div><div id="niDate"></div><div id="niNext"></div></div>
  <button id="noorBtn" aria-label="Background settings" aria-expanded="false" aria-controls="noorPanel">✨</button>
  <div id="noorPanel" role="dialog" aria-label="Live background settings" hidden>
   <div class="nh"><b>Live background</b><span id="noorStat"></span></div>
   <label class="nr"><span>Live background</span><input type="checkbox" id="nOn"></label>
   <label class="nr"><span>Scene</span><select id="nScene"><option value="auto">Automatic (real prayer times)</option><option value="fajr">Preview: Fajr</option><option value="sunrise">Preview: Sunrise</option><option value="dhuhr">Preview: Dhuhr</option><option value="asr">Preview: Asr</option><option value="maghrib">Preview: Maghrib</option><option value="isha">Preview: Isha</option></select></label>
   <label class="nr c"><span>Animation intensity</span><input type="range" id="nInt" min="0" max="100"></label>
   <label class="nr c"><span>Particle density</span><input type="range" id="nDen" min="0" max="100"></label>
   <label class="nr"><span>Idle ambient mode</span><select id="nIdle"><option value="0">Off</option><option value="30">After 30 s</option><option value="60">After 1 min</option><option value="120">After 2 min</option><option value="300">After 5 min</option></select></label>
   <label class="nr"><span>Performance</span><select id="nQ"><option value="ultra">Ultra</option><option value="high">High</option><option value="balanced">Balanced</option><option value="saver">Battery saver</option></select></label>
   <label class="nr"><span>Reduced motion</span><input type="checkbox" id="nRm"></label>
   <label class="nr"><span>Ambient sound</span><input type="checkbox" id="nAud"></label>
   <label class="nr c"><span>Sound volume</span><input type="range" id="nVol" min="0" max="100"></label>
   <label class="nr"><span>Tilt parallax (phone)</span><input type="checkbox" id="nTilt"></label>
   <p class="nn">Previews never change your prayer schedule. Quality lowers itself automatically if your device struggles.</p></div>`;
  document.body.appendChild(w);
  const btn=$('noorBtn'),pan=$('noorPanel'),tog=o=>{pan.hidden=!o;btn.setAttribute('aria-expanded',o)};
  btn.onclick=()=>tog(pan.hidden);$('noorEye').onclick=e=>{e.stopPropagation();setView(!viewOn)};
  on(document,'click',e=>{if(idleOn&&!e.target.closest('#noorUI'))setView(false)});
  on(document,'pointerdown',e=>{if(viewOn&&!idleOn&&!e.target.closest('#noorUI'))releaseLantern(e.clientX*DPR,e.clientY*DPR)});
  on(document,'keydown',e=>{if(e.key==='Escape'){if(viewOn)setView(false);else if(!pan.hidden){tog(false);btn.focus()}}});
  $('nOn').checked=P.on;$('nScene').value=P.scene;$('nInt').value=P.inten;$('nDen').value=P.dens;$('nQ').value=P.preset;$('nRm').checked=P.rm;
  $('nOn').onchange=e=>{P.on=e.target.checked;save();apply()};
  $('nScene').onchange=e=>{P.scene=e.target.value;save()};
  $('nInt').oninput=e=>{P.inten=+e.target.value;save()};
  $('nDen').oninput=e=>{P.dens=+e.target.value;save();setMotes()};
  $('nQ').onchange=e=>{P.preset=e.target.value;eff=ORDER.indexOf(P.preset);save();applyQ()};
  $('nRm').onchange=e=>{P.rm=e.target.checked;save();stop();start()};
  $('nAud').onchange=e=>{P.audio=e.target.checked;P.audio?Aud.on():Aud.off()};
  $('nIdle').value=P.idle;$('nIdle').onchange=e=>{P.idle=+e.target.value;save()};$('nVol').value=P.vol;$('nVol').oninput=e=>{P.vol=+e.target.value;save()};$('nTilt').checked=P.tilt;$('nTilt').onchange=e=>{P.tilt=e.target.checked;save();setTilt(P.tilt)};$('noorBack').onclick=()=>setView(false);
}
function setView(v,idle){viewOn=v;idleOn=!!(v&&idle);const h0=document.documentElement.classList;h0.toggle('noor-view',v);h0.toggle('noor-idle',idleOn);const h=$('noorHint');if(h){h.classList.toggle('show',v&&!idle);clearTimeout(setView.t);if(v&&!idle)setView.t=setTimeout(()=>h.classList.remove('show'),5000)}if(v&&$('noorPanel'))$('noorPanel').hidden=true}
function updIdle(){const d=new Date(),c=$('niClock');if(!c)return;c.textContent=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('niDate').textContent=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});const nx=ps.next;$('niNext').textContent=nx?nx.p+' in '+(nx.left>=60?Math.floor(nx.left/60)+'h '+Math.round(nx.left%60)+'m':Math.round(nx.left)+' min'):''}
function enterIdle(){if(idleOn||viewOn||!P.on)return;setView(true,true);updIdle()}
let lx=0,ly=0;const bump=e=>{if(e&&e.type==='pointermove'){if(Math.hypot((e.clientX||0)-lx,(e.clientY||0)-ly)<6)return;lx=e.clientX;ly=e.clientY}lastAct=performance.now();if(idleOn)setView(false)};
function setMotes(){nMotes=Math.round(cfg.motes*P.dens/60);nMotes=Math.min(nMotes,MX.length)}
function apply(){const ey=$('noorEye');if(ey)ey.style.display=P.on?'':'none';if(!P.on&&viewOn)setView(false);document.documentElement.classList.toggle('noor-off',!P.on);cv.style.display=P.on?'':'none';P.on?start():stop()}

/* ── BOOT ── */
on(window,'resize',(()=>{let r;return()=>{clearTimeout(r);r=setTimeout(size,250)}})());
on(window,'pointermove',e=>{if(!tiltOn){pt.tx=e.clientX/innerWidth*2-1;pt.ty=e.clientY/innerHeight*2-1}pt.px=e.clientX*DPR;pt.py=e.clientY*DPR},{passive:true});
on(document,'visibilitychange',()=>document.hidden?stop():start());
const rmChange=e=>{if(localStorage.getItem('noor_prefs')==null){P.rm=e.matches;const c=$('nRm');if(c)c.checked=P.rm;stop();start()}};
mq.addEventListener?mq.addEventListener('change',rmChange):0;
size();ui();apply();setMotes();lastAct=performance.now();if(P.tilt)setTilt(true);
['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(ev=>on(window,ev,bump,{passive:true,capture:true}));
setInterval(()=>{if(idleOn){updIdle();return}const app=$('appScreen');if(P.idle>0&&P.on&&!viewOn&&!bedside&&app&&app.classList.contains('active')&&performance.now()-lastAct>P.idle*1000&&!document.querySelector('#arView,#bedside,#travelBar')&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))enterIdle()},1000);
window.NOOR={prefs:P,moon:moonPhase,drawMoon,setCalm:v=>{calmT=clamp(v,0,1)},setRamadan:v=>{ramOn=!!v},spawnBirds:spawnFlock,pulse:prayerEvent,crowd:q=>{crowdForce=q},idle:()=>enterIdle(),release:releaseLantern,setBedside,pause:v=>{paused=!!v;paused?stop():start()},view:v=>setView(!!v),destroy(){stop();L.forEach(([t,e,f,o])=>t.removeEventListener(e,f,o));Aud.off();cv.remove();$('noorUI')?.remove();delete window.NOOR}};
})();
