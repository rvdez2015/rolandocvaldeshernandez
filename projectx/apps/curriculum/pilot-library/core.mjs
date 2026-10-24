/* Project X pure curriculum library model. No Firestore or DOM dependencies. */
export const RELEASE_ID = 'y11-j277-canonical-pilot-20261024-r1';
export const SCHOOL_ID = 'project-x-personal';
export const LESSON_LIMIT = 94;
export const REV = '1.0.0';
export const EXPECTED = Object.freeze({lessons:94,questions:376,families:376,revisions:1410});
export const pathToLesson = id => ['catalogueLessons',String(id),'revisions',RELEASE_ID];
export const pathToQuestion = id => ['catalogueQuestionBank',String(id),'revisions',REV];
export const pathToFamily = id => ['catalogueQuestionFamilies',String(id),'versions',REV];
export const pathToKeys = id => ['catalogueTeacherKeys',String(id),'revisions',RELEASE_ID];
export const pathToStudentLesson = id => ['catalogueStudentLessons',String(id),'revisions',RELEASE_ID];
export const pathToStudentQuestion = id => ['catalogueStudentQuestionBank',String(id),'revisions',REV];
export const unitOf = l => String(l.unitId||'');
export const numericUnit = u => Number((String(u).match(/U(\d+)/)||[])[1]||0);
export const lessonNumber = l => Number((String(l.lessonId).match(/L(\d+)$/)||[])[1]||0);
export const unitLabels = {
 '01':'Systems architecture','02':'Memory and storage','03':'Data representation',
 '04':'Networks and protocols','05':'Network security','06':'Systems software',
 '07':'Ethical, legal, cultural and environmental impacts','08':'Algorithms',
 '09':'Programming fundamentals','10':'Robust programming','11':'Boolean logic',
 '12':'Languages and IDEs','13':'Impacts and law revision','14':'Python setup',
 '15':'Python output and variables','16':'Python input','17':'Python types and arithmetic',
 '18':'Python selection','19':'Python libraries','20':'Python iteration',
 '21':'Python subprograms','22':'Python collections','23':'Python string and number handling',
 '24':'Python files','25':'Python GUI extension','26':'Python error handling'
};
export function nameUnit(id){const m=String(id).match(/U(\d+)/);const number=m?m[1]:'00';return `Unit ${Number(number)} · ${unitLabels[number]||'Curriculum unit'}`}
export function normaliseIndex(records){
 const map=new Map();
 for(const r of records){
  if(typeof r.lessonId!=='string'||!/^PX25-Y11-U\d{2}-L\d{3}$/.test(r.lessonId))throw Error('Unexpected lesson ID in index');
  if(r.visibility!=='owner_private'||r.studentPublished!==false)throw Error('Unsafe index visibility: '+r.lessonId);
  if(r.revisionId!==RELEASE_ID)throw Error('Unexpected release in index: '+r.lessonId);
  if(map.has(r.lessonId))throw Error('Duplicate lesson ID: '+r.lessonId);
  map.set(r.lessonId,r);
 }
 return Array.from(map.values()).sort((a,b)=> numericUnit(a.unitId)-numericUnit(b.unitId)||lessonNumber(a)-lessonNumber(b));
}
export function groupByUnit(records){
 const units=new Map();
 for(const r of records){if(!units.has(r.unitId))units.set(r.unitId,[]);units.get(r.unitId).push(r)}
 return Array.from(units,([unitId,lessons])=>({unitId,title:nameUnit(unitId),lessons}));
}
export function filterLessons(records,{query='',unit='all',role='all'}={}){
 const needle=String(query).toLowerCase().trim();
 return records.filter(l=>
 (unit==='all'||l.unitId===unit)&&
 (role==='all'||l.curriculumRole===role)&&
 (!needle||[l.title,l.lessonId,l.curriculumRole,l.unitId].some(x=>String(x||'').toLowerCase().includes(needle)))
 );
}
export function reconcileQuestions(lesson,questions,keys){
 if(!lesson||!Array.isArray(lesson.assessmentItemRefs))throw Error('Lesson assessment references missing');
 if(!keys?.teacherOnly)throw Error('Teacher mark scheme is not restricted');
 const q=new Map(questions.map(x=>[x.questionId,x]));
 const k=new Map((keys.questionMarkSchemes||[]).map(x=>[x.itemId,x]));
 let marks=0;const result=[];
 for(const ref of lesson.assessmentItemRefs){
  const qn=q.get(ref.itemId),key=k.get(ref.itemId);
  if(!qn||!key)throw Error('Missing question or key for '+ref.itemId);
  if(qn.familyId!==ref.familyId||key.familyId!==ref.familyId)throw Error('Question family mismatch: '+ref.itemId);
  if(qn.marks!==ref.marks||key.marks!==ref.marks)throw Error('Question marks mismatch: '+ref.itemId);
  if(!Array.isArray(key.markingPoints)||key.markingPoints.length!==key.marks)throw Error('Unmatched marking point count: '+ref.itemId);
  marks+=ref.marks;
  result.push({ref,question:qn,marking:key});
 }
 if(marks!==10)throw Error('Expected 10 marks; got '+marks);
 return result;
}
const EDITABLE={
 objectives:'teacherPlan.learningObjectives',
 success:'teacherPlan.successCriteria',
 explanation:'teacherPlan.subjectExplanation',
 misconceptions:'teacherPlan.misconceptions',
 homework:'teacherPlan.homework',
 reflections:'teacherPlan.teacherOnlyGuidance'
};
export const editableFieldPaths = Object.freeze({...EDITABLE});
export function textForEdit(lesson){
 const plan=lesson?.teacherPlan||{};
 return {
  objectives:(plan.learningObjectives||[]).join('\n'),
  success:(plan.successCriteria||[]).join('\n'),
  explanation:String(plan.subjectExplanation||''),
  misconceptions:(plan.misconceptions||[]).join('\n'),
  homework:String(plan.homework||''),
  reflections:String(plan.teacherOnlyGuidance||'')
 };
}
export function createDraftProposal({lesson,original,edited,actor,reason,baseHash}){
 if(!actor?.uid||!actor.email)throw Error('Authenticated teacher required');
 if(!reason?.trim())throw Error('A reason for the proposed revision is required');
 const changes=[];
 for(const [field,path] of Object.entries(EDITABLE)){
  if(String(original[field]||'')!==String(edited[field]||'')){
   changes.push({field,path,before:String(original[field]||''),after:String(edited[field]||'')});
  }
 }
 if(!changes.length)throw Error('No changes to save');
 return {
  packageType:'projectx-teacher-revision-proposal-v1',
  serverCommitStatus:'NOT_SUBMITTED',
  schoolId:SCHOOL_ID,
  lessonId:lesson.lessonId,
  parentRevisionId:lesson.revisionId,
  baseSourceHash:baseHash||null,
  proposerUid:actor.uid,
  proposerEmail:actor.email,
  proposerName:actor.displayName||'',
  proposedAtClient:new Date().toISOString(),
  proposedAtIsNotServerTimestamp:true,
  reason:reason.trim(),changes,
  studentPublished:false,
  teacherReviewRequired:true,
  note:'Offline draft export only. No Firestore mutation or server-authenticated authorship record has occurred.'
 };
}
export function ensureOwnerPrivate(data){
 if(!data||data.schoolId!==SCHOOL_ID||data.visibility!=='owner_private')throw Error('Incorrect school or non-private record');
}
