/* Prayer Time EXPLORE layer: year night-sky · my mosque times · mosque finder · travel detection · Ramadan & Hijri · Islamic sky · Wave of Prayer · bedside clock · accessibility · weekly card · offline status */
(()=>{
'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,mod=(x,n)=>((x%n)+n)%n;
const mins=t=>(t&&t!=='--:--')?toMins(t):null;
const nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60};
const localKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const hhmm=m=>String(Math.floor(mod(m,1440)/60)).padStart(2,'0')+':'+String(Math.round(mod(m,1440)%60)).padStart(2,'0');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const appActive=()=>$('appScreen')&&$('appScreen').classList.contains('active');
const DEF=()=>(typeof PT!=='undefined'&&PT.__d)||PT;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
try{['300 20px Jost','500 20px Jost','700 20px Jost','600 20px Cormorant Garamond','700 20px Cormorant Garamond'].forEach(f=>document.fonts&&document.fonts.load(f))}catch{}
const safe=f=>{try{f()}catch(e){console.warn('explore:',e)}};
function nextPrayer(){const n=nowM();for(const p of PRAYERS){const m=mins(PT[p]);if(m!=null&&m>n)return{p,left:m-n,m}}const m=mins(PT.Fajr);return m==null?null:{p:'Fajr',left:m+1440-n,m}}
const hav=(la1,lo1,la2,lo2)=>{const p1=rad(la1),p2=rad(la2),a=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(rad(lo2-lo1)/2)**2;return 12742*Math.asin(Math.sqrt(a))};

/* ── astronomy (low-precision, good to about a degree) ── */
const JD=d=>d.getTime()/864e5+2440587.5;
const gmst=d=>mod(280.46061837+360.98564736629*(JD(d)-2451545),360);
function sunEq(d){const n=JD(d)-2451545,L=mod(280.460+.9856474*n,360),g=rad(mod(357.528+.9856003*n,360)),lam=rad(L+1.915*Math.sin(g)+.02*Math.sin(2*g)),eps=rad(23.439-4e-7*n);
  return{ra:deg(Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam))),dec:deg(Math.asin(Math.sin(eps)*Math.sin(lam))),lam:mod(deg(lam),360)}}
function moonEq(d){const n=JD(d)-2451545,Lp=218.316+13.176396*n,Mp=rad(134.963+13.064993*n),F=rad(93.272+13.229350*n),lam=rad(Lp+6.289*Math.sin(Mp)),bet=rad(5.128*Math.sin(F)),eps=rad(23.439-4e-7*n);
  return{ra:deg(Math.atan2(Math.sin(lam)*Math.cos(eps)-Math.tan(bet)*Math.sin(eps),Math.cos(lam))),dec:deg(Math.asin(Math.sin(bet)*Math.cos(eps)+Math.cos(bet)*Math.sin(eps)*Math.sin(lam))),lam:mod(deg(lam),360)}}
function altaz(ra,dec,lat,lon,d){const H=rad(gmst(d)+lon-ra),p=rad(lat),de=rad(dec);
  return{alt:deg(Math.asin(Math.sin(p)*Math.sin(de)+Math.cos(p)*Math.cos(de)*Math.cos(H))),az:mod(deg(Math.atan2(-Math.cos(de)*Math.sin(H),Math.sin(de)*Math.cos(p)-Math.cos(de)*Math.sin(p)*Math.cos(H))),360)}}
function moonInfo(d){const s=sunEq(d),m=moonEq(d),D=mod(m.lam-s.lam,360),ph=D/360,nm=ph<.03||ph>.97?'New Moon':ph<.22?'Waxing Crescent':ph<.28?'First Quarter':ph<.47?'Waxing Gibbous':ph<.53?'Full Moon':ph<.72?'Waning Gibbous':ph<.78?'Last Quarter':'Waning Crescent';
  return{ph,ill:(1-Math.cos(rad(D)))/2,age:ph*29.530588853,elong:D<=180?D:360-D,name:nm}}

/* ── pages + nav ── */
function addPage(id,icon,label,html,action){
  const body=$('ngFutureBody');if(!body)return;
  if(html){const pg=document.createElement('div');pg.className='pg';pg.id='pg-'+id;pg.innerHTML=html;document.querySelector('.mn').appendChild(pg)}
  const ni=document.createElement('div');ni.className='ni';ni.title=label;ni.setAttribute('onclick',action||`go('${id}',this)`);ni.innerHTML=`<span class="nic">${icon}</span>${label}`;body.appendChild(ni);
}

/* ══ MY MOSQUE TIMES (override the dashboard, reminders and countdowns; remove to return to default) ══ */
function applyMosque(){
  if(typeof PT==='undefined')return;
  if(!Object.getOwnPropertyDescriptor(PT,'__d'))Object.defineProperty(PT,'__d',{value:Object.assign({},PT),enumerable:false,configurable:true});
  const m=gs('mosqueTimes',null);
  PRAYERS.forEach(p=>{const v=m&&m.times&&m.times[p];PT[p]=v&&/^\d{1,2}:\d{2}$/.test(v)?fmt24(v):PT.__d[p]});
  mosqueChip(m);
}
function mosqueChip(m){
  let c=$('mosqueChip');const pg=$('pg-dashboard');if(!pg)return;
  const on=m&&m.times&&Object.keys(m.times).length;
  if(!on){if(c)c.remove();return}
  if(!c){c=document.createElement('div');c.id='mosqueChip';c.className='mchip';const t=pg.querySelector('.tbar');t?t.after(c):pg.prepend(c)}
  c.innerHTML=`🕌 <span>Showing <b>${esc(m.name||'my mosque')}</b> times. Reminders use them too.</span> <button class="smb" id="mcReset">Use default times</button>`;
  $('mcReset').onclick=resetMosque;
}
function saveMosque(){
  const times={};PRAYERS.forEach(p=>{const v=$('mt_'+p).value;if(v)times[p]=v});
  if(!Object.keys(times).length){notif('Mosque times','Enter at least one time, or use Reset.','ℹ️');return}
  ss('mosqueTimes',{name:($('mtName').value||'My mosque').trim().slice(0,40),times});applyMosque();try{refreshTimesUI()}catch{}notif('Saved','Your mosque times are now used everywhere.','🕌');
}
function resetMosque(){ss('mosqueTimes',null);applyMosque();try{refreshTimesUI()}catch{}fillMosqueForm();notif('Default times','Back to the calculated prayer times.','↩️')}
function fillMosqueForm(){const m=gs('mosqueTimes',null);if(!$('mtName'))return;$('mtName').value=(m&&m.name)||'';PRAYERS.forEach(p=>{$('mt_'+p).value=(m&&m.times&&m.times[p])?m.times[p].padStart(5,'0'):''});
  const n=$('mtNote');if(n)n.textContent=m?'Active: '+Object.keys(m.times).length+' custom time(s). Empty fields use the calculated time.':'Using calculated times. Leave a box empty to keep the calculated time for that prayer.'}
function parseTimesFile(txt){
  const out={},re=/(fajr|dhuhr|zuhr|duhr|asr|maghrib|magrib|isha|esha)\D{0,12}?(\d{1,2})[:.](\d{2})\s*(am|pm)?/ig,N={fajr:'Fajr',dhuhr:'Dhuhr',zuhr:'Dhuhr',duhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',magrib:'Maghrib',isha:'Isha',esha:'Isha'};let m;
  while((m=re.exec(txt))){let h=+m[2];const mi=+m[3],ap=(m[4]||'').toLowerCase();if(mi>59||h>23)continue;if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;
    else if(!ap&&(N[m[1].toLowerCase()]==='Asr'||N[m[1].toLowerCase()]==='Maghrib'||N[m[1].toLowerCase()]==='Isha')&&h<12&&h>0)h+=12; // 12-hour lists often omit PM for afternoon prayers
    out[N[m[1].toLowerCase()]]=String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')}
  return out;
}

/* ══ YEAR AS A NIGHT SKY (History page) ══ */
let ysY=new Date().getFullYear(),ysPts=[];
function mkYearSky(){
  const pg=$('pg-history');if(!pg||$('ysCard'))return;const c=document.createElement('div');c.id='ysCard';c.className='card ys-card';
  c.innerHTML='<div class="ys-h"><b>🌌 Your year as a night sky</b><span><button class="smb" id="ysPrev" aria-label="Previous year">‹</button> <b id="ysYear"></b> <button class="smb" id="ysNext" aria-label="Next year">›</button></span></div><canvas id="ysCv" role="img" aria-label="Every day of the year drawn as a star, brighter when the day went better"></canvas><div id="ysTip" class="muted"></div><p class="muted">Each star is a day, brighter when it went better. A month that averages about 75% of your best days or more draws a gold constellation. Tap a star to open that day.</p>';
  pg.appendChild(c);$('ysPrev').onclick=()=>{ysY--;renderYearSky()};$('ysNext').onclick=()=>{ysY++;renderYearSky()};
  const cv=$('ysCv'),near=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let b=null,bd=18;ysPts.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<bd&&!p.fut){bd=d;b=p}});return b};
  cv.onmousemove=e=>{const p=near(e);cv.style.cursor=p?'pointer':'default';$('ysTip').textContent=p?`${p.key} · ${p.sc==null?'no log':p.sc+'% complete'}`:''};
  cv.onclick=e=>{const p=near(e);if(p){showHistDet(p.key);const d=$('histDet');if(d)d.scrollIntoView({behavior:'smooth',block:'nearest'})}};
  addEventListener('resize',()=>{if($('pg-history').classList.contains('active'))renderYearSky()});
}
function renderYearSky(){
  const cv=$('ysCv');if(!cv)return;$('ysYear').textContent=ysY;
  const W0=cv.clientWidth||900,H0=Math.round(W0*.62),dpr=Math.min(2,devicePixelRatio||1);cv.width=W0*dpr;cv.height=H0*dpr;cv.style.height=H0+'px';const c=cv.getContext('2d');c.scale(dpr,dpr);
  const bg=c.createLinearGradient(0,0,0,H0);bg.addColorStop(0,'#03071a');bg.addColorStop(1,'#0c1a3c');c.fillStyle=bg;c.fillRect(0,0,W0,H0);
  c.fillStyle='#cfe0ff';for(let i=0;i<170;i++){c.globalAlpha=.08+.22*hash('d'+i);c.fillRect(hash('b'+i)*W0,hash('c'+i)*H0,1,1)}c.globalAlpha=1;
  const logs=gs('logs',{}),cols=4,rows=3,cw=W0/cols,ch=H0/rows,tk=new Date().getTime();ysPts=[];const allSc=[];for(const k in logs)if(k.startsWith(ysY+'-'))allSc.push(dayComp(logs[k]));allSc.sort((x,y)=>x-y);const scale=Math.max(50,allSc.length?allSc[Math.floor(allSc.length*.9)]:60);
  for(let m=0;m<12;m++){
    const ox=(m%cols)*cw,oy=Math.floor(m/cols)*ch,n=new Date(ysY,m+1,0).getDate(),pts=[];let sum=0,cnt=0;
    c.fillStyle='rgba(180,200,240,.5)';c.font='600 11px Jost,sans-serif';c.fillText(MON[m],ox+12,oy+18);
    for(let d=1;d<=n;d++){
      const key=new Date(Date.UTC(ysY,m,d)).toISOString().slice(0,10),l=logs[key],sc=l?dayComp(l):null,col=(d-1)%7,row=Math.floor((d-1)/7);
      const x=ox+cw*.1+(col+.5)/7*cw*.8+(hash(key+'x')-.5)*cw*.07,y=oy+ch*.2+(row+.5)/5*ch*.68+(hash(key+'y')-.5)*ch*.07,fut=Date.UTC(ysY,m,d)>tk;
      if(sc!=null){sum+=sc;cnt++}const p={x,y,sc,key,fut};pts.push(p);ysPts.push(p)}
    const con=cnt>=10&&sum/cnt/scale>=.75;
    if(con){c.strokeStyle='rgba(240,200,102,.6)';c.lineWidth=1.2;c.shadowColor='#f0c866';c.shadowBlur=8;c.beginPath();let st=false;pts.forEach(p=>{if(p.sc!=null&&p.sc>=scale*.5){st?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);st=true}});c.stroke();c.shadowBlur=0;c.fillStyle='rgba(240,200,102,.85)';c.fillText('★ constellation',ox+cw-96,oy+18)}
    pts.forEach(p=>{const nb=p.sc==null?0:Math.min(1,p.sc/scale),a=p.fut?.07:p.sc==null?.2:.3+.7*nb,r=p.sc==null?1:1.1+nb*2.6;
      if(nb>=.85){const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r*6);g.addColorStop(0,'rgba(255,243,196,.34)');g.addColorStop(1,'rgba(255,243,196,0)');c.globalAlpha=1;c.fillStyle=g;c.fillRect(p.x-r*6,p.y-r*6,r*12,r*12)}
      c.globalAlpha=a;c.fillStyle=nb>=.85?'#fff3c4':'#cfe0ff';c.beginPath();c.arc(p.x,p.y,r,0,6.3);c.fill();c.globalAlpha=1;
      if(p.key===localKey(new Date())||p.key===new Date().toISOString().slice(0,10)){c.strokeStyle='rgba(240,200,102,.8)';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,r+4,0,6.3);c.stroke()}});
  }
}

/* ══ MOSQUE FINDER with "leave by" time (OpenStreetMap / Overpass, no key) ══ */
let mqList=[];
let mqOrigin=null;
function preciseFix(){
  return new Promise(res=>{
    if(!navigator.geolocation)return res(null);
    let best=null,wid=null,done=false;const st=$('mqStat');
    const fin=()=>{if(done)return;done=true;clearTimeout(tm);if(wid!=null)navigator.geolocation.clearWatch(wid);res(best)};
    const tm=setTimeout(fin,12000);
    wid=navigator.geolocation.watchPosition(p=>{const c=p.coords;if(!best||c.accuracy<best.acc)best={lat:c.latitude,lon:c.longitude,acc:c.accuracy};st.textContent='Getting a precise GPS fix… about ±'+Math.round(best.acc)+' m';if(best.acc<=30)fin()},()=>fin(),{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  });
}
async function findMosques(){
  const st=$('mqStat'),btn=$('mqGo');btn.disabled=true;st.textContent='Getting a precise GPS fix…';
  const fix=await preciseFix();
  if(fix)mqOrigin={lat:fix.lat,lon:fix.lon,acc:fix.acc,gps:true};
  else if(locInfo)mqOrigin={lat:locInfo.lat,lon:locInfo.lon,acc:null,gps:false};
  else{st.textContent='Could not get your position. Allow location access in your browser, or set your city in the app.';btn.disabled=false;return}
  const o=mqOrigin,r=+$('mqR').value;st.textContent='Searching OpenStreetMap near you…';let offline=false;
  const around=`(around:${r},${o.lat},${o.lon})`,q=`[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"]${around};way["amenity"="place_of_worship"]["religion"="muslim"]${around};relation["amenity"="place_of_worship"]["religion"="muslim"]${around};);out center 40;`;
  try{
    const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q)}),j=await res.json();
    mqList=j.elements.map(e=>{const la=e.lat??(e.center&&e.center.lat),lo=e.lon??(e.center&&e.center.lon);if(la==null)return null;const t=e.tags||{};
      return{id:e.type[0]+e.id,name:t.name||t['name:en']||'Mosque (unnamed)',la,lo,km:hav(o.lat,o.lon,la,lo)}}).filter(Boolean).sort((a,b)=>a.km-b.km).slice(0,15);
    ss('mq_cache',{lat:o.lat,lon:o.lon,gps:o.gps,ts:Date.now(),list:mqList});
  }catch{const c=gs('mq_cache',null);if(c&&hav(c.lat,c.lon,o.lat,o.lon)<1){mqList=c.list;offline=true}else{st.textContent='Could not reach OpenStreetMap. Check your connection and try again.';btn.disabled=false;return}}
  btn.disabled=false;
  const src=o.gps?`Using your GPS position (accurate to about ±${Math.round(o.acc)} m).`:'GPS was not available, so this uses the centre of your saved city. Allow location access for precise results.';
  st.textContent=src+' '+(offline?'Offline: showing your last search here. ':'')+(mqList.length?mqList.length+' mosque(s) found. Distances are straight-line; walking time adds 30% for real streets.':'No mosques mapped within that distance. Try a larger radius.');
  drawMosques();
}
const walkMin=km=>km*1.3/(+$('mqSp').value||5)*60;
function leaveInfo(m){
  const n=nextPrayer();if(!n)return'';const iq=gs('mqIqama',{})[m.id],T=iq&&iq[n.p]?mins(iq[n.p]):n.m,w=walkMin(m.km),buf=+$('mqBuf').value||0,cur=nowM(),tg=T<cur&&T+1440-cur<1440?T+1440:T,leave=tg-w-buf;
  const at=ampm(hhmm(leave));
  if(leave-cur>1)return`For <b>${n.p}</b> (${ampm(hhmm(tg))}${iq&&iq[n.p]?' iqama':''}): leave in <b>${Math.round(leave-cur)} min</b> (${at})`;
  if(tg-cur>0)return`For <b>${n.p}</b> (${ampm(hhmm(tg))}): <b class="mq-now">leave now</b>, about ${Math.round(w)} min walk`;
  return'';
}
function drawMosques(){
  const L=$('mqList');if(!L)return;const iqAll=gs('mqIqama',{});
  L.innerHTML=mqList.map(m=>{const iq=iqAll[m.id]||{};
    return`<div class="card mq" data-id="${m.id}"><div class="mq-top"><b>${esc(m.name)}</b><span>${m.km.toFixed(2)} km · ${Math.round(walkMin(m.km))} min walk</span></div><div class="mq-leave" data-leave="${m.id}">${leaveInfo(m)}</div>
    <details><summary>Jamaat (iqama) times for this mosque</summary><div class="mq-iq">${PRAYERS.map(p=>`<label>${p}<input type="time" data-p="${p}" value="${iq[p]||''}"></label>`).join('')}</div>
    <div class="mq-btns"><button class="smb" data-save="${m.id}">Save times</button><button class="smb" data-use="${m.id}">Use on my dashboard</button><a class="smb" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${m.la},${m.lo}&travelmode=walking">Directions ↗</a></div></details></div>`}).join('');
  L.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const id=b.dataset.save,card=b.closest('.mq'),t={};card.querySelectorAll('input[data-p]').forEach(i=>{if(i.value)t[i.dataset.p]=i.value});const a=gs('mqIqama',{});a[id]=t;ss('mqIqama',a);notif('Saved','Jamaat times saved for this mosque.','🕌');updLeave()});
  L.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const id=b.dataset.use,t=(gs('mqIqama',{})[id])||{},m=mqList.find(x=>x.id===id);if(!Object.keys(t).length)return notif('Mosque times','Save its jamaat times first.','ℹ️');ss('mosqueTimes',{name:m.name,times:t});applyMosque();try{refreshTimesUI()}catch{}notif('Dashboard updated','Now showing '+esc(m.name)+' times.','🕌')});
}
function updLeave(){if(!$('pg-mosques')||!$('pg-mosques').classList.contains('active'))return;mqList.forEach(m=>{const e=document.querySelector(`[data-leave="${m.id}"]`);if(e)e.innerHTML=leaveInfo(m)})}

/* ══ TRAVEL DETECTION (asks first; never decides rulings) ══ */
async function checkTravel(manual){
  if(!locInfo||!navigator.geolocation)return;
  if(!manual){let st=null;try{st=await navigator.permissions.query({name:'geolocation'})}catch{}if(!st||st.state!=='granted'||Date.now()<gs('travelSnooze',0))return}
  navigator.geolocation.getCurrentPosition(pos=>{const d=hav(locInfo.lat,locInfo.lon,pos.coords.latitude,pos.coords.longitude);
    if(d>60)travelBar(Math.round(d));else if(manual)notif('Location','You are close to '+esc(locInfo.city||'your saved city')+'.','📍')},()=>{if(manual)notif('Location','Could not get your position. Check browser permission.','⚠️')},{timeout:10000,maximumAge:600000});
}
function travelBar(km){
  if($('travelBar'))return;const b=document.createElement('div');b.id='travelBar';b.setAttribute('role','alertdialog');b.setAttribute('aria-label','You seem to have travelled');
  b.innerHTML=`<b>🧳 You seem to be about ${km} km from ${esc(locInfo.city||'your saved city')}.</b><p>Update prayer times and Qibla for where you are now?</p><p class="muted">Rulings on shortening or combining prayers while travelling differ between schools of thought. Please ask a qualified scholar or your local imam.</p><div><button class="smb" id="tvYes">Update times and Qibla</button><button class="smb" id="tvNo">Not now</button></div>`;
  document.body.appendChild(b);$('tvYes').onclick=()=>{b.remove();try{autoGPS()}catch{}};$('tvNo').onclick=()=>{ss('travelSnooze',Date.now()+864e5);b.remove()};
}

/* ══ RAMADAN & HIJRI CALENDAR ══ */
const HM=['Muharram','Safar',"Rabi' al-awwal","Rabi' al-thani",'Jumada al-ula','Jumada al-akhira','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'];
const hfmt=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'});
const hOff=()=>+gs('hijriOff',0)||0;
function hij(d){const p=hfmt.formatToParts(new Date(d.getTime()-hOff()*864e5)),g=t=>parseInt(p.find(x=>x.type===t).value,10);return{d:g('day'),m:g('month'),y:g('year')}}
const EVT=[[1,1,'Islamic New Year'],[10,1,'Day of Ashura'],[12,3,'Mawlid an-Nabi'],[27,7,"Isra' and Mi'raj"],[15,8,"Mid-Sha'ban"],[1,9,'First day of Ramadan'],[27,9,'Laylat al-Qadr (often sought on this night)'],[1,10,'Eid al-Fitr'],[9,12,'Day of Arafah'],[10,12,'Eid al-Adha']];
const noon=d=>{const x=new Date(d);x.setHours(12,0,0,0);return x};
let rmAnchor=noon(new Date());
function firstOfMonth(d){let x=noon(d);for(let i=0;i<31;i++){if(hij(x).d===1)return x;x=new Date(x.getTime()-864e5)}return x}
function ramEstimate(){const t=noon(new Date());for(let i=0;i<400;i++){const x=new Date(t.getTime()+i*864e5);if(hij(x).m===9&&hij(x).d===1)return x}return null}
function fastState(){const D=DEF(),f=mins(D.Fajr),m=mins(D.Maghrib),n=nowM();if(f==null||m==null)return null;if(n>=f&&n<m)return{label:'Iftar in',left:(m-n)*60};return{label:'Suhoor ends in',left:((n<f?f:f+1440)-n)*60}}
function renderRamadan(){
  const D=DEF(),isR=hij(new Date()).m===9;
  $('rmBadge').textContent=isR?'Ramadan (calculated)':'';$('rmS').textContent=D.Fajr&&D.Fajr!=='--:--'?ampm(D.Fajr):'–';$('rmI').textContent=D.Maghrib&&D.Maghrib!=='--:--'?ampm(D.Maghrib):'–';
  const al=gs('suhoorAlarm',{on:false,min:45});$('rmAl').checked=al.on;$('rmAlM').value=al.min;$('rmOff').value=hOff();
  renderCal();renderPlan();renderEvents();tickRamadan();
}
function tickRamadan(){const s=fastState(),e=$('rmCD');if(!e)return;if(!s){e.textContent='--:--:--';$('rmLab').textContent='Set your location';return}
  const t=Math.round(s.left);$('rmLab').textContent=s.label;e.textContent=[Math.floor(t/3600),Math.floor(t%3600/60),t%60].map(v=>String(v).padStart(2,'0')).join(':')}
function renderCal(){
  const first=firstOfMonth(rmAnchor),f0=hij(first),days=[];let x=new Date(first);
  while(hij(x).m===f0.m&&days.length<31){days.push(new Date(x));x=new Date(x.getTime()+864e5)}
  const fasts=gs('fasts',{}),today=localKey(new Date());let fc=0;
  const cells=days.map(d=>{const h=hij(d),k=localKey(d),ev=EVT.find(e=>e[0]===h.d&&e[1]===h.m),f=!!fasts[k];if(f)fc++;
    return`<button class="hcl${f?' f':''}${k===today?' t':''}${ev?' e':''}" data-k="${k}" title="${ev?esc(ev[2])+' · ':''}${f?'Fasted':'Tap to log a fast'}" aria-pressed="${f}" aria-label="${h.d} ${HM[h.m-1]}, ${d.toDateString()}${f?', fasted':''}"><b>${h.d}</b><small>${d.getDate()}</small></button>`}).join('');
  $('rmCal').innerHTML=`<div class="rc-h"><button class="smb" id="rcP" aria-label="Previous month">‹</button><div><b>${HM[f0.m-1]} ${f0.y} AH</b><small>${first.toLocaleDateString(undefined,{month:'short',day:'numeric'})} to ${days[days.length-1].toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small></div><button class="smb" id="rcN" aria-label="Next month">›</button></div>
   <div class="rc-w">${DAYS.map(d=>`<span>${d}</span>`).join('')}</div><div class="rc-g">${'<i></i>'.repeat(first.getDay())}${cells}</div>
   <p class="muted">Fasts logged this month: <b>${fc}</b>. Tap a day to log or remove a fast (optional, private).</p>`;
  $('rcP').onclick=()=>{rmAnchor=new Date(first.getTime()-864e5);renderCal()};$('rcN').onclick=()=>{rmAnchor=new Date(x.getTime()+864e5*0);renderCal()};
  $('rmCal').querySelectorAll('.hcl').forEach(b=>b.onclick=()=>{const f=gs('fasts',{});f[b.dataset.k]?delete f[b.dataset.k]:f[b.dataset.k]=1;ss('fasts',f);renderCal()});
}
function renderEvents(){
  const t=noon(new Date()),found={};for(let i=0;i<400;i++){const d=new Date(t.getTime()+i*864e5),h=hij(d);EVT.forEach((e,j)=>{if(e[0]===h.d&&e[1]===h.m&&found[j]==null)found[j]=i})}
  const L=EVT.map((e,j)=>({n:e[2],i:found[j]})).filter(e=>e.i!=null).sort((a,b)=>a.i-b.i).slice(0,6),r=ramEstimate();
  $('rmEv').innerHTML=`<h3>Important dates</h3>${r?`<p class="rm-est">Ramadan is calculated to begin about <b>${r.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</b>.</p>`:''}`+L.map(e=>{const d=new Date(t.getTime()+e.i*864e5);return`<div class="evrow"><span class="en">${esc(e.n)}<small>${d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</small></span><span class="ed">${e.i===0?'Today':e.i===1?'Tomorrow':'in '+e.i+' days'}</span></div>`}).join('')+
   '<p class="muted"><b>Calculated, not announced.</b> These dates come from the Umm al-Qura calculation. Many communities begin Ramadan and celebrate Eid after local moon sighting, which can differ by a day. Use the adjustment above when your local authority announces its date.</p>';
}
function renderPlan(){
  const st=gs('total_pages',0),todayRead=gs('today_pages_'+TK(),0),plan=gs('ramPlan',{start:null,tar:false}),est=ramEstimate(),isR=hij(new Date()).m===9;
  let start=plan.start?new Date(plan.start+'T12:00:00'):(isR?firstOfMonth(new Date()):est||noon(new Date()));
  const idx=Math.floor((noon(new Date())-noon(start))/864e5),tar=plan.tar?20:0,daysLeft=clamp(30-Math.max(0,idx),1,30),over=idx>=30;
  const eff0=Math.min(604,(st-todayRead)+tar*Math.max(0,idx)),perDay=Math.ceil(Math.max(0,604-eff0)/daysLeft),personal=Math.max(0,perDay-tar),left=Math.max(0,personal-todayRead),exp=Math.round(604*clamp(idx,0,30)/30),behind=Math.max(0,exp-eff0);
  $('rmPlan').innerHTML=`<h3>Quran plan: finish in 30 days</h3><div class="pbar"><i style="width:${Math.min(100,st/604*100)}%"></i></div><p class="muted">Your Quran Tracker shows <b>${st}</b> of 604 pages in this reading.</p>
   <label class="setrow"><span>Plan starts on</span><input type="date" id="rpStart" value="${localKey(start)}"></label>
   <label class="setrow"><span>I pray Taraweeh with a full recitation (about 20 pages a night)</span><input type="checkbox" id="rpTar" ${plan.tar?'checked':''}></label>
   ${over?'<p>The 30-day plan period has finished. Choose a new start date to plan again.</p>':idx<0?`<p>Your plan begins in <b>${-idx}</b> day(s). A steady pace is about <b>${Math.ceil(604/30)}</b> pages a day.</p>`:`<div class="rp-k"><div><small>Today's reading</small><b>${personal} pages</b></div><div><small>Still to read today</small><b>${left}</b></div><div><small>About after each prayer</small><b>${Math.ceil(left/5)}</b></div><div><small>Days left</small><b>${daysLeft}</b></div></div><p class="muted">${behind>0?`You are about <b>${behind}</b> pages behind an even pace, so today's target rises a little. It rebalances itself every day.`:'You are on track or ahead. MashaAllah.'}${tar?' Taraweeh pages are counted automatically, so this is your personal reading.':''}</p>`}
   <button class="smb" id="rpGo">Open Quran Tracker</button>`;
  $('rpStart').onchange=e=>{ss('ramPlan',{...gs('ramPlan',{}),start:e.target.value});renderPlan()};$('rpTar').onchange=e=>{ss('ramPlan',{...gs('ramPlan',{}),tar:e.target.checked});renderPlan()};
  $('rpGo').onclick=()=>go('quran',document.querySelector(`.ni[onclick*="'quran'"]`));
}

/* ══ REAL-TIME ISLAMIC SKY ══ */
const STARS=[['Sirius',6.752,-16.716,-1.46],['Canopus',6.399,-52.696,-.74],['Arcturus',14.261,19.182,-.05],['Vega',18.616,38.784,.03],['Capella',5.278,45.998,.08],['Rigel',5.242,-8.202,.13],['Procyon',7.655,5.225,.34],['Betelgeuse',5.919,7.407,.5],['Achernar',1.629,-57.237,.46],['Altair',19.846,8.868,.76],['Aldebaran',4.599,16.509,.85],['Antares',16.49,-26.432,1.06],['Spica',13.42,-11.161,.97],['Pollux',7.755,28.026,1.14],['Fomalhaut',22.961,-29.622,1.16],['Deneb',20.69,45.28,1.25],['Regulus',10.14,11.967,1.35],['Polaris',2.53,89.264,2],['Acrux',12.443,-63.099,.76],['Hadar',14.064,-60.373,.61],['Mimosa',12.795,-59.689,1.25],['Bellatrix',5.419,6.35,1.64],['Alnilam',5.603,-1.202,1.7],['Alnitak',5.679,-1.943,1.77],['Mintaka',5.533,-.299,2.2],['Dubhe',11.062,61.751,1.79],['Alkaid',13.792,49.313,1.86],['Mizar',13.399,54.925,2.27],['Merak',11.031,56.382,2.37],['Phecda',11.897,53.695,2.44],['Megrez',12.257,57.033,3.3],['Alioth',12.9,55.96,1.77],['Castor',7.577,31.889,1.58],['Alphard',9.46,-8.659,1.98],['Hamal',2.119,23.462,2],['Schedar',.675,56.537,2.24],['Caph',.153,59.15,2.27],['Alpheratz',.14,29.091,2.06],['Mirfak',3.405,49.861,1.8],['Saiph',5.796,-9.67,2.07],['Kochab',14.845,74.156,2.07],['Rasalhague',17.582,12.56,2.08],['Eltanin',17.943,51.489,2.23],['Sadr',20.37,40.257,2.2],['Shaula',17.56,-37.104,1.6],['Kaus Australis',18.403,-34.385,1.8],['Nunki',18.921,-26.297,2]];
const LINES=[[23,24],[24,22],[21,5],[5,39],[39,7],[7,21],[25,29],[29,30],[30,31],[31,27],[27,26],[26,28],[28,25]];
function skyWhen(){const d=$('skD').value?new Date($('skD').value+'T00:00:00'):new Date(),m=+$('skT').value;d.setHours(0,0,0,0);d.setMinutes(m);return d}
function twilight(a){return a>=0?'Day':a>=-6?'Civil twilight':a>=-12?'Nautical twilight':a>=-18?'Astronomical twilight':'Night'}
const SKYC=[[10,'#4d94dc','#a8d6f2'],[0,'#5c78bc','#f2b080'],[-6,'#26407f','#8c5c8e'],[-12,'#0e1c4a','#2c3872'],[-18,'#050b22','#0c1842'],[-30,'#02050f','#060d26']];
const hx=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function skyCol(alt){const S=SKYC;if(alt>=S[0][0])return[hx(S[0][1]),hx(S[0][2])];for(let i=1;i<S.length;i++)if(alt>=S[i][0]){const a=S[i-1],b=S[i],u=clamp((alt-b[0])/(a[0]-b[0]),0,1),mx=(p,q)=>p.map((v,k)=>Math.round(q[k]+(v-q[k])*u));return[mx(hx(a[1]),hx(b[1])),mx(hx(a[2]),hx(b[2]))]}return[hx(S[5][1]),hx(S[5][2])]}
function renderSky(){
  const cv=$('skCv');if(!cv)return;if(!locInfo){$('skInfo').innerHTML='<p>Set your location to see your sky.</p>';return}
  const d=skyWhen(),la=locInfo.lat,lo=locInfo.lon,S=sunEq(d),sa=altaz(S.ra,S.dec,la,lo,d),M=moonEq(d),ma=altaz(M.ra,M.dec,la,lo,d),mi=moonInfo(d);
  const sz=Math.min(cv.parentElement.clientWidth||560,640),dpr=Math.min(2,devicePixelRatio||1);cv.width=sz*dpr;cv.height=sz*dpr;cv.style.width=sz+'px';cv.style.height=sz+'px';const c=cv.getContext('2d');c.scale(dpr,dpr);
  const cx=sz/2,cy=sz/2,R=sz/2-26,P=(alt,az)=>{const r=(90-alt)/90*R;return[cx-r*Math.sin(rad(az)),cy-r*Math.cos(rad(az))]};
  const[top,bot]=skyCol(sa.alt),g=c.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,`rgb(${top})`);g.addColorStop(1,`rgb(${bot})`);
  c.fillStyle='#02050f';c.fillRect(0,0,sz,sz);c.save();c.beginPath();c.arc(cx,cy,R,0,6.3);c.clip();c.fillStyle=g;c.fillRect(0,0,sz,sz);
  const dark=clamp((-sa.alt-3)/12,0,1),pos=STARS.map(s=>{const a=altaz(s[1]*15,s[2],la,lo,d);return{n:s[0],mag:s[3],alt:a.alt,az:a.az}});
  pos.forEach(s=>{if(s.alt<=0)return;const vis=s.mag<1.5?dark:dark*clamp((-sa.alt-8)/8,0,1);if(vis<.02)return;const[x,y]=P(s.alt,s.az),r=Math.max(.8,3.1-s.mag*.7);c.globalAlpha=vis*(1-.5*(1-s.alt/90)*(s.alt<12?1:0));c.fillStyle='#f4f8ff';c.beginPath();c.arc(x,y,r,0,6.3);c.fill();
    if(s.mag<1.2&&vis>.5){c.font='600 10px Jost,sans-serif';c.fillStyle='#cfe0ff';c.fillText(s.n,x+r+3,y+3)}});
  c.strokeStyle='rgba(180,205,255,.22)';c.lineWidth=1;LINES.forEach(([a,b])=>{const A=pos[a],B=pos[b];if(A.alt>0&&B.alt>0){c.globalAlpha=dark*.7;const[x1,y1]=P(A.alt,A.az),[x2,y2]=P(B.alt,B.az);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}});c.globalAlpha=1;
  if(sa.alt>-3){const[x,y]=P(Math.max(sa.alt,0),sa.az),q=c.createRadialGradient(x,y,0,x,y,60);q.addColorStop(0,'rgba(255,230,160,.8)');q.addColorStop(1,'rgba(255,230,160,0)');c.fillStyle=q;c.fillRect(x-60,y-60,120,120);c.fillStyle='#fff6d0';c.beginPath();c.arc(x,y,9,0,6.3);c.fill()}
  if(ma.alt>-1){const[x,y]=P(Math.max(ma.alt,0),ma.az),q=c.createRadialGradient(x,y,0,x,y,44);q.addColorStop(0,'rgba(190,215,255,.45)');q.addColorStop(1,'rgba(190,215,255,0)');c.fillStyle=q;c.fillRect(x-44,y-44,88,88);c.save();c.translate(x,y);if(window.NOOR&&NOOR.drawMoon)NOOR.drawMoon(c,mi.ph,12,'#f6f1dc','#1b2442');c.restore()}
  c.restore();c.strokeStyle='rgba(240,200,102,.5)';c.lineWidth=2;c.beginPath();c.arc(cx,cy,R,0,6.3);c.stroke();
  c.fillStyle='#e8edf8';c.font='700 13px Jost,sans-serif';c.textAlign='center';c.fillText('N',cx,cy-R-8);c.fillText('S',cx,cy+R+18);c.fillText('E',cx-R-14,cy+4);c.fillText('W',cx+R+14,cy+4);
  const qb=mod(deg(Math.atan2(Math.sin(rad(39.8262-lo))*Math.cos(rad(21.4225)),Math.cos(rad(la))*Math.sin(rad(21.4225))-Math.sin(rad(la))*Math.cos(rad(21.4225))*Math.cos(rad(39.8262-lo)))),360),[qx,qy]=P(0,qb);c.fillStyle='#f0c866';c.beginPath();c.arc(qx,qy,6,0,6.3);c.fill();c.fillStyle='#fff';c.font='700 10px Jost,sans-serif';c.fillText('Qibla',qx,qy-10);c.textAlign='start';
  // crescent hint at sunset of the chosen day
  let ss_=null;const base=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),12)-lo*240000;for(let k=0;k<180;k++){const t=new Date(base+k*24e4),e=sunEq(t);if(altaz(e.ra,e.dec,la,lo,t).alt<-.83){ss_=t;break}}
  let hint='';if(ss_){const e=sunEq(ss_),mm=moonEq(ss_),mA=altaz(mm.ra,mm.dec,la,lo,ss_),mI=moonInfo(ss_);hint=`<div class="sk-box"><b>At sunset on this date</b> (about ${ampm(hhmm(ss_.getHours()*60+ss_.getMinutes()))} on your device clock): calculated moon age ${mI.age.toFixed(1)} days, moon ${mA.alt.toFixed(0)}° above the horizon, ${mI.elong.toFixed(0)}° from the sun.<small>This is only a rough aid for curious readers. It does not decide whether the crescent is seen. Official crescent-sighting announcements decide the start of Islamic months.</small></div>`}
  $('skInfo').innerHTML=`<div class="sk-k"><div><small>Sky</small><b>${twilight(sa.alt)}</b></div><div><small>Sun altitude</small><b>${sa.alt.toFixed(1)}°</b></div><div><small>Moon</small><b>${mi.name}</b></div><div><small>Calculated illumination</small><b>${Math.round(mi.ill*100)}%</b></div><div><small>Moon altitude</small><b>${ma.alt.toFixed(0)}°</b></div><div><small>Moon age (calculated)</small><b>${mi.age.toFixed(1)} d</b></div></div>${hint}
   <div class="sk-box warn"><b>Calculated, not announced.</b> The moon phase here is computed from astronomy. The start of Ramadan, Eid and other months follows <b>local moon-sighting announcements</b>, which can differ from calculation by a day. Follow your local authority. Sun at −18° marks astronomical dawn, which many methods use for Fajr; methods differ. Star positions use J2000 coordinates (about 0.3° off today).</div>`;
  $('skTL').textContent=ampm(hhmm(d.getHours()*60+d.getMinutes()));
}

/* ══ WAVE OF PRAYER (world map; no server) ══ */
let land=null,waveOff=0,wLandC=null;
function decodeLand(){
  const t=window.WORLD_LAND;if(!t)return[];const [sx,sy]=t.transform.scale,[tx,ty]=t.transform.translate;
  const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(p=>{x+=p[0];y+=p[1];return[x*sx+tx,y*sy+ty]})});
  const ring=idx=>{let pts=[];idx.forEach(i=>{let a=i<0?arcs[~i].slice().reverse():arcs[i];pts=pts.concat(pts.length?a.slice(1):a)});return pts};
  const out=[],walk=g=>{if(g.type==='GeometryCollection')g.geometries.forEach(walk);else if(g.type==='MultiPolygon')g.arcs.forEach(poly=>poly.forEach(r=>out.push(ring(r))));else if(g.type==='Polygon')g.arcs.forEach(r=>out.push(ring(r)))};
  Object.values(t.objects).forEach(walk);return out;
}
const WCOL={Fajr:[94,200,255],Sunrise:[255,224,138],Dhuhr:[255,255,255],Asr:[255,169,77],Maghrib:[255,107,129],Isha:[183,148,255]};
function renderWave(){
  const cv=$('wvCv');if(!cv)return;if(!land)land=decodeLand();
  const W0=Math.min(cv.parentElement.clientWidth||900,1100),H0=Math.round(W0/2),dpr=Math.min(2,devicePixelRatio||1);cv.width=W0*dpr;cv.height=H0*dpr;cv.style.width=W0+'px';cv.style.height=H0+'px';const c=cv.getContext('2d');c.scale(dpr,dpr);
  const X=lo=>(lo+180)/360*W0,Y=la=>(90-la)/180*H0,t=new Date(Date.now()+waveOff*36e5);
  const oc=c.createLinearGradient(0,0,0,H0);oc.addColorStop(0,'#0a1a3a');oc.addColorStop(1,'#07122b');c.fillStyle=oc;c.fillRect(0,0,W0,H0);
  const path=()=>{c.beginPath();land.forEach(r=>{r.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.closePath()})};
  path();c.fillStyle='#27457f';c.fill();
  const S=sunEq(t),gm=gmst(t),dec=rad(S.dec),NX=720,NY=360,ov=document.createElement('canvas');ov.width=NX;ov.height=NY;const oc2=ov.getContext('2d'),im=oc2.createImageData(NX,NY),D=im.data;
  const cH=new Float32Array(NX),sH=new Float32Array(NX),Hs=new Float32Array(NX);
  for(let i=0;i<NX;i++){const H=mod(gm+(-180+(i+.5)*360/NX)-S.ra+180,360)-180;Hs[i]=H;cH[i]=Math.cos(rad(H))}
  for(let j=0;j<NY;j++){const la=90-(j+.5)*180/NY,p=rad(la),sp=Math.sin(p),cp=Math.cos(p),sd=Math.sin(dec),cd=Math.cos(dec),asrAlt=deg(Math.atan(1/(1+Math.abs(Math.tan(p-dec)))));
    for(let i=0;i<NX;i++){const a=deg(Math.asin(clamp(sp*sd+cp*cd*cH[i],-1,1))),rising=Hs[i]<0,k=(j*NX+i)*4;
      let r=0,g=0,b=0,al=0;if(a<-.83){al=Math.min(.62,.18+(-a)/18*.5);r=2;g=6;b=24}
      const band=(tg,col,tol)=>{const q=1-Math.abs(a-tg)/tol;if(q>0){const w=q*q;r=r*(1-w)+col[0]*w;g=g*(1-w)+col[1]*w;b=b*(1-w)+col[2]*w;al=Math.max(al,w*.95)}};
      if(rising){band(-18,WCOL.Fajr,1.3);band(-.83,WCOL.Sunrise,1)}else{band(-.83,WCOL.Maghrib,1);band(-17,WCOL.Isha,1.3);band(asrAlt,WCOL.Asr,1.2)}
      if(Math.abs(Hs[i])<1&&a>0){const w=1-Math.abs(Hs[i])/1;r=r*(1-w)+255*w;g=g*(1-w)+255*w;b=b*(1-w)+255*w;al=Math.max(al,w*.9)}
      D[k]=r;D[k+1]=g;D[k+2]=b;D[k+3]=al*255}}
  oc2.putImageData(im,0,0);c.imageSmoothingEnabled=true;c.drawImage(ov,0,0,W0,H0);
  path();c.strokeStyle='rgba(200,220,255,.5)';c.lineWidth=.8;c.stroke();
  if(locInfo){const x=X(locInfo.lon),y=Y(locInfo.lat);c.fillStyle='#fff';c.strokeStyle='#f0c866';c.lineWidth=2;c.beginPath();c.arc(x,y,5,0,6.3);c.fill();c.stroke();c.fillStyle='#fff';c.font='700 11px Jost,sans-serif';c.fillText(locInfo.city||'You',x+9,y-7)}
  const sx=X(mod(-(gm-S.ra)+180,360)-180),sy=Y(S.dec);c.fillStyle='#ffe9a6';c.beginPath();c.arc(sx,sy,6,0,6.3);c.fill();
  $('wvTime').textContent=t.toUTCString().slice(5,22)+' UTC'+(waveOff?`  (${waveOff>0?'+':''}${waveOff} h)`:'  (live)');
}

/* ══ BEDSIDE CLOCK ══ */
let bsTimer=0,bsLock=null;
async function openBedside(){
  if($('bedside'))return;const o=document.createElement('div');o.id='bedside';o.setAttribute('role','dialog');o.setAttribute('aria-label','Bedside clock');
  o.innerHTML='<div id="bsBox"><canvas id="bsMoon" width="120" height="120" aria-hidden="true"></canvas><div id="bsClock"></div><div id="bsDate"></div><div id="bsNext"></div></div><div id="bsHint">Tap anywhere to exit</div>';document.body.appendChild(o);
  document.documentElement.classList.add('bedside-on');if(window.NOOR&&NOOR.setBedside)NOOR.setBedside(true);try{bsLock=await navigator.wakeLock.request('screen')}catch{}
  const up=()=>{const n=new Date(),np=nextPrayer(),D=DEF(),isha=mins(PT.Isha),fj=mins(PT.Fajr),cm=nowM(),night=isha!=null&&fj!=null&&(cm>=isha||cm<fj);
    $('bsClock').textContent=n.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('bsDate').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})+(()=>{try{const h=hij(n);return' · '+h.d+' '+HM[h.m-1]}catch{return''}})();
    $('bsNext').textContent=np?`${np.p} in ${np.left>=60?Math.floor(np.left/60)+'h '+Math.round(np.left%60)+'m':Math.round(np.left)+' min'}`:'';
    o.style.setProperty('--bs-dim',night?.55:.85);o.style.setProperty('--bs-veil',night?.55:.38);const m=n.getHours()*60+n.getMinutes();$('bsBox').style.transform=`translate(${Math.round(Math.sin(m/7)*28)}px,${Math.round(Math.cos(m/9)*20)}px)`;
    const x=$('bsMoon').getContext('2d'),mi=moonInfo(n);x.clearRect(0,0,120,120);x.save();x.translate(60,60);NOOR&&NOOR.drawMoon&&NOOR.drawMoon(x,mi.ph,44,'#c9d3ee','#10172c');x.restore()};
  up();bsTimer=setInterval(up,5000);const close=()=>{clearInterval(bsTimer);o.remove();removeEventListener('keydown',kd);document.documentElement.classList.remove('bedside-on');if(window.NOOR&&NOOR.setBedside)NOOR.setBedside(false);try{bsLock&&bsLock.release()}catch{}};
  const kd=e=>{if(e.key==='Escape')close()};addEventListener('keydown',kd);o.onclick=close;
}

/* ══ ACCESSIBILITY PACK ══ */
const VIB={Fajr:[300,120,300,120,300],Dhuhr:[600],Asr:[200,100,200],Maghrib:[150,80,150,80,500],Isha:[700,150,700]};
function a11y(){return{speak:false,pre:5,vib:false,size:100,hc:false,...gs('a11y',{})}}
function applyA11y(){const a=a11y();document.documentElement.style.fontSize=a.size===100?'':a.size+'%';document.documentElement.classList.toggle('hc',!!a.hc)}
function announce(msg,p){const a=a11y(),L=$('a11yLive');if(L)L.textContent=msg;if(a.speak){try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(msg))}catch{}}if(a.vib&&navigator.vibrate&&p)navigator.vibrate(VIB[p]||[300])}
const firedA=new Set();
function a11yTick(){
  if(!appActive())return;const a=a11y();if(!a.speak&&!a.vib)return;const n=new Date(),cm=n.getHours()*60+n.getMinutes();
  PRAYERS.forEach(p=>{const pm=mins(PT[p]);if(pm==null)return;
    [[pm-a.pre,`${p} in ${a.pre} minutes`,0],[pm,`It is time for ${p}`,1]].forEach(([at,msg,main])=>{if(cm!==at||(!main&&!a.pre))return;const k=TK()+p+main+'a';if(firedA.has(k))return;firedA.add(k);announce(msg,main?p:null)})});
}

/* ══ WEEKLY REFLECTION CARD (made on this device) ══ */
function weekData(){const logs=gs('logs',{}),out=[];for(let i=6;i>=0;i--){const k=DK(new Date(Date.now()-i*864e5)),l=logs[k];out.push({k,sc:l?dayComp(l):null,full:!!l&&PRAYERS.every(p=>l[p]&&l[p].fard&&!l[p].missed),wd:new Date(k+'T12:00:00').getDay()})}
  let streak=0;for(let i=0;i<400;i++){const l=logs[DK(new Date(Date.now()-i*864e5))];if(l&&PRAYERS.every(p=>l[p]&&l[p].fard&&!l[p].missed))streak++;else if(i>0)break}return{days:out,streak}}
function drawCard(cv,name){
  const W=1080,H=1350;cv.width=W;cv.height=H;const c=cv.getContext('2d'),{days,streak}=weekData(),sc=days.filter(d=>d.sc!=null).map(d=>d.sc),score=Math.round(avg(sc)),full=days.filter(d=>d.full).length;
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#050b24');g.addColorStop(.6,'#13235a');g.addColorStop(1,'#3a2a5e');c.fillStyle=g;c.fillRect(0,0,W,H);
  c.fillStyle='#e8f0ff';for(let i=0;i<260;i++){c.globalAlpha=.15+.5*hash('s'+i);const r=hash('r'+i)*2.2+.4;c.beginPath();c.arc(hash('x'+i)*W,hash('y'+i)*H*.8,r,0,6.3);c.fill()}c.globalAlpha=1;
  c.save();c.translate(930,170);const mi=moonInfo(new Date());if(window.NOOR&&NOOR.drawMoon)NOOR.drawMoon(c,mi.ph,62,'#f6f1dc','rgba(120,145,200,.25)');c.restore();
  c.fillStyle='#f0c866';c.font='700 74px Cormorant Garamond,Amiri,serif';c.fillText('My week in prayer',80,190);c.fillStyle='rgba(232,240,255,.75)';c.font='600 34px Jost,sans-serif';
  c.fillText(new Date(days[0].k+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})+' to '+new Date(days[6].k+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),80,250);
  const pts=days.map((d,i)=>({x:120+i*140,y:560-Math.sin(i/6*Math.PI)*170,d}));c.strokeStyle='rgba(240,200,102,.55)';c.lineWidth=3;c.beginPath();let s=false;pts.forEach(p=>{if(p.d.sc!=null&&p.d.sc>=50){s?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);s=true}});c.stroke();
  const wb=Math.max(60,...sc);pts.forEach(p=>{const v=p.d.sc==null?0:Math.min(1,p.d.sc/wb),r=14+v*30,q=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);q.addColorStop(0,`rgba(255,243,196,${.15+.6*v})`);q.addColorStop(1,'rgba(255,243,196,0)');c.fillStyle=q;c.fillRect(p.x-r*3,p.y-r*3,r*6,r*6);
    c.fillStyle=p.d.sc==null?'rgba(207,224,255,.3)':'#fff3c4';c.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=Math.PI/5*k-Math.PI/2;c.lineTo(p.x+rr*Math.cos(a),p.y+rr*Math.sin(a))}c.closePath();c.fill();
    c.fillStyle='rgba(232,240,255,.8)';c.font='600 28px Jost,sans-serif';c.textAlign='center';c.fillText(DAYS[p.d.wd],p.x,p.y+r+42);c.textAlign='start'});
  c.fillStyle='#fff';c.font='800 250px Jost,sans-serif';c.textAlign='center';c.fillText(score+'%',W/2,930);c.font='600 40px Jost,sans-serif';c.fillStyle='rgba(232,240,255,.8)';c.fillText('average prayer completion',W/2,1000);
  c.fillStyle='#f0c866';c.font='700 46px Jost,sans-serif';c.fillText(`${full} of 7 days with all five prayers`,W/2,1100);{const tx=`${streak} day streak`,w=c.measureText(tx).width,cx0=W/2+24;c.fillText(tx,cx0,1170);c.save();c.translate(cx0-w/2-30,1170);c.fillStyle='#ff9a3c';c.beginPath();c.moveTo(0,-44);c.bezierCurveTo(-24,-26,-24,-2,0,2);c.bezierCurveTo(24,-2,24,-22,6,-32);c.bezierCurveTo(6,-22,-2,-22,0,-44);c.fill();c.restore()}
  c.fillStyle='rgba(232,240,255,.55)';c.font='600 32px Jost,sans-serif';c.fillText((name?name+' · ':'')+'Prayer Time',W/2,1275);c.textAlign='start';
}
function renderWeekly(){const cv=$('wkCv');if(cv)drawCard(cv,$('wkName').checked?(gs('currentUser',{}).name||'').split(' ')[0]:'')}

/* ══ SETTINGS CARDS ══ */
function mkSettings2(){
  const pg=$('pg-settings');if(!pg||$('mosqueCard'))return;
  const m=document.createElement('div');m.id='mosqueCard';m.className='card';m.style.marginBottom='16px';
  m.innerHTML=`<div style="font-weight:700;margin-bottom:6px;font-size:.95rem">🕌 My mosque prayer times</div><p class="muted" id="mtNote"></p>
   <label class="setrow"><span>Mosque name</span><input type="text" id="mtName" maxlength="40" placeholder="e.g. Central Mosque"></label>
   ${PRAYERS.map(p=>`<label class="setrow"><span>${p}</span><input type="time" id="mt_${p}"></label>`).join('')}
   <label class="setrow"><span>Or upload a text/CSV file</span><input type="file" id="mtFile" accept=".txt,.csv,text/plain"></label>
   <div class="setrow"><button class="smb" id="mtSave">Save mosque times</button><button class="smb" id="mtReset">Remove and use default</button></div>
   <p class="muted">Your dashboard, countdown and reminders will use these times. Suhoor and Iftar still use the calculated times for safety. A file can list lines such as "Fajr 5:10", "Asr 4:30 PM".</p>`;
  const a=document.createElement('div');a.id='a11yCard';a.className='card';a.style.marginBottom='16px';const A=a11y();
  a.innerHTML=`<div style="font-weight:700;margin-bottom:10px;font-size:.95rem">♿ Accessibility and hands-free</div>
   <label class="setrow"><span>Speak prayer announcements</span><input type="checkbox" id="axSpeak"></label>
   <label class="setrow"><span>Announce before prayer</span><select id="axPre">${[0,5,10,15].map(v=>`<option value="${v}">${v?v+' minutes':'Off'}</option>`).join('')}</select></label>
   <label class="setrow"><span>Different vibration for each prayer</span><input type="checkbox" id="axVib"></label>
   <label class="setrow"><span>Text size</span><select id="axSize"><option value="100">Normal</option><option value="115">Large</option><option value="130">Extra large</option></select></label>
   <label class="setrow"><span>Higher contrast text</span><input type="checkbox" id="axHc"></label>
   <div class="setrow"><button class="smb" id="axTest">Test announcement</button></div>`;
  const o=document.createElement('div');o.id='offCard';o.className='card';o.style.marginBottom='16px';
  o.innerHTML=`<div style="font-weight:700;margin-bottom:8px;font-size:.95rem">📴 Offline schedule and travel</div><p id="offMeta"></p>
   <label class="setrow"><span>Save schedule for</span><select id="offM"><option value="1">This month</option><option value="2" selected>2 months</option><option value="3">3 months</option></select></label>
   <div class="setrow"><button class="smb" id="offUp">Update now</button><button class="smb" id="trvNow">Check if I have travelled</button><button class="smb" id="bsOpen">🛏 Bedside clock</button></div>
   <p class="muted">Good to know: browsers cannot wake a closed web app to remind you without a push server, so reminders fire while the app (or the installed app) is open or recently running. Location needs your permission and a secure (https) address. A saved schedule belongs to the city it was made for, so update it after you travel.</p>`;
  pg.appendChild(m);pg.appendChild(a);pg.appendChild(o);fillMosqueForm();
  $('mtSave').onclick=saveMosque;$('mtReset').onclick=resetMosque;
  $('mtFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const t=parseTimesFile(await f.text()),n=Object.keys(t).length;if(!n)return notif('File','No prayer times found. Use lines like "Fajr 5:10".','⚠️');PRAYERS.forEach(p=>{if(t[p])$('mt_'+p).value=t[p]});if(!$('mtName').value)$('mtName').value=f.name.replace(/\.\w+$/,'').slice(0,40);notif('File read',n+' time(s) loaded. Check them, then press Save.','📄')};
  $('axSpeak').checked=A.speak;$('axPre').value=A.pre;$('axVib').checked=A.vib;$('axSize').value=A.size;$('axHc').checked=A.hc;
  const sv=()=>{ss('a11y',{speak:$('axSpeak').checked,pre:+$('axPre').value,vib:$('axVib').checked,size:+$('axSize').value,hc:$('axHc').checked});applyA11y()};
  ['axSpeak','axPre','axVib','axSize','axHc'].forEach(i=>$(i).onchange=sv);$('axTest').onclick=()=>announce('Asr in 5 minutes','Asr');
  $('offUp').onclick=async()=>{$('offUp').textContent='Updating…';const ok=window.PTOffline?await PTOffline.update(+$('offM').value):false;$('offUp').textContent='Update now';notif(ok?'Saved':'Not updated',ok?'Offline schedule refreshed.':'Needs internet and a saved location.',ok?'📴':'⚠️');offMeta()};
  $('trvNow').onclick=()=>checkTravel(true);$('bsOpen').onclick=openBedside;offMeta();
}
function offMeta(){const e=$('offMeta');if(!e)return;const m=gs('pt_cal_meta',null);
  e.innerHTML=m?`Saved for <b>${esc(m.from)}</b> to <b>${esc(m.to)}</b> · ${esc(m.city||'your city')}<br><small>Last updated ${new Date(m.ts).toLocaleString()}</small>`:'No offline schedule saved yet. It saves automatically when you are online with a location set.'}

/* ══ BOOT ══ */
safe(()=>{
  addPage('mosques','🕌','Mosque Finder',`<div class="tbar"><h1>🕌 Mosque Finder</h1></div><div class="card mq-ctl"><label class="setrow"><span>Search radius</span><select id="mqR"><option value="1000">1 km</option><option value="3000" selected>3 km</option><option value="5000">5 km</option><option value="10000">10 km</option></select></label>
   <label class="setrow"><span>Walking speed</span><select id="mqSp"><option value="3.5">Slow (3.5 km/h)</option><option value="5" selected>Normal (5 km/h)</option><option value="6.5">Brisk (6.5 km/h)</option></select></label>
   <label class="setrow"><span>Extra minutes to arrive early</span><input type="number" id="mqBuf" value="5" min="0" max="30" style="width:70px"></label>
   <button class="smb" id="mqGo">Find mosques near me</button><p class="muted" id="mqStat">Uses your device's GPS (high accuracy) and OpenStreetMap data. Jamaat (iqama) times are not in that data, so you can enter them for the mosque you attend.</p></div><div id="mqList"></div>`);
  addPage('rmdn','🌙','Ramadan and Hijri',`<div class="tbar"><h1>🌙 Ramadan and Hijri</h1></div><div class="card rm-hero"><small id="rmLab">Fast countdown</small><div id="rmCD" class="rm-cd">--:--:--</div><div class="rm-row"><span>Suhoor ends <b id="rmS">–</b></span><span>Iftar <b id="rmI">–</b></span><span id="rmBadge" class="chip"></span></div>
   <label class="setrow"><span>Suhoor alarm</span><span><input type="checkbox" id="rmAl"> <select id="rmAlM"><option value="30">30 min before Fajr</option><option value="45">45 min before Fajr</option><option value="60">60 min before Fajr</option><option value="90">90 min before Fajr</option></select></span></label>
   <label class="setrow"><span>My local announcement</span><select id="rmOff"><option value="0">Same as calculated</option><option value="1">Local date is 1 day later</option><option value="-1">Local date is 1 day earlier</option></select></label>
   <p class="muted">Suhoor and Iftar use the calculated Fajr and Maghrib start times, never your mosque's jamaat times. Hijri dates are calculated (Umm al-Qura) until you apply your local announcement.</p></div>
   <div class="card" id="rmCal"></div><div class="card" id="rmPlan"></div><div class="card" id="rmEv"></div>`);
  addPage('sky','🔭','Islamic Sky',`<div class="tbar"><h1>🔭 Real-Time Islamic Sky</h1></div><div class="card sk-wrap"><div class="sk-c"><canvas id="skCv" role="img" aria-label="Live sky map for your location showing the sun, moon, stars and Qibla direction"></canvas></div>
   <div class="sk-ctl"><label>Date <input type="date" id="skD"></label><label>Time <b id="skTL"></b><input type="range" id="skT" min="0" max="1439"></label><button class="smb" id="skNow">Now</button></div><div id="skInfo"></div></div>`);
  addPage('wave','🌍','Wave of Prayer',`<div class="tbar"><h1>🌍 Wave of Prayer</h1></div><div class="card"><div class="wv-w"><canvas id="wvCv" role="img" aria-label="World map showing where each prayer time is beginning right now"></canvas></div><p id="wvTime" class="muted"></p>
   <div class="wv-leg">${Object.entries(WCOL).map(([k,v])=>`<span><i style="background:rgb(${v})"></i>${k}</span>`).join('')}</div><label class="setrow col"><span>Move through time (hours)</span><input type="range" id="wvOff" min="-12" max="12" value="0" step="1"></label><button class="smb" id="wvNow">Back to now</button>
   <p class="muted">A glowing band marks where that prayer is beginning at this moment, following the sun around the Earth. Fajr and Isha use fixed twilight angles (18° and 17°), and methods differ, so bands are approximate. Near the poles in summer, some bands do not appear.</p></div>`);
  addPage('weekly','🖼️','Weekly Card',`<div class="tbar"><h1>🖼️ Weekly Reflection Card</h1></div><div class="card wk"><canvas id="wkCv" role="img" aria-label="Your week as a card with stars, average score and streak"></canvas><label class="setrow"><span>Include my first name</span><input type="checkbox" id="wkName"></label>
   <div class="setrow"><button class="smb" id="wkDl">Download image</button><button class="smb" id="wkShare">Share</button></div><p class="muted">Made on this device. It shows only your score, streak and stars, with no prayer-by-prayer details.</p></div>`);
  addPage('bedside','🛏️','Bedside Clock',null,'openBedsideClock()');window.openBedsideClock=openBedside;
});
safe(()=>{
  $('mqGo').onclick=findMosques;['mqSp','mqBuf'].forEach(i=>$(i).onchange=drawMosques);
  $('rmAl').onchange=$('rmAlM').onchange=()=>ss('suhoorAlarm',{on:$('rmAl').checked,min:+$('rmAlM').value});$('rmOff').onchange=e=>{ss('hijriOff',+e.target.value);renderRamadan()};
  const d=new Date();$('skD').value=localKey(d);$('skT').value=d.getHours()*60+d.getMinutes();$('skD').onchange=$('skT').oninput=renderSky;$('skNow').onclick=()=>{const n=new Date();$('skD').value=localKey(n);$('skT').value=n.getHours()*60+n.getMinutes();renderSky()};
  $('wvOff').oninput=e=>{waveOff=+e.target.value;renderWave()};$('wvNow').onclick=()=>{waveOff=0;$('wvOff').value=0;renderWave()};
  $('wkName').onchange=renderWeekly;$('wkDl').onclick=()=>$('wkCv').toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='my-week-in-prayer.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});
  $('wkShare').onclick=()=>$('wkCv').toBlob(async b=>{const f=new File([b],'my-week-in-prayer.png',{type:'image/png'});try{if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'My week in prayer'});else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;a.click();notif('Saved','Sharing is not supported here, so the image was downloaded.','🖼️')}}catch{}});
});
const _g=window.go;window.go=function(id,n){_g(id,n);safe(()=>{if(id==='history')renderYearSky();if(id==='mosques'){drawMosques();const c=gs('mq_cache',null);if(!mqList.length&&c&&locInfo&&hav(c.lat,c.lon,locInfo.lat,locInfo.lon)<5){mqList=c.list;mqOrigin={lat:c.lat,lon:c.lon,acc:null,gps:!!c.gps};drawMosques()}}if(id==='rmdn')renderRamadan();if(id==='sky')renderSky();if(id==='wave')renderWave();if(id==='weekly')renderWeekly();if(id==='settings'){mkSettings2();fillMosqueForm();offMeta()}})};
const _r=window.refreshTimesUI;window.refreshTimesUI=function(){applyMosque();return _r.apply(this,arguments)};
safe(mkYearSky);safe(mkSettings2);safe(applyMosque);safe(applyA11y);
if(!$('a11yLive')){const l=document.createElement('div');l.id='a11yLive';l.className='sr-only';l.setAttribute('aria-live','polite');document.body.appendChild(l)}
const firedS=new Set();
setInterval(()=>{safe(()=>{
  const act=n=>$(n)&&$(n).classList.contains('active');
  if(act('pg-rmdn'))tickRamadan();if(act('pg-mosques'))updLeave();
  const al=gs('suhoorAlarm',{on:false,min:45}),f=mins(DEF().Fajr);if(al.on&&f!=null&&appActive()){const n=new Date(),cm=n.getHours()*60+n.getMinutes(),k=TK()+'suh';if(cm===mod(f-al.min,1440)&&!firedS.has(k)){firedS.add(k);notif('Suhoor time','Fajr is in '+al.min+' minutes. Time to eat and drink.','🌙');window.PTSound&&PTSound.soft();announce('Suhoor time. Fajr in '+al.min+' minutes.')}}
  if(window.NOOR&&NOOR.setRamadan)NOOR.setRamadan(hij(new Date()).m===9);a11yTick()})},1000);
setInterval(()=>{if(act20('pg-sky'))renderSky();if(act20('pg-wave'))renderWave()},30000);
function act20(i){return $(i)&&$(i).classList.contains('active')}
setTimeout(()=>checkTravel(false),15000);setInterval(()=>checkTravel(false),3*3600000);
})();
