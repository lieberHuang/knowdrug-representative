const assert=require('node:assert/strict');
(async()=>{
 const {createApiServer}=await import('../server/aliyun.mjs');let calls=0;
 const server=createApiServer({env:{DEEPSEEK_API_KEY:'server-test-secret',TRUST_PROXY:'1'},fetchImpl:async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(calls===1?{inScope:true}:{title:'日达仙资料核对',body:'请核对批准说明书。',followUps:['日达仙资料如何查阅？','日达仙安全信息如何核对？','日达仙保存要求如何确认？']})}}]}),{headers:{'Content-Type':'application/json'}});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  let response=await fetch(base+'/api/health');assert.equal(response.status,200);assert.equal((await response.json()).configured,true);
  response=await fetch(base+'/api/knowledge',{method:'OPTIONS',headers:{Origin:'https://lieberhuang.github.io','Access-Control-Request-Method':'POST'}});assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://lieberhuang.github.io');
  response=await fetch(base+'/api/knowledge',{method:'POST',headers:{Origin:'https://lieberhuang.github.io','Content-Type':'application/json'},body:JSON.stringify({expert:'drug',question:'日达仙资料如何核对？'})});assert.equal(response.status,200);const data=await response.json();assert.equal(data.followUps.length,3);assert.equal(calls,2);assert(!JSON.stringify(data).includes('server-test-secret'));
  response=await fetch(base+'/api/knowledge',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({expert:'insurance',question:'申请材料？'})});assert.equal(response.status,403);
  response=await fetch(base+'/api/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(24001)});assert.equal(response.status,413);
  assert.equal((await fetch(base+'/unknown')).status,404);console.log('PASS: Alibaba Node HTTP adapter, health, CORS preflight, DeepSeek scope/answer forwarding, payload limits and secret-free responses');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
