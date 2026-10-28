/* Project X universal curriculum review proposal core — pure, no network or side effects. */
export const SOURCE_RELEASE='y11-j277-canonical-pilot-20261024-r1';
export const FIELDS=Object.freeze([
 {id:'title',label:'Lesson title',path:'title',kind:'text'},
 {id:'objectives',label:'Learning objectives',path:'teacherPlan.learningObjectives',kind:'lines'},
 {id:'success',label:'Success criteria',path:'teacherPlan.successCriteria',kind:'lines'},
 {id:'explanation',label:'Subject explanation and worked examples',path:'teacherPlan.subjectExplanation',kind:'text'},
 {id:'prior',label:'Prior knowledge',path:'teacherPlan.priorKnowledge',kind:'mixed'},
 {id:'misconceptions',label:'Common misconceptions',path:'teacherPlan.misconceptions',kind:'mixed'},
 {id:'vocabulary',label:'Vocabulary',path:'teacherPlan.vocabulary',kind:'mixed'},
 {id:'homework',label:'Homework',path:'teacherPlan.homework',kind:'text'},
 {id:'activities',label:'45-minute lesson activities (JSON)',path:'activities',kind:'json'}
]);
export const ID_PATTERN=/^PX25-Y11-U\d{2}-L\d{3}$/;
const get=(o,path)=>path.split('.').reduce((x,k)=>x?.[k],o);
export function displayField(lesson,field){
 const value=get(lesson,field.path);
 if(field.kind==='json')return JSON.stringify(value??[],null,2);
 if(Array.isArray(value))return value.map(x=>String(x)).join('\n');
 return value==null?'':String(value);
}
export function parseField(text,field,lesson){
 if(typeof text!=='string'||text.length>28000)throw Error(`${field.label} is missing or too long.`);
 if(field.kind==='json'){
  let value;try{value=JSON.parse(text)}catch{throw Error('Activities must be valid JSON.');}
  if(!Array.isArray(value)||!value.length||value.length>18||value.some(a=>!a||typeof a!=='object'||Array.isArray(a)))throw Error('Expected 1–18 valid activity objects.');
  value.forEach((a,i)=>{if(('minutes'in a)&&(!Number.isFinite(a.minutes)||a.minutes<0||a.minutes>90))throw Error(`Activity ${i+1} has invalid minutes.`)});
  return value;
 }
 if(field.kind==='lines'){
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length<1||lines.length>15||lines.some(s=>s.length>750))throw Error(`${field.label} must contain 1–15 concise lines.`);
  return lines;
 }
 if(field.kind==='mixed'){
  const original=get(lesson,field.path);
  if(Array.isArray(original))return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  return text.trim();
 }
 const output=text.trim();if(!output||output.length>24000)throw Error(`${field.label} cannot be empty or too long.`);return output;
}
export function collectChanges(lesson,edited){
 if(!lesson||!ID_PATTERN.test(lesson.lessonId)||lesson.revisionId!==SOURCE_RELEASE)throw Error('Unverified source lesson or revision.');
 if(!lesson.teacherPlan||typeof lesson.teacherPlan!=='object')throw Error('Missing authoritative teacher plan.');
 const changes={};
 for(const field of FIELDS){
  const original=get(lesson,field.path);
  const draft=edited[field.id]??displayField(lesson,field);
  if(draft===displayField(lesson,field))continue;
  const proposed=parseField(draft,field,lesson);
  if(JSON.stringify(original??null)!==JSON.stringify(proposed))changes[field.id]={path:field.path,before:original??null,after:proposed};
 }
 return changes;
}
export function makeRevision({lesson,changes,reason,uid,email,sourceFingerprint,revisionId,parentRevisionId=null}){
 if(!ID_PATTERN.test(lesson?.lessonId)||lesson?.revisionId!==SOURCE_RELEASE)throw Error('Lesson identity mismatch');
 if(!uid||!email||!revisionId)throw Error('Authenticated owner and unique revision ID required');
 const fields=Object.keys(changes||{});
 if(!fields.length)throw Error('Nothing has changed. Copy the current lesson and edit at least one section.');
 if(fields.some(x=>!FIELDS.some(f=>f.id===x)))throw Error('Attempted edit of an unsupported field');
 if(!reason||reason.trim().length<12)throw Error('Enter a revision reason of at least 12 characters.');
 if(!/^[a-f0-9]{64}$/.test(sourceFingerprint||''))throw Error('Invalid source fingerprint. Reload the authoritative lesson.');
 return {schema:'projectx-curriculum-review-proposal-v1',lessonId:lesson.lessonId,unitId:lesson.unitId,
  schoolId:'project-x-personal',sourceReleaseId:SOURCE_RELEASE,sourceFingerprint,revisionId,
  parentRevisionId,changedFields:fields,changes,changeReason:reason.trim().slice(0,600),
  createdByUid:uid,createdByEmail:email,status:'review_draft',teacherApproved:false,
  studentPublished:false,automaticClassroomSync:false};
}
export function linesDiff(a,b){
 const aa=String(a).split(/\r?\n/),bb=String(b).split(/\r?\n/);
 // bounded LCS is adequate for a single edit field, without a diff dependency
 if(aa.length*bb.length>120000)return [{kind:'note',text:`Large section: ${aa.length} original lines, ${bb.length} proposed lines. Compare in the two columns.`}];
 const dp=Array.from({length:aa.length+1},()=>new Uint16Array(bb.length+1));
 for(let i=aa.length-1;i>=0;i--)for(let j=bb.length-1;j>=0;j--)dp[i][j]=aa[i]===bb[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0;const result=[];
 while(i<aa.length&&j<bb.length){if(aa[i]===bb[j]){result.push({kind:'same',text:aa[i]});i++;j++}
 else if(dp[i+1][j]>=dp[i][j+1])result.push({kind:'minus',text:aa[i++]});
 else result.push({kind:'plus',text:bb[j++]});}
 while(i<aa.length)result.push({kind:'minus',text:aa[i++]});while(j<bb.length)result.push({kind:'plus',text:bb[j++]});
 return result;
}
export function stableLessonSnapshot(lesson){
 if(!lesson||!ID_PATTERN.test(lesson.lessonId)||lesson.revisionId!==SOURCE_RELEASE)throw Error('Invalid source lesson');
 return JSON.stringify({lessonId:lesson.lessonId,revisionId:lesson.revisionId,unitId:lesson.unitId,fields:FIELDS.map(f=>[f.id,get(lesson,f.path)])});
}
