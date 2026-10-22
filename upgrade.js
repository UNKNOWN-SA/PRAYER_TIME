/* Prayer Time upgrade layer: live sky, sun path, Qibla compass, reminders, Islamic dates */
(()=>{
const $=id=>document.getElementById(id), M=t=>(t&&t!=='--:--')?toMins(t):null;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ang=x=>(((x+540)%360)+360)%360-180;
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let override=null;
const nowMin=()=>{if(override!=null)return override;const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60};
const hh=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const hm=m=>Math.floor(m/60)+'h '+String(Math.round(m%60)).padStart(2,'0')+'m';
function times(){const m=M(PT.Maghrib)??1085;return{f:M(PT.Fajr)??300,sr:M(PT.Sunrise)??375,d:M(PT.Dhuhr)??740,a:M(PT.Asr)??950,m,i:M(PT.Isha)??1170,ss:M(PT.Sunset)??m}}

/* ───────── LIVE SKY ───────── */
const cv=$('sky'),cx=cv.getContext('2d');
let W=0,H=0,DPR=1,K=1,stars,clouds,motes,lights,city,cl,moon,shoot=null;
const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgb=c=>`rgb(${c.map(Math.round)})`;
function palette(n){
  const t=times();
  const k=[[0,'#04091a','#0a1430'],[t.f-35,'#060d24','#0f1b42'],[t.f+10,'#22306b','#d0657c'],[t.sr+25,'#4a82c9','#f5bd82'],[t.d-90,'#2f74c4','#86c8f0'],[t.a+40,'#3068b4','#a3cfe9'],[t.m-35,'#40529e','#f79c5a'],[t.m+18,'#2b1b50','#c9506a'],[t.i,'#0a1230','#1a2350'],[1440,'#04091a','#0a1430']].sort((x,y)=>x[0]-y[0]);
  for(let i=1;i<k.length;i++)if(n<=k[i][0]){const a=k[i-1],b=k[i],u=clamp((n-a[0])/((b[0]-a[0])||1),0,1);return[mix(hex(a[1]),hex(b[1]),u),mix(hex(a[2]),hex(b[2]),u)]}
  return[hex(k[0][1]),hex(k[0][2])];
}
function bodies(n){const t=times(),nn=n<t.sr?n+1440:n;return{sunS:(n-t.sr)/(t.ss-t.sr),nightS:(nn-t.ss)/(t.sr+1440-t.ss)}}
const arcPos=s=>[W*(.08+.84*s),H*.58-Math.sin(Math.PI*s)*H*.46];

function build(){
  K=Math.min(W,H*1.5)/1400;const k=K*.62;
  stars=Array.from({length:170},()=>({x:Math.random()*W,y:Math.random()*H*.7,r:(.4+Math.random()*1.2)*DPR,p:Math.random()*6.28,s:.6+Math.random()*1.6}));
  clouds=Array.from({length:6},()=>({x:Math.random()*W,y:H*(.08+Math.random()*.4),w:(220+Math.random()*260)*DPR,v:(4+Math.random()*8)*DPR,a:.5+Math.random()*.5}));
  motes=Array.from({length:42},()=>({x:Math.random()*W,y:Math.random()*H,r:(.6+Math.random()*1.8)*DPR,v:(6+Math.random()*14)*DPR,p:Math.random()*6.28}));
  // skyline with a mosque
  const hS=Math.round(H*.34);city=document.createElement('canvas');city.width=W;city.height=hS;
  const c=city.getContext('2d'),base=hS,mx=W*.7;lights=[];c.fillStyle='#030816';
  const R=(x,y,w,h)=>c.fillRect(x,y,w,h),dome=(x,y,r)=>{c.beginPath();c.arc(x,y,r,Math.PI,0);c.fill()};
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let x=0;x<W;){const w=(28+rnd()*50)*k,h=(30+rnd()*110)*k;
    if(Math.abs(x+w/2-mx)>260*k){R(x,base-h,w,h);if(rnd()<.35)dome(x+w/2,base-h,w*.32);
      for(let j=0;j<3;j++)if(rnd()<.5)lights.push([x+rnd()*(w-6*k),base-h+10*k+rnd()*(h-20*k),3*k,3*k])}
    x+=w+(4+rnd()*8)*k}
  R(mx-170*k,base-110*k,340*k,110*k);dome(mx,base-110*k,95*k);dome(mx-125*k,base-110*k,45*k);dome(mx+125*k,base-110*k,45*k);
  R(mx-1.5*k,base-248*k,3*k,44*k);c.beginPath();c.arc(mx,base-254*k,6*k,0,6.3);c.fill();
  for(let i=-3;i<=3;i++)lights.push([mx+i*38*k-5*k,base-70*k,10*k,22*k]);
  [-1,1].forEach(s=>{const x=mx+s*215*k;R(x-9*k,base-300*k,18*k,300*k);R(x-15*k,base-300*k,30*k,9*k);R(x-7*k,base-340*k,14*k,40*k);
    c.beginPath();c.moveTo(x-8*k,base-340*k);c.lineTo(x,base-395*k);c.lineTo(x+8*k,base-340*k);c.fill();
    lights.push([x-2*k,base-250*k,4*k,12*k],[x-2*k,base-200*k,4*k,12*k])});
  // clouds & moon sprites
  cl=document.createElement('canvas');cl.width=400;cl.height=140;let g=cl.getContext('2d');
  [[90,80,60],[160,60,70],[240,70,65],[310,85,50],[200,95,70]].forEach(([x,y,r])=>{const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(255,255,255,.9)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,400,140)});
  moon=document.createElement('canvas');moon.width=moon.height=90;g=moon.getContext('2d');g.fillStyle='#f4f1de';g.beginPath();g.arc(45,45,30,0,6.3);g.fill();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(58,36,26,0,6.3);g.fill();
}
function size(){DPR=Math.min(devicePixelRatio||1,1.5);W=cv.width=Math.round(innerWidth*DPR);H=cv.height=Math.round(innerHeight*DPR);build()}
function glow(x,y,r,c0,c1){const q=cx.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,c0);q.addColorStop(1,c1);cx.fillStyle=q;cx.fillRect(x-r,y-r,2*r,2*r)}

function frame(ts){
  requestAnimationFrame(frame);
  if(document.hidden||!W)return;
  const t=rm?0:ts/1000,n=nowMin(),[top,bot]=palette(n);
  const lum=(top[0]*.3+top[1]*.6+top[2]*.1)/255,night=clamp(1-lum*4.2,0,1),day=clamp(lum*2.2,0,1);
  const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,rgb(top));g.addColorStop(1,rgb(bot));cx.fillStyle=g;cx.fillRect(0,0,W,H);
  if(night>.02){cx.fillStyle='#fff';stars.forEach(s=>{cx.globalAlpha=night*(.35+.65*Math.abs(Math.sin(t*s.s+s.p)));cx.beginPath();cx.arc(s.x,s.y,s.r,0,6.3);cx.fill()})}
  cx.globalAlpha=1;
  if(!rm&&night>.6&&!shoot&&Math.random()<.002)shoot={x:Math.random()*W*.8+W*.1,y:Math.random()*H*.3,l:0};
  if(shoot){shoot.l+=.02;const x=shoot.x+shoot.l*420*DPR,y=shoot.y+shoot.l*200*DPR,q=cx.createLinearGradient(x,y,x-120*DPR,y-57*DPR);
    q.addColorStop(0,'rgba(255,255,255,.9)');q.addColorStop(1,'rgba(255,255,255,0)');cx.strokeStyle=q;cx.lineWidth=1.6*DPR;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x-120*DPR,y-57*DPR);cx.stroke();if(shoot.l>1)shoot=null}
  const{sunS,nightS}=bodies(n);
  if(sunS>=0&&sunS<=1){const[x,y]=arcPos(sunS),hz=1-Math.sin(Math.PI*sunS);
    glow(x,y,300*DPR*K,`rgba(255,${Math.round(214-70*hz)},130,.55)`,'rgba(255,200,120,0)');
    cx.fillStyle=`rgb(255,${Math.round(243-80*hz)},${Math.round(196-120*hz)})`;cx.beginPath();cx.arc(x,y,30*DPR*K+8,0,6.3);cx.fill()}
  else if(nightS>=0&&nightS<=1){const[x,y]=arcPos(nightS);glow(x,y,220*DPR*K,'rgba(190,210,255,.3)','rgba(190,210,255,0)');const s=90*DPR*K+30;cx.drawImage(moon,x-s/2,y-s/2,s,s)}
  clouds.forEach(c=>{if(!rm){c.x+=c.v/60;if(c.x>W+c.w)c.x=-c.w}cx.globalAlpha=(.07+.38*day)*c.a;cx.drawImage(cl,c.x,c.y,c.w,c.w*.35)});
  cx.fillStyle='#f0c866';motes.forEach(m=>{if(!rm){m.y-=m.v/60;if(m.y<-10){m.y=H+10;m.x=Math.random()*W}}cx.globalAlpha=.12+.25*Math.abs(Math.sin(t*.7+m.p));cx.beginPath();cx.arc(m.x,m.y,m.r,0,6.3);cx.fill()});
  cx.globalAlpha=1;
  const hz=cx.createLinearGradient(0,H*.6,0,H);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,rgb(bot).replace('rgb','rgba').replace(')',',.55)'));cx.fillStyle=hz;cx.fillRect(0,H*.6,W,H*.4);
  cx.drawImage(city,0,H-city.height);
  cx.fillStyle='#ffd27a';lights.forEach((l,i)=>{cx.globalAlpha=night*(.55+.45*Math.sin(t*.8+i));cx.fillRect(l[0],H-city.height+l[1],l[2],l[3])});
  cx.globalAlpha=1;cx.fillStyle='rgba(4,8,20,.34)';cx.fillRect(0,0,W,H);
}


/* ───────── SUN PATH CARD (all six prayers) ───────── */
const AX0=34,AX1=566,AH=172,AA=118;let marksKey='';
function sunT(){const t=times();t.sr=Math.max(t.sr,t.f+5);t.d=Math.max(t.d,t.sr+5);t.a=Math.max(t.a,t.d+5);t.ss=Math.max(t.ss,t.a+5);t.m=Math.max(t.m,t.ss);t.i=Math.max(t.i,t.m+5);return t}
const axf=(t,n)=>AX0+(AX1-AX0)*clamp((n-t.f)/(t.i-t.f),0,1);
const ayf=(t,n)=>{const s=(n-t.sr)/(t.ss-t.sr);return s>0&&s<1?AH-AA*Math.sin(Math.PI*s):AH};
const poly=(t,from,to,N)=>{let d='';for(let k=0;k<=N;k++){const m=from+(to-from)*k/N;d+=(k?'L':'M')+axf(t,m).toFixed(1)+' '+ayf(t,m).toFixed(1)}return d};
function mkArc(){
  if($('dayArc')||!document.querySelector('.qcard'))return;
  const d=document.createElement('div');d.id='dayArc';d.className='card dayarc';
  d.innerHTML=`<div class="da-head"><b>🌤 Sun path</b><span id="daNote"></span></div><svg viewBox="0 0 600 262" role="img" aria-label="Sun path with all six prayer times"><line x1="14" y1="172" x2="586" y2="172" class="hz"/><path id="daBase"/><path id="daDone"/><g id="daMarks"></g><g id="daSun"><circle r="18" class="halo"/><circle r="8"/></g></svg>`;
  document.querySelector('.qcard').before(d);
}
function updArc(){
  if(!$('daSun'))return;
  const t=sunT(),n=nowMin(),key=JSON.stringify(t);
  if(key!==marksKey){marksKey=key;$('daBase').setAttribute('d',poly(t,t.f,t.i,220));
    $('daMarks').innerHTML=[['Fajr',t.f,PT.Fajr,0],['Sunrise',t.sr,PT.Sunrise,0],['Dhuhr',t.d,PT.Dhuhr,1],['Asr',t.a,PT.Asr,1],['Maghrib',t.m,PT.Maghrib,0],['Isha',t.i,PT.Isha,0]].map(([l,v,s,hi])=>{
      const x=axf(t,v).toFixed(1),y=ayf(t,v).toFixed(1),tm=s&&s!=='--:--'?ampm(s):'–',side=l==='Asr',low=l==='Sunrise'||l==='Isha',ty=side?+y-18:hi?+y-26:AH+(low?62:24),tx=side?+x+12:l==='Isha'?+x+16:x,an=side?'start':l==='Isha'?'end':'middle';
      return(low?`<line x1="${x}" x2="${x}" y1="${y}" y2="${ty-14}" class="ld"/>`:'')+`<circle cx="${x}" cy="${y}" r="5"/><text x="${tx}" y="${ty}" text-anchor="${an}" class="nm">${l}</text><text x="${tx}" y="${ty+15}" text-anchor="${an}">${tm}</text>`}).join('')}
  const day=n>t.sr&&n<t.ss,nc=clamp(n,t.f,t.i);
  $('daSun').setAttribute('transform',`translate(${axf(t,nc).toFixed(1)} ${ayf(t,nc).toFixed(1)})`);$('daSun').setAttribute('class',day?'sun':'moon');
  $('daDone').setAttribute('d',nc>t.f?poly(t,t.f,nc,Math.max(2,Math.round((nc-t.f)/(t.i-t.f)*220))):'');
  $('daNote').textContent=day?hm(t.ss-n)+' of daylight left':n>=t.f&&n<=t.sr?'Sunrise in '+hm(t.sr-n):n>t.ss&&n<t.i?'Isha in '+hm(t.i-n):'Last third of the night starts '+ampm(hh(t.ss+(t.sr+1440-t.ss)*2/3));
}

/* ───────── ISLAMIC DATES ───────── */
const EV=[[1,1,'Islamic New Year','🌙'],[10,1,'Day of Ashura','🕊️'],[12,3,'Mawlid an-Nabi','🌿'],[27,7,"Isra & Mi'raj",'🌠'],[15,8,"Mid-Sha'ban",'✨'],[1,9,'Ramadan begins','🌙'],[27,9,'Laylat al-Qadr (likely night)','⭐'],[1,10,'Eid al-Fitr','🎉'],[9,12,'Day of Arafah','⛰️'],[10,12,'Eid al-Adha','🐑']];
let evDay='';
function mkEvents(){
  const card=$('evCard')||Object.assign(document.createElement('div'),{id:'evCard',className:'card evcard'});
  if(!card.parentNode&&$('dayArc'))$('dayArc').after(card);
  if(evDay===TK())return;evDay=TK();
  try{
    const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric'}),found={},b=new Date();b.setHours(12,0,0,0);
    const part=(d,ty)=>+f.formatToParts(d).find(x=>x.type===ty).value;
    for(let i=0;i<400;i++){const d=new Date(b);d.setDate(b.getDate()+i);const dd=part(d,'day'),mm=part(d,'month');EV.forEach((e,j)=>{if(e[0]===dd&&e[1]===mm&&found[j]==null)found[j]=i})}
    const list=EV.map((e,j)=>({n:e[2],i:e[3],d:found[j]})).filter(e=>e.d!=null).sort((a,c)=>a.d-c.d).slice(0,4);
    const tm=new Date(b);tm.setDate(tm.getDate()+1);const wd=tm.getDay(),hd=part(tm,'day');
    const fast=wd===1||wd===4?'Tomorrow is a Sunnah fasting day ('+(wd===1?'Monday':'Thursday')+').':(hd>=13&&hd<=15?'Tomorrow is one of the white days (Ayyam al-Bid), a Sunnah fast.':'');
    card.innerHTML='<div class="da-head"><b>🗓 Coming up</b><span>Dates may shift by a day with moon sighting</span></div>'+list.map(e=>{const dt=new Date(b);dt.setDate(b.getDate()+e.d);
      return`<div class="evrow"><span class="ei">${e.i}</span><span class="en">${e.n}<small>${dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</small></span><span class="ed">${e.d===0?'Today':e.d===1?'Tomorrow':'in '+e.d+' days'}</span></div>`}).join('')+(fast?`<div class="evfast">🌙 ${fast}</div>`:'');
  }catch{card.remove()}
}

/* ───────── QIBLA ───────── */
const KA=[21.4225,39.8262],rad=x=>x*Math.PI/180;
const qibla=(la,lo)=>{const p1=rad(la),p2=rad(KA[0]),dl=rad(KA[1]-lo);return(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360};
const dist=(la,lo)=>{const p1=rad(la),p2=rad(KA[0]),a=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(rad(KA[1]-lo)/2)**2;return 12742*Math.asin(Math.sqrt(a))};
let heading=null,bearing=0,disp=0,qOk=false;
function renderQibla(){
  const w=$('qBody');if(!w)return;
  if(!locInfo){w.innerHTML='<p class="muted">Set your location to find the Qibla direction.</p><button class="smb" onclick="showLoc()">Set location</button>';return}
  bearing=qibla(locInfo.lat,locInfo.lon);
  let ticks='';for(let a=0;a<360;a+=10)ticks+=`<line y1="-138" y2="${a%90?-130:-122}" transform="rotate(${a})"/>`;
  const dirs=['north','north-east','east','south-east','south','south-west','west','north-west'];
  w.innerHTML=`<svg id="qSvg" viewBox="-160 -160 320 320" role="img" aria-label="Qibla compass"><g id="qDial"><circle r="140" class="rim"/>${ticks}<text y="-106">N</text><text x="108" y="5">E</text><text y="116">S</text><text x="-108" y="5">W</text><g transform="rotate(${bearing})"><line y2="-96" class="qline"/><path d="M0 -124 l10 22 h-20z" class="qm"/></g></g><path d="M0 -158 l8 14 h-16z" class="ptr"/><circle r="5" class="hub"/></svg>
  <div class="qinfo"><div class="qdeg">${Math.round(bearing)}°</div><div>${dirs[Math.round(bearing/45)%8]} of true north · ${Math.round(dist(locInfo.lat,locInfo.lon)).toLocaleString()} km to Makkah</div><div id="qHint" class="muted">Turn on the live compass and hold your phone flat.</div></div><button class="smb" id="qBtn">Enable live compass</button>`;
  $('qBtn').onclick=startCompass;
}
function startCompass(){
  const on=e=>{const h=e.webkitCompassHeading!=null?e.webkitCompassHeading:((e.absolute||e.type==='deviceorientationabsolute')&&e.alpha!=null?360-e.alpha:null);if(h!=null)heading=h};
  const attach=()=>{addEventListener('deviceorientationabsolute',on,true);addEventListener('deviceorientation',on,true);$('qHint').textContent='Turn until the gold marker points to the arrow at the top.';
    setTimeout(()=>{if(heading==null&&$('qHint'))$('qHint').textContent='No compass sensor found. The dial shows the Qibla angle from true north.'},2500)};
  if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().then(r=>r==='granted'?attach():($('qHint').textContent='Compass permission was denied.')).catch(()=>{});
  else attach();
}
function qLoop(){
  requestAnimationFrame(qLoop);
  const dial=$('qDial');if(!dial||!$('pg-qibla').classList.contains('active'))return;
  disp+=ang(-(heading||0)-disp)*.18;dial.setAttribute('transform',`rotate(${disp.toFixed(2)})`);
  if(heading!=null){const al=Math.abs(ang(bearing-heading))<4;$('qSvg').classList.toggle('ok',al);if(al&&!qOk&&navigator.vibrate)navigator.vibrate(40);qOk=al}
}
qLoop();

/* ───────── REMINDERS + SETTINGS ───────── */
function chime(){try{const a=new(window.AudioContext||window.webkitAudioContext)();[523.25,659.25,783.99].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.28;o.type='sine';o.frequency.value=f;o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.start(t);o.stop(t+2.3)})}catch{}}
function mkSettings(){
  const pg=$('pg-settings');if(!pg||$('remCard'))return;
  const r=gs('rem',{on:true,pre:10}),c=document.createElement('div');c.id='remCard';c.className='card';c.style.marginBottom='16px';
  c.innerHTML=`<div style="font-weight:700;margin-bottom:12px;font-size:.95rem">🔔 Reminders</div>
  <label class="setrow"><span>Chime and alert at prayer time</span><input type="checkbox" id="remOn"></label>
  <label class="setrow"><span>Heads-up before each prayer</span><select id="remPre">${[0,5,10,15,20,30].map(v=>`<option value="${v}">${v?v+' minutes':'Off'}</option>`).join('')}</select></label>
  <div class="setrow"><button class="smb" id="remTest">Play test chime</button></div>`;
  pg.appendChild(c);
  $('remOn').checked=r.on;$('remPre').value=r.pre;
  const save=()=>ss('rem',{on:$('remOn').checked,pre:+$('remPre').value});
  $('remOn').onchange=save;$('remPre').onchange=save;$('remTest').onclick=chime;
}
const fired=new Set();
function tick(){
  mkArc();mkEvents();updArc();
  if(!$('appScreen').classList.contains('active'))return;
  const r=gs('rem',{on:true,pre:10});if(!r.on)return;
  const d=new Date(),n=d.getHours()*60+d.getMinutes();
  PRAYERS.forEach(p=>{const pm=M(PT[p]);if(pm==null)return;
    [[pm-r.pre,`${p} starts in ${r.pre} minutes`,0],[pm,`It's time for ${p}`,1]].forEach(([at,msg,main])=>{
      if(n!==at||(!main&&!r.pre))return;const k=TK()+p+main;if(fired.has(k))return;fired.add(k);
      notif(main?'Prayer time':'Get ready',msg,'🕌');if(main)(window.PTSound?PTSound.play(p):chime());
      try{if(Notification.permission==='granted')new Notification('Prayer Time',{body:msg})}catch{}})});
}
/* ───────── THEME SWITCH ───────── */
function syncTheme(t){const dark=t!=='light';document.querySelectorAll('.theme-sw').forEach(b=>{b.setAttribute('aria-checked',dark);b.setAttribute('aria-label',dark?'Dark mode on. Switch to light mode':'Light mode on. Switch to dark mode')});
  const l=dark?'Dark mode':'Light mode';['thLabel','thLabel2'].forEach(i=>{const e=$(i);if(e)e.textContent=l});const k=$('thIco2');if(k)k.textContent=dark?'🌙':'☀️'}
const _at=window.applyTheme;
window.applyTheme=function(t){const h=document.documentElement;h.classList.add('theme-anim');_at(t);syncTheme(t);clearTimeout(window.__ta);window.__ta=setTimeout(()=>h.classList.remove('theme-anim'),700)};
syncTheme(document.documentElement.getAttribute('data-theme')||'dark');
/* ───────── SIDEBAR MODES: full · icon rail · slid away ───────── */
const SBM=['full','rail','hide'];let sbm=0;
try{sbm=Math.max(0,SBM.indexOf(localStorage.getItem('pt_sb')))}catch{}
function applySB(){
  const h=document.documentElement;h.classList.toggle('sb-rail',sbm===1);h.classList.toggle('sb-hide',sbm===2);
  const b=$('sbToggle');if(b){const t=['Collapse sidebar','Hide sidebar','Show sidebar'][sbm];b.textContent=sbm===2?'›':'‹';b.title=t+' ( [ )';b.setAttribute('aria-label',t);b.setAttribute('aria-expanded',sbm!==2)}
  try{localStorage.setItem('pt_sb',SBM[sbm])}catch{}
}
function cycleSB(){sbm=(sbm+1)%3;applySB()}
function mkSB(){
  if($('sbToggle'))return;const b=document.createElement('button');b.id='sbToggle';b.type='button';b.onclick=cycleSB;
  $('appScreen').appendChild(b);
  document.querySelectorAll('.ni').forEach(n=>{n.title=n.textContent.replace(/\s+/g,' ').trim().replace(/ \d+$/,'')});
  addEventListener('keydown',e=>{if(e.key==='['&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))cycleSB()});
  applySB();
}
const _go=window.go;window.go=function(id,n){_go(id,n);if(id==='qibla')renderQibla();if(id==='settings')mkSettings()};
mkArc();mkSettings();mkEvents();mkSB();setInterval(tick,1000);
})();
