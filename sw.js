/* Prayer Time service worker: works offline. Bump V when you update files. */
const V='pt-v7',SHELL=['./','index.html','fonts.css','style.css','upgrade.css','script.js','upgrade.js','noor.js','future.js','world.js','explore.js','adhan.js','icons.js','logo.svg','manifest.webmanifest','icon-192.png','icon-512.png','fonts/cinzel-latin-600-normal.woff2','fonts/cinzel-latin-700-normal.woff2','fonts/amiri-arabic-400-normal.woff2','fonts/amiri-arabic-700-normal.woff2','fonts/cormorant-garamond-latin-500-normal.woff2','fonts/cormorant-garamond-latin-600-normal.woff2','fonts/cormorant-garamond-latin-700-normal.woff2','fonts/jost-latin-300-normal.woff2','fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2','fonts/jost-latin-700-normal.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.pathname.includes('/audio/'))return; // audio is streamed and stored on the device by the app itself
  
  if(u.hostname==='api.aladhan.com'||u.hostname==='nominatim.openstreetmap.org'){
    e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(h=>h.put(r,c));return x}).catch(()=>caches.match(r)));return}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>{
    const n=fetch(r).then(x=>{if(x&&x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x}).catch(()=>m);return m||n}));
});
