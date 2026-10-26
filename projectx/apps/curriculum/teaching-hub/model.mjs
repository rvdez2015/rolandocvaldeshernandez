/* Pure Project X presentation helpers: no Firebase writes, no DOM or private data. */
import { nameUnit, numericUnit, lessonNumber, groupByUnit, filterLessons, EXPECTED, RELEASE_ID } from '../pilot-library/core.mjs';
export {nameUnit, numericUnit, lessonNumber, groupByUnit, filterLessons, EXPECTED, RELEASE_ID};
export function buildUnits(lessons){
 return groupByUnit(lessons).map((u,i)=>({
   ...u,number:numericUnit(u.unitId),name:u.title.replace(/^Unit \d+ · /,''),
   totalMinutes:u.lessons.reduce((s,l)=>s+(Number(l.durationMinutes)||45),0),
   category:Math.min(5,i)
 }));
}
export function searchCurriculum(rows,q='',unit='all',role='all'){
 const val=String(q||'').toLowerCase().trim();
 const matched=filterLessons(rows,{query:'',unit,role});
 return matched.filter(l=>!val||[
   l.title,l.lessonId,l.unitId,l.curriculumRole,nameUnit(l.unitId)
 ].some(s=>String(s||'').toLowerCase().includes(val)));
}
export function validateRelease(doc,index){
 if(!doc||doc.status!=='READY_OWNER_PRIVATE'||doc.studentPublished!==false)throw Error('Release is not an owner-private teaching pilot');
 if(doc.schoolId!=='project-x-personal'||doc.lessonCount!==EXPECTED.lessons)throw Error('Unexpected project or lesson count');
 if(index.length!==EXPECTED.lessons)throw Error(`Expected ${EXPECTED.lessons} lessons, received ${index.length}`);
 const units=buildUnits(index);
 if(units.length!==26)throw Error(`Expected 26 unit groups, received ${units.length}`);
 return {unitCount:units.length,lessonCount:index.length,questionCount:EXPECTED.questions};
}
export function roleLabel(role){return ({core_gcse:'Core GCSE',assessment_or_practice:'Assessment / practice',optional_enrichment:'Optional extension',a_level_bridge:'A Level bridge',core_gcse_assessment:'GCSE assessment'})[role]||'Curriculum lesson'}
export function formatMinutes(minutes){return `${Number(minutes)||45} min`}
