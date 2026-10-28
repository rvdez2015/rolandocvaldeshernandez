/* Project X Year 11 Classroom Material reconciliation — pure functions only.
 * No network, authentication, private Firebase keys or browser state. */
import {RELEASE_ID, classroomMarker, safeStudentContent} from './core-v5.mjs';
import {lessonMaterialDraft} from './bootstrap-core.mjs';

export const MAX_DESCRIPTION=25000;
export const LESSON_PATTERN=/^PX25-Y11-U\d{2}-L\d{3}$/;

function fieldText(field,name){
 if(field===undefined||field===null||field==='')return '';
 if(Array.isArray(field)){
  if(field.length>30||field.some(x=>typeof x!=='string'))throw Error(`${name} is not a safe list of text items. Review the record manually.`);
  return field.map(x=>x.trim()).filter(Boolean).map(x=>`• ${x}`).join('\n');
 }
 if(typeof field!=='string')throw Error(`${name} has unexpected structure. Stop before exporting.`);
 if(field.length>12000)throw Error(`${name} is too long for an automatic draft proposal.`);
 return field.trim();
}

export function lessonEnrichment(teacher){
 const p=teacher?.teacherPlan;
 if(!p||typeof p!=='object')throw Error('Authoritative teacher plan not found');
 const fields=[
  ['Subject explanation',fieldText(p.subjectExplanation,'subjectExplanation')],
  ['Prior knowledge',fieldText(p.priorKnowledge,'priorKnowledge')],
  ['Common misconceptions',fieldText(p.misconceptions,'misconceptions')]
 ];
 if(!fields[0][1])throw Error('Subject explanation is empty. Review the lesson in Curriculum Centre first.');
 const enriched=fields.filter(([,t])=>t).map(([heading,t])=>`${heading}:\n${t}`).join('\n\n');
 if(/\b(marking\s+(?:scheme|points|criteria)|answer\s*key|teacher[- ]only\s+(?:answer|marking)|provisional\s+marking)\b/i.test(enriched))
   throw Error('Potential teacher-only marking text detected. Resolve before student-facing export.');
 return enriched;
}

export function proposedMaterial(studentRecord,teacherRecord,topicId){
 const student=safeStudentContent(studentRecord);
 if(teacherRecord?.lessonId!==student.lessonId||teacherRecord?.unitId!==student.unitId||teacherRecord?.revisionId!==RELEASE_ID)
  throw Error('Owner and student revisions or lesson IDs disagree. No sync allowed.');
 const base=lessonMaterialDraft(studentRecord,topicId,teacherRecord);
 const extra=lessonEnrichment(teacherRecord);
 const anchor='\nLearning context:\n';
 if(base.description.split(anchor).length!==2)throw Error('Unexpected v1.2 Material structure. Stop instead of overwriting.');
 const description=base.description.replace(anchor,`\n\n${extra}\n${anchor}`);
 if(description.length>MAX_DESCRIPTION)throw Error('Material exceeds safe Classroom description limit. Edit the explanation before synchronising.');
 if(!description.endsWith(classroomMarker(student.lessonId,'material')))throw Error('Project X identity marker missing.');
 return {...base,description};
}

export function uniqueMaterial(posts,lessonId){
 if(!LESSON_PATTERN.test(lessonId))throw Error('Invalid lesson ID');
 const marker=classroomMarker(lessonId,'material');
 const matches=posts.filter(p=>String(p.description||'').includes(marker));
 if(matches.length!==1)throw Error(`${matches.length} matching Classroom Materials found for ${lessonId}; expected exactly one. Do not update or create duplicates.`);
 return matches[0];
}

export function checkPatchEligibility(remote,base,proposed,lessonId){
 if(!remote?.id||!LESSON_PATTERN.test(lessonId))throw Error('Missing verified Classroom Material or lesson ID.');
 const marker=classroomMarker(lessonId,'material');
 if(remote.state!=='DRAFT'||base.state!=='DRAFT'||proposed.state!=='DRAFT')throw Error('Only existing DRAFT Material posts can be synchronised.');
 if(remote.title!==base.title||remote.title!==proposed.title)throw Error('The Material title has changed; manual review required.');
 if(String(remote.topicId)!==String(base.topicId)||String(remote.topicId)!==String(proposed.topicId))throw Error('Material topic mismatch; manual review required.');
 if(remote.materials?.length)throw Error('Material has manually added attachments; no automatic sync.');
 if(!String(remote.description||'').includes(marker))throw Error('Material marker mismatch.');
 if(remote.description===proposed.description)return 'already-current';
 if(remote.description!==base.description)throw Error('Classroom Material differs from original v1.2 draft. Manual edits must not be overwritten.');
 return 'ready';
}

export function assertUnchanged(remote,baseline){
 if(String(remote.id)!==String(baseline.id)||remote.state!=='DRAFT'||remote.title!==baseline.title||
 String(remote.topicId)!==String(baseline.topicId)||remote.description!==baseline.description||
 String(remote.updateTime||'')!==String(baseline.updateTime||'')||
 JSON.stringify(remote.materials||[])!==JSON.stringify(baseline.materials||[]))
  throw Error('Classroom draft changed since preview. Re-preview before any update.');
 return true;
}

export function validateTeacherEditedDescription(description,lessonId){
 if(typeof description!=='string'||description.length>MAX_DESCRIPTION||description.length<150)throw Error('Draft description length is invalid.');
 const marker=classroomMarker(lessonId,'material');
 if(description.split(marker).length!==2||!description.trimEnd().endsWith(marker))throw Error('Preserve the unique Project X identity marker at the end, exactly once.');
 for(const heading of ['Learning objectives:','Success criteria:','Subject explanation:','Student activities:']){
  if(!description.includes(heading))throw Error(`Required section missing: ${heading}`);
 }
 const checked=description.replaceAll('Teacher-only marking schemes are never attached.','');
 if(/\b(marking\s+(?:scheme|points|criteria)|answer\s*key|teacher[- ]only\s+(?:answer|marking)|provisional\s+marking)\b/i.test(checked))
  throw Error('Potential confidential marking content; edit the draft before synchronising.');
 return description;
}
