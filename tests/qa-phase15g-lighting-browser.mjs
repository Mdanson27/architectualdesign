import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';
const port=5196,debugPort=23000+process.pid%10000,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'inherit'});
const url='http://127.0.0.1:'+port+'/phase15g-review.html';
let chrome,ws;const pending=new Map(),exceptions=[];let counter=0;
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++counter,t=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},90000);pending.set(id,m=>{clearTimeout(t);resolve(m)});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const m=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(m.error||m.result?.exceptionDetails)throw Error(JSON.stringify(m.error??m.result.exceptionDetails));return m.result?.result?.value;}
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await sleep(250);}if(!ready)throw Error('Vite review unavailable');
 chrome=spawn(process.env.CHROME_BIN||'/usr/bin/google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1100,800','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(os.tmpdir(),'phase15g-'+process.pid),url],{stdio:'ignore'});
 let target;for(let i=0;i<100;i++){try{target=(await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(x=>x.type==='page'&&x.url.includes('phase15g-review'));if(target)break;}catch{}await sleep(250);}if(!target)throw Error('Chrome review unavailable');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);};
 await cdp('Runtime.enable');let ids;for(let i=0;i<100;i++){ids=await evaluate('window.__LightQA?.ids');if(ids)break;await sleep(250);}if(ids?.length!==7)throw Error('Missing lighting families');
 const dir='analysis/phase15g-visuals';fs.mkdirSync(dir,{recursive:true});const result=[];
 for(const id of ids)for(const detail of ['high','low'])for(const view of ['day','perspective','night','dimmed']){
  const data=await evaluate('window.__LightQA.render('+JSON.stringify(id)+','+JSON.stringify(detail)+','+JSON.stringify(view)+')');
  if(!data?.png?.startsWith('data:image/png;base64,')||data.uniqueSampleColors<40||data.triangles<1)throw Error('Invalid render '+id+' '+detail+' '+view);
  const buf=Buffer.from(data.png.split(',')[1],'base64');if(buf.length<5000)throw Error('Invalid PNG');fs.writeFileSync(path.join(dir,id+'-'+detail+'-'+view+'.png'),buf);delete data.png;result.push(data);
 }
 for(const id of ids)for(const detail of ['high','low']){
  const rows=result.filter(r=>r.id===id&&r.detail===detail),day=rows.find(r=>r.view==='day'),night=rows.find(r=>r.view==='night'),dim=rows.find(r=>r.view==='dimmed');
  if(day.intensity!==0||night.intensity<=0||Math.abs(dim.intensity/night.intensity-.25)>.001)throw Error('Rendered dimming state mismatch '+id);
 }
 if(exceptions.length)throw Error(exceptions.join(';'));
 fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify(result,null,2));console.log('PHASE15G_WEBGL_RENDERS',JSON.stringify({families:ids.length,variants:14,captures:result.length,exceptions:exceptions.length}));
}finally{ws?.close();chrome?.kill();vite.kill();}
