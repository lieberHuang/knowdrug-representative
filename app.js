const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='knowdrug-representative-';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(STORE+key))??fallback;}catch{return fallback;}};
function save(key,value){try{localStorage.setItem(STORE+key,JSON.stringify(value));return true;}catch{toast('当前设备存储空间不足，请更换较小的照片');return false;}}
const defaultScript=name=>`医生，您好。我是您的专属医药代表${name}。很高兴在知药与您见面。我会为您提供日达仙资料与学术支持。您可以向药品助手提问，也可以查看相关指南、最新文献，或者使用病历点评。期待与您交流。`;
const DEFAULT_PROFILE={name:'林晓',photo:'assets/representative.png',look:'natural',rate:1,script:defaultScript('林晓'),version:1,publishedAt:DATE_ANCHOR.toISOString()};
// Upgrade persisted sample content without discarding conversations or notes.
function migrateDrugCopy(value){
 if(typeof value==='string')return [["\u745e\u8212\u4f10\u4ed6\u6c40\u9499\u7247","日达仙"],["\u745e\u8212\u4f10\u4ed6\u6c40","日达仙"],["\u4ed6\u6c40\u7c7b","日达仙药品资料"],["\u8840\u8102\u7ba1\u7406","日达仙资料"],["\u964d\u8102\u6cbb\u7597","日达仙相关研究"],["\u964d\u8102\u76f8\u5173\u836f\u7269","日达仙"],["\u964d\u8102\u76f8\u5173","日达仙相关"],["\u964d\u8102","日达仙"],["\u8840\u8102","药品"],["\u4ed6\u6c40","日达仙"]].reduce((text,[oldName,newName])=>text.split(oldName).join(newName),value);
 if(Array.isArray(value))return value.map(migrateDrugCopy);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,migrateDrugCopy(item)]));
 return value;
}
let published=migrateDrugCopy(read('published',DEFAULT_PROFILE));
if(published.script)published.script=published.script.replace('我会为您提供药品资料与学术支持。','我会为您提供日达仙资料与学术支持。');
let draft=migrateDrugCopy(read('draft',null));
const followed=read('followed',[]);
let notes=migrateDrugCopy(read('notes',{}));
let period=[7,30].includes(read('period',7))?read('period',7):7;
let page='home',params={},activeTopic='全部',doctorSearch='',followFilter='all',insightView='doctors',currentMetric='qa',previewSpeaking=false;
const names={home:'首页',avatar:'我的数字人',insights:'医生洞察',stats:'使用统计',doctor:'医生提问总结',studio:'录入数字人',preview:'视频预览',scripts:'录制话术',shareLinks:'邀请链接',knowledge:'知识库问答'};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;
let afterSheetClose=null;
function finishSheetAction(){const action=afterSheetClose;afterSheetClose=null;if(action)action();}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function formatDate(value){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
function dayLabel(day){const date=new Date(DATE_ANCHOR.getTime()-day*86400000);return `${date.getUTCMonth()+1}/${date.getUTCDate()}`;}
function eventsFor(doctor=null,type=null){return EVENTS.filter(e=>e.day<period&&(!doctor||e.doctor===doctor)&&(!type||e.type===type));}
function typeCount(events,type){return events.filter(e=>e.type===type).length;}
function countDoctors(events){return new Set(events.map(e=>e.doctor)).size;}
function topTopics(events){const counts={};events.filter(e=>e.type==='qa').forEach(e=>counts[e.question.topic]=(counts[e.question.topic]||0)+1);return Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));}
function summary(events){const topics=topTopics(events);const count=typeCount(events,'qa');return count?`本期共提出 ${count} 个问题，主要关注${topics.slice(0,2).map(t=>`“${t[0]}”`).join('与')}。`:'本期暂无提问记录。';}
function followState(id){
 const change=(notes[id]||[]).find(record=>record.kind==='status');
 return change||{status:followed.includes(id)?'done':'pending'};
}
function followLabel(status){return status==='done'?'已跟进':'待跟进';}
function pendingDoctors(){return DOCTORS.filter(d=>followState(d.id).status==='pending'&&eventsFor(d.id,'qa').length);}
function recordFollow(doctorId, record){
 const next={...notes,[doctorId]:[{...record,at:new Date().toISOString()},...(notes[doctorId]||[])]};
 if(!save('notes',next)){toast('存储空间不足，跟进记录未保存');return false;}
 notes=next;
 return true;
}
function followStatusMarkup(id){
 const current=followState(id);
 return `<span class="tag ${current.status==='done'?'done':'pending'}">${followLabel(current.status)}</span>
  <small>${current.at?'变更于 '+formatDate(current.at):'暂无状态变更记录'}</small>`;
}
function followTimeline(records, showDoctor=false){
 if(!records.length)return '<p class="follow-empty">暂无跟进记录</p>';
 return `<ol class="follow-timeline">${records.map(record=>{
  const doctor=showDoctor?DOCTORS.find(d=>d.id===record.doctorId):null;
  const label=record.label||(record.kind==='status'?'标记为'+followLabel(record.status):'跟进记录');
  return `<li><div class="follow-event-heading"><strong>${esc(label)}</strong><time datetime="${esc(record.at)}">${formatDate(record.at)}</time></div>
   ${doctor?`<button class="text-btn follow-link" data-doctor="${doctor.id}">${esc(doctor.name)} ›</button>`:''}
   ${record.text?`<p>${record.kind==='note'?'<b>笔记</b> ':''}${esc(record.text)}</p>`:''}
   ${record.detail?`<p><b>详细跟进</b> ${esc(record.detail)}</p>`:''}
  </li>`;
 }).join('')}</ol>`;
}
function byNewest(records){return records.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));}
function recentFollowMarkup(){
 const earliest=Date.now()-7*86400000;
 const records=byNewest(DOCTORS.flatMap(d=>(notes[d.id]||[]).map(record=>({...record,doctorId:d.id})))
  .filter(record=>Date.parse(record.at)>=earliest&&Date.parse(record.at)<=Date.now()));
 return `<section class="panel"><h3>最近 7 天跟进</h3>${followTimeline(records,true)}</section>`;
}
function personalHistory(id){
 return followTimeline(byNewest([...(notes[id]||[])]));
}
function followPanel(doctor){
 const id=doctor.id;
 return `<section class="panel follow-panel" data-follow-id="${id}">
  <div class="follow-status"><span id="follow-status-info">${followStatusMarkup(id)}</span>
   <button class="secondary-button" id="toggle-follow" data-id="${id}">${followState(id).status==='done'?'改为待跟进':'标记已跟进'}</button></div>
  <form id="follow-form">
   <label for="follow-note">跟进笔记</label>
   <textarea class="note-area" id="follow-note" name="note" rows="2" maxlength="500" placeholder="记录需要准备的资料与沟通重点"></textarea>
   <label for="follow-detail">详细跟进记录</label>
   <textarea class="note-area" id="follow-detail" name="detail" rows="4" maxlength="1500" placeholder="记录沟通结果、待办事项与下次联系计划"></textarea>
   <button class="primary-button full" type="submit">保存跟进记录</button>
  </form>
  <div id="follow-history">${personalHistory(id)}</div>
 </section>`;
}
function updateFollowPanel(id){
 const status=$('#follow-status-info'), toggle=$('#toggle-follow'), history=$('#follow-history');
 if(status)status.innerHTML=followStatusMarkup(id);
 if(toggle)toggle.textContent=followState(id).status==='done'?'改为待跟进':'标记已跟进';
 if(history)history.innerHTML=personalHistory(id);
}
document.addEventListener('submit',event=>{
 if(event.target.id!=='follow-form')return;
 event.preventDefault();
 const id=params.id;
 const form=event.target;
 const data=new FormData(form);
 const text=String(data.get('note')).trim(), detail=String(data.get('detail')).trim();
 if(!text&&!detail){toast('请填写笔记或详细跟进记录');return;}
 if(!recordFollow(id,{kind:'note',text,detail}))return;
 form.reset();updateFollowPanel(id);toast('跟进记录已保存');
});
function periodControl(){return `<div class="period-switch" role="group" aria-label="统计周期"><button data-period="7" class="${period===7?'active':''}" aria-pressed="${period===7}">近7天</button><button data-period="30" class="${period===30?'active':''}" aria-pressed="${period===30}">近30天</button></div>`;}
function metricPanel(events){return `<div class="metrics-panel"><button class="metric" data-page="insights"><div class="metric-label">${icon('person')}活跃医生</div><div class="metric-value">${countDoctors(events)}<span>位</span></div></button><button class="metric" data-feature="qa"><div class="metric-label">${icon('chat')}日达仙问答</div><div class="metric-value">${typeCount(events,'qa')}<span>次</span></div></button><button class="metric" data-feature="case"><div class="metric-label">${icon('case')}病历点评</div><div class="metric-value">${typeCount(events,'case')}<span>次</span></div></button><button class="metric" data-feature="video"><div class="metric-label">${icon('play')}数字人观看</div><div class="metric-value">${typeCount(events,'video')}<span>次</span></div></button></div>`;}
function moduleRows(events,onlyClinical=false){const items=onlyClinical?MODULES.filter(m=>m.id!=='qa'):MODULES;const max=Math.max(1,...items.map(m=>typeCount(events,m.id)));return items.map(m=>{const total=typeCount(events,m.id);const doctors=countDoctors(events.filter(e=>e.type===m.id));return `<button class="module-row" data-feature="${m.id}"><span class="module-icon">${icon(m.icon)}</span><div><h3>${m.name}</h3><div class="module-bar"><i style="width:${total/max*100}%"></i></div></div><strong>${total}</strong><span class="chevron">›</span></button>`;}).join('');}
function photo(profile,cls='',alt='数字人形象'){return `<img class="${cls}" src="${esc(profile.photo)}" alt="${esc(alt)}">`;}
function home(){const events=eventsFor();const topics=topTopics(events);const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'numeric',hour12:false}).format(new Date()));const greeting=hour<11?'上午好':hour<14?'中午好':hour<18?'下午好':'晚上好';return `<div class="greeting"><h1>${esc(published.name)}，${greeting}</h1><span class="rep-label">代表版</span></div><section class="portrait-card"><img class="portrait" src="${esc(published.photo)}" alt="${esc(published.name)}的数字人"><button class="round-play" data-preview="published" aria-label="预览数字人">${icon('play')}</button><div class="portrait-info"><span class="status-badge"><i></i>数字人形象</span><h2>我的数字人</h2><button class="text-btn" data-page="avatar">管理形象 <span>›</span></button></div></section><div class="section-head"><h2>日达仙概览</h2>${periodControl()}</div>${metricPanel(events)}<div class="section-head"><h2>医生关注重点</h2><button class="text-btn" data-page="insights">全部洞察 ›</button></div><section class="panel"><div class="insight-note">${icon('spark')}<div>近期高频问题集中在<strong>${esc(topics[0]?.[0]||'药品资料')}</strong>与<strong>${esc(topics[1]?.[0]||'临床证据')}</strong>。</div></div>${topics.slice(0,3).map(([topic,count],i)=>`<button class="topic-row" data-topic-entry="${topic}"><span class="topic-rank">${String(i+1).padStart(2,'0')}</span><span class="topic-title">${topic}</span><span class="topic-progress"><i style="width:${count/(topics[0]?.[1]||1)*100}%"></i></span><span class="topic-count">${count}次</span><span class="chevron">›</span></button>`).join('')}</section><button class="follow-card" id="follow-entry"><span class="follow-icon">${icon('clock')}</span><strong>待跟进医生<span class="count-pill">${pendingDoctors().length}</span></strong><span class="chevron">›</span></button><div class="section-head"><h2>功能使用</h2><button class="text-btn" data-page="stats">全部统计 ›</button></div><section class="panel">${moduleRows(events,true)}</section>`;}
function doctorCard(doctor){const all=eventsFor(doctor.id);const qs=all.filter(e=>e.type==='qa');const topics=topTopics(qs);const status=followState(doctor.id).status;return `<button class="doctor-card" data-doctor="${doctor.id}"><div class="doctor-card-top"><span class="doctor-avatar">${esc(doctor.name[0])}</span><div><h3>${esc(doctor.name)}</h3><div class="doctor-meta">${esc(doctor.hospital)} · ${esc(doctor.department)}</div></div><span class="chevron">›</span></div><p class="doctor-summary">${summary(all)}</p><div class="tag-row">${topics.slice(0,2).map(([t])=>`<span class="tag">${t}</span>`).join('')}${RepWorkspace.tags(doctor.id)}${`<span class="tag ${status==='done'?'done':'pending'}">${followLabel(status)}</span>`}<span class="qa-count">${qs.length}次提问</span></div></button>`;}
function filteredDoctors(){return DOCTORS.filter(d=>{const qs=eventsFor(d.id,'qa');return RepWorkspace.matches(d.id)&&(followFilter==='all'||followState(d.id).status===followFilter)&&(activeTopic==='全部'||qs.some(e=>e.question.topic===activeTopic))&&`${d.name}${d.department}${d.hospital}`.includes(doctorSearch);}).sort((a,b)=>eventsFor(b.id,'qa').length-eventsFor(a.id,'qa').length);}
function insights(){
 const topics=['全部',...topTopics(eventsFor()).map(([topic])=>topic)];
 return `<div class="page-toolbar"><h2>医生洞察</h2>${insightView==='doctors'?periodControl():''}</div>
  <div class="insight-segments" role="group" aria-label="医生洞察视图">
   <button data-insight-view="doctors" aria-pressed="${insightView==='doctors'}" class="${insightView==='doctors'?'active':''}">医生列表</button>
   <button data-insight-view="timeline" aria-pressed="${insightView==='timeline'}" class="${insightView==='timeline'?'active':''}">最近 7 天时间线</button>
  </div>${insightView==='timeline'?recentFollowMarkup():`
  <label class="search-field">${icon('search')}<input id="doctor-search" type="search" placeholder="搜索医生、医院或科室" value="${esc(doctorSearch)}" aria-label="搜索医生"></label>
  <div class="chips" role="group" aria-label="跟进状态">${[['all','全部医生'],['pending','待跟进'],['done','已跟进']].map(([value,label])=>`<button class="chip ${followFilter===value?'active':''}" data-follow-filter="${value}" aria-pressed="${followFilter===value}">${label}</button>`).join('')}</div>
  <div class="chips" role="group" aria-label="问题主题">${topics.map(topic=>`<button class="chip ${activeTopic===topic?'active':''}" data-topic="${esc(topic)}" aria-pressed="${activeTopic===topic}">${topic==='全部'?'全部主题':esc(topic)}</button>`).join('')}</div>
  ${RepWorkspace.filters()}<div id="doctor-list">${doctorList()}</div>`}`;
}
function doctorList(){const list=filteredDoctors();return list.length?list.map(doctorCard).join(''):`<div class="empty">${icon('search')}暂无匹配的医生</div>`;}
function doctorDetail(){const doctor=DOCTORS.find(d=>d.id===params.id)||DOCTORS[0];const events=eventsFor(doctor.id);const topics=topTopics(events);const questions=events.filter(e=>e.type==='qa');const uniqueQuestions=questions.filter((event,index,list)=>list.findIndex(other=>other.question.text===event.question.text)===index).slice(0,6);return `<div class="doctor-header"><span class="doctor-avatar">${esc(doctor.name[0])}</span><div><h2>${esc(doctor.name)}</h2><p>${esc(doctor.hospital)} · ${esc(doctor.department)}</p></div></div>${RepWorkspace.doctorPanel(doctor.id)}<div class="page-toolbar"><span class="status-badge">${questions.length}次提问</span>${periodControl()}</div><section class="panel"><h3 class="summary-title">${icon('spark')}提问总结</h3><p class="summary-copy">${summary(events)}</p><div class="summary-action">建议准备${TOPIC_MATERIALS[topics[0]?.[0]]||'相关药品资料'}，用于下一次学术沟通。</div><div class="tag-row">${topics.map(([topic,count])=>`<span class="tag">${topic} ${count}</span>`).join('')}</div></section><div class="section-head"><h2>近期问题</h2></div><section class="panel">${uniqueQuestions.map(e=>`<article class="question-entry"><p>${esc(e.question.text)}</p><div class="entry-meta"><time>${formatDate(e.at)}</time><span class="tag">${e.question.topic}</span></div></article>`).join('')}</section><div class="section-head"><h2>功能使用</h2></div><section class="panel">${moduleRows(events)}</section><div class="section-head"><h2>跟进记录</h2></div>${followPanel(doctor)}`;}
function chartData(events,type){const count=(older,newer)=>events.filter(e=>e.type===type&&e.day<=older&&e.day>=newer).length;return period===7?Array.from({length:7},(_,i)=>({label:dayLabel(6-i),full:dayLabel(6-i),count:count(6-i,6-i)})):Array.from({length:6},(_,i)=>{const older=29-i*5;return {label:dayLabel(older),full:dayLabel(older)+'–'+dayLabel(older-4),count:count(older,older-4)};});}
function chartHTML(events,type,id='trend'){const points=chartData(events,type);const max=Math.max(1,...points.map(p=>p.count));const last=points[points.length-1];return `<div class="chart-value" id="${id}-value">${last.full} · ${last.count}次</div><div class="chart" aria-label="功能使用趋势">${points.map((p,i)=>`<button class="chart-column ${i===points.length-1?'selected':''}" style="--bar:${Math.max(2,p.count/max*100)}%" data-chart="${id}" data-chart-label="${p.full} · ${p.count}次" aria-label="${p.full} ${p.count}次"><span class="bar-track"><i></i></span><small>${p.label}</small></button>`).join('')}</div>`;}
function stats(){const events=eventsFor();return `<div class="page-toolbar"><h2>数据总览</h2><button class="text-btn" id="export-stats">${icon('download')}导出</button></div><div class="page-toolbar"><span class="status-badge">${period===7?'近7天':'近30天'}</span>${periodControl()}</div>${metricPanel(events)}<div class="section-head"><h2>使用趋势</h2></div><section class="panel"><div class="stat-heading"><h3>${[...MODULES,{id:'video',name:'数字人观看'}].find(m=>m.id===currentMetric).name}</h3><select id="trend-metric" aria-label="选择趋势指标">${[...MODULES,{id:'video',name:'数字人观看'}].map(m=>`<option value="${m.id}" ${m.id===currentMetric?'selected':''}>${m.name}</option>`).join('')}</select></div>${chartHTML(events,currentMetric)}</section><div class="section-head"><h2>功能明细</h2></div><section class="panel">${moduleRows(events)}<button class="module-row" data-feature="video"><span class="module-icon">${icon('play')}</span><div><h3>数字人观看</h3><div class="module-bar"><i style="width:100%"></i></div></div><strong>${typeCount(events,'video')}</strong><span class="chevron">›</span></button></section>`;}
function render(){RepWorkspace.applyDoctors();const workspace=RepWorkspace.render(page,params);if(workspace!==null){$('#main').innerHTML=workspace;$('#screen-title').textContent=names[page];return;}const view={home,insights,stats,doctor:doctorDetail}[page];$('#main').innerHTML=view();$('#screen-title').textContent=names[page];$('#profile img').src=published.photo;$('#profile img').alt=published.name;}
function renderKeepScroll(){const y=scrollY;render();window.scrollTo({top:y,behavior:'instant'});}
function navigate(target,newParams={},fromHistory=false,replace=false){if(!names[target])target='home';RepWorkspace.leave();stopSpeech();page=target;params=newParams;document.body.dataset.page=page;const selected=['studio','preview','scripts','shareLinks'].includes(page)?'avatar':page==='doctor'?'insights':page;$$('.tab').forEach(b=>{const on=b.dataset.page===selected;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});if(page==='insights'){if(newParams.topic)activeTopic=newParams.topic;if(newParams.followFilter)followFilter=newParams.followFilter;}if(!fromHistory){if(replace)history.replaceState({page,params},'');else history.pushState({page,params},'');}render();window.scrollTo({top:0,behavior:'instant'});}
history.scrollRestoration='manual';history.replaceState({page:'home',params:{}},'');
window.addEventListener('popstate',event=>{const state=event.state||{page:'home',params:{}};if($('#sheet').open&&!state.sheet)$('#sheet').close();if(state.sheet&&!$('#sheet').open)$('#sheet').showModal();if(state.page!==page||JSON.stringify(state.params||{})!==JSON.stringify(params))navigate(state.page,state.params||{},true);if(!state.sheet)finishSheetAction();});
$('#back').onclick=()=>{if(page==='studio')navigate('avatar');else if(page==='preview')navigate('avatar');else history.back();};
$('#brand').onclick=e=>{e.preventDefault();navigate('home');};
function openSheet(title,body){stopSpeech();$('#sheet-title').textContent=title;$('#sheet-body').innerHTML=body;if(!$('#sheet').open){history.pushState({page,params,sheet:true},'');$('#sheet').showModal();}}
$('#close-sheet').onclick=()=>$('#sheet').close();
$('#sheet').addEventListener('close',()=>{if(history.state?.sheet)history.back();else finishSheetAction();});
$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let touchStart=null;$('#sheet').addEventListener('touchstart',e=>{touchStart=$('#sheet').scrollTop<=0?e.touches[0].clientY:null;},{passive:true});$('#sheet').addEventListener('touchend',e=>{if(touchStart!==null&&e.changedTouches[0].clientY-touchStart>90)$('#sheet').close();touchStart=null;},{passive:true});
$('#profile').onclick=()=>openSheet('代表资料',`<div class="sheet-profile">${photo(published)}<div><strong>${esc(published.name)}</strong><span>医药代表</span></div></div><div class="detail-row"><span>数字人</span><b>我的形象</b></div><div class="detail-row"><span>服务医生</span><b>${countDoctors(eventsFor())} 位</b></div>`);
function featureDetail(type){const module=MODULES.find(m=>m.id===type)||{id:'video',name:'数字人观看'};const all=eventsFor(page==='doctor'?params.id:null,type);const ranked=DOCTORS.map(d=>({doctor:d,count:all.filter(e=>e.doctor===d.id).length})).filter(r=>r.count).sort((a,b)=>b.count-a.count);openSheet(module.name,`<div class="feature-detail-metrics"><div><div class="detail-number">${all.length}</div><div class="detail-label">使用次数</div></div><div><div class="detail-number">${countDoctors(all)}</div><div class="detail-label">使用医生</div></div></div>${chartHTML(all,type,'feature')}<h3>医生使用排行</h3>${ranked.map(({doctor,count})=>`<div class="rank-row"><span class="doctor-avatar">${esc(doctor.name[0])}</span><span>${esc(doctor.name)}</span><strong>${count}次</strong></div>`).join('')}`);}
function stopSpeech(){if(window.speechSynthesis)window.speechSynthesis.cancel();previewSpeaking=false;const button=$('#preview-play');if(button)button.innerHTML=`${icon('play')}播放介绍`;}
function exportStats(){const events=eventsFor();const rows=[['统计周期',`近${period}天`],['指标','次数','使用医生数'],...MODULES.map(m=>[m.name,typeCount(events,m.id),countDoctors(events.filter(e=>e.type===m.id))]),['数字人观看',typeCount(events,'video'),countDoctors(events.filter(e=>e.type==='video'))]];const csv='\ufeff'+rows.map(row=>row.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`knowdrug-代表端-近${period}天.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('统计报表已导出');}
document.addEventListener('click',event=>{
 const target=event.target.closest('button,a');if(!target)return;
 if(target.dataset.insightView){insightView=target.dataset.insightView;render();return;}
 if(target.dataset.followFilter){followFilter=target.dataset.followFilter;render();return;}
 if(target.dataset.page){if(target.dataset.page==='insights'){followFilter='all';insightView='doctors';activeTopic='全部';doctorSearch='';}navigate(target.dataset.page);return;}
 if(target.dataset.period){period=Number(target.dataset.period);save('period',period);renderKeepScroll();return;}
 if(target.dataset.feature){featureDetail(target.dataset.feature);return;}
 if(target.dataset.topicEntry){activeTopic=target.dataset.topicEntry;doctorSearch='';insightView='doctors';navigate('insights',{topic:activeTopic,followFilter:'all'});return;}
 if(target.dataset.topic){activeTopic=target.dataset.topic;renderKeepScroll();return;}
 if(target.dataset.doctor){navigate('doctor',{id:target.dataset.doctor});return;}
 if(target.dataset.preview){navigate('preview',{source:target.dataset.preview});return;}
 if(target.dataset.chart){const root=target.closest('.panel')||$('#sheet-body');$$(`[data-chart="${target.dataset.chart}"]`,root).forEach(b=>b.classList.toggle('selected',b===target));$('#'+target.dataset.chart+'-value',root).textContent=target.dataset.chartLabel;return;}
 switch(target.id){
  case 'follow-entry':activeTopic='全部';doctorSearch='';insightView='doctors';navigate('insights',{followFilter:'pending'});break;
  case 'create-avatar':navigate('studio');break;
  case 'edit-avatar':navigate('studio');break;
  case 'toggle-follow':{
   const id=target.dataset.id;
   const status=followState(id).status==='done'?'pending':'done';
   if(recordFollow(id,{kind:'status',status})){
    updateFollowPanel(id);toast('已标记为'+followLabel(status));
   }
   break;
  }
  case 'export-stats':exportStats();break;
 }
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='doctor-search'){doctorSearch=el.value.trim();$('#doctor-list').innerHTML=doctorList();}

});
document.addEventListener('change',event=>{
 if(event.target.id==='trend-metric'){currentMetric=event.target.value;renderKeepScroll();}

});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();});
if(read('drug-copy-version',0)<1){save('published',published);save('draft',draft);save('notes',notes);save('drug-copy-version',1);}
RepWorkspace.init({profile:()=>published,doctors:DOCTORS,go:target=>navigate(target),refresh:()=>renderKeepScroll(),filter:()=>{$('#doctor-list').innerHTML=doctorList();},toast,modal:openSheet,closeThen:action=>{afterSheetClose=action;$('#sheet').close();},updateProfile:p=>{published={...published,name:p.name,photo:p.photo};$('#profile img').src=p.photo;$('#profile img').alt=p.name;}});
render();
