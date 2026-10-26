/** Pure student-safe resource generation and export utilities. No secrets, no Firestore. */
export const TYPES=['presentation','diagram','worksheet','quiz','video','code'];
const clip=(s,n=1500)=>String(s??'').slice(0,n).trim();
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contextFor(lesson){
 if(!/^PX25-Y11-U\d\d-L\d\d\d$/.test(lesson?.lessonId||''))throw Error('Invalid Year 11 pilot lesson ID.');
 const p=lesson.teacherPlan||{},s=lesson.studentPlan||{};
 return {lessonId:lesson.lessonId,title:clip(lesson.title,200),yearGroup:11,unitId:lesson.unitId,
  objectives:(p.learningObjectives||[]).slice(0,6).map(x=>clip(x,250)),criteria:(p.successCriteria||[]).slice(0,6).map(x=>clip(x,250)),
  vocabulary:(p.vocabulary||[]).slice(0,12).map(x=>clip(x,80)),
  subjectExplanation:clip(p.subjectExplanation,3300),misconceptions:(p.misconceptions||[]).slice(0,6).map(x=>clip(x,220)),
  activities:(s.activities||[]).slice(0,8).map(x=>clip(x.instructions,500)),
  studentQuestions:(s.assessmentQuestions||[]).slice(0,6).map(x=>({question:clip(x.question,700),marks:Number(x.marks)||0}))};
}
const short=(v,count)=>clip(v,count);
export function createOfflineDraft(type,lesson){
 if(!TYPES.includes(type))throw Error('Unknown resource type');
 const c=contextFor(lesson),title=c.title,verbs=c.objectives.length?c.objectives:[`Describe ${title}`,`Apply knowledge of ${title}`];
 const meta={kind:type,title:`${title} — ${type[0].toUpperCase()+type.slice(1)}`,source:'template',teacherReviewRequired:true};
 switch(type){
  case 'presentation':return {...meta,slides:[
   {title:`${title}`,bullets:[`OCR J277 · Year 11`,...verbs.slice(0,2)],speakerNotes:'Introduce the key question and retrieve prior knowledge.'},
   {title:'Learning objectives',bullets:verbs,speakerNotes:'Clarify success criteria with pupils.'},
   {title:'Key knowledge',bullets:[short(c.subjectExplanation||'Add a verified subject explanation.',900)],speakerNotes:'Teacher must check content accuracy and add a relevant example.'},
   {title:'Apply your knowledge',bullets:c.activities.slice(0,3).length?c.activities.slice(0,3):['Complete a topic-specific guided problem.'],speakerNotes:'Adapt tasks to your students and available resources.'},
   {title:'Check your understanding',bullets:c.studentQuestions.slice(0,3).map(q=>q.question),speakerNotes:'Use canonical assessment questions; keep marking guidance private.'}]};
  case 'diagram':{
   meta.lessonId=c.lessonId;
   const base=(c.vocabulary.length>=3?c.vocabulary.slice(0,5):[...verbs.slice(0,4)]).map((x,i)=>({id:'n'+i,label:short(x,54)}));
   const nodes=[{id:'topic',label:short(title,45)},...base];
   const edges=base.map(n=>({from:'topic',to:n.id,label:'related concept'}));
   return {...meta,caption:`Concept map for ${c.lessonId}. Teacher must verify every relationship.`,nodes,edges};
  }
  case 'worksheet':return {...meta,instructions:'Complete the activities. Show working and explanations where required.',tasks:[...c.activities.slice(0,4).map(x=>({prompt:x,level:'standard'})),...c.studentQuestions.slice(0,4).map(x=>({prompt:x.question,marks:x.marks,level:'exam-style'}))]};
  case 'quiz':return {...meta,instructions:'Teacher-reviewed, original examination-style questions.',questions:c.studentQuestions.map((q,i)=>({id:`${c.lessonId}-Q${i+1}`,question:q.question,marks:q.marks}))};
  case 'video':return {...meta,searchTerms:[`${title} GCSE Computer Science OCR J277 explanation`,`${title} visual walkthrough`],approvedLinks:[],note:'Search suggestions only. No video has been verified or endorsed.'};
  case 'code':return {...meta,language:'python',code:`# Project X · ${c.lessonId}\n# ${title}\n# Teacher: create a topic-specific exercise before sharing.\n\ndef main():\n    print('Start your ${short(title.replace(/['\\]/g,''),55)} exercise')\n\nif __name__ == '__main__':\n    main()\n`,notes:'Starter template only. Teacher must adapt and test the code.'};
 }
}
export function validateDraft(type,data){
 if(!TYPES.includes(type)||!data||typeof data!=='object'||Array.isArray(data)||data.kind!==type)throw Error('Resource type mismatch');
 if(typeof data.title!=='string'||!data.title.trim()||data.title.length>220)throw Error('Resource title missing/too long');
 const size=JSON.stringify(data).length;if(size>62000)throw Error('Resource exceeds 62 KB. Split into smaller materials.');
 const array=(v,max)=>Array.isArray(v)&&v.length>=1&&v.length<=max;
 if(type==='presentation'&&!array(data.slides,14))throw Error('Presentation needs 1–14 slides');
 if(type==='diagram'){if(!array(data.nodes,14)||!Array.isArray(data.edges)||data.edges.length>25)throw Error('Diagram needs up to 14 nodes and 25 edges');const ids=data.nodes.map(n=>n.id);if(new Set(ids).size!==ids.length||data.edges.some(e=>!ids.includes(e.from)||!ids.includes(e.to)))throw Error('Diagram references invalid nodes');}
 if(type==='worksheet'&&!array(data.tasks,22))throw Error('Worksheet needs 1–22 tasks');
 if(type==='quiz'){if(!array(data.questions,18))throw Error('Quiz needs 1–18 questions');if(data.questions.some(x=>!x.question||!Number.isInteger(Number(x.marks))||Number(x.marks)<1))throw Error('Quiz questions or marks invalid');const marks=data.questions.reduce((n,x)=>n+Number(x.marks),0);if(marks!==10)throw Error('Canonical quiz must total 10 marks');}
 if(type==='video'&&!Array.isArray(data.searchTerms))throw Error('Video resource requires search terms');
 if(type==='code'&&typeof data.code!=='string')throw Error('Code draft missing code');
 // Block accidental contamination of student-facing artefacts by teacher key metadata.
 if(/"(?:markingPoints|teacherOnly|modelAnswer|answerKey)"\s*:/i.test(JSON.stringify(data)))throw Error('Restricted teacher answer-key data is not permitted in student resources');
 return data;
}
export function safeVideoUrl(raw){
 try{const u=new URL(raw);if(u.protocol!=='https:')return null;
  if(['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)&&(/^(\/watch|\/shorts\/[^/]+|\/embed\/[^/]+)$/.test(u.pathname)))return u.href;
  if(u.hostname==='youtu.be'&&/^\/[a-zA-Z0-9_-]{6,}$/.test(u.pathname))return u.href;
  if(['www.bbc.co.uk','bbc.co.uk','vimeo.com','www.vimeo.com'].includes(u.hostname))return u.href;
 }catch{}return null;
}
export function diagramSVG(d){
 validateDraft('diagram',d);const ns=d.nodes.slice(0,14),edges=d.edges.filter(e=>ns.some(n=>n.id===e.from)&&ns.some(n=>n.id===e.to));
 const w=1080,h=Math.max(440,160+ns.length*92),pos=new Map();const central=ns[0];pos.set(central.id,[540,98]);ns.slice(1).forEach((n,i)=>{const left=i%2===0;pos.set(n.id,[left?270:810,210+Math.floor(i/2)*102]);});
 const output=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#0c112a"/><text x="40" y="43" font-family="sans-serif" font-size="24" fill="#e8dafa">${esc(d.title)}</text>`];
 for(const e of edges){const a=pos.get(e.from),b=pos.get(e.to);output.push(`<line x1="${a[0]}" y1="${a[1]+24}" x2="${b[0]}" y2="${b[1]-24}" stroke="#c39bf4" stroke-width="3"/>`);}
 ns.forEach((n,i)=>{const [x,y]=pos.get(n.id),fill=i===0?'#6826b2':'#27214d';output.push(`<rect x="${x-215}" y="${y-30}" width="430" height="68" rx="14" fill="${fill}" stroke="#a779e7"/><text x="${x}" y="${y+8}" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#fff">${esc(short(n.label,48))}</text>`)});
 output.push(`<text x="40" y="${h-25}" font-family="sans-serif" font-size="14" fill="#d7b65b">Project X · ${esc(d.lessonId||'Lesson draft')} · Teacher verification required</text></svg>`);return output.join('');
}
export function exportHTML(type,d){validateDraft(type,d);
 const base=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(d.title)}</title><style>body{margin:0;background:#10112a;color:#f4eafa;font:17px/1.65 Arial,sans-serif}main{margin:auto;max-width:1000px;padding:30px}section{background:#272044;margin:24px 0;padding:30px;border-radius:18px;border:1px solid #604291}h1,h2{color:#d8abff}button{padding:10px 16px}small{color:#d4b759}li{margin:12px 0}@media print{body{background:white;color:black}section{break-after:page;background:white;color:black;border:1px solid #ccc}h1,h2{color:#3d2870}}</style></head><body><main><h1>${esc(d.title)}</h1><small>Project X · Original teaching draft · Teacher review required</small>`;
 let sections='';
 if(type==='presentation')sections=d.slides.map((s,i)=>`<section><small>Slide ${i+1}/${d.slides.length}</small><h2>${esc(s.title)}</h2><ul>${(s.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p><small>Speaker note: ${esc(s.speakerNotes||'')}</small></p></section>`).join('');
 else if(type==='worksheet')sections=`<section><h2>Instructions</h2><p>${esc(d.instructions||'')}</p><ol>${d.tasks.map(t=>`<li>${esc(t.prompt||'')} ${t.marks?`(${Number(t.marks)} marks)`:''}<div style="min-height:95px;border-bottom:1px dotted #888"></div></li>`).join('')}</ol></section>`;
 else if(type==='quiz')sections=`<section><h2>Assessment</h2><ol>${d.questions.map(q=>`<li>${esc(q.question||'')} (${Number(q.marks)||1} marks)</li>`).join('')}</ol></section>`;
 else if(type==='video')sections=`<section><h2>Suggested searches</h2><ul>${d.searchTerms.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><h2>Teacher-approved links</h2><ul>${(d.approvedLinks||[]).filter(x=>safeVideoUrl(typeof x==='string'?x:x.url)).map(x=>{const u=safeVideoUrl(typeof x==='string'?x:x.url);return `<li><a style="color:#d8abff" href="${esc(u)}" rel="noopener">${esc(u)}</a></li>`}).join('')}</ul></section>`;
 else if(type==='code')sections=`<section><h2>Starter code</h2><pre style="white-space:pre-wrap">${esc(d.code)}</pre></section>`;
 else if(type==='diagram')sections=`<section>${diagramSVG(d)}</section>`;
 return base+sections+'</main></body></html>';
}
