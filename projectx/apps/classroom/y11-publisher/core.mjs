/* Project X · Pure Google Classroom publishing planner, no browser/Firebase dependencies. */
export const RELEASE_ID='y11-j277-canonical-pilot-20261024-r1';
export const SCHOOL_ID='project-x-personal';
export const UNIT_LABELS={
 '01':'Systems architecture','02':'Memory and storage','03':'Data representation','04':'Networks and protocols',
 '05':'Network security','06':'Systems software','07':'Ethical, legal, cultural & environmental impacts',
 '08':'Algorithms','09':'Programming fundamentals','10':'Robust programming','11':'Boolean logic',
 '12':'Languages and IDEs','13':'Impacts and law revision','14':'Python setup','15':'Python output and variables',
 '16':'Python input','17':'Python types and arithmetic','18':'Python selection','19':'Python libraries',
 '20':'Python iteration','21':'Python subprograms','22':'Python collections','23':'Python string and number handling',
 '24':'Python files','25':'Python GUI extension','26':'Python error handling'
};
export const lessonIdPattern=/^PX25-Y11-U\d{2}-L\d{3}$/;
const str=v=>String(v??'');
export function unitNo(unitId){const m=str(unitId).match(/U(\d{2})$/);return m?m[1]:null}
export function unitName(unitId){const n=unitNo(unitId);return n?`Year 11 · Unit ${Number(n)} · ${UNIT_LABELS[n]||'Computer Science'}`:'Unknown unit'}
export function validateIndex(entries){
 if(!Array.isArray(entries))throw Error('Invalid private index');
 const seen=new Set();
 for(const d of entries){
  if(!lessonIdPattern.test(d.lessonId||''))throw Error('Unexpected lesson ID');
  if(seen.has(d.lessonId))throw Error('Duplicate lesson ID');seen.add(d.lessonId);
  if(d.revisionId!==RELEASE_ID||d.visibility!=='owner_private'||d.studentPublished!==false)throw Error('Unexpected private index status: '+d.lessonId);
 }
 if(entries.length!==94||Object.keys(UNIT_LABELS).length!==26)throw Error(`Expected 94 lessons in 26 units, got ${entries.length}`);
 return entries.slice().sort((a,b)=>a.lessonId.localeCompare(b.lessonId));
}
export function selectPlanEntries(index,ids,mode){
 if(!['topics','materials','assignments','both'].includes(mode))throw Error('Unsupported operation');
 const allUnits=[...new Map(index.map(l=>[l.unitId,{unitId:l.unitId,name:unitName(l.unitId)}])).values()].sort((a,b)=>a.unitId.localeCompare(b.unitId));
 if(mode==='topics')return {mode,units:allUnits,lessons:[],itemCount:allUnits.length};
 const wanted=new Set(ids);const selected=index.filter(x=>wanted.has(x.lessonId));
 if(!selected.length||wanted.size!==selected.length)throw Error('Choose one or more valid Year 11 lessons');
 if(selected.length>10)throw Error('Batch limit: select up to 10 lessons per run');
 const units=[...new Map(selected.map(l=>[l.unitId,{unitId:l.unitId,name:unitName(l.unitId)}])).values()];
 return {mode,units,lessons:selected,itemCount:selected.length*(mode==='both'?2:1)};
}
export function safeStudentContent(student){
 if(!student||!lessonIdPattern.test(student.lessonId||''))throw Error('Invalid student-safe record');
 if(student.revisionId!==RELEASE_ID)throw Error('Student projection release mismatch');
 if(student.studentPublicationApproved!==false||student.approvedForAutomaticStudentRelease!==false)throw Error('Unexpected student publication status');
 const s=student.studentPlan;
 if(!s||s.answerKeysIncluded!==false)throw Error('Student projection includes unknown answer-key state');
 const activities=(s.activities||[]).map(a=>({stageId:str(a.stageId).slice(0,64),instructions:str(a.instructions).slice(0,3000),requiresTeacherProvidedExample:a.requiresTeacherProvidedExample===true}));
 const questions=(s.assessmentQuestions||[]).map(q=>({id:str(q.itemId),question:str(q.question).slice(0,3500),marks:Number(q.marks)}));
 if(!questions.length||questions.some(q=>!q.question||!Number.isInteger(q.marks)||q.marks<1))throw Error('Student question set invalid');
 if(questions.reduce((n,q)=>n+q.marks,0)!==10)throw Error('Expected a 10-mark student assessment set');
 const check=JSON.stringify({activities,questions}).toLowerCase();
 if(/"markingpoints"|"modelanswer"|\bmark scheme\b|\bteacher.only\b|\bcorrect answer\s*:/i.test(check))throw Error('Possible restricted answer text in student projection');
 return {lessonId:student.lessonId,title:str(student.title).slice(0,400),unitId:student.unitId,intro:str(s.intro).slice(0,3500),activities,questions};
}
export function classroomMarker(lessonId,kind){
 if(!lessonIdPattern.test(lessonId)||!['material','assignment'].includes(kind))throw Error('Invalid Classroom marker');
 return `ProjectX-Ref: ${lessonId} | ${RELEASE_ID} | ${kind}`;
}
export function topicTitle(unitId){return unitName(unitId).slice(0,100)}
export function classroomBody(student,kind,topicId){
 const s=safeStudentContent(student);const marker=classroomMarker(s.lessonId,kind);
 const lines=[
  `Project X · OCR J277 (Year 11) · initial teaching pilot`,
  `Lesson: ${s.title}`,
  `\nLearning context:\n${s.intro||'Discuss the key concepts before attempting the task.'}`,
  `\nStudent activities:`,
  ...s.activities.map((a,i)=>`${i+1}. ${a.stageId}: ${a.instructions}${a.requiresTeacherProvidedExample?' [Teacher to provide a worked example]':''}`)
 ];
 if(kind==='assignment')lines.push('\nAssessment practice (10 marks total):',...s.questions.map((q,i)=>`${i+1}. [${q.marks} mark${q.marks===1?'':'s'}] ${q.question}`));
 lines.push('\nComplete the activity as directed by your teacher. No marking scheme is attached.');
 const description=lines.join('\n').slice(0,26000)+'\n\n'+marker;
 const shared={title:`Y11 · ${s.title}`.slice(0,180),description,topicId,state:'DRAFT'};
 return kind==='assignment'?{...shared,workType:'ASSIGNMENT',maxPoints:10}:shared;
}
export function findRemoteByMarker(items,marker){return items.find(x=>String(x.description||'').includes(marker))||null}
export function topicIdFromName(items,title){return items.find(t=>t.name===title)?.topicId||null}
export function isOwnerIndexRecord(r){return r?.visibility==='owner_private'&&r.studentPublished===false&&r.revisionId===RELEASE_ID}
