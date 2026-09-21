// Isolated localhost audit only. No production storage or HUB files are touched.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const cache = new Map();
async function remote(url) {
  if (!cache.has(url)) { const r = await fetch(url); if (!r.ok) throw Error(`${r.status} ${url}`); cache.set(url, Buffer.from(await r.arrayBuffer())); }
  return cache.get(url);
}
const diagnostic = `<aside style="position:fixed;top:0;left:0;z-index:999999;background:#fff;color:#000;font:12px monospace;max-width:100%;padding:5px">
<button onclick="auditRead()">Relever CJ</button> <a href="/menu.html">Menu test</a> <a href="/garage.html">Garage test</a> <a href="/profil.html">Profil test</a> <a href="/cjajlkGames-V2-test/v2/#profil">Hub test</a>
<button onclick="Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));auditRead()">Masquer simulation</button>
<button onclick="delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));auditRead()">Reprendre visibilité</button>
<button onclick="document.hasFocus=()=>false;window.dispatchEvent(new Event('blur'));auditRead()">Perdre focus simulation</button>
<button onclick="delete document.hasFocus;window.dispatchEvent(new Event('focus'));auditRead()">Reprendre focus</button>
<pre id="auditResult" style="max-height:130px;overflow:auto;white-space:pre-wrap"></pre></aside>
<script>function auditRead(){let p=JSON.parse(localStorage.getItem('cjPlayerData')||'null');document.getElementById('auditResult').textContent=JSON.stringify({stats:p?.stats,ledger:p?.cjActivityV1,state:window.getGameState?.(),tracking:window.CJEngine?.isTracking(),scripts:[...document.scripts].map(s=>s.src).filter(s=>/cjAccount|cjEngine/.test(s))});}auditRead();</script>`;
const clock = `<!doctype html><meta charset="utf-8"><h1>Horloge contrôlée CJ — test local</h1>
<script>let auditNow=0;Object.defineProperty(performance,'now',{value:()=>auditNow});window.getGameState=()=>({running:true,paused:false});</script>
<script src="/shared/cjAccount.js"></script><script src="/shared/cjEngine.js"></script>
<button onclick="advance(5990)">599 secondes</button><button onclick="advance(10)">1 seconde</button><button onclick="location.reload()">Recharger</button>
<script>async function advance(n){CJEngine.tick(100,'velocity');await new Promise(r=>setTimeout(r,10));CJEngine.tick(100,'velocity');for(let i=0;i<n;i++){auditNow+=100;CJEngine.tick(100,'velocity');}CJEngine.suspend();auditRead();}</script>${diagnostic}`;
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost'), pathname=decodeURIComponent(url.pathname);
    let bytes;
    if(pathname==='/clock.html') bytes=Buffer.from(clock);
    else if(pathname.startsWith('/shared/')) bytes=await remote('https://cjajlk.github.io/cjajlkGames-V2-test/core/'+path.basename(pathname));
    else if(pathname.startsWith('/cjajlkGames-V2-test/')) bytes=await remote('https://cjajlk.github.io'+pathname+(pathname.endsWith('/')?'index.html':''));
    else {
      const target=path.resolve(root,'.'+pathname);
      if(!target.startsWith(root+path.sep)) throw Error('Invalid path');
      bytes=fs.readFileSync(target);
    }
    if(pathname.endsWith('.html')||pathname.endsWith('/')) {
      let html=bytes.toString();
      if(pathname!=='/clock.html') html=html.replace('</body>',diagnostic+'</body>');
      html=html.replaceAll('https://cjajlk.github.io/cjajlkGames-V2-test/core/','/shared/');
      bytes=Buffer.from(html);
    }
    const ext=path.extname(pathname);
    const type=({'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'})[ext]||'text/html';
    res.setHeader('Content-Type',type);res.end(bytes);
  } catch(e) {res.writeHead(404);res.end(String(e));}
}).listen(9222,'127.0.0.1',()=>console.log('Isolated audit: http://127.0.0.1:9222/clock.html'));
