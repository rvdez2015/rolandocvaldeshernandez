import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedLessonClassroomPreview} from './approved-sync-core.mjs';
const marker='[PX-LESSON-EXAMPLE-MARKER]';
const approved={approvalStatus:'approved',visibility:'owner_private',studentPublished:false,
 revisionId:'approved-123',approvedProposalId:'123',
 teacherPlan:{learningObjectives:['Understand bits'],successCriteria:['Convert units'],
  subjectExplanation:'PRIVATE ANSWER KEY MUST NOT APPEAR'}};
const existing={id:'material-1',title:'Unit conversions',state:'DRAFT',description:'Lesson: Units\n\nLearning objectives:\n1. Previous objective\n\nSuccess criteria:\n1. Previous criterion\n\nStudent activities:\nDo exercises\n\n'+marker};
test('previews safe sections only',()=>{
 const x=approvedLessonClassroomPreview(approved,existing,marker);
 assert.match(x.proposedDescription,/Convert units/);
 assert.doesNotMatch(x.proposedDescription,/PRIVATE ANSWER KEY/);
 assert.equal(x.requiresHumanReview,true);
 assert.equal(x.materialId,'material-1');
 assert.ok(x.proposedDescription.includes('Student activities:\nDo exercises'));
 assert.ok(x.proposedDescription.includes('1. Understand bits'));
});
test('rejects identity mismatch',()=>assert.throws(
 ()=>approvedLessonClassroomPreview(approved,{...existing,description:'Other material'},marker),/marker missing/));
test('rejects unapproved revisions',()=>assert.throws(
 ()=>approvedLessonClassroomPreview({...approved,approvalStatus:'review_draft'},existing,marker),/approved revision/));
