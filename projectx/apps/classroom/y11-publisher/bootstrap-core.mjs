/* Project X — Year 11 Classroom bootstrap. Pure, side-effect-free safeguards. */
import {validateIndex, safeStudentContent, topicTitle, classroomBody, classroomMarker, RELEASE_ID, UNIT_LABELS} from './core-v5.mjs';
import {inferYearGroup} from './course-routing-v5.mjs';
import {createStudentPack} from './resources-v4.mjs';

export const COURSE_NAME = 'Year 11 Computer Science - OCR J277';
export const COURSE_SECTION = '2026-2027';
export const WORKSHEET_VERSION = 'worksheet-only-v1';
export const YEAR = 11;
export const BATCH_SIZE = 10;
const markerId = /^PX25-Y11-U\d{2}-L\d{3}$/;
const escapeHTML = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function planCurriculum(records){
  const lessons=validateIndex(records);
  const unitIds=[...new Set(lessons.map(item=>item.unitId))].sort();
  if(unitIds.length!==26 || unitIds.some((id,i)=>id!==`PX25-Y11-U${String(i+1).padStart(2,'0')}`))throw Error('Year 11 must contain 26 mapped, ordered units.');
  if(Object.keys(UNIT_LABELS).length!==26)throw Error('Unit labels mismatch');
  return {lessons, units:unitIds.map(id=>({unitId:id,name:topicTitle(id)}))};
}
export function coursePayload(){
  return {name:COURSE_NAME,section:COURSE_SECTION,descriptionHeading:'Year 11 - OCR GCSE Computer Science J277',description:'Project X Year 11 course. Curriculum topics and teacher-reviewed worksheets only. Presentations, diagrams, code and video resources are created on demand within Project X.',ownerId:'me',courseState:'PROVISIONED'};
}
export function isTargetCourse(course){
  return !!course?.id && course.name===COURSE_NAME && course.section===COURSE_SECTION && inferYearGroup(course)===11 && ['ACTIVE','PROVISIONED'].includes(course.courseState);
}
export function isActiveTarget(course){return isTargetCourse(course)&&course.courseState==='ACTIVE';}
export function matchingCourse(course){
  return !!course && String(course.name||'').toLowerCase()===COURSE_NAME.toLowerCase() && String(course.section||'')===COURSE_SECTION;
}
export function worksheetMarker(lessonId){if(!markerId.test(lessonId))throw Error('Invalid Year 11 lesson ID');return `ProjectX-Ref: ${lessonId} | ${RELEASE_ID} | ${WORKSHEET_VERSION}`;}
export function worksheetTitle(student){return `Y11 Worksheet - ${String(student.title).slice(0,165)}`;}
export function createWorksheetOnly(studentRecord){
  // Keep the existing Project X student worksheet, including teacher-reviewed worked examples
  // and the canonical 10-mark questions. Exclude standalone extra resource sections only.
  const student=safeStudentContent(studentRecord),pack=createStudentPack(studentRecord),file=pack.files.find(f=>f.kind==='worksheet');
  if(!file || !file.content)throw Error('Original Project X worksheet is missing');
  const marker=worksheetMarker(student.lessonId);
  const html=file.content
    .replace(/<section><h2>Visual resource<\/h2>[\s\S]*?<\/section>/g,'')
    .replace(/<section><h2>Programming activity<\/h2>[\s\S]*?<\/section>/g,'')
    .replace(/student-resource-pack-v4/g,WORKSHEET_VERSION);
  if(!html.includes(marker))throw Error('Worksheet marker does not match the original student lesson');
  return {lessonId:student.lessonId,title:student.title,unitId:student.unitId,html,marker,marks:pack.assessmentMarks,activityCount:student.activities.length,teacherWarnings:pack.resourceWarnings};
}
export function worksheetDraft(worksheet,topicId,driveFileId){
  if(!topicId||!driveFileId||worksheet.marks!==10)throw Error('Missing approved topic/Drive worksheet or incorrect assessment marks');
  return {title:worksheetTitle(worksheet),description:`Student worksheet for ${worksheet.title}. Includes guided activities and 10 original practice marks. Review before publishing. No separate presentations, diagrams, videos or code files.\n\n${worksheet.marker}`,workType:'ASSIGNMENT',maxPoints:10,state:'DRAFT',topicId,materials:[{driveFile:{driveFile:{id:driveFileId},shareMode:'STUDENT_COPY'}}]};
}
export function matchWorksheet(items,worksheet){
  const hits=items.filter(item=>String(item.description||'').includes(worksheet.marker));
  if(hits.length>1)throw Error('Duplicate worksheet markers found; resolve manually');
  if(!hits.length)return null;
  const existing=hits[0];
  if(existing.state!=='DRAFT'||existing.maxPoints!==10||existing.workType!=='ASSIGNMENT'||!existing.materials?.some(m=>m.driveFile?.driveFile?.id))throw Error('Existing worksheet differs or is published. Stop; never overwrite.');
  return existing;
}
export function nextBatch(plan,doneIds){
  const done=new Set(doneIds);
  return plan.lessons.filter(item=>!done.has(item.lessonId)).slice(0,BATCH_SIZE);
}


// Stand-alone Classroom MATERIAL posts are deliberately separate from worksheet ASSIGNMENTS.
// They contain the student-safe lesson context and activities, with no attached extra resources.
export function materialMarker(lessonId){return classroomMarker(lessonId,'material');}
// v1.2: restore objectives and success criteria from the authoritative owner-only
// catalogueLessons record. Never send the full teacherPlan or marking data to Classroom.
export function approvedLearningTargets(studentRecord, teacherRecord){
  const student=safeStudentContent(studentRecord);
  if(!teacherRecord || teacherRecord.lessonId!==student.lessonId || teacherRecord.revisionId!==RELEASE_ID || teacherRecord.unitId!==student.unitId)
    throw Error('Owner lesson and student lesson identity/revision mismatch. Stop before creating any Material.');
  const plan=teacherRecord.teacherPlan;
  if(!plan || typeof plan!=='object')throw Error('Authoritative teacherPlan is unavailable for '+student.lessonId);
  const clean=(value,label)=>{
    if(!Array.isArray(value)||value.length<1||value.length>12)throw Error(`${label} missing or unexpectedly structured for ${student.lessonId}`);
    return value.map((entry,i)=>{
      if(typeof entry!=='string'||!entry.trim()||entry.trim().length>450 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(entry))throw Error(`${label} item ${i+1} invalid for ${student.lessonId}`);
      return entry.trim();
    });
  };
  return {objectives:clean(plan.learningObjectives,'Learning objectives'),successCriteria:clean(plan.successCriteria,'Success criteria')};
}
// Reconstruct the exact v1.1 description to permit safe, explicit migration of
// existing drafts. If the teacher has edited a draft, migration stops instead.
export function legacyLessonMaterialDraft(studentRecord,topicId){
  if(!topicId)throw Error('Approved lesson topic missing');
  const student=safeStudentContent(studentRecord);
  const base=classroomBody(studentRecord,'material',topicId);
  const description=base.description.replace(
    'Lesson resource note: Supply referenced diagrams, worksheets or code separately before student publication.',
    'Related worksheet: separate Classroom assignment. Diagrams, videos, presentations and code starters are supplied on demand by the teacher.'
  );
  if(description.length>25000)throw Error('Lesson material description is too long');
  return {title:`Y11 Material - ${student.title}`.slice(0,180),description,topicId,state:'DRAFT'};
}
export function lessonMaterialDraft(studentRecord,topicId,teacherRecord){
  const base=legacyLessonMaterialDraft(studentRecord,topicId);
  const student=safeStudentContent(studentRecord);
  const targets=approvedLearningTargets(studentRecord,teacherRecord);
  const anchor=`Lesson: ${student.title}\n`;
  if(!base.description.includes(anchor))throw Error('Lesson title anchor is missing');
  const detail=`${anchor}\nLearning objectives:\n${targets.objectives.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nSuccess criteria:\n${targets.successCriteria.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n`;
  const description=base.description.replace(anchor,detail);
  if(description.length>25000)throw Error('Lesson objectives make Material too long; review before creating it');
  return {...base,description};
}
export function materialUpgradeStatus(existing,legacy,proposed){
  if(!existing?.id)throw Error('Existing Material draft has no Google ID');
  if(existing.state!=='DRAFT')throw Error('Material is published or not a draft: never upgrade automatically');
  if(String(existing.topicId)!==String(legacy.topicId) || String(existing.topicId)!==String(proposed.topicId))throw Error('Existing Material topic differs: stop for manual review');
  if(existing.title!==legacy.title || existing.title!==proposed.title)throw Error('Existing Material title differs: stop for manual review');
  if(existing.materials?.length)throw Error('Existing Material has additional attachments: stop for manual review');
  if(existing.description===proposed.description)return 'already-upgraded';
  if(existing.description===legacy.description)return 'upgrade';
  throw Error('Existing Material was edited or differs from v1.1: do not overwrite teacher changes');
}
export function matchLessonMaterial(items,expected){
  const marker=typeof expected==='string'?expected:expected?.marker||expected?.description?.match(/ProjectX-Ref: PX25-Y11-U\d{2}-L\d{3} \| [^\n]+ \| material/)?.[0];
  if(!marker)throw Error('Lesson Material marker is missing');
  const hits=items.filter(item=>String(item.description||'').includes(marker));
  if(hits.length>1)throw Error('Duplicate lesson Material markers found: stop and review');
  if(!hits.length)return null;
  const item=hits[0];
  if(item.state!=='DRAFT')throw Error('Matching lesson Material is published or otherwise not a draft: stop and review');
  if(expected?.topicId && String(item.topicId)!==String(expected.topicId))throw Error('Matching lesson Material is under the wrong topic: stop and review');
  if(expected?.description && item.description!==expected.description)throw Error('Existing lesson Material differs from Project X draft: stop and review');
  return item;
}
