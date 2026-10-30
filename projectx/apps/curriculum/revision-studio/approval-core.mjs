/* Project X: pure approval projection; no network access or side effects.
   Approval is NOT publication. Store returned revision in a new immutable
   owner-private revision document with owner-only server-enforced rules. */
import {FIELDS,SOURCE_RELEASE,ID_PATTERN} from './review-core.mjs';
const clone = x => JSON.parse(JSON.stringify(x));
const get = (x,path) => path.split('.').reduce((v,k)=>v?.[k],x);
const set = (x,path,value) => {
  const keys=path.split('.'); let p=x;
  for(const key of keys.slice(0,-1)){
    if(!p[key]||typeof p[key]!=='object'||Array.isArray(p[key])) throw Error('Invalid curriculum field path: '+path);
    p=p[key];
  }
  p[keys.at(-1)]=clone(value);
};
export function buildApprovedLesson(source, proposal, {approvalId,approvedByUid,approvedAt}={}){
  if(!source||!ID_PATTERN.test(source.lessonId)||source.revisionId!==SOURCE_RELEASE)
    throw Error('Unverified source release');
  if(!proposal||proposal.schema!=='projectx-curriculum-review-proposal-v1'||
      proposal.lessonId!==source.lessonId||proposal.sourceReleaseId!==SOURCE_RELEASE||
      proposal.schoolId!=='project-x-personal'||proposal.status!=='review_draft'||
      proposal.teacherApproved!==false||proposal.studentPublished!==false)
    throw Error('Unverified owner-private review proposal');
  if(!approvalId||!approvedByUid||!approvedAt)throw Error('Explicit approval metadata required');
  if(!proposal.changeReason||proposal.changeReason.trim().length<12)throw Error('Approval reason missing');
  const changes=proposal.changes;
  if(!changes||!Object.keys(changes).length)throw Error('No proposed changes');
  if(JSON.stringify(Object.keys(changes).sort())!==JSON.stringify([...proposal.changedFields].sort()))
    throw Error('Changed field manifest mismatch');
  const result=clone(source);
  for(const [id,change] of Object.entries(changes)){
    const field=FIELDS.find(f=>f.id===id);
    if(!field||change?.path!==field.path)throw Error('Unexpected field or path: '+id);
    if(JSON.stringify(get(source,field.path)??null)!==JSON.stringify(change.before??null))
      throw Error('Proposal is stale for field: '+id);
    if(change.after===undefined)throw Error('Missing replacement for field: '+id);
    set(result,field.path,change.after);
  }
  // The immutable source is untouched; the consumer must enforce optimistic
  // concurrency (source fingerprint, proposal-head ID, target non-existence).
  result.revisionId=approvalId;
  result.parentRevisionId=SOURCE_RELEASE;
  result.approvedProposalId=proposal.revisionId;
  result.approvedByUid=approvedByUid;
  result.approvedAt=approvedAt;
  result.visibility='owner_private';
  result.studentPublished=false;
  result.classroomSyncStatus='not_requested';
  return result;
}
export function assertClassroomSafeApproval(approved){
  if(!approved||approved.visibility!=='owner_private'||approved.studentPublished!==false)
    throw Error('Untrusted approved lesson');
  // Teacher plans are never directly published. A separately reviewed
  // student-facing projection must be produced before Classroom writes.
  return {lessonId:approved.lessonId,revisionId:approved.revisionId,
    requiresStudentProjection:true,requiresTeacherReview:true};
}
