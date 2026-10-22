/* Prayer Time ADHAN layer: default adhan files, built-in tones, user uploads, a separate Fajr adhan, per-prayer switches and a Stop bar.
   Rings through the app's existing prayer-time reminder (upgrade.js calls PTSound.play(prayer)). */
(()=>{
'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PR=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const DEFAULTS={vol:85,fade:4,on:{Fajr:1,Dhuhr:1,Asr:1,Maghrib:1,Isha:1},adhan:'default',fajr:'default',remind:'gentle',names:{}};
const cfg=()=>{const c=gs('snd2',null)||{};return{...DEFAULTS,...c,on:{...DEFAULTS.on,...(c.on||{})},names:{...(c.names||{})}}};
const save=c=>ss('snd2',c);
/* carry over the older single-sound setting once */
(()=>{if(gs('snd2',null)!=null)return;const o=gs('snd',null);if(!o)return;const c=cfg();c.vol=o.vol||85;if(o.mode==='adhan'){c.adhan='file';c.fajr='file'}if(o.mode==='off'){PR.forEach(p=>c.on[p]=0)}save(c)})();

/* ── storage for uploaded files (same IndexedDB the app already uses) ── */
let idb=null;
const db=()=>idb||(idb=new Promise((res,rej)=>{const r=indexedDB.open('pt_future',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const dbPut=async(k,v)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('f','readwrite');t.objectStore('f').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})};
const dbGet=async k=>{try{const d=await db();return await new Promise(res=>{const r=d.transaction('f').objectStore('f').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})}catch{return null}};
const dbDel=async k=>{const d=await db();return new Promise(res=>{const t=d.transaction('f','readwrite');t.objectStore('f').delete(k);t.oncomplete=res})};

/* ── built-in tones (synthesised; the Fajr one is slower and softer) ── */
function note(c,out,type,f,t,a,d){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;o.connect(g);g.connect(out);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.1)}
const TONES={
  gentle:{name:'Gentle chime',dur:3.2,play:(c,o,t)=>[523.25,659.25,783.99].forEach((f,i)=>note(c,o,'sine',f,t+i*.28,.2,2.2))},
  bell:{name:'Temple bell',dur:6,play:(c,o,t)=>[[1,.5,5],[2.76,.28,3.5],[5.4,.16,2.4],[8.93,.08,1.6]].forEach(([r,a,d])=>note(c,o,'sine',440*r,t,a*.5,d))},
  harp:{name:'Soft harp',dur:5,play:(c,o,t)=>[523.25,587.33,659.25,783.99,880,783.99,659.25,587.33].forEach((f,i)=>note(c,o,'triangle',f,t+i*.3,.22,1.4))},
  dawn:{name:'Dawn chime',dur:9,play:(c,o,t)=>[349.23,440,523.25,698.46,880].forEach((f,i)=>{note(c,o,'sine',f,t+i*.9,.18,4);note(c,o,'triangle',f/2,t+i*.9,.07,5)})}
};

/* ── playback ── */
let ac=null,cur=null,pending=null,unlocked=false,defs={};
function ctx(){ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume().catch(()=>{});return ac}
function unlock(){if(unlocked)return;unlocked=true;try{ctx()}catch{}status();if(pending&&Date.now()-pending.t<12e4){const p=pending.p;pending=null;play(p)}}
['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,unlock,{passive:true}));
async function defSrc(k){const b=await dbGet('def:'+k);return b&&b.blob?{blob:b.blob,label:defs[k]}:{url:defs[k],label:defs[k]}}
async function resolve(slot){
  const s=cfg()[slot];
  if(s==='default'){
    if(slot==='fajr'){if(defs.fajr)return defSrc('fajr');if(defs.adhan)return defSrc('adhan');return{tone:'dawn'}}
    if(slot==='adhan')return defs.adhan?defSrc('adhan'):{tone:'gentle'};
    return{tone:'gentle'}}
  if(s==='file'){const b=await dbGet(slot);if(b)return{blob:b,label:cfg().names[slot]||'your file'};return{tone:slot==='fajr'?'dawn':'gentle'}}
  if(s==='off')return null;
  return{tone:s};
}
async function play(p,opts={}){
  const c=cfg(),slot=opts.slot||(p==='Fajr'?'fajr':'adhan');
  if(!opts.preview&&slot!=='remind'&&!c.on[p])return;
  stop();const src=await resolve(slot);if(!src)return;
  const vol=c.vol/100*(opts.soft?.6:1);
  if(src.tone){try{const a=ctx(),out=a.createGain();out.gain.value=vol;out.connect(a.destination);const T=TONES[src.tone];T.play(a,out,a.currentTime+.05);
      cur={kind:'tone',out,a,p,slot,tone:src.tone,end:setTimeout(()=>stop(),T.dur*1000+300)};ring(p,slot,T.name)}catch{}return}
  const url=src.blob?URL.createObjectURL(src.blob):src.url,au=new Audio(url);au.preload='auto';au.volume=c.fade?0:clamp(vol,0,1);
  cur={kind:'file',au,url:src.blob?url:null,p,slot,src:url,label:src.label};
  try{await au.play()}catch{if(src.blob)URL.revokeObjectURL(url);cur=null;if(!opts.preview){pending={p,t:Date.now()};notif('Tap to hear the adhan','Your browser blocks sound until you click the page once.','🔇')}return}
  if(c.fade){const st=Date.now(),x=cur;x.fi=setInterval(()=>{const v=Math.min(1,(Date.now()-st)/(c.fade*1000));try{au.volume=clamp(v*vol,0,1)}catch{}if(v>=1)clearInterval(x.fi)},120)}
  au.onended=()=>stop();ring(p,slot,src.label||'');
}
function stop(){const x=cur;if(!x)return;cur=null;clearInterval(x.fi);clearTimeout(x.end);
  if(x.kind==='file'){try{x.au.pause()}catch{}if(x.url)URL.revokeObjectURL(x.url)}else{try{x.out.gain.setTargetAtTime(0,x.a.currentTime,.1)}catch{}}hideRing()}
function ring(p,slot,name){
  let b=$('ringBar');if(!b){b=document.createElement('div');b.id='ringBar';b.setAttribute('role','status');document.body.appendChild(b)}
  b.innerHTML=`<span class="rb-i">${window.PTIcon?PTIcon.svg(slot==='remind'?'bell':'building-mosque'):''}</span><span class="rb-t"><b>${slot==='remind'?'Prayer approaching':'Adhan · '+esc(p)}</b><small>${esc(name||'Playing')}</small></span><button class="smb" id="rbStop">Stop</button>`;
  requestAnimationFrame(()=>b.classList.add('show'));$('rbStop').onclick=stop;
}
function hideRing(){const b=$('ringBar');if(b)b.classList.remove('show')}
addEventListener('keydown',e=>{if(e.key==='Escape'&&cur)stop()});
window.PTSound={play:(p,o)=>play(p,o),stop,soft:()=>{if(cfg().remind!=='off')play('Dhuhr',{slot:'remind',soft:true,preview:true})},debug:()=>cur&&{kind:cur.kind,slot:cur.slot,p:cur.p,tone:cur.tone,label:cur.label}};

/* ── default adhan files placed next to the app (audio/adhan.mp3, audio/adhan-fajr.mp3) ── */
async function detect(){
  for(const [file,key] of [['adhan','adhan'],['adhan-fajr','fajr']])for(const e of['mp3','m4a','ogg','wav']){
    try{const r=await fetch(`audio/${file}.${e}`,{method:'HEAD',cache:'no-store'});if(r.ok&&!/text\/html/.test(r.headers.get('content-type')||'')){defs[key]=`audio/${file}.${e}`;break}}catch{}}
  for(const k of['adhan','fajr'])if(defs[k]){const have=await dbGet('def:'+k);if(!have||have.url!==defs[k]){try{const r=await fetch(defs[k]),b=await r.blob();await dbPut('def:'+k,{blob:b,url:defs[k]})}catch{}}}
  status();
}

/* ── settings card ── */
const SLOTS=[['adhan','Adhan','Dhuhr, Asr, Maghrib and Isha'],['fajr','Fajr adhan','A different call for Fajr'],['remind','Reminder before prayer','Plays when a prayer is approaching']];
function srcOptions(slot){return`<option value="default">Default</option>`+Object.entries(TONES).map(([k,t])=>`<option value="${k}">Built-in: ${t.name}</option>`).join('')+`<option value="file">My uploaded file</option><option value="off">Silent</option>`}
function desc(slot){
  const c=cfg();if(c[slot]!=='default')return '';
  if(slot==='adhan')return defs.adhan?`Default: recorded adhan (${esc(defs.adhan)}).`:'Default: built-in Gentle chime. Add audio/adhan.mp3 beside the app for a recorded adhan.';
  if(slot==='fajr')return defs.fajr?`Default: recorded Fajr adhan (${esc(defs.fajr)}).`:defs.adhan?'Default: the recorded adhan (add audio/adhan-fajr.mp3 for a Fajr-specific one).':'Default: built-in Dawn chime, slower and softer than the others.';
  return'';
}
function status(){
  const s=$('adStatus');if(s)s.textContent=unlocked?'Sound ready':'Tap the page once to enable sound';
  SLOTS.forEach(([k])=>{const d=$('add_'+k);if(d)d.textContent=desc(k)});
}
async function refreshFiles(){const c=cfg();for(const[k]of SLOTS){const f=await dbGet(k),n=$('adn_'+k),r=$('adr_'+k),sel=$('ads_'+k);if(!n)continue;n.textContent=f?`Uploaded: ${c.names[k]||'file'}`:'No file uploaded';r.style.display=f?'':'none';const o=sel.querySelector('option[value=file]');if(o)o.disabled=!f}}
function mkCard(){
  const pg=$('pg-settings');if(!pg||$('adhanCard'))return;const c=cfg();
  const d=document.createElement('div');d.id='adhanCard';d.className='card';d.style.marginBottom='16px';
  d.innerHTML=`<div class="ad-h"><b>🔔 Adhan and sounds</b><span id="adStatus" class="muted"></span></div>
   <div class="ad-pr" role="group" aria-label="Ring for these prayers">${PR.map(p=>`<button type="button" class="chip ad-chip" data-p="${p}" aria-pressed="${!!c.on[p]}">${p}</button>`).join('')}</div>
   <label class="setrow col"><span>Volume</span><input type="range" id="adVol" min="10" max="100"></label>
   <label class="setrow"><span>Fade in</span><select id="adFade">${[0,2,4,8].map(v=>`<option value="${v}">${v?v+' seconds':'Off'}</option>`).join('')}</select></label>
   ${SLOTS.map(([k,t,h])=>`<div class="ad-slot"><div class="ad-st"><b>${t}</b><small class="muted">${h}</small></div>
     <label class="setrow"><span>Sound</span><select id="ads_${k}">${srcOptions(k)}</select></label>
     <div class="ad-up"><label class="smb ad-file">Upload my own<input type="file" id="adf_${k}" accept="audio/*" hidden></label><span id="adn_${k}" class="muted"></span><button type="button" class="smb" id="adr_${k}">Remove my file</button><button type="button" class="smb" id="adp_${k}">Preview</button></div>
     <small class="muted" id="add_${k}"></small></div>`).join('')}
   <div class="setrow"><button type="button" class="smb" id="adStop">Stop sound</button></div>
   <p class="muted">The adhan rings at each prayer time while Prayer Time is open (or the installed app is running). Browsers need one tap on the page before they allow sound, and phones may pause background tabs. Use recordings you have the right to use. Your uploaded files stay on this device. If you run this site, put <code>audio/adhan.mp3</code> and <code>audio/adhan-fajr.mp3</code> beside <code>index.html</code> and every visitor gets them as the default.</p>`;
  const f=$('futCard');f?pg.insertBefore(d,f):pg.appendChild(d);
  $('adVol').value=c.vol;$('adFade').value=c.fade;SLOTS.forEach(([k])=>$('ads_'+k).value=c[k]);
  const upd=fn=>{const x=cfg();fn(x);save(x)};
  d.querySelectorAll('.ad-chip').forEach(b=>b.onclick=()=>{upd(x=>x.on[b.dataset.p]=x.on[b.dataset.p]?0:1);b.setAttribute('aria-pressed',!!cfg().on[b.dataset.p])});
  $('adVol').oninput=e=>upd(x=>x.vol=+e.target.value);$('adFade').onchange=e=>upd(x=>x.fade=+e.target.value);
  SLOTS.forEach(([k])=>{
    $('ads_'+k).onchange=e=>{upd(x=>x[k]=e.target.value);status()};
    $('adf_'+k).onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!/^audio\//.test(f.type)&&!/\.(mp3|m4a|ogg|wav|aac)$/i.test(f.name))return notif('Not an audio file','Choose an mp3, m4a, ogg or wav file.','⚠️');if(f.size>15*1048576)return notif('File too large','Please use a file under 15 MB.','⚠️');
      await dbPut(k,f);upd(x=>{x[k]='file';x.names[k]=f.name.slice(0,60)});$('ads_'+k).value='file';await refreshFiles();status();notif('Saved',esc(f.name)+' will be used for '+k+'.','🔊')};
    $('adr_'+k).onclick=async()=>{await dbDel(k);upd(x=>{x[k]=k==='remind'?'gentle':'default';delete x.names[k]});$('ads_'+k).value=cfg()[k];await refreshFiles();status();notif('Removed','Back to the default sound.','↩️')};
    $('adp_'+k).onclick=()=>play(k==='fajr'?'Fajr':'Dhuhr',{preview:true,slot:k});
  });
  $('adStop').onclick=stop;refreshFiles();status();
  // tidy the older single-sound controls
  ['sndMode','adhanF','fajrF','sndVol','sndTest'].forEach(i=>{const e=$(i);if(e){const r=e.closest('.setrow');(r||e).remove()}});
  const fc=$('futCard');if(fc)fc.querySelectorAll('p.muted').forEach(p=>{if(/right to use/.test(p.textContent))p.remove()});
  const rc=$('remCard');if(rc){const sp=rc.querySelector('.setrow span');if(sp&&/Chime/.test(sp.textContent))sp.textContent='Alert and adhan at prayer time';const t=$('remTest');if(t){t.textContent='Test adhan';t.onclick=()=>play('Dhuhr',{preview:true})}}
}
const _g=window.go;window.go=function(id,n){_g(id,n);if(id==='settings'){mkCard();refreshFiles();status()}};
mkCard();detect();
})();
