/* Security regression tests for owner-approved tuition records.
 * Runs against LOCAL emulator only; rules assembled from baseline and proposed fragment. */
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
const base=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const fragment=readFileSync(new URL('./tuition-approved-only.rules.fragment',import.meta.url),'utf8');
if(!base.trimEnd().endsWith('}\n}') && !base.trimEnd().endsWith('}\r\n}'))throw Error('Unexpected baseline rules structure');
const rules=base.replace(/\n  }\s*}\s*$/, ()=>'\n'+fragment+'\n  }\n}');
if(rules===base)throw Error('Tuition rules fragment not inserted');
const env=await initializeTestEnvironment({projectId:'demo-projectx-tuition-approval',firestore:{rules}});
after(async()=>env.cleanup());
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const owner=env.authenticatedContext(OWNER).firestore();
const other=env.authenticatedContext('stranger').firestore();
const anon=env.unauthenticatedContext().firestore();
const id='ad9bb9d0-3945-4d9d-90bd-3ef65a1a117a';
const path='ownerApprovedTuitionEnquiries/'+id;
const good=()=>({name:'Sample Parent',email:'sample@example.net',course:'gcse',language:'en',
 message:'I would like Computer Science tuition.',enquiryId:id,approvedByUid:OWNER,
 approvalStatus:'owner_approved',consentVerified:true,
 createdAt:firebase.firestore.FieldValue.serverTimestamp(),source:'owner_manual_email_review'});
test('anonymous and other users cannot read or create records',async()=>{
 await assertFails(anon.doc(path).get());
 await assertFails(other.doc(path).get());
 await assertFails(anon.doc(path).set(good()));
 await assertFails(other.doc(path).set(good()));
 await assertFails(anon.collection('ownerApprovedTuitionEnquiries').get());
});
test('owner cannot save without explicit approval and verified consent',async()=>{
 await assertFails(owner.doc(path).set({...good(),consentVerified:false}));
 await assertFails(owner.doc(path).set({...good(),approvalStatus:'pending'}));
 await assertFails(owner.doc(path).set({...good(),approvedByUid:'stranger'}));
 await assertFails(owner.doc(path).set({...good(),privateTeacherKey:'secret'}));
});
test('owner can create validated approved record but cannot change it',async()=>{
 await assertSucceeds(owner.doc(path).set(good()));
 await assertSucceeds(owner.doc(path).get());
 await assertFails(owner.doc(path).update({message:'altered'}));
 await assertFails(owner.doc(path).delete());
});
