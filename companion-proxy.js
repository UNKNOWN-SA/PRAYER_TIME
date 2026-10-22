/* AI Companion proxy. Keeps your API key on the server, never in the web page.
   Run:  ANTHROPIC_API_KEY=sk-ant-... ALLOW_ORIGIN=http://localhost:8080 node companion-proxy.js
   Then paste  http://localhost:8787/ask  into the AI Companion page (Connect your AI server). Needs Node 18+. */
const http=require('http');
const KEY=process.env.ANTHROPIC_API_KEY,ORIGIN=process.env.ALLOW_ORIGIN||'*',PORT=process.env.PORT||8787,MODEL=process.env.MODEL||'claude-sonnet-5-5';
const SYSTEM=`You are a respectful assistant inside an Islamic prayer-time app. Be warm, brief and practical.
Cite the Quran or hadith collection by name and reference only when you are confident. When the main schools of thought differ, present the main views and name them, and say which school the user follows if given. Never issue a personal fatwa; for personal rulings recommend asking a qualified scholar. If unsure, say so plainly. Use the supplied context (madhab, city, today's prayer times) when it helps.`;
http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin',ORIGIN);res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  if(req.method!=='POST'||req.url!=='/ask'){res.writeHead(404);return res.end()}
  let body='';for await(const c of req)body+=c;if(body.length>2e5){res.writeHead(413);return res.end()}
  try{
    const{messages=[],context={}}=JSON.parse(body);
    const clean=messages.slice(-12).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,4000)}));
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body:JSON.stringify({model:MODEL,max_tokens:700,system:SYSTEM+'\nContext: '+JSON.stringify(context).slice(0,1500),messages:clean})});
    const j=await r.json();res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({reply:(j.content&&j.content.map(c=>c.text||'').join(''))||null,error:j.error&&j.error.message}));
  }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Server error'}))}
}).listen(PORT,()=>console.log('Companion proxy on http://localhost:'+PORT+'/ask'));
