// Synthetic, deterministic fixtures. No doctor-side data is collected by this project.
const DOCTORS = [
 ['d1','张医生','心血管内科','仁和医院'],['d2','李医生','内分泌科','江城中心医院'],['d3','王医生','心血管内科','滨江医院'],['d4','陈医生','全科医学科','仁和医院'],['d5','刘医生','心血管内科','江城中心医院'],['d6','赵医生','内分泌科','滨江医院'],['d7','周医生','全科医学科','仁和医院'],['d8','吴医生','心血管内科','滨江医院'],['d9','郑医生','内分泌科','江城中心医院'],['d10','孙医生','全科医学科','仁和医院'],['d11','许医生','心血管内科','滨江医院'],['d12','林医生','内分泌科','江城中心医院']
].map(([id,name,department,hospital])=>({id,name,department,hospital}));
const QUESTION_BANK = [
 {
  "topic": "用法用量",
  "text": "如何查阅日达仙的用法用量？"
 },
 {
  "topic": "用药安全",
  "text": "日达仙与其他药物合用时，需要核对哪些信息？"
 },
 {
  "topic": "特殊人群",
  "text": "特殊人群使用日达仙前，需要核对哪些背景信息？"
 },
 {
  "topic": "指南证据",
  "text": "如何查阅日达仙相关的指南与循证资料？"
 },
 {
  "topic": "病历点评",
  "text": "日达仙相关病例的病史和用药记录还需要补充什么？"
 },
 {
  "topic": "用药安全",
  "text": "如何查找日达仙说明书中的注意事项与不良反应？"
 },
 {
  "topic": "临床研究",
  "text": "解读日达仙相关研究时，如何梳理研究终点？"
 },
 {
  "topic": "用法用量",
  "text": "查阅日达仙用法用量前，应核对哪些资料？"
 },
 {
  "topic": "特殊人群",
  "text": "不同人群使用日达仙时，应该查阅哪些说明书信息？"
 },
 {
  "topic": "指南证据",
  "text": "日达仙相关资料中，如何区分指南意见与原始研究？"
 },
 {
  "topic": "用药安全",
  "text": "如何建立日达仙合并用药核对清单？"
 },
 {
  "topic": "病历点评",
  "text": "日达仙相关病例的病历点评支持哪些维度？"
 }
];
const TOPIC_MATERIALS={'用法用量':'说明书用法用量及资料核对清单','用药安全':'药物相互作用与注意事项资料','特殊人群':'特殊人群用药资料','指南证据':'指南阅读要点与原始出处','病历点评':'病历信息完整性核对清单','临床研究':'研究设计与终点解读资料'};
const MODULES=[{id:'qa',name:'日达仙问答',icon:'chat'},{id:'case',name:'病历点评',icon:'case'},{id:'guides',name:'相关指南',icon:'book'},{id:'papers',name:'最新文献',icon:'paper'}];
const DATE_KEY = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const DATE_ANCHOR = new Date(DATE_KEY+'T12:00:00+08:00');
const EVENTS=[];
for(let day=0;day<30;day++){
 const dateKey=new Date(DATE_ANCHOR.getTime()-day*86400000).toISOString().slice(0,10);
 DOCTORS.forEach((doctor,i)=>{
  if((day+i)%4===0||(i*7+day)%13===0)return;
  const add=(type,n=0,question=null)=>{EVENTS.push({id:`${day}-${doctor.id}-${type}-${n}`,doctor:doctor.id,type,day,at:`${dateKey}T${String(8+(i%8)).padStart(2,'0')}:${String((i*11+n*9+day)%60).padStart(2,'0')}:00+08:00`,question});};
  add('video');
  const questionCount=1+(day+i)%3+(day%4===0?1:0);
  for(let n=0;n<questionCount;n++)add('qa',n,QUESTION_BANK[(day*2+i+n*3)%QUESTION_BANK.length]);
  if((i+day)%3===0)add('case');
  if((i+day)%2===0)add('guides');
  if((i+day)%3!==0)add('papers');
 });
}
EVENTS.sort((a,b)=>b.at.localeCompare(a.at));
