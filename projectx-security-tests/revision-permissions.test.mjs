/* LOCAL FIRESTORE EMULATOR ONLY. Proposed revision rules have no production effect. */
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
const base=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const fragment=readFileSync(new URL('./revision-approval.rules.fragment',import.meta.url),'utf8');
const rules=base.replace(/\n  }\s*}\s*$/,()=> '\n'+fragment+'\n  }\n}');
if(!rules.includes('match /ownerApprovedCurriculumLessons/{lessonId}'))throw Error('Approved curriculum rules not inserted');
const env=await initializeTestEnvironment({projectId:'demo-projectx-revision-approval',firestore:{rules}});
after(async()=>env.cleanup());
const UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const owner=env.authenticatedContext(UID).firestore(),other=env.authenticatedContext('unauthorized').firestore(),anon=env.unauthenticatedContext().firestore();
const id='PX25-Y11-U02-L003',version='approved-abc123',head='ownerApprovedCurriculumLessons/'+id,rev=head+'/versions/'+version;
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const proposalPath='ownerCurriculumReviewDrafts/'+id+'/versions/abc123';
test('seed a genuine owner private proposal in emulator fixture',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await context.firestore().doc(proposalPath).set({
    lessonId:id,revisionId:'abc123',createdByUid:UID,
    status:'review_draft',studentPublished:false,
    schema:'projectx-curriculum-review-proposal-v1',sourceReleaseId:'y11-j277-canonical-pilot-20261024-r1',schoolId:'project-x-personal',sourceFingerprint:'a'.repeat(64)
  });
 });
});
test('reject approval that references a missing proposal',async()=>{
 await assertFails(owner.doc(rev.replace(version,'approved-orphan')).set({
   ...versionData(),revisionId:'approved-orphan',approvedProposalId:'missing'
 }));
});

const versionData=()=>({lessonId:id,revisionId:version,schoolId:'project-x-personal',
 approvedByUid:UID,approvedProposalId:'abc123',parentRevisionId:'y11-j277-canonical-pilot-20261024-r1',approvalStatus:'approved',
 visibility:'owner_private',studentPublished:false,classroomSyncStatus:'not_requested'});
const headData=()=>({lessonId:id,schoolId:'project-x-personal',latestApprovedRevisionId:version,
 previousApprovedRevisionId:null,approvedByUid:UID,updatedAt:stamp(),
 classroomSyncStatus:'pending_student_projection'});
test('public visitors cannot inspect or write private approved revisions',async()=>{
 for(const path of [head,rev]){await assertFails(anon.doc(path).get());await assertFails(other.doc(path).get());await assertFails(other.doc(path).set(versionData()))}
 await assertFails(anon.collection(head+'/versions').get());
});
test('owner-only create of immutable approved version; reject public visibility',async()=>{
 await assertFails(owner.doc(rev).set({...versionData(),visibility:'student_public'}));
 await assertFails(owner.doc(rev).set({...versionData(),studentPublished:true}));
 await assertFails(owner.doc(rev).set({...versionData(),parentRevisionId:'wrong-source'}));
 await assertSucceeds(owner.doc(rev).set(versionData()));
 await assertSucceeds(owner.doc(rev).get());
 await assertFails(owner.doc(rev).update({studentPublished:true}));
 await assertFails(owner.doc(rev).delete());
});
test('approved head cannot target a missing or differently identified version',async()=>{
 const missing='ownerApprovedCurriculumLessons/PX25-Y11-U03-L001';
 await assertFails(owner.doc(missing).set({...headData(),lessonId:'PX25-Y11-U03-L001',latestApprovedRevisionId:'approved-missing'}));
 await assertFails(owner.doc(head).set({...headData(),latestApprovedRevisionId:'approved-nonexistent'}));
});
test('owner can create pointer, with no deletion or unapproved exposure',async()=>{
 await assertFails(owner.doc(head).set({...headData(),classroomSyncStatus:'published'}));
 await assertSucceeds(owner.doc(head).set(headData()));
 await assertSucceeds(owner.doc(head).get());
 await assertFails(owner.doc(head).delete());
});
