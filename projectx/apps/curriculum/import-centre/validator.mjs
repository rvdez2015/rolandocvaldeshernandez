/* Pure validation and path planning. No Firebase, no private data included in this file. */
export const RELEASE_ID = 'y11-j277-canonical-pilot-20261024-r1';
export const SCHOOL_ID = 'project-x-personal';
const forbidden = new Set(['teacherPlan','teacherActions','teacherOnlyGuidance','markingPoints','markingPrinciples','modelAnswer','modelAnswerDraft','workedSteps','acceptedAnswers','questionMarkSchemes','workModel','teacherReviewPlan','releaseGovernance','auditV5','auditV6','sourceAnswerStatus','teacherDecision','revisionMetadata','markAllocation','solutionStatus','teacherOnly','restrictedTeacherOnly']);
const fail = m => { throw new Error(m); };
const assert = (p,m) => {if(!p)fail(m)};
const unique = (a,label) => {const out=new Map();for(const o of a){assert(o&&typeof o==='object'&&typeof o[label]==='string'&&o[label].length>0,'Missing '+label);assert(!out.has(o[label]),'Duplicate '+label+': '+o[label]);out.set(o[label],o)}return out};
export function studentSafeCheck(obj, path='student') {
 if(Array.isArray(obj)){obj.forEach((x,i)=>studentSafeCheck(x,`${path}[${i}]`));return}
 if(obj&&typeof obj==='object')for(const [k,v] of Object.entries(obj)) {assert(!forbidden.has(k),`Restricted key in student record: ${path}.${k}`);studentSafeCheck(v,`${path}.${k}`)}
}
export function buildOperations(bundle) {
 const {lessons,questions,families,teacherKeys,studentLessons,studentQuestions}=bundle;
 const ops=[];
 for(const f of families)ops.push({kind:'family',id:f.familyId,version:'1.0.0',path:`catalogueQuestionFamilies/${f.familyId}/versions/1.0.0`,record:f});
 for(const q of questions)ops.push({kind:'question',id:q.questionId,version:q.version,path:`catalogueQuestionBank/${q.questionId}/revisions/${q.version}`,record:q});
 for(const q of studentQuestions)ops.push({kind:'studentQuestion',id:q.questionId,version:q.version,path:`catalogueStudentQuestionBank/${q.questionId}/revisions/${q.version}`,record:q});
 for(const l of lessons)ops.push({kind:'lesson',id:l.lessonId,version:l.revisionId,path:`catalogueLessons/${l.lessonId}/revisions/${l.revisionId}`,record:l});
 for(const l of studentLessons)ops.push({kind:'studentLesson',id:l.lessonId,version:l.revisionId,path:`catalogueStudentLessons/${l.lessonId}/revisions/${l.revisionId}`,record:l});
 for(const k of teacherKeys)ops.push({kind:'teacherKey',id:k.lessonId,version:k.revisionId,path:`catalogueTeacherKeys/${k.lessonId}/revisions/${k.revisionId}`,record:k});
 return ops;
}
export function validatePackage(b) {
 const start=Date.now();
 assert(b&&typeof b==='object'&&b.packageType==='projectx-canonical-y11-import','Wrong package type. Select PRIVATE_IMPORT_PAYLOAD.json');
 assert(b.releaseId===RELEASE_ID,'Unexpected releaseId');
 const names=['lessons','questions','families','teacherKeys','studentLessons','studentQuestions'];
 const sizes=[94,376,376,94,94,376];
 names.forEach((n,i)=>assert(Array.isArray(b[n])&&b[n].length===sizes[i],`${n}: expected ${sizes[i]} entries`));
 const L=unique(b.lessons,'lessonId'),Q=unique(b.questions,'questionId'),F=unique(b.families,'familyId'),K=unique(b.teacherKeys,'lessonId'),SL=unique(b.studentLessons,'lessonId'),SQ=unique(b.studentQuestions,'questionId');
 let totalMarks=0, questionCount=0, extensions=0;
 for(const f of b.families){
  assert(Number.isInteger(f.marks)&&f.marks>0&&f.marks<=10,'Bad family marks '+f.familyId);
  assert(Array.isArray(f.markingPrinciples)&&f.markingPrinciples.length===f.marks,'Bad family marking points '+f.familyId);
  assert(Array.isArray(f.canonicalQuestionIds)&&f.canonicalQuestionIds.length>0,'No family questions '+f.familyId);
  for(const qid of f.canonicalQuestionIds)assert(Q.get(qid)?.familyId===f.familyId,'Family question back-link mismatch '+qid);
 }
 for(const q of b.questions){
  assert(q.version==='1.0.0','Unexpected bank version '+q.questionId);
  const family=F.get(q.familyId),safe=SQ.get(q.questionId);
  assert(family&&family.marks===q.marks,'Question-family mismatch '+q.questionId);
  assert(safe&&safe.familyId===q.familyId&&safe.marks===q.marks&&safe.version===q.version&&safe.canonicalStem===q.canonicalStem,'Student bank question mismatch '+q.questionId);
  assert(q.conceptFamilyRef?.familyId===q.familyId,'Missing concept link '+q.questionId);
  assert(L.has(q.originLessonId),'Question has no source lesson '+q.questionId);
  studentSafeCheck(safe,'studentQuestion/'+q.questionId);
 }
 for(const l of b.lessons){
  assert(/^PX25-Y11-U\d{2}-L\d{3}$/.test(l.lessonId),'Invalid lesson ID '+l.lessonId);
  assert(l.revisionId===RELEASE_ID&&l.schemaVersion===2&&l.durationMinutes===45&&l.yearGroup===11,'Unexpected lesson schema '+l.lessonId);
  assert(Array.isArray(l.activities)&&l.activities.reduce((n,a)=>n+Number(a.minutes),0)===45,'Lesson duration != 45 '+l.lessonId);
  assert(l.releaseGovernance?.automatedStudentPublication===false,'Unsafe release flag '+l.lessonId);
  const k=K.get(l.lessonId),s=SL.get(l.lessonId);
  assert(k?.revisionId===RELEASE_ID&&s?.revisionId===RELEASE_ID,'Missing matching lesson/key/student record '+l.lessonId);
  assert(k.teacherOnly===true&&k.independentModerationComplete===false,'Unexpected teacher key flags '+l.lessonId);
  assert(s.studentPublicationApproved===false&&s.approvedForAutomaticStudentRelease===false,'Student auto-publication not disabled '+l.lessonId);
  studentSafeCheck(s,'studentLesson/'+l.lessonId);
  const qs=l.studentPlan?.assessmentQuestions,refs=l.canonicalQuestionBank?.references,ks=k.questionMarkSchemes,ss=s.studentPlan?.assessmentQuestions,stRefs=s.questionReferences;
  assert(Array.isArray(qs)&&qs.length===4&&refs?.length===4&&ks?.length===4&&ss?.length===4&&stRefs?.length===4,'Expected four questions per lesson '+l.lessonId);
  assert(qs.reduce((n,q)=>n+Number(q.marks),0)===10,'Lesson assessment !=10 marks '+l.lessonId);
  const stageIds=new Set(l.activities.map(x=>x.stageId));
  assert(stageIds.size===l.activities.length,'Duplicate activity stages '+l.lessonId);
  for(let i=0;i<4;i++){
   const q=qs[i],ref=refs[i],answer=ks[i],safe=ss[i],studentRef=stRefs[i],bank=Q.get(q.itemId);
   assert(bank&&bank.originLessonId===l.lessonId,'Unknown canonical question '+q.itemId);
   assert(q.itemId===ref.questionId&&q.itemId===answer.itemId&&q.itemId===safe.itemId&&q.itemId===studentRef.questionId,'Question ID mismatch '+l.lessonId);
   assert(q.question===bank.canonicalStem&&safe.question===q.question,'Question wording mismatch '+q.itemId);
   assert(q.marks===bank.marks&&q.marks===answer.marks&&q.marks===safe.marks&&q.marks===ref.marks,'Question marks mismatch '+q.itemId);
   assert(ref.version===bank.version&&studentRef.version===bank.version&&ref.familyId===bank.familyId,'Question bank revision mismatch '+q.itemId);
   assert(answer.familyId===bank.familyId&&Array.isArray(answer.markingPoints)&&answer.markingPoints.length===q.marks,'Incorrect private mark scheme '+q.itemId);
   assert(JSON.stringify(answer.markingPoints)===JSON.stringify(F.get(bank.familyId).markingPrinciples),'Family-core marking conflict '+q.itemId);
   assert((l.assessmentItemRefs||[]).some(r=>r.itemId===q.itemId&&stageIds.has(r.stageId)),'Missing assessment stage reference '+q.itemId);
   totalMarks+=q.marks;questionCount++;
  }
  if(['optional_enrichment','a_level_bridge'].includes(l.curriculumRole))extensions++;
 }
 const operations=buildOperations(b);
 assert(operations.length===1410,'Wrong operation count');
 assert(new Set(operations.map(o=>o.path)).size===1410,'Duplicate Firestore document path');
 for(const o of operations)assert(new TextEncoder().encode(JSON.stringify(o.record)).length<750_000,'Firestore size risk: '+o.path);
 return {ok:true,lessons:L.size,questions:Q.size,families:F.size,teacherKeys:K.size,studentLessons:SL.size,studentQuestions:SQ.size,docs:operations.length,questionCount,totalMarks,extensions,checkedAt:new Date().toISOString(),elapsedMs:Date.now()-start};
}
export async function jsonHash(value) {
 const bytes=new TextEncoder().encode(JSON.stringify(value));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
