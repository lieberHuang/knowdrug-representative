import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {handleKnowledge} from './worker.mjs';

const MAX_BODY_BYTES=24000;
function clientIP(request,env){const address=request.socket.remoteAddress||'unknown',loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);return env.TRUST_PROXY==='1'&&loopback&&typeof request.headers['x-real-ip']==='string'?request.headers['x-real-ip']:address;}
async function readBody(request){const chunks=[];let bytes=0;for await(const chunk of request){bytes+=chunk.length;if(bytes>MAX_BODY_BYTES){const error=new Error('body_too_large');error.status=413;throw error;}chunks.push(chunk);}return Buffer.concat(chunks);}
function sendJSON(response,status,value){if(response.destroyed)return;response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});response.end(JSON.stringify(value));}
export function createApiServer({env=process.env,fetchImpl=fetch}={}){
 return http.createServer(async(request,response)=>{
  const controller=new AbortController();response.once('close',()=>controller.abort());request.once('aborted',()=>controller.abort());
  try{
   const protocol=request.headers['x-forwarded-proto']==='https'?'https':'http',url=new URL(request.url,protocol+'://'+(request.headers.host||'localhost'));
   if(['/api/health','/healthz'].includes(url.pathname)){if(request.method!=='GET')return sendJSON(response,405,{error:'仅支持 GET 请求'});return sendJSON(response,env.DEEPSEEK_API_KEY?200:503,{ok:!!env.DEEPSEEK_API_KEY,configured:!!env.DEEPSEEK_API_KEY,model:env.DEEPSEEK_MODEL||'deepseek-flash'});}
   if(url.pathname!=='/api/knowledge')return sendJSON(response,404,{error:'接口不存在'});
   if(Number(request.headers['content-length']||0)>MAX_BODY_BYTES){request.resume();return sendJSON(response,413,{error:'问题内容过长'});}
   const headers=new Headers();for(const [key,value] of Object.entries(request.headers)){if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);}
   headers.set('CF-Connecting-IP',clientIP(request,env));
   const body=await readBody(request),webRequest=new Request(url,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)&&body.length?{body}:{}),signal:controller.signal});
   const result=await handleKnowledge(webRequest,env,fetchImpl);if(response.destroyed)return;response.writeHead(result.status,Object.fromEntries(result.headers));response.end(Buffer.from(await result.arrayBuffer()));
  }catch(error){sendJSON(response,error.status||500,{error:error.status===413?'问题内容过长':'暂时无法处理请求，请稍后重试'});}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3001),server=createApiServer();
 server.requestTimeout=80000;server.headersTimeout=15000;server.listen(port,host,()=>console.log(`knowdrug API listening on ${host}:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>{server.closeAllConnections();process.exit(0);},65000).unref();});
}
