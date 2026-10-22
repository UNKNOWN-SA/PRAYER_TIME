/* Prayer Time FUTURE layer: moon phase · AR Qibla · habit insights · calm + nudges · AI companion · voice · adhan audio · PWA/offline · mini widget · family circle */
(()=>{
'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mins=t=>(t&&t!=='--:--')?toMins(t):null;
const nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60};
const fmtLeft=m=>{m=Math.max(0,Math.round(m));return m>=60?Math.floor(m/60)+'h '+(m%60)+'m':m+' min'};
const ang=x=>(((x+540)%360)+360)%360-180,rad=x=>x*Math.PI/180;
const localKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function nextPrayer(){const n=nowM();for(const p of PRAYERS){const m=mins(PT[p]);if(m!=null&&m>n)return{p,left:m-n,m}}const m=mins(PT.Fajr);return m==null?null:{p:'Fajr',left:m+1440-n,m}}
const appActive=()=>$('appScreen')&&$('appScreen').classList.contains('active');

/* ── pages + nav ── */
function mkNav(){
  const nav=document.querySelector('.sb nav');if(!nav||$('ng-future'))return;
  const g=document.createElement('div');g.className='nav-group open';g.id='ng-future';
  g.innerHTML='<div class="nav-group-hdr" onclick="toggleNavGroup(\'ng-future\')"><span>✨ Smart</span><span class="nav-arrow">▾</span></div><div class="nav-group-body" id="ngFutureBody"></div>';
  nav.appendChild(g);
}
function addPage(id,icon,label,html){
  const pg=document.createElement('div');pg.className='pg';pg.id='pg-'+id;pg.innerHTML=html;document.querySelector('.mn').appendChild(pg);
  const ni=document.createElement('div');ni.className='ni';ni.setAttribute('onclick',`go('${id}',this)`);ni.title=label;ni.innerHTML=`<span class="nic">${icon}</span>${label}`;$('ngFutureBody').appendChild(ni);
}

/* ── 1. LIVE MOON PHASE ── */
function mkMoon(){
  if(!window.NOOR||!NOOR.moon||$('moonCard'))return;
  const c=document.createElement('div');c.id='moonCard';c.className='card moon-card';
  c.innerHTML='<canvas id="moonCv" width="120" height="120" aria-hidden="true"></canvas><div class="mc-t"><b id="moonName"></b><span id="moonSub"></span><small id="moonNote"></small></div>';
  const a=$('evCard')||$('dayArc');if(a)a.after(c);else return;updMoon();
}
function updMoon(){
  const cv=$('moonCv');if(!cv||!NOOR.moon)return;const m=NOOR.moon(),x=cv.getContext('2d');
  x.clearRect(0,0,120,120);x.save();x.translate(60,60);NOOR.drawMoon(x,m.ph,50,'#f6f1dc','#1b2442');x.restore();
  $('moonName').textContent='🌙 '+m.name;$('moonSub').textContent=Math.round(m.ill*100)+'% lit · moon age '+m.age.toFixed(1)+' days';
  $('moonNote').textContent=m.ph>.4&&m.ph<.6?'Bright night: a lovely time for Tahajjud.':m.ph<.06||m.ph>.94?'Near the new moon: the Hijri month is turning.':'The background moon matches this phase.';
}

/* ── 3. AR QIBLA ── */
const KA=[21.4225,39.8262];
const qBearing=(la,lo)=>{const p1=rad(la),p2=rad(KA[0]),dl=rad(KA[1]-lo);return(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360};
const qDist=(la,lo)=>{const p1=rad(la),p2=rad(KA[0]),a=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(rad(KA[1]-lo)/2)**2;return 12742*Math.asin(Math.sqrt(a))};
function mkARBtn(){
  const w=document.querySelector('#pg-qibla .qibla-wrap');if(!w||$('arBtn'))return;
  const b=document.createElement('button');b.id='arBtn';b.className='smb';b.textContent='📷 AR view (camera + compass)';b.onclick=openAR;w.appendChild(b);
}
async function openAR(){
  if(!locInfo){notif('Qibla','Set your location first','📍');return}
  const bearing=qBearing(locInfo.lat,locInfo.lon),km=Math.round(qDist(locInfo.lat,locInfo.lon)).toLocaleString();
  try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission()}catch{}
  const ov=document.createElement('div');ov.id='arView';
  ov.innerHTML='<video playsinline muted autoplay></video><div id="arBeam"><i>🕋</i></div><div id="arEdge"></div><div id="arTxt">Starting camera…</div><button id="arX" aria-label="Close AR view">✕</button>';
  document.body.appendChild(ov);let stream=null,raf=0,hd=null,sm=null,ok=false;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});ov.querySelector('video').srcObject=stream}catch{ov.classList.add('nocam')}
  const on=e=>{let h=null;if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;else if((e.absolute||e.type==='deviceorientationabsolute')&&e.alpha!=null){
      const a=rad(e.alpha),b=rad(e.beta||0),g=rad(e.gamma||0),vx=-Math.cos(a)*Math.sin(g)-Math.sin(a)*Math.sin(b)*Math.cos(g),vy=-Math.sin(a)*Math.sin(g)+Math.cos(a)*Math.sin(b)*Math.cos(g);
      h=(Math.atan2(vx,vy)*180/Math.PI+360)%360}
    if(h!=null)hd=h};
  addEventListener('deviceorientationabsolute',on,true);addEventListener('deviceorientation',on,true);
  const beam=$('arBeam'),edge=$('arEdge'),txt=$('arTxt');
  const loop=()=>{raf=requestAnimationFrame(loop);
    if(hd==null){txt.textContent='Move your phone in a figure-8 to calibrate the compass…';return}
    sm=sm==null?hd:sm+ang(hd-sm)*.2;const d=ang(bearing-sm),aligned=Math.abs(d)<4;
    if(Math.abs(d)<=31){beam.style.display='block';beam.style.left=(50+d/62*100)+'%';edge.style.display='none'}else{beam.style.display='none';edge.style.display='block';edge.textContent=d>0?'Turn right ›':'‹ Turn left';edge.style.left=d>0?'auto':'14px';edge.style.right=d>0?'14px':'auto'}
    beam.classList.toggle('ok',aligned);if(aligned&&!ok&&navigator.vibrate)navigator.vibrate(40);ok=aligned;
    txt.textContent=aligned?'Facing the Qibla ✓ · '+km+' km to Makkah':'Qibla is '+Math.abs(Math.round(d))+'° to your '+(d>0?'right':'left')+' · '+km+' km';};
  loop();
  const close=()=>{cancelAnimationFrame(raf);removeEventListener('deviceorientationabsolute',on,true);removeEventListener('deviceorientation',on,true);removeEventListener('keydown',esc2);if(stream)stream.getTracks().forEach(t=>t.stop());ov.remove()};
  const esc2=e=>{if(e.key==='Escape')close()};addEventListener('keydown',esc2);$('arX').onclick=close;
}

/* ── 5. HABIT INSIGHTS ── */
function stats(){
  const logs=gs('logs',{}),keys=Object.keys(logs).sort().slice(-90),today=TK();
  const per=PRAYERS.map(()=>({n:0,d:0,ot:0})),grid=PRAYERS.map(()=>Array.from({length:7},()=>({n:0,d:0}))),scores=[];
  for(const k of keys){const l=logs[k],wd=new Date(k+'T12:00:00').getDay();let any=false;
    PRAYERS.forEach((p,i)=>{const pd=l[p];if(!pd)return;const done=!!pd.fard&&!pd.missed;if(k===today&&!done&&!pd.missed)return;
      any=true;per[i].n++;grid[i][wd].n++;if(done){per[i].d++;grid[i][wd].d++;if(pd.ontime)per[i].ot++}});
    if(any)scores.push(dayComp(l))}
  return{per,grid,scores};
}
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
function renderInsights(){
  const b=$('insBody');if(!b)return;const s=stats(),days=s.scores.length;
  if(days<4){b.innerHTML='<div class="card ins-empty">🧠 Log at least 4 days of prayers and I will start finding your patterns. Everything is analysed on this device only.</div>';return}
  const rate=i=>s.per[i].n?s.per[i].d/s.per[i].n:0,tot=s.per.reduce((a,p)=>a+p.d,0)/Math.max(1,s.per.reduce((a,p)=>a+p.n,0));
  const ot=s.per.reduce((a,p)=>a+p.ot,0)/Math.max(1,s.per.reduce((a,p)=>a+p.d,0));
  const last=avg(s.scores.slice(-7)),prev=avg(s.scores.slice(-14,-7)),tr=s.scores.length>7?last-prev:null;
  const order=PRAYERS.map((p,i)=>[p,rate(i)]).sort((a,c)=>a[1]-c[1]),weak=order[0],strong=order[4];
  const cells=[];PRAYERS.forEach((p,i)=>s.grid[i].forEach((c,wd)=>{if(c.n>=3)cells.push({p,wd,r:c.d/c.n,n:c.n})}));cells.sort((a,c)=>a.r-c.r);
  const slots=cells.filter(c=>c.r<.8).slice(0,2),nud=gs('nudges',[]);
  const heat=PRAYERS.map((p,i)=>`<tr><th>${p}</th>${s.grid[i].map(c=>{const r=c.n?c.d/c.n:null;return`<td title="${c.n?Math.round(r*100)+'% ('+c.n+' days)':'no data'}" style="background:${r==null||c.n<2?'rgba(138,153,187,.18)':`hsl(${Math.round(r*120)} 62% ${34+r*6}%)`}">${c.n>=2?Math.round(r*100):''}</td>`}).join('')}</tr>`).join('');
  b.innerHTML=`<div class="ins-grid">
   <div class="card ins-k"><small>Prayed (last ${days} days)</small><b>${Math.round(tot*100)}%</b></div>
   <div class="card ins-k"><small>On time, when prayed</small><b>${Math.round(ot*100)}%</b></div>
   <div class="card ins-k"><small>Trend vs last week</small><b>${tr==null?'–':(tr>=0?'▲ ':'▼ ')+Math.abs(Math.round(tr))+' pts'}</b></div>
   <div class="card ins-k"><small>Strongest / weakest</small><b>${strong[0]} / ${weak[0]}</b></div></div>
   <div class="card"><h3>What I notice</h3><ul class="ins-ul">
    <li>${weak[0]} is your lowest prayer at <b>${Math.round(weak[1]*100)}%</b>; ${strong[0]} is strongest at <b>${Math.round(strong[1]*100)}%</b>.</li>
    ${slots.map(c=>`<li>${c.p} slips most on <b>${DAYS[c.wd]}s</b> (${Math.round(c.r*100)}% over ${c.n} days). <button class="smb" data-nud="${c.p}|${c.wd}">Add an early nudge</button></li>`).join('')}
    ${tr!=null?`<li>Your daily score is ${tr>=0?'up':'down'} ${Math.abs(Math.round(tr))} points compared with the previous week.</li>`:''}</ul>
    ${nud.length?`<div class="ins-nud">Active nudges: ${nud.map((n,i)=>`<span class="chip">${esc(n.p)} · ${DAYS[n.wd]}s <a href="#" data-rm="${i}" aria-label="Remove nudge">✕</a></span>`).join('')}</div>`:''}</div>
   <div class="card"><h3>Completion by prayer and weekday</h3><div class="heat-w"><table class="heat"><tr><th></th>${DAYS.map(d=>`<th>${d.slice(0,3)}</th>`).join('')}</tr>${heat}</table></div></div>`;
  b.querySelectorAll('[data-nud]').forEach(x=>x.onclick=()=>{const[p,wd]=x.dataset.nud.split('|'),n=gs('nudges',[]);if(!n.some(z=>z.p===p&&z.wd==+wd))n.push({p,wd:+wd});ss('nudges',n);notif('Nudge added',`You will get an extra reminder before ${p} on ${DAYS[wd]}s.`,'🔔');renderInsights()});
  b.querySelectorAll('[data-rm]').forEach(x=>x.onclick=e=>{e.preventDefault();const n=gs('nudges',[]);n.splice(+x.dataset.rm,1);ss('nudges',n);renderInsights()});
}

/* ── 9. SOUND: chime or your own adhan file ── */
let idb=null;
const db=()=>idb||(idb=new Promise((res,rej)=>{const r=indexedDB.open('pt_future',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const dbPut=async(k,v)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('f','readwrite');t.objectStore('f').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})};
const dbGet=async k=>{const d=await db();return new Promise(res=>{const r=d.transaction('f').objectStore('f').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})};
function chime(soft){try{const a=new(window.AudioContext||window.webkitAudioContext)(),vol=gs('snd',{vol:80}).vol/100*(soft?.5:1);[523.25,659.25,783.99].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.28;o.type='sine';o.frequency.value=f;o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*vol,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.start(t);o.stop(t+2.3)})}catch{}}
const Snd={au:null,tm:0,async play(p,preview){
  const c=gs('snd',{mode:'chime',vol:80});if(c.mode==='off'&&!preview)return;this.stop();
  if(c.mode==='adhan'||preview==='adhan'){const blob=(p==='Fajr'&&await dbGet('fajr'))||await dbGet('adhan');
    if(blob){const au=this.au=new Audio(URL.createObjectURL(blob));au.volume=0;au.onended=()=>URL.revokeObjectURL(au.src);
      try{await au.play();let v=0;this.tm=setInterval(()=>{v+=.04;au.volume=Math.min(c.vol/100,v*c.vol/100);if(v>=1)clearInterval(this.tm)},160);return}catch{notif('Adhan blocked','Click anywhere on the page once so the browser allows sound.','🔇')}}}
  chime()},
  stop(){clearInterval(this.tm);if(this.au){this.au.pause();this.au=null}}};
window.PTSound={play:(p)=>Snd.play(p),stop:()=>Snd.stop(),soft:()=>{if(gs('snd',{mode:'chime'}).mode!=='off')chime(true)}};

/* ── 6. CALM + NUDGES ── */
const fired=new Set();
function tick(){
  if(!appActive())return;const cc=gs('calm',{on:true,min:10}),np=nextPrayer();
  if(window.NOOR&&NOOR.setCalm)NOOR.setCalm(cc.on&&np&&np.left<=cc.min?clamp(1-np.left/cc.min,0,1)*.85+.15:0);
  if(cc.on&&np&&np.left<=cc.min&&np.left>cc.min-1.5){const k=TK()+np.p+'calm';if(!fired.has(k)){fired.add(k);PTSound.soft();notif('Prayer approaching',`${np.p} in about ${cc.min} minutes. Time to wind down.`,'🌙')}}
  const n=new Date(),cm=n.getHours()*60+n.getMinutes();
  gs('nudges',[]).forEach(z=>{if(z.wd!==n.getDay())return;const pm=mins(PT[z.p]);if(pm==null||cm!==pm-25)return;const k=TK()+z.p+'nudge';if(fired.has(k))return;fired.add(k);notif('Gentle nudge',`${z.p} often slips on ${DAYS[z.wd]}s. It starts in 25 minutes.`,'🔔');PTSound.soft()});
  if(navigator.setAppBadge&&matchMedia('(display-mode: standalone)').matches){np&&np.left<=60?navigator.setAppBadge(Math.max(1,Math.round(np.left))).catch(()=>{}):navigator.clearAppBadge&&navigator.clearAppBadge().catch(()=>{})}
}

/* ── 7. AI COMPANION (needs your own server endpoint) + offline Ramadan planner ── */
const hist=[];
const cmAdd=(who,html)=>{const l=$('cmLog');if(!l)return;const d=document.createElement('div');d.className='cm '+who;d.innerHTML=html;l.appendChild(d);l.scrollTop=l.scrollHeight};
function ramadanPlan(){
  const f=mins(PT.Fajr),m=mins(PT.Maghrib),i=mins(PT.Isha),d=mins(PT.Dhuhr),a=mins(PT.Asr);
  if([f,m,i,d,a].includes(null))return'Set your location first so I can use your real prayer times.';
  const h=x=>ampm(String(Math.floor(((x%1440)+1440)%1440/60)).padStart(2,'0')+':'+String(Math.round(x%60)).padStart(2,'0')),l3=m+(f+1440-m)*2/3;
  return`<b>Your Ramadan day (from today's times)</b><table class="cm-t">${[['Wake for Suhoor',h(f-60)],['Stop eating (Fajr)',h(f)],['Dhuhr',h(d)],['Asr · Quran time',h(a+10)],['Break the fast (Iftar)',h(m)],['Isha',h(i)],['Taraweeh',h(i+20)],['Last third of the night',h(l3)]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><small>A planning aid built from your times, not a ruling.</small>`}
async function ask(q){
  const ep=gs('companionEP','');cmAdd('me',esc(q));
  if(!ep){cmAdd('bot','The AI companion needs a small server that holds your API key. Open <b>Connect your AI server</b> below. (The Ramadan planner works without it.)');return}
  hist.push({role:'user',content:q});const w=document.createElement('div');cmAdd('bot','…');
  try{const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist.slice(-12),context:{madhab:getMadhab(),city:locInfo&&locInfo.city,times:PT,date:TK()}})});
    const j=await r.json(),t=j.reply||j.error||'No reply.';hist.push({role:'assistant',content:t});$('cmLog').lastChild.innerHTML=esc(t).replace(/\n/g,'<br>')}
  catch{$('cmLog').lastChild.innerHTML='Could not reach your server. Check the address and that it is running.'}
}
function renderCompanion(){const e=$('cmEP');if(e&&!e.value)e.value=gs('companionEP','');if($('cmLog')&&!$('cmLog').children.length)cmAdd('bot','Assalamu alaikum! Ask me a question, or tap a helper below. I cite sources and tell you when scholars differ, but I am not a mufti.')}

/* ── 8. VOICE CONTROL ── */
const SRC=window.SpeechRecognition||window.webkitSpeechRecognition;
const PN={fajr:'Fajr',dhuhr:'Dhuhr',zuhr:'Dhuhr',duhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',magrib:'Maghrib',isha:'Isha',esha:'Isha'};
function say(t){notif('Voice',esc(t),'🎙');try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}catch{}}
function command(t){
  t=t.toLowerCase();const m=t.match(/(fajr|dhuhr|zuhr|duhr|asr|maghrib|magrib|isha|esha)/);
  if(/(mark|log|prayed|done|completed)/.test(t)&&m){const p=PN[m[1]],lg=getLog();lg[p].fard=true;lg[p].missed=false;saveLog(TK(),lg);try{renderTracker();renderDashBar()}catch{}return say(p+' marked as prayed. May Allah accept it.')}
  if(/next prayer|when is the next|how long/.test(t)){const n=nextPrayer();return say(n?n.p+' is in '+fmtLeft(n.left)+'.':'Prayer times are not loaded yet.')}
  if(/dark mode/.test(t)){applyTheme('dark');return say('Dark mode on.')}
  if(/light mode/.test(t)){applyTheme('light');return say('Light mode on.')}
  if(/show.*(scene|background)|view.*scene/.test(t)&&window.NOOR){NOOR.view(true);return say('Scene view. Press Escape or Back to return.')}
  const pages={dashboard:'dashboard',home:'dashboard',tracker:'prayers',history:'history',qibla:'qibla',insight:'insights',circle:'circle',companion:'companion',settings:'settings',analytics:'analytics',goals:'goals',dhikr:'dhikr',quran:'quran'};
  for(const k in pages)if(t.includes(k)){const id=pages[k];go(id,document.querySelector(`.ni[onclick*="'${id}'"]`));return say('Opening '+k+'.')}
  if(/count|tasbih/.test(t)&&typeof tapDh==='function'){tapDh();return say('Counted.')}
  say('Try: next prayer, mark Fajr done, open Qibla, show insights, or dark mode.');
}
function mkVoice(){
  if($('voiceBtn'))return;const b=document.createElement('button');b.id='voiceBtn';b.setAttribute('aria-label','Voice control');b.title='Voice control';b.textContent='🎙';document.body.appendChild(b);
  b.onclick=()=>{if(!SRC)return notif('Voice','Voice control needs Chrome, Edge or Safari.','ℹ️');const r=new SRC();r.lang='en-US';r.interimResults=false;b.classList.add('on');
    r.onresult=e=>{const t=e.results[0][0].transcript;notif('Heard',esc(t),'🎙');command(t)};r.onerror=()=>notif('Voice','Could not hear you. Allow the microphone and try again.','🎙');r.onend=()=>b.classList.remove('on');try{r.start()}catch{}};
}

/* ── 10. PWA + OFFLINE TIMES ── */
let deferred=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=$('instBtn');if(b)b.style.display=''});
async function prefetchMonth(months=2,force){
  if(!locInfo||!navigator.onLine)return false;if(!force&&gs('pt_cal_stamp','')===localKey(new Date()))return false;let ok=false;const d=new Date();
  for(let add=0;add<months;add++){const dt=new Date(d.getFullYear(),d.getMonth()+add,1);
    try{const r=await fetch(`https://api.aladhan.com/v1/calendar/${dt.getFullYear()}/${dt.getMonth()+1}?latitude=${locInfo.lat}&longitude=${locInfo.lon}&method=3&school=${getMadhab()}`),j=await r.json();
      if(j.code===200){const cal=gs('pt_cal',{});j.data.forEach(x=>{const g=x.date.gregorian.date.split('-'),t=x.timings;cal[g[2]+'-'+g[1]+'-'+g[0]]={Fajr:t.Fajr,Sunrise:t.Sunrise,Dhuhr:t.Dhuhr,Asr:t.Asr,Sunset:t.Sunset,Maghrib:t.Maghrib,Isha:t.Isha,Midnight:t.Midnight}});
        const cut=localKey(new Date(Date.now()-40*864e5));Object.keys(cal).forEach(k=>{if(k<cut)delete cal[k]});ss('pt_cal',cal);ok=true}}catch{}}
  if(ok){ss('pt_cal_stamp',localKey(new Date()));const ks=Object.keys(gs('pt_cal',{})).sort();ss('pt_cal_meta',{ts:new Date().toISOString(),from:ks[0],to:ks[ks.length-1],city:(locInfo.city||''),madhab:getMadhab()})}
  return ok;
}
window.PTOffline={update:m=>prefetchMonth(m,true)};
const _fpt=window.fetchPrayerTimes;
window.fetchPrayerTimes=async function(la,lo){
  let t=null;try{t=await _fpt(la,lo)}catch{}if(t)return t;
  const c=gs('pt_cal',{})[localKey(new Date())];if(!c)return null;const f=s=>fmt24(String(s).slice(0,5));
  notif('Offline','Using your saved prayer times.','📴');
  return{Fajr:f(c.Fajr),Dhuhr:f(c.Dhuhr),Asr:f(c.Asr),Maghrib:f(c.Maghrib),Isha:f(c.Isha),Sunrise:f(c.Sunrise),Sunset:f(c.Sunset),Midnight:f(c.Midnight),FajrEnd:f(c.Sunrise),DhuhrEnd:f(c.Asr),AsrEnd:f(c.Maghrib),MaghribEnd:f(c.Isha),IshaEnd:f(c.Midnight)};
};

/* ── 12. MINI WIDGET (picture-in-picture / popup / ?widget=1) ── */
function buildWidget(doc){
  const st=doc.createElement('style');st.textContent='*{box-sizing:border-box}body{margin:0;font-family:Jost,system-ui,sans-serif}.w{min-height:100vh;padding:14px 16px;color:#eef2ff;background:linear-gradient(145deg,rgba(8,20,48,.92),rgba(40,30,70,.88));display:flex;flex-direction:column;justify-content:center;gap:6px}.w small{opacity:.7;letter-spacing:.12em;text-transform:uppercase;font-size:.62rem}.w h2{margin:0;font:700 1.6rem Cormorant Garamond,Amiri,serif;color:#f0c866}.w .t{font:800 2.1rem/1 Jost,sans-serif;font-variant-numeric:tabular-nums}.w .r{display:flex;gap:5px;margin-top:6px}.w .r span{flex:1;text-align:center;font-size:.62rem;padding:4px 0;border-radius:8px;background:rgba(255,255,255,.08)}.w .r span.n{background:rgba(240,200,102,.25);color:#ffe9a6;font-weight:800}';
  doc.head.appendChild(st);const w=doc.createElement('div');w.className='w';w.innerHTML='<small>Next prayer</small><h2></h2><div class="t">--:--:--</div><div class="r"></div>';doc.body.appendChild(w);
  const up=()=>{const n=nextPrayer();if(!n){w.querySelector('h2').textContent='Set location';return}const s=Math.round(n.left*60);
    w.querySelector('h2').textContent=n.p;w.querySelector('.t').textContent=[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');
    w.querySelector('.r').innerHTML=PRAYERS.map(p=>`<span class="${p===n.p?'n':''}">${p.slice(0,3)}<br>${PT[p]==='--:--'?'–':PT[p]}</span>`).join('')};
  up();const iv=setInterval(up,1000);return()=>clearInterval(iv);
}
async function openWidget(){
  try{if(window.documentPictureInPicture){const w=await documentPictureInPicture.requestWindow({width:330,height:200});const stop=buildWidget(w.document);w.addEventListener('pagehide',stop);return}}catch{}
  window.open(location.pathname+'?widget=1','ptw','popup,width=340,height=220')||notif('Widget','Allow pop-ups to open the mini widget.','ℹ️');
}
const Q=new URLSearchParams(location.search);
if(Q.get('widget')){document.documentElement.classList.add('widget-mode');addEventListener('DOMContentLoaded',()=>buildWidget(document))}

/* ── 11. FAMILY CIRCLE (local-first: share codes, no server) ── */
const cid=()=>{let i=gs('circleId','');if(!i){i=Math.random().toString(36).slice(2,10);ss('circleId',i)}return i};
function myStats(){
  const logs=gs('logs',{}),ks=Object.keys(logs).sort().slice(-7),sc=ks.map(k=>dayComp(logs[k]));
  let streak=0;const d=new Date();for(let i=0;i<400;i++){const l=logs[DK(new Date(d.getTime()-i*864e5))];if(l&&PRAYERS.every(p=>l[p]&&l[p].fard&&!l[p].missed))streak++;else if(i>0)break;else continue}
  return{n:(gs('currentUser',{}).name||'Me').slice(0,24),s:Math.round(avg(sc)),k:streak};
}
const enc=o=>'PT1.'+btoa(unescape(encodeURIComponent(JSON.stringify(o))));
function dec(c){try{const o=JSON.parse(decodeURIComponent(escape(atob(String(c).trim().replace(/^PT1\./,'')))));if(typeof o.i!=='string'||typeof o.n!=='string')return null;return{i:o.i.slice(0,12),n:o.n.slice(0,24),s:clamp(+o.s||0,0,100),k:clamp(+o.k||0,0,9999),t:+o.t||Date.now()}}catch{return null}}
function renderCircle(){
  const b=$('crBody');if(!b)return;const me={...myStats(),i:cid(),t:Date.now()},list=gs('circle',[]).filter(x=>x.i!==me.i),all=[{...me,me:1},...list].sort((a,c)=>c.s-a.s);
  const code=enc(me),circleAvg=Math.round(avg(all.map(x=>x.s)));
  b.innerHTML=`<div class="card"><h3>Your code</h3><p class="muted">Send this to family or friends (WhatsApp, SMS). Refresh it whenever you want to share new progress.</p><textarea id="crCode" readonly rows="2">${code}</textarea><button class="smb" id="crCopy">Copy my code</button></div>
  <div class="card"><h3>Add someone's code</h3><textarea id="crIn" rows="2" placeholder="Paste a code that starts with PT1."></textarea><button class="smb" id="crAdd">Add to circle</button></div>
  <div class="card"><h3>Our circle <small class="muted">average ${circleAvg}% this week</small></h3>${all.map(x=>`<div class="cr-row"><span class="cr-n">${esc(x.n)}${x.me?' (you)':''}</span><span class="cr-b"><i style="width:${x.s}%"></i></span><span class="cr-s">${x.s}%</span><span class="cr-k">🔥${x.k}</span>${x.me?'':`<button class="cr-x" data-rm="${esc(x.i)}" aria-label="Remove ${esc(x.n)}">✕</button>`}</div>`).join('')}
  <p class="muted">Scores are each person's average for the last 7 logged days. Updates arrive when someone sends a fresh code, because there is no server.</p></div>`;
  $('crCopy').onclick=()=>{navigator.clipboard?navigator.clipboard.writeText(code).then(()=>notif('Copied','Your circle code is on the clipboard.','📋')):($('crCode').select(),document.execCommand('copy'))};
  $('crAdd').onclick=()=>{const m=dec($('crIn').value);if(!m)return notif('Circle','That code is not valid.','⚠️');if(m.i===cid())return notif('Circle','That is your own code.','ℹ️');const l=gs('circle',[]).filter(x=>x.i!==m.i);l.push(m);ss('circle',l);notif('Circle',esc(m.n)+' added.','🤝');renderCircle()};
  b.querySelectorAll('[data-rm]').forEach(x=>x.onclick=()=>{ss('circle',gs('circle',[]).filter(m=>m.i!==x.dataset.rm));renderCircle()});
}

/* ── settings card ── */
function mkSettings(){
  const pg=$('pg-settings');if(!pg||$('futCard'))return;const s=gs('snd',{mode:'chime',vol:80}),c=gs('calm',{on:true,min:10});
  const d=document.createElement('div');d.id='futCard';d.className='card';d.style.marginBottom='16px';
  d.innerHTML=`<div style="font-weight:700;margin-bottom:12px;font-size:.95rem">🌟 Smart tools</div>
  <label class="setrow"><span>Prayer-time sound</span><select id="sndMode"><option value="chime">Soft chime</option><option value="adhan">My adhan file</option><option value="off">Silent</option></select></label>
  <label class="setrow"><span>Adhan file</span><input type="file" id="adhanF" accept="audio/*"></label>
  <label class="setrow"><span>Fajr adhan (optional)</span><input type="file" id="fajrF" accept="audio/*"></label>
  <label class="setrow col"><span>Volume</span><input type="range" id="sndVol" min="10" max="100"></label>
  <div class="setrow"><button class="smb" id="sndTest">Preview</button><button class="smb" id="sndStop">Stop</button></div>
  <p class="muted">Use an audio file you have the right to use. It stays on this device, and your browser may need one click on the page before it allows sound.</p>
  <label class="setrow"><span>Calm mode before prayer (dims the scene)</span><input type="checkbox" id="calmOn"></label>
  <label class="setrow"><span>Start calm mode</span><select id="calmMin">${[5,10,15,20].map(v=>`<option value="${v}">${v} min before</option>`).join('')}</select></label>
  <div class="setrow"><button class="smb" id="notifBtn">Enable notifications</button><button class="smb" id="instBtn" style="display:none">Install app</button><button class="smb" id="widBtn">Mini widget</button></div>
  <p class="muted" id="offNote"></p>`;
  pg.appendChild(d);$('sndMode').value=s.mode;$('sndVol').value=s.vol;$('calmOn').checked=c.on;$('calmMin').value=c.min;
  const sv=()=>ss('snd',{mode:$('sndMode').value,vol:+$('sndVol').value}),cs=()=>ss('calm',{on:$('calmOn').checked,min:+$('calmMin').value});
  $('sndMode').onchange=sv;$('sndVol').oninput=sv;$('calmOn').onchange=cs;$('calmMin').onchange=cs;
  $('adhanF').onchange=async e=>{if(e.target.files[0]){await dbPut('adhan',e.target.files[0]);notif('Adhan saved',esc(e.target.files[0].name),'🔊')}};
  $('fajrF').onchange=async e=>{if(e.target.files[0]){await dbPut('fajr',e.target.files[0]);notif('Fajr adhan saved',esc(e.target.files[0].name),'🔊')}};
  $('sndTest').onclick=()=>Snd.play('Dhuhr',$('sndMode').value==='adhan'?'adhan':'chime');$('sndStop').onclick=()=>Snd.stop();
  $('notifBtn').onclick=()=>reqNotif();$('widBtn').onclick=openWidget;
  $('instBtn').onclick=async()=>{if(deferred){deferred.prompt();deferred=null;$('instBtn').style.display='none'}};if(deferred)$('instBtn').style.display='';
  const cal=gs('pt_cal',{}),n=Object.keys(cal).length;$('offNote').textContent=n?`Offline times saved for ${n} days.`:'Offline times will be saved automatically when you are online with a location set.';
}

/* ── boot ── */
mkNav();
addPage('insights','🧠','Habit Insights','<div class="tbar"><h1>🧠 Habit Insights</h1></div><div id="insBody"></div>');
addPage('circle','🤝','Family Circle','<div class="tbar"><h1>🤝 Family Circle</h1></div><div id="crBody"></div>');
addPage('companion','🤖','AI Companion',`<div class="tbar"><h1>🤖 AI Companion</h1></div><div class="card cmp"><div id="cmLog" aria-live="polite"></div><div class="cm-row"><input id="cmIn" placeholder="Ask about prayer, fasting, planning…" aria-label="Ask the companion"><button class="smb" id="cmSend">Send</button></div><div class="cm-q"><button class="smb" id="cmRam">🗓 Plan my Ramadan day</button><button class="smb" id="cmIns">💡 Explain my habits</button></div></div>
 <details class="card"><summary>Connect your AI server</summary><p class="muted">Run the included <code>companion-proxy.js</code> on your own computer or host, then paste its address here. Your API key stays on the server, never in this page.</p><input id="cmEP" placeholder="http://localhost:8787/ask" aria-label="Companion server address"><button class="smb" id="cmSave">Save</button></details>`);
const send=()=>{const i=$('cmIn'),q=i.value.trim();if(q){i.value='';ask(q)}};
$('cmSend').onclick=send;$('cmIn').onkeydown=e=>{if(e.key==='Enter')send()};
$('cmRam').onclick=()=>{cmAdd('me','Plan my Ramadan day');cmAdd('bot',ramadanPlan())};
$('cmIns').onclick=()=>{const s=stats(),w=PRAYERS.map((p,i)=>`${p} ${s.per[i].n?Math.round(s.per[i].d/s.per[i].n*100):0}%`).join(', ');ask('Here are my prayer completion rates over the last 90 days: '+w+'. Give me three practical, gentle suggestions.')};
$('cmSave').onclick=()=>{ss('companionEP',$('cmEP').value.trim());notif('Saved','Companion server address saved.','🤖')};
const _g=window.go;window.go=function(id,n){_g(id,n);if(id==='insights')renderInsights();if(id==='circle')renderCircle();if(id==='companion')renderCompanion();if(id==='qibla')mkARBtn();if(id==='settings'){mkSettings();const o=$('offNote');if(o){const k=Object.keys(gs('pt_cal',{})).length;o.textContent=k?`Offline times saved for ${k} days.`:o.textContent}}};
mkSettings();mkVoice();mkARBtn();
const boot=setInterval(()=>{if(!$('evCard')&&!$('dayArc'))return;mkMoon();if($('moonCard'))clearInterval(boot)},500);
setInterval(tick,1000);setInterval(updMoon,3600000);
setTimeout(prefetchMonth,4000);setInterval(prefetchMonth,6*3600000);
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
if(Q.get('go')&&$('pg-'+Q.get('go')))setTimeout(()=>{if(gs('currentUser',null))go(Q.get('go'),document.querySelector(`.ni[onclick*="'${Q.get('go')}'"]`))},800);
})();
