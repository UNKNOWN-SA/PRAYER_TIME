// ═══════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════
const PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const PICO    = {Fajr:'🌅',Dhuhr:'☀️',Asr:'🌤',Maghrib:'🌇',Isha:'🌙'};

const SUNNAH_INFO = {
  Fajr:    { type:'muakkada', label:"Sunnah Mu'akkada" },
  Dhuhr:   { type:'muakkada', label:"Sunnah Mu'akkada" },
  Asr:     { type:'nafl',     label:"Sunnah Nafl (not scored)" },
  Maghrib: { type:'muakkada', label:"Sunnah Mu'akkada" },
  Isha:    { type:'muakkada', label:"Sunnah Mu'akkada", witr:true },
};

const QUOTES = [
  {t:"Prayer is decreed upon the believers at specified times.",       s:"Quran 4:103"},
  {t:"The first thing judged on the Day of Judgment is prayer.",       s:"Hadith – Ahmad"},
  {t:"The closest a servant is to his Lord is when prostrating.",      s:"Sahih Muslim"},
  {t:"Whoever reads a letter from the Book of Allah will have a reward multiplied by ten.", s:"Al-Tirmidhi"},
  {t:"Make use of five before five: youth, health, wealth, free time, and life.", s:"Al-Hakim"},
  {t:"SubhanAllah and its praise fills the scales.",                   s:"Sahih Muslim"},
  {t:"The strong believer is better and more beloved to Allah than the weak believer.", s:"Sahih Muslim"},
  {t:"Pray two rak'ahs before Fajr; better than this world and all within it.", s:"Sahih Muslim"},
];

// Updated: Salawat renamed to Durood
const DHLIST = [
  {ar:'سُبْحَانَ اللّٰهُ',           en:'SubhanAllah',       k:'subhan'},
  {ar:'الْحَمْدُ لِلَّٰهِ',          en:'Alhamdulillah',     k:'hamd'},
  {ar:'اَللّٰهُ أَكْبَرُ',           en:'Allahu Akbar',       k:'akbar'},
  {ar:'أَسْتَغْفِرُ اللّٰهَ',        en:'Astaghfirullah',    k:'astaghfar'},
  {ar:'اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّد', en:'Durood Shareef',  k:'durood'},
  {ar:'لَا إِلَٰهَ إِلَّا اللّٰهُ',  en:'La ilaha illAllah', k:'tahleel'},
];

const GICO = {prayer:'🤲',quran:'📖',dhikr:'📿',mosque:'🕌',fasting:'🌙',charity:'💝'};
const GCOL = {prayer:'#00b37e',quran:'#4fc3f7',dhikr:'#d4a843',mosque:'#7c5cbf',fasting:'#ff9800',charity:'#e91e63'};

// Madhab options for Asr calculation
// Shafi'i/Maliki/Hanbali = school=0 (shadow length = 1x object)
// Hanafi               = school=1 (shadow length = 2x object)
const MADHAB_OPTIONS = [
  { value:'0', label:"Shafi'i / Maliki / Hanbali (Standard)" },
  { value:'1', label:"Hanafi (Later Asr)" },
];

// ═══════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════
const gs  = (k,d) => { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):d; } catch { return d; } };
const ss  = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const TK  = ()    => new Date().toISOString().slice(0,10);
const DK  = d     => d.toISOString().slice(0,10);
const el  = id    => document.getElementById(id);
const sf  = (id,v)=> { const e=el(id); if(e) e.textContent=v; };

// ═══════════════════════════════════════════════════
//  PRAYER LOG & SCORING
// ═══════════════════════════════════════════════════
function defLog() {
  const l = {};
  PRAYERS.forEach(p => l[p] = {
    fard:false, sunnah_muakkada:false,
    mosque:false, ontime:false,
    khushu:0, witr:false, missed:false
  });
  return l;
}

function getLog(date=TK()) {
  const all = gs('logs',{});
  if(!all[date]) all[date] = defLog();
  PRAYERS.forEach(p => {
    if(!all[date][p])
      all[date][p] = {fard:false,sunnah_muakkada:false,mosque:false,ontime:false,khushu:0,witr:false,missed:false};
    if('sunnah' in all[date][p] && !('sunnah_muakkada' in all[date][p])) {
      all[date][p].sunnah_muakkada = all[date][p].sunnah;
      delete all[date][p].sunnah;
    }
  });
  return all[date];
}

function saveLog(date, log) {
  const all = gs('logs',{});
  all[date] = log;
  ss('logs', all);
  recompute();
}

function pScore(pd, prayer) {
  if(!pd || pd.missed) return 0;
  const info = SUNNAH_INFO[prayer] || {};
  let s = 0;
  if(prayer === 'Asr') {
    // Asr has different weights: Fard=50, Mosque=25, OnTime=25 (Sunnah is Nafl, not scored)
    if(pd.fard)   s += 50;
    if(pd.mosque) s += 25;
    if(pd.ontime) s += 25;
  } else if(prayer === 'Isha') {
    // Isha: Fard=35, Sunnah=20, Mosque=20, OnTime=15, Witr=10
    if(pd.fard)              s += 35;
    if(pd.sunnah_muakkada)   s += 20;
    if(pd.mosque)            s += 20;
    if(pd.ontime)            s += 15;
    if(pd.witr)              s += 10;  // Witr only applies to Isha
  } else {
    // All other prayers: Fard=40, Sunnah Mu'akkada=30, Mosque=20, OnTime=10
    if(pd.fard)              s += 40;
    if(pd.sunnah_muakkada && info.type === 'muakkada') s += 30;
    if(pd.mosque)            s += 20;
    if(pd.ontime)            s += 10;
  }
  return Math.min(100, s);
}

function pScoreMax(prayer) {
  if(prayer === 'Asr')  return 100; // 50+25+25
  if(prayer === 'Isha') return 100; // 35+20+20+15+10
  const info = SUNNAH_INFO[prayer] || {};
  let m = 40 + 20 + 10; // fard + mosque + ontime
  if(info.type === 'muakkada') m += 30;
  return Math.min(100, m);
}

function dayComp(log) {
  if(!log) return 0;
  const scores = PRAYERS.map(p => pScore(log[p]||{}, p));
  return Math.round(scores.reduce((a,b)=>a+b,0) / PRAYERS.length);
}

function pStatus(pd, prayer) {
  if(!pd || pd.missed)       return {txt:'Missed',             cls:'missed'};
  const s  = pScore(pd, prayer);
  const mx = pScoreMax(prayer);
  if(s >= mx) return {txt:'Complete ✓',        cls:'done'};
  if(s  >  0) return {txt:'Partial ('+s+'%)', cls:'partial'};
  return           {txt:'Pending',             cls:'pending'};
}

function allLogs() { return gs('logs',{}); }

// ═══════════════════════════════════════════════════
//  PERIOD STATS (week / month) — only past days
// ═══════════════════════════════════════════════════
function calcPeriodStats(days) {
  const logs  = allLogs();
  const now   = new Date();
  const today = TK();
  let totalScore=0, counted=0, fardDone=0, fardTotal=0, mosqueDone=0;
  for(let i=0; i<days; i++) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    const key = DK(d);
    if(key > today) continue;
    const log = logs[key]; if(!log) continue;
    totalScore += dayComp(log); counted++;
    PRAYERS.forEach(p => {
      fardTotal++;
      if(log[p]&&log[p].fard&&!log[p].missed){fardDone++;if(log[p].mosque)mosqueDone++;}
    });
  }
  return {
    avgScore:   counted ? Math.round(totalScore/counted) : 0,
    fardRate:   fardTotal ? Math.round(fardDone/fardTotal*100) : 0,
    mosqueRate: fardDone  ? Math.round(mosqueDone/fardDone*100) : 0,
    counted, days
  };
}

function calcMonthProgress() {
  const now   = new Date();
  const year  = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const dim   = new Date(year, month+1, 0).getDate();
  const logs  = allLogs();
  let totalScore=0, daysCounted=0, perfectDays=0, fardDone=0, fardTotal=0, mosqueDone=0;
  for(let d=1; d<=today; d++) {
    const key = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const log = logs[key]; if(!log) continue;
    const comp = dayComp(log);
    totalScore+=comp; daysCounted++;
    if(comp===100) perfectDays++;
    PRAYERS.forEach(p=>{
      fardTotal++;
      if(log[p]&&log[p].fard&&!log[p].missed){fardDone++;if(log[p].mosque)mosqueDone++;}
    });
  }
  return {
    avgScore:    daysCounted ? Math.round(totalScore/daysCounted) : 0,
    perfectDays, daysCounted,
    totalDays:   dim, daysLeft: dim-today,
    fardRate:    fardTotal ? Math.round(fardDone/fardTotal*100) : 0,
    mosqueRate:  fardDone  ? Math.round(mosqueDone/fardDone*100) : 0,
  };
}

// ═══════════════════════════════════════════════════
//  HIJRI DATE
// ═══════════════════════════════════════════════════
function getHijriDate(date) {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{
      day:'numeric',month:'long',year:'numeric'
    }).format(date||new Date());
  } catch(e) { return hijriFallback(date||new Date()); }
}

function hijriFallback(date) {
  const jd=Math.floor(date.getTime()/86400000+2440587.5);
  const l=jd-1948440+10632, n=Math.floor((l-1)/10631);
  const ll=l-10631*n+354;
  const j=Math.floor((10985-ll)/5316)*Math.floor((50*ll)/17719)+Math.floor(ll/5670)*Math.floor((43*ll)/15238);
  const lll=ll-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
  const m=Math.floor((24*lll)/709), d=lll-Math.floor((709*m)/24), y=30*n+j-30;
  const MN=['Muharram','Safar','Rabī\' al-Awwal','Rabī\' al-Thānī','Jumādā al-Ūlā','Jumādā al-Ākhirah',
            'Rajab','Sha\'bān','Ramaḍān','Shawwāl','Dhū al-Qa\'dah','Dhū al-Ḥijjah'];
  return d+' '+MN[m-1]+' '+y+' AH';
}

function isRamadan() {
  try {
    const m=parseInt(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{month:'numeric'}).format(new Date()));
    return m===9;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════
//  PRAYER TIMES — Full data (start, end, sunrise, sunset)
//  Asr school: 0 = Shafi'i/Maliki/Hanbali, 1 = Hanafi
// ═══════════════════════════════════════════════════
let PT = {
  Fajr:'--:--', Dhuhr:'--:--', Asr:'--:--', Maghrib:'--:--', Isha:'--:--',
  Sunrise:'--:--', Sunset:'--:--',
  FajrEnd:'--:--', DhuhrEnd:'--:--', AsrEnd:'--:--', MaghribEnd:'--:--', IshaEnd:'--:--'
};
let locInfo = gs('location', null);

function getMadhab() { return gs('madhab','0'); }

async function fetchPrayerTimes(lat, lon) {
  const school  = getMadhab();
  const methods = [3,2,4,1];
  for(const method of methods) {
    try {
      const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&tune=0,0,0,0,0,0,0,0,0`;
      const r = await fetch(url);
      if(!r.ok) continue;
      const j = await r.json();
      if(j.code===200 && j.data && j.data.timings) {
        const t = j.data.timings;
        // Build full times object including end times and sunrise/sunset
        const times = {
          Fajr:       fmt24(t.Fajr),
          Dhuhr:      fmt24(t.Dhuhr),
          Asr:        fmt24(t.Asr),
          Maghrib:    fmt24(t.Maghrib),
          Isha:       fmt24(t.Isha),
          Sunrise:    fmt24(t.Sunrise),
          Sunset:     fmt24(t.Sunset),
          Midnight:   fmt24(t.Midnight),
          // End times: next prayer's start = current prayer's end
          // Fajr ends at Sunrise
          FajrEnd:    fmt24(t.Sunrise),
          // Dhuhr ends at Asr
          DhuhrEnd:   fmt24(t.Asr),
          // Asr ends at Maghrib (Sunset)
          AsrEnd:     fmt24(t.Maghrib),
          // Maghrib ends at Isha
          MaghribEnd: fmt24(t.Isha),
          // Isha ends at Midnight (or Fajr next day)
          IshaEnd:    fmt24(t.Midnight),
        };
        if(Object.values({Fajr:times.Fajr,Dhuhr:times.Dhuhr,Asr:times.Asr,Maghrib:times.Maghrib,Isha:times.Isha}).every(v=>v!=='--:--'))
          return times;
      }
    } catch(e) { console.warn('Method '+method+' failed:',e); }
  }
  return null;
}

function fmt24(t) {
  if(!t) return '--:--';
  const clean = t.replace(/\s*(AM|PM)$/i,'').trim();
  const parts = clean.split(':');
  if(parts.length<2) return '--:--';
  return parts[0].padStart(2,'0')+':'+parts[1].padStart(2,'0');
}

function toMins(t) {
  if(!t||t==='--:--') return 0;
  const [h,m]=t.split(':').map(Number);
  return h*60+m;
}

function ampm(t) {
  if(!t||t==='--:--') return '–';
  const [h,m]=t.split(':').map(Number);
  return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM');
}

async function loadTimes() {
  if(!locInfo) return;
  const ck = 'pt_'+TK()+'_'+locInfo.lat.toFixed(4)+'_'+locInfo.lon.toFixed(4)+'_m'+getMadhab();
  const cached = gs(ck,null);
  if(cached) { PT=cached; refreshTimesUI(); return; }
  notif('Loading','Fetching prayer times for '+locInfo.city+'...','⏳');
  const times = await fetchPrayerTimes(locInfo.lat, locInfo.lon);
  if(times) {
    PT=times; ss(ck,times); refreshTimesUI();
    notif('Prayer Times','Times updated for '+locInfo.city,'🕌');
  } else {
    notif('Warning','Could not fetch prayer times. Check your connection.','⚠️');
  }
}

function refreshTimesUI() { renderDashBar(); renderTracker(); updateSunriseSunset(); }

function updateSunriseSunset() {
  sf('sunriseVal', ampm(PT.Sunrise));
  sf('sunsetVal',  ampm(PT.Sunset));
}

// ═══════════════════════════════════════════════════
//  LOCATION
// ═══════════════════════════════════════════════════
function showLoc() { el('locO').style.display='flex'; el('locStatus').textContent=''; }
function hideLoc() { el('locO').style.display='none'; }

function autoGPS() {
  el('locStatus').innerHTML='<span class="spin"></span> Detecting location...';
  if(!navigator.geolocation){ el('locStatus').textContent='Geolocation not supported.'; return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    const {latitude:lat,longitude:lon}=pos.coords;
    el('locStatus').innerHTML='<span class="spin"></span> Getting city name...';
    let city='Your Location';
    try {
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`);
      const d=await r.json();
      city=d.address.city||d.address.town||d.address.village||d.address.county||city;
    } catch{}
    setLoc(lat,lon,city);
  },()=>{ el('locStatus').textContent='GPS failed. Please search your city.'; },{timeout:12000});
}

async function searchCity() {
  const q=el('cityIn').value.trim(); if(!q) return;
  el('locStatus').innerHTML='<span class="spin"></span> Searching...';
  el('cityResults').innerHTML='';
  try {
    const r    =await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`);
    const data =await r.json();
    el('locStatus').textContent=data.length?'Select your city:':'No results. Try a different spelling.';
    data.slice(0,4).forEach(item=>{
      const btn=document.createElement('button');
      btn.className='locbtn';
      btn.textContent='📍 '+item.display_name.split(',').slice(0,3).join(', ');
      btn.onclick=()=>setLoc(+item.lat,+item.lon,item.display_name.split(',')[0]);
      el('cityResults').appendChild(btn);
    });
  } catch { el('locStatus').textContent='Network error. Check connection.'; }
}

function setLoc(lat,lon,city) {
  locInfo={lat,lon,city}; ss('location',locInfo);
  el('locStatus').textContent='✓ Location set: '+city+'. Fetching prayer times...';
  el('sbLoc').textContent='📍 '+city;
  setTimeout(async()=>{ await loadTimes(); hideLoc(); },600);
}

function saveMadhab() {
  const sel=el('madhabSelect'); if(!sel) return;
  ss('madhab',sel.value);
  // Clear cached prayer times so they refetch with new school
  if(locInfo){
    const ck0='pt_'+TK()+'_'+locInfo.lat.toFixed(4)+'_'+locInfo.lon.toFixed(4)+'_m0';
    const ck1='pt_'+TK()+'_'+locInfo.lat.toFixed(4)+'_'+locInfo.lon.toFixed(4)+'_m1';
    localStorage.removeItem(ck0); localStorage.removeItem(ck1);
  }
  loadTimes();
  notif('Madhab Updated','Prayer times recalculated for '+(['Shafi\'i/Maliki/Hanbali','Hanafi'][+sel.value]),'🕌');
}

// ═══════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════
function switchTab(t) {
  document.querySelectorAll('.ltab').forEach((x,i)=>x.classList.toggle('active',t==='login'?i===0:i===1));
  el('lf').style.display=t==='login' ?'block':'none';
  el('sf').style.display=t==='signup'?'block':'none';
}

function doLogin() {
  const email=el('le').value.trim(), pass=el('lp').value;
  if(!email||!pass){notif('Error','Fill all fields','⚠️');return;}
  const users=gs('users',{}), key=email.toLowerCase();
  if(!users[key]||users[key].pass!==pass){notif('Error','Invalid credentials','⚠️');return;}
  ss('currentUser',{email,name:users[key].name});
  if(el('rm').checked) ss('remember',true);
  loadApp();
}

function doSignup() {
  const name=el('sn').value.trim(), email=el('se').value.trim(), pass=el('sp').value;
  if(!name||!email||!pass){notif('Error','Fill all fields','⚠️');return;}
  const users=gs('users',{}), key=email.toLowerCase();
  if(users[key]){notif('Error','Account already exists','⚠️');return;}
  users[key]={name,pass}; ss('users',users); ss('currentUser',{email,name}); loadApp();
}

function guestLogin() { ss('currentUser',{name:'Guest',email:'guest@local',guest:true}); loadApp(); }
function doLogout()   { localStorage.removeItem('currentUser'); el('loginScreen').classList.add('active'); el('appScreen').classList.remove('active'); }

function renameUser() {
  const u = gs('currentUser', {});
  const newName = prompt('Enter your new display name:', u.name||'');
  if(!newName || !newName.trim()) return;
  const trimmed = newName.trim();
  u.name = trimmed;
  ss('currentUser', u);
  // also update in users store if not guest
  if(!u.guest && u.email) {
    const users = gs('users', {});
    const key   = u.email.toLowerCase();
    if(users[key]) { users[key].name = trimmed; ss('users', users); }
  }
  sf('sbUser', trimmed);
  sf('dashGreet', 'Assalamu Alaikum, '+trimmed+' 👋');
  notif('Name Updated', 'Your name has been changed to '+trimmed, '✏️');
}

// ═══════════════════════════════════════════════════
//  APP INIT
// ═══════════════════════════════════════════════════
async function loadApp() {
  el('loginScreen').classList.remove('active');
  el('appScreen').classList.add('active');
  const u=gs('currentUser',{name:'Guest'});
  sf('sbUser',u.name||'Guest');
  sf('dashGreet','Assalamu Alaikum, '+(u.name||'Guest')+' 👋');

  // Dual date
  const now=new Date();
  const engDate=now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const hijriDate=getHijriDate(now);
  const dateEl=el('dashDate');
  if(dateEl) dateEl.innerHTML=engDate+'<br><span class="hijri-badge">☪ '+hijriDate+'</span>';

  locInfo=gs('location',null);
  el('sbLoc').textContent=locInfo?'📍 '+(locInfo.city||'Location set'):'📍 Set Location';

  // Set madhab selector
  const madhabSel=el('madhabSelect');
  if(madhabSel) madhabSel.value=getMadhab();

  await loadTimes();
  renderDashBar();
  recompute();
  startCD();
  rotateQ();
  initDh();
  initJuz();
  loadGoals();
  loadQaza();
  loadModes();
  initNavGroups();
  initCal();
  renderMonthProgress();
  el('ptDate').value=TK();

  const th=gs('theme','dark');
  if(th==='light') applyTheme('light');

  if(isRamadan()) {
    const modes=gs('modes',{});
    if(!modes.ramadanAutoActivated){
      modes.ramadan=true; modes.ramadanAutoActivated=true; ss('modes',modes);
      notif('Ramadan Mubarak!','Ramadan Mode auto-activated 🌙','🌙');
      loadModes();
    }
  }

  if(!locInfo) setTimeout(showLoc,900);
}

function init() { const u=gs('currentUser',null); if(u) loadApp(); }

// ═══════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════
function go(id,nav) {
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  el('pg-'+id).classList.add('active');
  if(nav) nav.classList.add('active');
  closeSB();
  if(id==='analytics') setTimeout(()=>initCharts(period),120);
  if(id==='score')     setTimeout(()=>renderScore(true),120);
  if(id==='prayers') { el('ptDate').value=el('ptDate').value||TK(); renderTracker(); }
  if(id==='history')   renderCal();
  if(id==='quran')   { initJuz(); initQuranChart(); }
  if(id==='settings')  renderSettings();
}
function toggleSB()    { el('sb').classList.toggle('open'); el('sbov').classList.toggle('open'); }
function closeSB()     { el('sb').classList.remove('open'); el('sbov').classList.remove('open'); }

// ─── Collapsible sidebar nav groups ───────────────
function toggleNavGroup(id) {
  const group = el(id);
  if(!group) return;
  group.classList.toggle('open');
  // Persist state
  const states = gs('navGroups', {});
  states[id] = group.classList.contains('open');
  ss('navGroups', states);
}

function initNavGroups() {
  const states = gs('navGroups', {});
  document.querySelectorAll('.nav-group').forEach(g => {
    const id = g.id;
    if(id && id in states) {
      if(states[id]) g.classList.add('open');
      else           g.classList.remove('open');
    }
  });
}

// ─── Rename from settings page ────────────────────
function renameFromSettings() {
  const inp = el('renameInput');
  if(!inp) return;
  const newName = inp.value.trim();
  if(!newName) { notif('Error','Please enter a name','⚠️'); return; }
  const u = gs('currentUser', {});
  u.name = newName;
  ss('currentUser', u);
  if(!u.guest && u.email) {
    const users = gs('users', {});
    const key   = u.email.toLowerCase();
    if(users[key]) { users[key].name = newName; ss('users', users); }
  }
  sf('sbUser', newName);
  sf('dashGreet', 'Assalamu Alaikum, '+newName+' 👋');
  notif('Name Updated', 'Your name has been changed to '+newName, '✏️');
}
function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light'); }
function applyTheme(t) { document.documentElement.setAttribute('data-theme',t); ss('theme',t); el('thIco').textContent=t==='dark'?'🌙':'☀️'; }

// ═══════════════════════════════════════════════════
//  DASHBOARD BAR — shows start time + end time
// ═══════════════════════════════════════════════════
function renderDashBar() {
  const log=getLog(), bar=el('dashBar'); if(!bar) return;
  const now=new Date(), nm=now.getHours()*60+now.getMinutes();
  bar.innerHTML='';
  PRAYERS.forEach(p=>{
    const pd=log[p], t=PT[p], endT=PT[p+'End']||'--:--';
    const pm=toMins(t);
    const isCur=pm<=nm&&nm<pm+75;
    const st=pStatus(pd,p);
    const div=document.createElement('div');
    div.className='pc5'
      +(isCur?' cur':'')
      +(st.cls==='done'?' done':st.cls==='missed'?' missed':st.cls==='partial'?' partial':'');
    div.onclick=()=>openPD(p,TK());
    div.innerHTML=`
      <div class="pc5name">${PICO[p]} ${p}</div>
      <div class="pc5time">${ampm(t)}</div>
      <div class="pc5end">ends ${ampm(endT)}</div>
      <div class="pc5checks">
        <div class="pchk${pd.fard?' on':''}" title="Fard">F</div>
        <div class="pchk${pd.sunnah_muakkada?' on':''}" title="Sunnah">S</div>
        <div class="pchk${pd.mosque?' on':''}" title="Mosque">M</div>
        ${p==='Isha'?`<div class="pchk${pd.witr?' on':''}" title="Witr">W</div>`:''}
      </div>
      <div class="pc5st ${st.cls}">${st.txt}</div>`;
    bar.appendChild(div);
  });
  // Update hero ring
  const comp=dayComp(log), circ=226.19;
  const ring=el('hring');
  if(ring) ring.style.strokeDashoffset=circ-(circ*(comp/100));
  sf('heroPct',comp+'%');
  updateSunriseSunset();
}

// ═══════════════════════════════════════════════════
//  MONTHLY PROGRESS WIDGET
// ═══════════════════════════════════════════════════
function renderMonthProgress() {
  const wrap=el('monthProgressWrap'); if(!wrap) return;
  const mp=calcMonthProgress(), now=new Date();
  wrap.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-weight:700;font-size:.88rem">${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})} Progress</span>
      <span style="color:var(--gold);font-weight:700">${mp.avgScore}% avg</span>
    </div>
    <div class="month-pbar"><div class="month-pfill" style="width:${mp.avgScore}%"></div></div>
    <div class="month-stats">
      <div class="month-stat"><div class="msv">${mp.perfectDays}</div><div class="msk">Perfect Days</div></div>
      <div class="month-stat"><div class="msv">${mp.fardRate}%</div><div class="msk">Fard Rate</div></div>
      <div class="month-stat"><div class="msv">${mp.mosqueRate}%</div><div class="msk">Mosque Rate</div></div>
    </div>
    <div class="month-days-note">
      ${mp.daysCounted} / ${mp.totalDays} days recorded
    </div>`;
}

// ═══════════════════════════════════════════════════
//  PRAYER TRACKER PAGE — shows start + end times
// ═══════════════════════════════════════════════════
function ptToday() { el('ptDate').value=TK(); renderTracker(); }

function renderTracker() {
  const date=el('ptDate').value||TK(), log=getLog(date);
  const list=el('trackerList'); if(!list) return; list.innerHTML='';

  PRAYERS.forEach(p=>{
    const pd=log[p], t=PT[p]||'--:--', endT=PT[p+'End']||'--:--';
    const st=pStatus(pd,p), sc=pScore(pd,p);
    const info=SUNNAH_INFO[p]||{};
    const isAsr=p==='Asr';

    const card=document.createElement('div');
    card.className='pfc'+(st.cls==='done'?' done':st.cls==='partial'?' partial':st.cls==='missed'?' missed':'');

    const sunnahBadge=isAsr
      ?'<span class="sunnah-nafl"></span>'
      :'<span class="sunnah-muakkada"></span>';

    card.innerHTML=`
      <div class="pfctop">
        <div class="pfcname">${PICO[p]} ${p}</div>
        <div class="pfc-times">
          <div class="pfc-start">🕐 Start: <b>${ampm(t)}</b></div>
          <div class="pfc-end">🔚 End: <b>${ampm(endT)}</b></div>
        </div>
        <div class="pfcst ${st.cls}">${st.txt}</div>
      </div>
      <div class="pfcchecks">
        <div class="pfcc" onclick="qToggle('${date}','${p}','fard')">
          <div class="pfcbox${pd.fard?' on':pd.missed?' ms':''}">
            <div class="ico">🕋</div><div>Fard</div>
          </div>
        </div>
        <div class="pfcc" ${isAsr?'title="Asr Sunnah is Nafl — not scored"':'onclick="qToggle(\''+date+'\',\''+p+'\',\'sunnah_muakkada\')"'}>
          <div class="pfcbox${pd.sunnah_muakkada?' on':''}${isAsr?' disabled':''}">
            <div class="ico">☀️</div><div>Sunnah${sunnahBadge}</div>
          </div>
        </div>
        <div class="pfcc" onclick="qToggle('${date}','${p}','mosque')">
          <div class="pfcbox${pd.mosque?' on':''}">
            <div class="ico">🕌</div><div>Mosque</div>
          </div>
        </div>
        <div class="pfcc" onclick="qToggle('${date}','${p}','ontime')">
          <div class="pfcbox${pd.ontime?' on':''}">
            <div class="ico">⏰</div><div>On-Time</div>
          </div>
        </div>
        ${p==='Isha'?`
        <div class="pfcc" onclick="qToggle('${date}','${p}','witr')">
          <div class="pfcbox${pd.witr?' on':''}">
            <div class="ico">🌙</div>
            <div>Witr<span class="witr-badge">Wajib</span></div>
          </div>
        </div>`:''}
      </div>
      <div class="khrow">
        <span style="font-size:.75rem;color:var(--muted)">Khushu:</span>
        ${[{e:'😶',v:1},{e:'🙂',v:2},{e:'😌',v:3},{e:'✨',v:4}].map(k=>`
          <div class="khbtn${pd.khushu===k.v?' on':''}" onclick="qKhushu('${date}','${p}',${k.v})" title="${['Weak','Average','Good','Excellent'][k.v-1]}">${k.e}</div>
        `).join('')}
        <span style="font-size:.68rem;color:var(--muted);margin-left:4px">
          ${pd.khushu>0?['Weak','Average','Good','Excellent'][pd.khushu-1]:''}
        </span>
      </div>
      <div class="pscchip">Score: <b>${sc}/100</b>
        ${isAsr?'<span style="font-size:.67rem;color:var(--muted)"></span>':''}
        ${sc===100?'🌟':sc>=60?'⭐':sc>0?'📈':''}
      </div>`;
    list.appendChild(card);

    const mrow=document.createElement('div');
    mrow.className='missed-btn';
    const mb=document.createElement('button');
    mb.className=pd.missed?'is-missed':'';
    mb.textContent=pd.missed?'✗ Missed — Undo':'Mark as Missed';
    mb.onclick=()=>toggleMissed(date,p);
    mrow.appendChild(mb); list.appendChild(mrow);
  });
}

function qToggle(date,prayer,key) {
  const log=getLog(date);
  if(key==='fard'&&log[prayer].missed) log[prayer].missed=false;
  log[prayer][key]=!log[prayer][key];
  saveLog(date,log); renderTracker(); if(date===TK()) renderDashBar();
}
function qKhushu(date,prayer,val) {
  const log=getLog(date); log[prayer].khushu=log[prayer].khushu===val?0:val;
  saveLog(date,log); renderTracker();
}
function toggleMissed(date,prayer) {
  const log=getLog(date), was=log[prayer].missed;
  log[prayer].missed=!was;
  if(!was){
    log[prayer].fard=false; log[prayer].sunnah_muakkada=false; log[prayer].mosque=false;
    const q=gs('qaza',{}); q[prayer]=(q[prayer]||0)+1; ss('qaza',q);
    notif('Qaza Added',prayer+' added to Qaza list','❌');
  } else {
    const q=gs('qaza',{}); q[prayer]=Math.max(0,(q[prayer]||0)-1); ss('qaza',q);
  }
  saveLog(date,log); renderTracker(); loadQaza(); if(date===TK()) renderDashBar();
}

// ═══════════════════════════════════════════════════
//  PRAYER DETAIL MODAL
// ═══════════════════════════════════════════════════
let _pd={}, _pdDate=null, _pdPrayer=null;
function openPD(prayer,date) {
  _pdPrayer=prayer; _pdDate=date||TK();
  const log=getLog(_pdDate); _pd={...log[prayer]};
  el('pdTitle').textContent=PICO[prayer]+' '+prayer+' — '+_pdDate;
  el('witrRow').style.display=prayer==='Isha'?'block':'none';
  refreshPDUI(); el('pdMo').classList.add('open');
}
function closePD() { el('pdMo').classList.remove('open'); }
function refreshPDUI() {
  el('pd-fard').classList.toggle('active',  !!_pd.fard);
  el('pd-sunnah').classList.toggle('active',!!_pd.sunnah_muakkada);
  el('pd-mosque').classList.toggle('active',!!_pd.mosque);
  el('pd-ontime').classList.toggle('active',!!_pd.ontime);
  [1,2,3,4].forEach(i=>el('k'+i).classList.toggle('active',_pd.khushu===i));
  const wt=el('witrT'); if(wt) wt.classList.toggle('on',!!_pd.witr);
  sf('pdScore',pScore(_pd,_pdPrayer)+'%');
}
function tPD(k) {
  if(k==='sunnah') k='sunnah_muakkada';
  _pd[k]=!_pd[k]; if(k==='fard'&&_pd.fard) _pd.missed=false; refreshPDUI();
}
function setKh(v) { _pd.khushu=_pd.khushu===v?0:v; refreshPDUI(); }
function markMissedPD() {
  _pd.missed=true; _pd.fard=false; _pd.sunnah_muakkada=false; _pd.mosque=false;
  const log=getLog(_pdDate); log[_pdPrayer]={..._pd}; saveLog(_pdDate,log);
  const q=gs('qaza',{}); q[_pdPrayer]=(q[_pdPrayer]||0)+1; ss('qaza',q);
  closePD(); renderDashBar(); loadQaza();
  notif('Qaza Added',_pdPrayer+' missed → Qaza','❌');
}
function savePD() {
  _pd.missed=false; const log=getLog(_pdDate); log[_pdPrayer]={..._pd}; saveLog(_pdDate,log);
  closePD(); renderDashBar();
  if(el('pg-prayers').classList.contains('active')) renderTracker();
  notif('Saved','JazakAllah Khair! '+_pdPrayer+' logged.','✅');
}

// ═══════════════════════════════════════════════════
//  RECOMPUTE
// ═══════════════════════════════════════════════════
function recompute() { updateStreaks(); updateStats(); renderScore(false); updateQzBadge(); renderMonthProgress(); }

function updateStreaks() {
  const logs=allLogs(), sorted=Object.keys(logs).sort();
  let fS=0,fjS=0,mS=0,oS=0;
  for(let i=sorted.length-1;i>=0;i--){const d=logs[sorted[i]];if(PRAYERS.every(p=>d[p]&&d[p].fard&&!d[p].missed))fS++;else break;}
  for(let i=sorted.length-1;i>=0;i--){const d=logs[sorted[i]];if(d.Fajr&&d.Fajr.fard&&!d.Fajr.missed)fjS++;else break;}
  for(let i=sorted.length-1;i>=0;i--){const d=logs[sorted[i]];if(d&&PRAYERS.some(p=>d[p]&&d[p].mosque))mS++;else break;}
  for(let i=sorted.length-1;i>=0;i--){
    const d=logs[sorted[i]], done=PRAYERS.filter(p=>d[p]&&d[p].fard&&!d[p].missed);
    if(done.length>0&&done.every(p=>d[p].ontime))oS++;else break;
  }
  const bF=Math.max(gs('bFard',0),fS),bFj=Math.max(gs('bFajr',0),fjS),bM=Math.max(gs('bMosque',0),mS),bO=Math.max(gs('bOntime',0),oS);
  ss('bFard',bF);ss('bFajr',bFj);ss('bMosque',bM);ss('bOntime',bO);
  sf('sFard',fS);sf('bFard','Best: '+bF);sf('sFajr',fjS);sf('bFajr','Best: '+bFj);
  sf('sMosque',mS);sf('bMosque','Best: '+bM);sf('sOntime',oS);sf('bOntime','Best: '+bO);
}

function updateStats() {
  const wk=calcPeriodStats(7), mo=calcPeriodStats(30);
  sf('stWk',wk.avgScore+'%'); sf('stMo',mo.avgScore+'%'); sf('stMs',mo.mosqueRate+'%');
  const q=gs('qaza',{}); sf('stQz',Object.values(q).reduce((a,b)=>a+b,0));
}

// ═══════════════════════════════════════════════════
//  COUNTDOWN
// ═══════════════════════════════════════════════════
function startCD() {
  function tick(){
    const now=new Date(), nm=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
    let next=null,nextM=99999;
    for(const p of PRAYERS){const pm=toMins(PT[p]);if(pm>nm&&pm<nextM){nextM=pm;next=p;}}
    if(!next){next=PRAYERS[0];nextM=toMins(PT[PRAYERS[0]])+1440;}
    sf('nextN',next); sf('nextT',ampm(PT[next]));
    let diff=Math.max(0,(nextM-nm)*60);
    const h=Math.floor(diff/3600);diff%=3600;
    const m=Math.floor(diff/60),s=Math.floor(diff%60);
    sf('cdEl',String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'));
  }
  tick(); setInterval(tick,1000);
}

// ═══════════════════════════════════════════════════
//  QUOTES
// ═══════════════════════════════════════════════════
let qI=0;
function rotateQ(){const q=QUOTES[qI%QUOTES.length];sf('qTxt',q.t);sf('qSrc','— '+q.s);qI++;setTimeout(rotateQ,12000);}

// ═══════════════════════════════════════════════════
//  HISTORY CALENDAR
// ═══════════════════════════════════════════════════
let calY=new Date().getFullYear(), calM=new Date().getMonth();
function initCal()  { renderCal(); }
function calPrev()  { calM--;if(calM<0){calM=11;calY--;} renderCal(); }
function calNext()  { calM++;if(calM>11){calM=0;calY++;} renderCal(); }
function renderCal() {
  const logs=allLogs();
  sf('calTitle',new Date(calY,calM,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}));
  const grid=el('calGrid'); if(!grid) return; grid.innerHTML='';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{const l=document.createElement('div');l.className='caldlbl';l.textContent=d;grid.appendChild(l);});
  const first=new Date(calY,calM,1).getDay(),dim=new Date(calY,calM+1,0).getDate(),tod=TK();
  for(let i=0;i<first;i++){const e=document.createElement('div');e.className='calday empty';grid.appendChild(e);}
  for(let d=1;d<=dim;d++){
    const key=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const log=logs[key],comp=log?dayComp(log):null;
    let cls='none';
    if(comp===100)cls='full';else if(comp>0)cls='partial';else if(log&&PRAYERS.some(p=>log[p]&&log[p].missed))cls='mday';
    const div=document.createElement('div');
    div.className='calday '+cls+(key===tod?' today':'');
    div.innerHTML=`<div class="dn">${d}</div><div class="dd"></div>`;
    div.onclick=()=>showHistDet(key);
    grid.appendChild(div);
  }
}
function showHistDet(dateStr){
  const log=allLogs()[dateStr],det=el('histDet'); if(!det) return;
  if(!log){det.innerHTML='<div class="card" style="text-align:center;color:var(--muted);padding:22px">No data for '+dateStr+'</div>';return;}
  const comp=dayComp(log);
  let html=`<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px">
    <b style="font-family:Cormorant Garamond,'Amiri',serif;font-size:1.05rem">${dateStr}</b>
    <b style="color:var(--gold)">${comp}% Complete</b>
  </div><div style="display:flex;flex-direction:column;gap:8px">`;
  PRAYERS.forEach(p=>{
    const pd=log[p],sc=pScore(pd,p),st=pStatus(pd,p);
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--surf2);border-radius:9px">
      <span style="font-family:Cormorant Garamond,'Amiri',serif;color:var(--gold)">${PICO[p]} ${p}</span>
      <div style="display:flex;gap:5px;align-items:center">
        ${pd.fard?'<span style="color:var(--em);font-size:.72rem">✓Fard</span>':''}
        ${pd.sunnah_muakkada?'<span style="color:var(--gold);font-size:.72rem">✓Sunnah</span>':''}
        ${pd.mosque?'<span style="color:var(--em);font-size:.72rem">🕌</span>':''}
        ${pd.witr?'<span style="color:#e91e63;font-size:.72rem">🌙Witr</span>':''}
      </div>
      <span style="font-size:.76rem;padding:3px 9px;border-radius:7px;
        background:${st.cls==='done'?'rgba(0,179,126,.2)':st.cls==='missed'?'rgba(220,50,50,.2)':'rgba(255,255,255,.05)'};
        color:${st.cls==='done'?'var(--em)':st.cls==='missed'?'#ff6b6b':'var(--gold)'}">${sc}%</span>
    </div>`;
  });
  html+='</div></div>'; det.innerHTML=html;
}

// ═══════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════
let period=7, cB, cP, cL;
function setPeriod(d,btn){period=d;document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');initCharts(d);}
function initCharts(days){
  const logs=allLogs(),now=new Date(),today=TK();
  const lbls=[],dData=[],pcnt={Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0};
  let fT=0,fD=0,sD=0,mD=0,kS=0,kC=0;
  for(let i=days-1;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);const key=DK(d);
    lbls.push(days<=30?d.getDate()+'':d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    if(key>today){dData.push(null);continue;}
    const log=logs[key];
    if(log){
      dData.push(dayComp(log));
      PRAYERS.forEach(p=>{fT++;if(log[p]&&log[p].fard&&!log[p].missed){fD++;pcnt[p]++;if(log[p].sunnah_muakkada&&SUNNAH_INFO[p].type==='muakkada')sD++;if(log[p].mosque)mD++;if(log[p].khushu>0){kS+=log[p].khushu;kC++;}}});
    } else dData.push(null);
  }
  const pct=n=>fT?Math.round(n/fT*100)+'%':'–', pctD=n=>fD?Math.round(n/fD*100)+'%':'–';
  sf('aFard',pct(fD));sf('aSun',pctD(sD));sf('aMos',pctD(mD));sf('aKh',kC?(kS/kC).toFixed(1):'-');
  const co={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a99bb',font:{family:'Jost',size:11}}}}};
  const grd={color:'rgba(255,255,255,.04)'},tk={color:'#8a99bb',font:{family:'Jost',size:10}};
  if(cB)cB.destroy();
  cB=new Chart(el('cBar'),{type:'bar',data:{labels:lbls,datasets:[{label:'Daily %',data:dData,backgroundColor:'rgba(212,168,67,.55)',borderColor:'#d4a843',borderWidth:2,borderRadius:5}]},options:{...co,scales:{x:{grid:grd,ticks:tk},y:{grid:grd,ticks:{...tk,callback:v=>v+'%'},min:0,max:100}}}});
  if(cP)cP.destroy();
  cP=new Chart(el('cPie'),{type:'doughnut',data:{labels:PRAYERS,datasets:[{data:Object.values(pcnt),backgroundColor:['#d4a843','#00b37e','#4fc3f7','#e91e63','#7c5cbf'],borderWidth:0}]},options:{...co,cutout:'65%'}});
  if(cL)cL.destroy();
  const ma=dData.map((_,i,a)=>{const sl=a.slice(Math.max(0,i-6),i+1).filter(v=>v!==null);return sl.length?Math.round(sl.reduce((x,y)=>x+y)/sl.length):null;});
  cL=new Chart(el('cLine'),{type:'line',data:{labels:lbls,datasets:[{label:'Daily',data:dData,borderColor:'rgba(79,195,247,.5)',backgroundColor:'rgba(79,195,247,.05)',fill:true,tension:.4,pointRadius:2},{label:'7-day avg',data:ma,borderColor:'#00b37e',backgroundColor:'transparent',tension:.4,pointRadius:0,borderWidth:2}]},options:{...co,scales:{x:{grid:grd,ticks:tk},y:{grid:grd,ticks:{...tk,callback:v=>v+'%'},min:0,max:100}}}});
}

// ═══════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════
function renderScore(animate){
  const logs=allLogs(),now=new Date();
  let fT=0,fD=0,oD=0,mD=0,sD=0;
  for(let i=0;i<7;i++){
    const d=new Date(now);d.setDate(d.getDate()-i);const log=logs[DK(d)];if(!log)continue;
    PRAYERS.forEach(p=>{fT++;if(log[p]&&log[p].fard&&!log[p].missed){fD++;if(log[p].ontime)oD++;if(log[p].mosque)mD++;if(log[p].sunnah_muakkada&&SUNNAH_INFO[p].type==='muakkada')sD++;}});
  }
  const fP=fT?fD/fT:0,oP=fD?oD/fD:0,mP=fD?mD/fD:0,sP=fD?sD/fD:0;
  let avgPg=0;for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);avgPg+=gs('today_pages_'+DK(d),0);}avgPg/=7;
  let avgDh=0;for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);const dc=gs('dhikr_today_'+DK(d),{});avgDh+=Object.values(dc).reduce((a,b)=>a+b,0);}avgDh/=7;
  const score=Math.round(fP*35+oP*20+mP*20+sP*10+Math.min(avgPg,10)/10*10+Math.min(avgDh,100)/100*5);
  sf('sbScore',score+'%');sf('bigNum',score);sf('schip','Score: '+score+'%');
  const grade=score>=90?'🌟 Excellent':score>=75?'✨ Very Good':score>=60?'👍 Good':score>=40?'📈 Improving':'🤲 Keep Striving';
  sf('scGrade',grade);
  if(animate){const c=477.52;el('bigRing').style.strokeDashoffset=c-(c*(score/100));}
  sf('sdFard',Math.round(fP*100)+'%');sf('sdOnt',Math.round(oP*100)+'%');sf('sdMos',Math.round(mP*100)+'%');
  sf('sdQrn',avgPg.toFixed(1));sf('sdDh',Math.round(avgDh));sf('sdSun',Math.round(sP*100)+'%');
}

// ═══════════════════════════════════════════════════
//  DHIKR (Salawat renamed to Durood)
// ═══════════════════════════════════════════════════
let dhCur='subhan', dhCnts={};
function initDh(){dhCnts=gs('dhikr_today_'+TK(),{});DHLIST.forEach(d=>{if(!dhCnts[d.k])dhCnts[d.k]=0;});renderDhPre();updDhUI();renderDhHist();}
function renderDhPre(){
  const w=el('dhPre');if(!w)return;w.innerHTML='';
  DHLIST.forEach(d=>{
    const div=document.createElement('div');div.className='dhpr'+(dhCur===d.k?' active':'');
    div.onclick=()=>{dhCur=d.k;renderDhPre();updDhUI();};
    div.innerHTML=`<div class="ar">${d.ar}</div><div class="en">${d.en}</div><div class="cnt">${dhCnts[d.k]||0}</div>`;
    w.appendChild(div);
  });
}
function tapDh(){dhCnts[dhCur]=(dhCnts[dhCur]||0)+1;ss('dhikr_today_'+TK(),dhCnts);updDhUI();renderDhPre();if(navigator.vibrate)navigator.vibrate(25);}
function updDhUI(){sf('dhNum',dhCnts[dhCur]||0);updDhBar();}
function updDhBar(){const cnt=dhCnts[dhCur]||0,t=parseInt(el('dhTgt')?.value||33);el('dhBar').style.width=Math.min(100,Math.round(cnt/t*100))+'%';}
function resetDh(){dhCnts[dhCur]=0;ss('dhikr_today_'+TK(),dhCnts);updDhUI();renderDhPre();}
function undoDh(){if(dhCnts[dhCur]>0){dhCnts[dhCur]--;ss('dhikr_today_'+TK(),dhCnts);updDhUI();renderDhPre();}}
function saveDhSession(){
  const pre=DHLIST.find(d=>d.k===dhCur),ses=gs('dhikr_sessions',[]);
  ses.unshift({date:TK(),time:new Date().toLocaleTimeString(),dhikr:pre.en,count:dhCnts[dhCur]||0});
  ss('dhikr_sessions',ses.slice(0,30));renderDhHist();
  notif('Session Saved',pre.en+' × '+(dhCnts[dhCur]||0),'📿');
}
function renderDhHist(){
  const w=el('dhHist');if(!w)return;
  w.innerHTML=gs('dhikr_sessions',[]).slice(0,5).map(s=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--surf2);border-radius:9px;margin-bottom:6px">
      <div><div style="font-weight:600;font-size:.85rem">${s.dhikr}</div>
      <div style="font-size:.68rem;color:var(--muted)">${s.date} • ${s.time}</div></div>
      <div style="font-size:1.05rem;font-weight:800;color:var(--gold)">${s.count}</div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════
//  QURAN
// ═══════════════════════════════════════════════════
const QURAN_TOTAL=604;
function initJuz(){
  const juz=gs('juz_data',Array(30).fill(0)),grid=el('juzGrid');if(!grid)return;grid.innerHTML='';
  juz.forEach((v,i)=>{
    const div=document.createElement('div');div.className='juzbox'+(v===2?' done':v===1?' half':'');
    div.title='Juz '+(i+1)+': '+(v===2?'Complete':v===1?'Partial':'Not started');div.textContent=i+1;
    div.onclick=()=>{juz[i]=(v+1)%3;ss('juz_data',juz);initJuz();};grid.appendChild(div);
  });
  const total=gs('total_pages',0),todPg=gs('today_pages_'+TK(),0);
  sf('pgRead',total+' pages read');
  const pgBar=el('pgBar');if(pgBar)pgBar.style.width=Math.min(100,(total/QURAN_TOTAL)*100)+'%';
  sf('todPg',todPg);sf('qGoal',gs('daily_quran_goal',5));
  const resetNote=el('quranResetNote');if(resetNote)resetNote.style.display=total>580?'block':'none';
  const comp=gs('quran_completions',0);sf('qCompletions',comp);
}
function addPg(){
  const inp=el('pgIn'), v=parseInt(inp.value)||0;
  if(v<=0) return;
  let total   = gs('total_pages',0) + v;
  const todPg = gs('today_pages_'+TK(),0) + v;
  // Handle one or more full completions (e.g. user adds 800 pages)
  if(total >= QURAN_TOTAL){
    const newCompletions = Math.floor(total / QURAN_TOTAL);
    const prevCompletions= gs('quran_completions',0);
    const allCompletions = prevCompletions + newCompletions;
    ss('quran_completions', allCompletions);
    total = total % QURAN_TOTAL;          // remainder becomes new progress
    ss('juz_data', Array(30).fill(0));    // reset juz grid
    const msg = newCompletions > 1
      ? 'MashaAllah! '+newCompletions+' full Qurans completed! Total: '+allCompletions+'x. Reset to '+total+' pages.'
      : 'MashaAllah! Full Quran completed ('+allCompletions+'x)! Reset to '+total+' pages.';
    notif('Quran Complete! 🎉', msg, '📖');
  }
  ss('total_pages', total);
  ss('today_pages_'+TK(), todPg);
  inp.value='';
  initJuz();
  if(el('pg-quran').classList.contains('active')) initQuranChart();
}
function setQGoal(){const g=prompt('Daily Quran goal (pages):');if(g&&+g>0){ss('daily_quran_goal',+g);initJuz();}}
let cQ;
function initQuranChart(){
  const ctx=el('cQuran');if(!ctx)return;
  const labels=[],data=[],now=new Date();
  for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);labels.push(d.getDate()+'');data.push(gs('today_pages_'+DK(d),0));}
  if(cQ){cQ.destroy();cQ=null;}
  cQ=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Pages Read',data,backgroundColor:'rgba(79,195,247,.6)',borderColor:'#4fc3f7',borderWidth:2,borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#8a99bb',font:{family:'Jost',size:10}}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#8a99bb',font:{family:'Jost',size:10}},beginAtZero:true}}}});
}

// ═══════════════════════════════════════════════════
//  GOALS
// ═══════════════════════════════════════════════════
function openGoalM(){el('goalMo').classList.add('open');}
function closeGoalM(){el('goalMo').classList.remove('open');}
function saveGoal(){
  const title=el('gT').value.trim(),target=parseInt(el('gN').value)||1,cat=el('gC').value;
  if(!title)return;
  const goals=gs('goals',[]);goals.push({id:Date.now(),title,target,cat,progress:0,created:TK()});
  ss('goals',goals);closeGoalM();el('gT').value='';el('gN').value='';loadGoals();notif('Goal Created',title,'🎯');
}
function loadGoals(){
  const goals=gs('goals',[]),w=el('goalsList');if(!w)return;
  if(!goals.length){w.innerHTML='<div style="text-align:center;color:var(--muted);padding:46px">No goals yet 🎯</div>';return;}
  w.innerHTML='';
  goals.forEach((g,i)=>{
    const pct=Math.min(100,Math.round(g.progress/g.target*100));
    const div=document.createElement('div');div.className='gi';
    div.innerHTML=`<div class="gico">${GICO[g.cat]||'🎯'}</div>
      <div class="ginfo"><div class="gtitle">${g.title}</div>
      <div class="gmeta">${g.progress} / ${g.target} • ${g.cat} • since ${g.created}</div>
      <div class="gpbar"><div class="gpfill" style="width:${pct}%;background:${GCOL[g.cat]}"></div></div>
      <div class="gpct">${pct}% ${pct>=100?'🏆 Completed!':pct>50?'⭐':''}</div></div>
      <div class="goal-actions">
        <button onclick="updGoal(${i},1)"  class="smb" style="padding:5px 10px">+1</button>
        <button onclick="updGoal(${i},10)" class="smb" style="padding:5px 10px">+10</button>
        <button onclick="delGoal(${i})"    class="smb" style="padding:5px 9px;color:#ff6b6b">✕</button>
      </div>`;
    w.appendChild(div);
  });
}
function updGoal(i,inc){const goals=gs('goals',[]);goals[i].progress=Math.min(goals[i].target,goals[i].progress+inc);ss('goals',goals);loadGoals();if(goals[i].progress>=goals[i].target)notif('Goal Achieved!',goals[i].title+' 🏆','🏆');}
function delGoal(i){const goals=gs('goals',[]);goals.splice(i,1);ss('goals',goals);loadGoals();}

// ═══════════════════════════════════════════════════
//  QAZA
// ═══════════════════════════════════════════════════
function loadQaza(){
  const q=gs('qaza',{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0,Witr:0});
  const grid=el('qzGrid');if(!grid)return;grid.innerHTML='';
  [...PRAYERS,'Witr'].forEach(p=>{
    const cnt=q[p]||0,div=document.createElement('div');div.className='qzcard';
    div.innerHTML=`<div class="qzname">${p}</div><div class="qzcount">${cnt}</div>
      <div class="qzctrl">
        <button class="qzbtn" onclick="chQz('${p}',-1)" title="Mark one completed">–</button>
        <button class="qzbtn" onclick="chQz('${p}', 1)" title="Add missed prayer">+</button>
      </div>
      <div class="qz-clear">${cnt>0?cnt+' remaining':'Clear ✓'}</div>`;
    grid.appendChild(div);
  });
  sf('totQz',Object.values(q).reduce((a,b)=>a+b,0));updateQzBadge();
}
function chQz(p,d){const q=gs('qaza',{});q[p]=Math.max(0,(q[p]||0)+d);ss('qaza',q);loadQaza();}
function updateQzBadge(){const total=Object.values(gs('qaza',{})).reduce((a,b)=>a+b,0);sf('qzBadge',total);sf('stQz',total);}

// ═══════════════════════════════════════════════════
//  SPECIAL MODES
// ═══════════════════════════════════════════════════
function loadModes(){
  const m=gs('modes',{});
  const fb=el('fridayBtn'),rb=el('ramadanBtn');
  if(fb){fb.textContent=m.friday?'Active':'Enable';fb.classList.toggle('on',!!m.friday);}
  if(rb){rb.textContent=m.ramadan?'Active':'Enable';rb.classList.toggle('on',!!m.ramadan);}
  ['kahf','juma','salawat','dua','fast','taraweeh','sahoor','charity'].forEach(k=>{const e=el('tm-'+k);if(e)e.classList.toggle('on',!!(m.items&&m.items[k]));});
  const banner=el('ramadanBanner');if(banner)banner.classList.toggle('show',!!m.ramadan);
  renderRamDays();
}
function toggleMode(m){const modes=gs('modes',{});modes[m]=!modes[m];ss('modes',modes);loadModes();}
function toggleMI(k){const modes=gs('modes',{items:{}});if(!modes.items)modes.items={};modes.items[k]=!modes.items[k];ss('modes',modes);loadModes();}
function renderRamDays(){
  const w=el('ramDays');if(!w)return;const comp=gs('ramadan_days',[]);w.innerHTML='';
  for(let i=1;i<=30;i++){
    const done=comp.includes(i),div=document.createElement('div');
    div.className='ramday'+(done?' ramday-done':'');div.textContent=i;div.title='Day '+i+(done?' — Completed':'');
    div.onclick=()=>{const idx=comp.indexOf(i);if(idx>-1)comp.splice(idx,1);else comp.push(i);ss('ramadan_days',comp);renderRamDays();};
    w.appendChild(div);
  }
}

// ═══════════════════════════════════════════════════
//  SETTINGS PAGE
// ═══════════════════════════════════════════════════
function renderSettings(){
  const m = getMadhab();
  const s1 = el('madhabSelect');     if(s1) s1.value = m;
  const s2 = el('madhabSelectPage'); if(s2) s2.value = m;
  // Show user name in rename field
  const u = gs('currentUser',{});
  const nameField = el('renameInput');
  if(nameField) nameField.value = u.name||'';
}

// ═══════════════════════════════════════════════════
//  EXPORT / IMPORT
// ═══════════════════════════════════════════════════
function exportD(){
  const data={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);try{data[k]=JSON.parse(localStorage.getItem(k));}catch{data[k]=localStorage.getItem(k);}}
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='prayer-time-backup-'+TK()+'.json';a.click();
  notif('Exported','Backup saved successfully','💾');
}
function importD(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{const d=JSON.parse(ev.target.result);Object.entries(d).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));notif('Imported','Data restored. Refreshing...','📤');setTimeout(()=>location.reload(),1500);}
      catch{notif('Error','Invalid backup file','⚠️');}
    };r.readAsText(f);
  };inp.click();
}

// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════
function notif(title,body,icon='☪'){
  const div=document.createElement('div');div.className='notif';
  div.innerHTML=`<div class="ntitle">${icon} ${title}</div><div class="nbody">${body}</div>`;
  document.body.appendChild(div);
  setTimeout(()=>{div.style.animation='sir .4s ease reverse';setTimeout(()=>div.remove(),400);},4200);
}
function reqNotif(){
  if('Notification' in window)Notification.requestPermission().then(p=>{
    p==='granted'?notif('Notifications On','Prayer reminders enabled','🔔'):notif('Notifications','Allow in browser settings','ℹ️');
  });
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  locInfo=gs('location',null);
  const ptDate=el('ptDate');if(ptDate)ptDate.value=TK();
  init();
});
