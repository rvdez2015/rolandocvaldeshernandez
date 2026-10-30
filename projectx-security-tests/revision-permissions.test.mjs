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
const versionData=()=>({lessonId:id,revisionId:version,schoolId:'project-x-personal',
 approvedByUid:UID,approvedProposalId:'abc123',approvalStatus:'approved',
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
 await assertSucceeds(owner.doc(rev).set(versionData()));
 await assertSucceeds(owner.doc(rev).get());
 await assertFails(owner.doc(rev).update({studentPublished:true}));
 await assertFails(owner.doc(rev).delete());
});
test('owner can create pointer, with no deletion or unapproved exposure',async()=>{
 await assertFails(owner.doc(head).set({...headData(),classroomSyncStatus:'published'}));
 await assertSucceeds(owner.doc(head).set(headData()));
 await assertSucceeds(owner.doc(head).get());
 await assertFails(owner.doc(head).delete());
});
