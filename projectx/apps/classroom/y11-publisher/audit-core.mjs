/* Project X Year 11 curriculum audit — pure read-only inspection logic.
 * No network requests or writes. Terms detected here signal REVIEW, never an
 * automatic finding of non-compliance or a replacement of an authoritative lesson.
 */
import {RELEASE_ID,safeStudentContent} from './core-v5.mjs';

export const UNITS_LESSON_ID='PX25-Y11-U02-L003';
const genericObjectives=/\bstudents will be able to (?:explain and apply the key ideas|understand the main ideas)\b/i;
const genericSuccess=/\bi can explain the main idea of\b/i;
const keyTerms=[
  ['binary representation',/\bbinary\b/i],
  ['bit',/\bbits?\b/i],
  ['nibble',/\bnibbles?\b/i],
  ['byte',/\bbytes?\b/i],
  ['kilobyte',/\bkilobytes?\b|\bKB\b/i],
  ['megabyte',/\bmegabytes?\b|\bMB\b/i],
  ['gigabyte',/\bgigabytes?\b|\bGB\b/i],
  ['terabyte',/\bterabytes?\b|\bTB\b/i],
  ['petabyte',/\bpetabytes?\b|\bPB\b/i],
  ['conversions',/\bconvert(?:ing|ed|s|ion)?\b|\bconversion\b/i],
  ['capacity',/\bcapacit(?:y|ies)\b/i],
  ['text file sizes',/\btext\b/i],
  ['image file sizes',/\bimages?\b/i],
  ['sound file sizes',/\bsound\b|\baudio\b/i]
];
function asStrings(value){return Array.isArray(value)?value.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];}
function safeText(value,limit=3500){return typeof value==='string'?value.slice(0,limit):'';}
export function buildEntry(index,owner,student){
  if(!index?.lessonId || !index.unitId)throw Error('Invalid lesson index record');
  if(!owner || owner.lessonId!==index.lessonId||owner.unitId!==index.unitId||owner.revisionId!==RELEASE_ID)
    throw Error('Owner lesson identity / release mismatch');
  if(!student || student.lessonId!==index.lessonId||student.unitId!==index.unitId||student.revisionId!==RELEASE_ID)
    throw Error('Student lesson identity / release mismatch');
  const s=safeStudentContent(student);
  const objectives=asStrings(owner.teacherPlan?.learningObjectives).slice(0,12);
  const successCriteria=asStrings(owner.teacherPlan?.successCriteria).slice(0,12);
  const flags=[];
  if(!objectives.length)flags.push('OBJECTIVES_MISSING');
  if(!successCriteria.length)flags.push('SUCCESS_CRITERIA_MISSING');
  if(objectives.some(x=>genericObjectives.test(x)))flags.push('OBJECTIVES_GENERIC');
  if(successCriteria.some(x=>genericSuccess.test(x)))flags.push('SUCCESS_CRITERIA_GENERIC');
  if(!s.intro.trim())flags.push('INTRO_MISSING');
  if(!s.activities.length)flags.push('ACTIVITIES_MISSING');
  if(s.questions.reduce((n,q)=>n+q.marks,0)!==10)flags.push('ASSESSMENT_MARKS_INVALID');
  const summaryText=[s.title,s.intro,...objectives,...successCriteria,...s.activities.map(x=>x.instructions),...s.questions.map(q=>q.question)].join('\n');
  const unitCoverage=index.lessonId===UNITS_LESSON_ID?keyTerms.map(([term,rx])=>({term,evidenced:rx.test(summaryText)})):null;
  if(unitCoverage?.some(x=>!x.evidenced))flags.push('UNITS_TOPIC_COVERAGE_REVIEW');
  return {lessonId:index.lessonId,unitId:index.unitId,revisionId:RELEASE_ID,title:s.title,
    learningObjectives:objectives,successCriteria,
    studentIntro:safeText(s.intro),
    activities:s.activities.map(x=>({stageId:x.stageId,instructions:safeText(x.instructions,3000),requiresTeacherProvidedExample:x.requiresTeacherProvidedExample})),
    assessment:s.questions.map(q=>({itemId:q.id,question:safeText(q.question),marks:q.marks})),
    assessmentMarks:s.questions.reduce((n,q)=>n+q.marks,0),flags,unitCoverage};
}
export function summarize(entries){
  const counts={};for(const e of entries)for(const flag of e.flags)counts[flag]=(counts[flag]||0)+1;
  return {lessonsRead:entries.length,withFlags:entries.filter(x=>x.flags.length).length,flagCounts:counts};
}
export function makeExport(entries,failures=[]){
  const sum=summarize(entries);
  return {reportType:'ProjectX-Y11-readonly-content-review',generatedAt:new Date().toISOString(),source:'Owner-authenticated Firebase Year 11 catalogueLessons + catalogueStudentLessons revisions; no Google Classroom read',releaseId:RELEASE_ID,
    policy:'Read-only. No changes applied. Keyword flags are review prompts, not proof of absent teaching. Assessment questions exclude marking keys and correct answers.',
    ...sum,failedLessons:failures,lessons:entries};
}
