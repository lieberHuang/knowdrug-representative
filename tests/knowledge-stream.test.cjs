const assert=require('node:assert/strict');
const {setTimeout:pause}=require('node:timers/promises');
const origin='https://lieberhuang.github.io';
const encoder=new TextEncoder();
const reply=value=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}),{headers:{'Content-Type':'application/json'}});
const chunk=text=>'data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:null}]})+'\n\n';
function streamed(parts,{complete=true,delay=8}={}){return new Response(new ReadableStream({async start(controller){for(const part of parts){await pause(delay);controller.enqueue(encoder.encode(part));}if(complete)controller.enqueue(encoder.encode('data: [DONE]\n\n'));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
function events(raw){return raw.split('\n\n').filter(Boolean).map(frame=>{const rows=frame.split('\n'),type=rows.find(row=>row.startsWith('event:'))?.slice(6).trim(),data=rows.find(row=>row.startsWith('data:'))?.slice(5).trim();return {type,data:data?JSON.parse(data):null};});}
(async()=>{
 const {handleKnowledgeStream}=await import('../server/worker.mjs');
 const env={DEEPSEEK_API_KEY:'server-test-secret'};
 let calls=[];
 const model=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);if(calls.length===1)return reply({inScope:true});if(body.stream)return streamed([chunk('核对日达仙'),chunk('批准说明书。')]);return reply({title:'日达仙资料核对',followUps:['日达仙资料来源如何确认？','日达仙安全信息如何查阅？','日达仙研究材料如何核对？']});};
 const request=new Request('https://api.example/api/knowledge/stream',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'stream-a'},body:JSON.stringify({expert:'drug',question:'如何核对日达仙资料？'})});
 const response=await handleKnowledgeStream(request,env,model);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/event-stream/);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 const frames=events(await response.text());assert.deepEqual(frames.map(item=>item.type),['start','delta','delta','status','done']);assert.equal(frames.filter(item=>item.type==='delta').map(item=>item.data.text).join(''),'核对日达仙批准说明书。');assert.equal(frames.at(-1).data.followUps.length,3);assert.equal(frames.at(-1).data.answer.title,'日达仙资料核对');assert.equal(calls.length,3);assert.equal(calls[1].stream,true);assert(!JSON.stringify(frames).includes(env.DEEPSEEK_API_KEY));
 calls=[];const offscope=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return calls.length===1?reply({inScope:false}):reply({title:'无关标题',followUps:['日达仙资料在哪里？','日达仙安全资料如何查阅？','日达仙说明书如何核对？']});};
 const offRequest=new Request('https://api.example/api/knowledge/stream',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'stream-b'},body:JSON.stringify({expert:'drug',question:'推荐一台电脑'})});
 const offFrames=events(await (await handleKnowledgeStream(offRequest,env,offscope)).text());assert.equal(offFrames.at(-1).type,'done');assert.equal(offFrames.at(-1).data.answer.title,'我专注于日达仙');assert.match(offFrames.at(-1).data.answer.body,/仅回答日达仙/);assert.equal(calls.length,2);
 const incomplete=async()=>streamed([chunk('未完成')],{complete:false});
 const badRequest=new Request('https://api.example/api/knowledge/stream',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'stream-c'},body:JSON.stringify({expert:'insurance',question:'申请材料？'})});
 const badFrames=events(await (await handleKnowledgeStream(badRequest,env,incomplete)).text());assert.equal(badFrames.at(-1).type,'error');assert.match(badFrames.at(-1).data.error,/中断/);assert(!badFrames.some(item=>item.type==='done'));
 const blank=()=>new Response(JSON.stringify({choices:[{message:{content:'   '}}]}),{headers:{'Content-Type':'application/json'}});
 let metadataCalls=0;const malformedMetadata=async(url,options)=>{metadataCalls++;return JSON.parse(options.body).stream?streamed([chunk('请核对申请材料。')]):blank();};
 const metadataRequest=new Request('https://api.example/api/knowledge/stream',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'stream-d'},body:JSON.stringify({expert:'insurance',question:'申请材料如何核对？'})});
 const metadataFrames=events(await (await handleKnowledgeStream(metadataRequest,env,malformedMetadata)).text());assert.equal(metadataFrames.at(-1).type,'done');assert.equal(metadataFrames.at(-1).data.answer.body,'请核对申请材料。');assert.equal(metadataFrames.at(-1).data.followUps.length,3);assert(!metadataFrames.some(item=>item.type==='error'));assert.equal(metadataCalls,3);
 let classifyCalls=0;const malformedScope=async(url,options)=>{classifyCalls++;if(classifyCalls<=2)return blank();return JSON.parse(options.body).stream?streamed([chunk('日达仙以批准说明书为准。')]):reply({title:'说明书核对',followUps:['日达仙适用人群如何核对？','日达仙用药安全信息如何确认？','日达仙资料版本如何查阅？']});};
 const scopeRequest=new Request('https://api.example/api/knowledge/stream',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'stream-e'},body:JSON.stringify({expert:'drug',question:'日达仙说明书应重点核对哪些项目？'})});
 const scopeFrames=events(await (await handleKnowledgeStream(scopeRequest,env,malformedScope)).text());assert.equal(scopeFrames.at(-1).type,'done');assert.equal(scopeFrames.at(-1).data.answer.title,'说明书核对');assert.equal(classifyCalls,4);
 const {createApiServer}=await import('../server/aliyun.mjs');
 const nodeModel=async(url,options)=>JSON.parse(options.body).stream?streamed([chunk('先核对条款，'),chunk('再整理材料。')]):reply({title:'材料核对',followUps:['材料来源如何核对？','申请条件如何确认？','缺少材料如何补充？']});
 const server=createApiServer({env:{...env,TRUST_PROXY:'1'},fetchImpl:nodeModel});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url='http://127.0.0.1:'+server.address().port+'/api/knowledge/stream',result=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({expert:'insurance',question:'申请材料如何核对？'})});assert.equal(result.status,200);assert.match(result.headers.get('Content-Type'),/text\/event-stream/);const frames=events(await result.text());assert.deepEqual(frames.map(item=>item.type),['start','delta','delta','status','done']);assert.equal(frames.at(-1).data.answer.body,'先核对条款，再整理材料。');}finally{await new Promise(resolve=>server.close(resolve));}
 console.log('PASS: DeepSeek SSE chunks relay before model-selected follow-ups; drug scope and incomplete streams stay safe');
})().catch(error=>{console.error(error);process.exitCode=1;});
