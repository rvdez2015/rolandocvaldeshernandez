/* Project X pilot rules verification. All reads and writes in this test go
   to the LOCAL Firebase Firestore emulator, not to production. */
import { test, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const UID = 'UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const RELEASE = 'y11-j277-canonical-pilot-20261024-r1';
const LESSON = 'PX25-Y11-U01-L001';
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-projectx-rules-gate', firestore: {rules}
});
after(async () => {await env.cleanup()});
const owner = env.authenticatedContext(UID,{email:'owner@example.com'}).firestore();
const other = env.authenticatedContext('other-user',{email:'other@example.com'}).firestore();
const anon = env.unauthenticatedContext().firestore();

const base = () => ({
  schoolId:'project-x-personal', importReleaseId:RELEASE,
  revisionStatus:'pilot_import_draft', visibility:'owner_private',
  createdByUid:UID, createdByEmail:'owner@example.com',
  createdAt:TS(), parentRevisionId:null,
  sourceHash:'f'.repeat(64), changedFields:['initial_import'],
  changeReason:'initial owner pilot import',importSchema:'projectx-curriculum-import-v2'
});
const lpath = `catalogueLessons/${LESSON}/revisions/${RELEASE}`;
const skpath=`catalogueStudentLessons/${LESSON}/revisions/${RELEASE}`;
const keypath=`catalogueTeacherKeys/${LESSON}/revisions/${RELEASE}`;
const question='PXQF-J277-1697258A6B7A4C';
const qpath=`catalogueQuestionBank/${question}/revisions/1.0.0`;
const familyPath=`catalogueQuestionFamilies/${question}/versions/1.0.0`;
const sqpath=`catalogueStudentQuestionBank/${question}/revisions/1.0.0`;

// Tests are sequential by default. Each path used for creation is unique.
test('legacy collections, including nested revisions, remain owner-accessible', async()=>{
 for(const path of ['lessons/legacy1','classroomPublications/old1','ownerObservationDrafts/old1',
                     'catalogueLessons/1.1d/revisions/legacy1']) {
  await assertSucceeds(owner.doc(path).set({smokeTest:true}));
  await assertSucceeds(owner.doc(path).get());
  await assertSucceeds(owner.doc(path).update({smokeTest:false}));
  await assertFails(other.doc(path).get());
  await assertFails(anon.doc(path).get());
 }
});

test('nonowner/anonymous cannot access private curriculum or teacher keys',async()=>{
 for(const path of [lpath,skpath,keypath,qpath,familyPath,sqpath,
                      `curriculumPilotIndex/${LESSON}`,`curriculumPilotReleases/${RELEASE}`]) {
   await assertFails(anon.doc(path).get());
   await assertFails(other.doc(path).get());
 }
 await assertFails(other.collection(`catalogueLessons/${LESSON}/revisions`).get());
 await assertFails(anon.doc(lpath).set({...base(),lessonId:LESSON,revisionId:RELEASE}));
 await assertFails(other.doc(lpath).set({...base(),lessonId:LESSON,revisionId:RELEASE}));
});

test('owner can create the valid lesson revision, but cannot mutate it',async()=>{
 const ref=owner.doc(lpath);
 const good={...base(),lessonId:LESSON,revisionId:RELEASE};
 await assertFails(ref.set({...good,createdByUid:'someone-else'}));
 await assertFails(ref.set({...good,sourceHash:'not-hex'}));
 await assertFails(ref.set({...good,visibility:'student_public'}));
 await assertSucceeds(ref.set(good));
 await assertSucceeds(ref.get());
 await assertFails(ref.update({title:'changed'}));
 await assertFails(ref.delete());
 await assertFails(ref.set({...good,title:'overwrite'}));
});

test('legacy fallback must NOT overwrite or create pilot lesson roots/revisions',async()=>{
 await assertFails(owner.doc(`catalogueLessons/${LESSON}`).set({title:'not legacy'}));
 await assertFails(owner.doc(`catalogueLessons/${LESSON}/revisions/another-random-revision`).set({
  ...base(),lessonId:LESSON,revisionId:'another-random-revision'
 }));
});

test('question family and teacher question records permit only owner',async()=>{
 await assertSucceeds(owner.doc(familyPath).set({...base(),familyId:question}));
 await assertSucceeds(owner.doc(qpath).set({...base(),questionId:question}));
 await assertFails(owner.doc(qpath).update({modelAnswerDraft:'replace'}));
 await assertFails(other.doc(familyPath).get());
});

test('student question records reject teacher-only top-level content',async()=>{
 const baseQ={...base(),questionId:question, familyId:question,version:'1.0.0',
  subject:'Computer Science',qualification:'OCR J277',schemeId:'PX25-SOW-J277-Y11',
  specificationObjectiveIds:['1.1.1'],curriculumRole:'core_gcse',marks:2,
  canonicalStem:'State two CPU cache characteristics',presentations:[],sourceType:'original'};
 const ref=owner.doc(sqpath);
 await assertFails(ref.set({...baseQ,modelAnswer:'private answer'}));
 await assertFails(ref.set({...baseQ,teacherPlan:{secret:'private'}}));
 await assertSucceeds(ref.set(baseQ));
 await assertFails(ref.update({canonicalStem:'another version'}));
});

test('student lesson records reject teacher fields and automatic publication',async()=>{
 const baseL={...base(),lessonId:LESSON,revisionId:RELEASE,
  schemeId:'PX25-SOW-J277-Y11',title:'CPU',yearGroup:11,keyStage:'KS4',
  unitId:'PX25-Y11-U01',durationMinutes:45,curriculumRole:'core_gcse',
  frameworkObjectiveIds:['1.1.1'],studentPlan:{intro:'CPU'},
  questionReferences:[],pilotVisibility:'owner_private',
  studentPublicationApproved:false,approvedForAutomaticStudentRelease:false};
 const ref=owner.doc(skpath);
 await assertFails(ref.set({...baseL,teacherPlan:{secret:'private'}}));
 await assertFails(ref.set({...baseL,studentPublicationApproved:true}));
 await assertSucceeds(ref.set(baseL));
 await assertFails(ref.delete());
});

test('teacher keys are private and append-only',async()=>{
 const ref=owner.doc(keypath);
 await assertFails(ref.set({...base(),lessonId:LESSON,revisionId:RELEASE,
  teacherOnly:false,independentModerationComplete:false}));
 await assertSucceeds(ref.set({...base(),lessonId:LESSON,revisionId:RELEASE,
  teacherOnly:true,independentModerationComplete:false}));
 await assertFails(other.doc(keypath).get());
 await assertFails(ref.update({teacherOnly:false}));
});

test('owner-only pilot index and release marker are immutable',async()=>{
 const ir=owner.doc(`curriculumPilotIndex/${LESSON}`);
 await assertSucceeds(ir.set({lessonId:LESSON,revisionId:RELEASE,schoolId:'project-x-personal',
  visibility:'owner_private',studentPublished:false,createdByUid:UID,createdAt:TS()}));
 await assertFails(ir.update({studentPublished:true}));
 const rr=owner.doc(`curriculumPilotReleases/${RELEASE}`);
 await assertSucceeds(rr.set({releaseId:RELEASE,schoolId:'project-x-personal',status:'READY_OWNER_PRIVATE',
  studentPublished:false,documentCount:1410,createdByUid:UID,createdAt:TS()}));
 await assertFails(rr.delete());
});

test('unmapped collection remains denied (no broad catch-all)',async()=>{
 await assertFails(owner.doc('unmappedCollection/unsafe').set({payload:'x'}));
 await assertFails(owner.doc('unmappedCollection/unsafe').get());
});
