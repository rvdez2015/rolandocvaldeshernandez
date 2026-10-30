import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApprovedLesson,assertClassroomSafeApproval} from './approval-core.mjs';
import {SOURCE_RELEASE} from './review-core.mjs';
const source={lessonId:'PX25-Y11-U02-L003',unitId:'U02',revisionId:SOURCE_RELEASE,
  visibility:'owner_private',schoolId:'project-x-personal',title:'Original',
  teacherPlan:{learningObjectives:['Old'],successCriteria:['Old']}};
const proposal={schema:'projectx-curriculum-review-proposal-v1',
  lessonId:source.lessonId,sourceReleaseId:SOURCE_RELEASE,
  schoolId:'project-x-personal',status:'review_draft',
  teacherApproved:false,studentPublished:false,
  revisionId:'proposal-1',changeReason:'Improve learning objective',
  changedFields:['objectives'],changes:{
    objectives:{path:'teacherPlan.learningObjectives',before:['Old'],after:['New']}
  }};
const approval={approvalId:'approved-1',approvedByUid:'owner-uid',approvedAt:'2026-10-30T00:00:00Z'};
test('creates a separate owner-private approved revision without changing source',()=>{
 const before=JSON.stringify(source);
 const result=buildApprovedLesson(source,proposal,approval);
 assert.equal(JSON.stringify(source),before);
 assert.deepEqual(result.teacherPlan.learningObjectives,['New']);
 assert.equal(result.revisionId,'approved-1');
 assert.equal(result.studentPublished,false);
 assert.equal(result.classroomSyncStatus,'not_requested');
 assert.equal(assertClassroomSafeApproval(result).requiresStudentProjection,true);
});
test('rejects stale proposal',()=>{
 const stale=structuredClone(proposal);stale.changes.objectives.before=['Different'];
 assert.throws(()=>buildApprovedLesson(source,stale,approval),/stale/);
});
test('rejects arbitrary field path',()=>{
 const bad=structuredClone(proposal);bad.changes.objectives.path='studentPublished';
 assert.throws(()=>buildApprovedLesson(source,bad,approval),/Unexpected field/);
});
test('requires approval metadata',()=>{
 assert.throws(()=>buildApprovedLesson(source,proposal,{}),/approval metadata/);
});
test('rejects unreviewed direct publication',()=>{
 assert.throws(()=>assertClassroomSafeApproval({...source,studentPublished:true}),/Untrusted/);
});
