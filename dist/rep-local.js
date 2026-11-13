/* Browser-only records. Uploaded materials never enter the source repository. */
const RepLocal=(()=>{
 let connection;
 const open=()=>connection||(connection=new Promise((resolve,reject)=>{const r=indexedDB.open('knowdrug-representative-workspace',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{connection=null;reject(new Error('无法打开浏览器资料库，请允许网站存储后重试'));};}));
 async function run(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records',mode);let result;try{const request=action(tx.objectStore('records'));request.onsuccess=()=>result=request.result;}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(new Error('资料未保存，请检查浏览器存储空间'));});}
 const get=id=>run('readonly',s=>s.get(id));
 const put=record=>run('readwrite',s=>s.put(record));
 const remove=id=>run('readwrite',s=>s.delete(id));
 const clear=()=>run('readwrite',s=>s.clear());
 const all=async prefix=>(await run('readonly',s=>s.getAll())).filter(r=>r.id.startsWith(prefix));
 const uid=prefix=>prefix+MobileCompat.uuid();
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function track(link,type,extra={}){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');let missing=false;store.get(link.id).onsuccess=ev=>{if(!ev.target.result){missing=true;return;}store.put({id:uid('event:'),linkId:link.id,repId:link.repId,doctorId:link.doctorId,type,at:new Date().toISOString(),...extra});};tx.oncomplete=()=>missing?reject(new Error('链接已失效，请联系代表重新生成')):resolve();tx.onerror=tx.onabort=()=>reject(new Error('记录未保存，请重试'));});}
 return {get,put,remove,clear,all,uid,escape,track};
})();
const RepKnowledge=(()=>{
 function terms(query){const clean=query.toLowerCase().replace(/日达仙|请问|如何|什么|这个|是否|相关|可以|需要|了解|一下/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ');const out=new Set();for(const word of clean.trim().split(/\s+/)){if(!word)continue;if(/^[a-z0-9]+$/.test(word)){out.add(word);continue;}if(word.length<2)continue;for(let i=0;i<word.length-1;i++)out.add(word.slice(i,i+2));}return [...out];}
 function search(documents,query){const keys=terms(query);if(!keys.length)return [];const results=[];for(const doc of documents){const paragraphs=doc.text.split(/\n\s*\n|\n(?=[#第])/).flatMap(p=>{const a=[];for(let i=0;i<p.length;i+=450)a.push(p.slice(i,i+550));return a;}).filter(p=>p.trim());paragraphs.forEach((text,index)=>{const low=text.toLowerCase();const matches=keys.filter(k=>low.includes(k));if(!matches.length)return;const score=matches.length/keys.length+matches.length*.12;if(keys.length>3&&matches.length/keys.length<.2)return;results.push({docId:doc.id,name:doc.name,section:index+1,text:text.trim(),score});});}return results.sort((a,b)=>b.score-a.score).slice(0,4);}
 return {terms,search};
})();
