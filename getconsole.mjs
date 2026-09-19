import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire('/tmp/wsdep/');
const WebSocket = require('ws');
const PROF='/tmp/chromecrm'+Date.now();
spawn('/usr/bin/google-chrome', ['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=9339','--user-data-dir='+PROF,'about:blank'], {stdio:'ignore', detached:true});
function get(path){return new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:9339,path},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej)})}
await new Promise(r=>setTimeout(r,3000));
let list;for(let i=0;i<15;i++){try{list=JSON.parse(await get('/json'));if(list.length)break}catch(e){}await new Promise(r=>setTimeout(r,500))}
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
let id=0;const pend={};const logs=[];
const send=(m,p={})=>{const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p}));return new Promise(r=>pend[i]=r)};
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&pend[m.id]){pend[m.id](m.result);delete pend[m.id];}
  if(m.method==='Runtime.exceptionThrown'){const e=m.params.exceptionDetails;const st=(e.stackTrace?.callFrames||[]).slice(0,4).map(f=>f.functionName+'@'+f.url+':'+f.lineNumber).join(' <- ');logs.push('EXCEPTION: '+(e.exception?.description||e.text)+' | '+st)}
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t.toUpperCase()+': '+m.params.args.map(a=>a.value||a.description||'').join(' ').slice(0,300))}
});
ws.on('open',async()=>{
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  await send('Page.navigate',{url:'https://crm.aitechsite.site/'});
  await new Promise(r=>setTimeout(r,10000));
  const rs=await send('Runtime.evaluate',{returnByValue:true,expression:'document.readyState+" inputs="+document.querySelectorAll("input").length'});
  logs.push('STATE: '+rs.result?.value);
  console.log(logs.join('\\n')||'NO LOGS');
  process.exit(0);
});
setTimeout(()=>{console.log('TIMEOUT\\n'+logs.join('\\n'));process.exit(0)},25000);
