/* Project X owner-only, private curriculum pilot importer.
   PRIVATE DATA IS NEVER FETCHED FROM A PUBLIC URL. Owner manually chooses file locally.
   Firestore rules, not this browser client, must enforce access and immutable writes.
*/
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,SCHOOL_ID,validatePackage,buildOperations,jsonHash} from './validator.mjs';
const cfg={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const el=id=>document.getElementById(id);
let bundle=null,localResult=null,planned=[],preflight=null,busy=false,completed=false,importLog=[],hashCache=new Map();
const isOwner=()=>auth.currentUser?.uid===OWNER;
const show=(id,text)=>{el(id).textContent=text};
const fatal=e=>{throw Error(e)};
function countStatuses(a){const c={NEW:0,MATCH:0,CONFLICT:0};a.forEach(x=>{c[x.state]++});return c}
function log(action,detail){importLog.push({time:new Date().toISOString(),action,detail});el('downloadLog').disabled=false}
function state(){
 el('signin').disabled=!!auth.currentUser||busy;el('signout').disabled=!auth.currentUser||busy;
 el('localCheck').disabled=!bundle||busy;
 el('preflight').disabled=!bundle||!localResult?.ok||!isOwner()||busy;
 el('import').disabled=!preflight?.ok||!isOwner()||busy||!el('securityAck').checked||!el('approvalAck').checked||!el('revisionsAck').checked;
 el('finalize').disabled=busy||!isOwner()||!(completed||(preflight?.ok&&preflight?.counts?.MATCH===planned.length));
 el('upload').disabled=busy;
}
function busySet(value){busy=value;state()}
function progress(n,total,message){el('progress').max=total||1410;el('progress').value=n;show('progressText',message)}
function revoke(){preflight=null;completed=false;state()}
for(const id of ['securityAck','approvalAck','revisionsAck'])el(id).addEventListener('change',state);
el('upload').addEventListener('change',async event=>{
 bundle=null;localResult=null;planned=[];hashCache.clear();revoke();state();
 const file=event.target.files?.[0];if(!file)return;
 busySet(true);
 try{
  if(file.size>45_000_000)fatal('Unusually large file; expected a private Project X JSON package.');
  const obj=JSON.parse(await file.text());
  const report=validatePackage(obj);bundle=obj;localResult=report;planned=buildOperations(obj);
  show('loadStatus',`VALIDATED locally: ${file.name}\n${report.lessons} lessons, ${report.questions} questions, ${report.families} families; ${report.docs} immutable documents; total marks ${report.totalMarks}.\nPrivate teacher and student-safe records are separate.`);
  const hash=await jsonHash({releaseId:obj.releaseId,counts:{lessons:obj.lessons.length,questions:obj.questions.length},sourceZipSHA256:obj.sourceZipSHA256});
  show('fileFacts',`Source package fingerprint: ${hash}\nImport release: ${obj.releaseId}`);el('fileFacts').hidden=false;
  show('dryStatus','Local integrity passed. Sign in as owner, verify deployed security rules and run remote preflight.');
  log('localValidation',{file:file.name,summary:report,fingerprint:hash});
 }catch(e){show('loadStatus','FILE REJECTED: '+e.message);el('fileFacts').hidden=true;log('validationFailed',{message:e.message})}
 finally{busySet(false)}
});
el('localCheck').onclick=()=>{
 try{localResult=validatePackage(bundle);show('loadStatus',`Local validation PASS: ${localResult.docs} documents. No cloud writes.`);log('localValidationRepeat',localResult)}catch(e){localResult=null;revoke();show('loadStatus','FAIL: '+e.message)}state();
};
const ensureOwner=()=>{if(!isOwner())fatal('Owner authentication required. Login with the configured Project X owner account.')};
el('signin').onclick=async()=>{busySet(true);try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){show('authStatus','Sign-in failed: '+e.message)}finally{busySet(false)}};
el('signout').onclick=()=>signOut(auth).catch(e=>show('authStatus',e.message));
onAuthStateChanged(auth,user=>{
 revoke();hashCache.clear();
 show('authStatus',user?(isOwner()?`Authenticated Project X owner: ${user.email} (UID verified).`:`Signed in as ${user.email}, but this account is NOT the Project X owner. Cloud operations disabled.`):'Signed out. No Firebase writes possible.');
 state();
});
async function hashed(op){if(!hashCache.has(op.path))hashCache.set(op.path,await jsonHash(op.record));return hashCache.get(op.path)}
async function limitedMap(items,limit,fn,onStep){
 let pos=0,finished=0;const result=new Array(items.length);
 async function worker(){while(pos<items.length){const i=pos++;result[i]=await fn(items[i],i);finished++;if(onStep&&(finished%20===0||finished===items.length))onStep(finished,items.length)}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return result;
}
async function cloudPreflight(){
 ensureOwner();if(!localResult?.ok||!bundle)fatal('Run local validation first');
 show('dryStatus','Reading existing Firestore revisions and comparing content hashes (no writes)…');
 const checks=await limitedMap(planned,14,async op=>{
  const hash=await hashed(op),reference=doc(db,...op.path.split('/'));
  const snap=await getDoc(reference);
  const state=!snap.exists()?'NEW':snap.data().sourceHash===hash?'MATCH':'CONFLICT';
  return {...op,sourceHash:hash,state};
 },(n,total)=>progress(n,total,`Remote preflight ${n}/${total} revision targets checked · read-only`));
 const counts=countStatuses(checks),conflicts=checks.filter(x=>x.state==='CONFLICT').map(x=>x.path);
 return {ok:conflicts.length===0,checks,counts,conflicts,time:new Date().toISOString()};
}
el('preflight').onclick=async()=>{
 preflight=null;completed=false;busySet(true);
 try{const p=await cloudPreflight();preflight=p;
 show('dryStatus',`${p.ok?'DRY RUN PASS':'DRY RUN BLOCKED'} — ${p.counts.NEW} new, ${p.counts.MATCH} existing identical, ${p.counts.CONFLICT} conflicting.\n${p.conflicts.slice(0,8).join('\n')}${p.conflicts.length>8?'\n(Additional conflicts omitted)':''}\nNo writes were made.`);
 log('remotePreflight',{ok:p.ok,counts:p.counts,conflicts:p.conflicts});
 }catch(e){show('dryStatus','DRY RUN FAILED: '+e.message);log('remotePreflightFailed',{message:e.message})}finally{busySet(false)}
};
const CHUNK=20;
async function writeNew(list){
 let done=0;
 for(let i=0;i<list.length;i+=CHUNK){
  ensureOwner();const items=list.slice(i,i+CHUNK),batch=writeBatch(db);
  for(const x of items){
   const reference=doc(db,...x.path.split('/'));
   // Rules must permit CREATE only, never UPDATE. A concurrent create must fail, not overwrite.
   batch.set(reference,{
    ...x.record,
    sourceHash:x.sourceHash,
    importReleaseId:RELEASE_ID,
    schoolId:SCHOOL_ID,
    createdByUid:auth.currentUser.uid,
    createdByEmail:auth.currentUser.email||'',
    createdAt:serverTimestamp(),
    revisionStatus:'pilot_import_draft',
    visibility:'owner_private',
    changedFields:['initial_import'],
    parentRevisionId:null,
    changeReason:'initial teacher-approved pilot import; ongoing teaching revisions expected',
    importSchema:'projectx-curriculum-import-v2'
   });
  }
  await batch.commit();
  const readbacks=await Promise.all(items.map(x=>getDoc(doc(db,...x.path.split('/')))));
  for(let n=0;n<items.length;n++)if(!readbacks[n].exists()||readbacks[n].data().sourceHash!==items[n].sourceHash)fatal('Readback hash mismatch after write: '+items[n].path);
  done+=items.length;
  progress(done,list.length,`Written/read-back verified ${done}/${list.length} new records. Previously matching records skipped.`);
  show('importStatus',`Imported ${done}/${list.length} new records · ${preflight.counts.MATCH} already match. No student publication.`);
  log('chunkCommitted',{batch:i/CHUNK+1,verified:items.map(x=>x.path)});
 }
 return done;
}
el('import').onclick=async()=>{
 if(!confirm('Confirm: import ONLY to restricted Firestore staging, never student publication? Existing revisions must not be overwritten.'))return;
 busySet(true);completed=false;
 try{
  ensureOwner();if(!el('securityAck').checked||!el('approvalAck').checked||!el('revisionsAck').checked)fatal('Security and approval acknowledgment required');
  // Recheck all documents directly before writing; avoids stale preview assumptions.
  const fresh=await cloudPreflight();if(!fresh.ok)fatal('New conflicts detected; no new writes started. '+fresh.conflicts[0]);
  preflight=fresh;const pending=fresh.checks.filter(x=>x.state==='NEW');
  show('importStatus',`Beginning immutable owner-private import: ${pending.length} new revision documents.`);
  const done=await writeNew(pending);
  completed=true;show('importStatus',`Import phase completed: ${done} new documents verified; ${fresh.counts.MATCH} were already identical.\nNext: perform the full post-import verification and private index step.`);
  log('importComplete',{new:done,preExisting:fresh.counts.MATCH});
 }catch(e){completed=false;show('importStatus',`IMPORT INTERRUPTED: ${e.message}\nPreviously committed chunks remain intact. Rerun the dry run and resume; matching revisions will be skipped.`);log('importInterrupted',{message:e.message})}finally{busySet(false)}
};
async function finalize(){
 ensureOwner();
 // Full readback must be all MATCH; no unknown source or missing docs.
 const verification=await cloudPreflight();
 if(!verification.ok||verification.counts.MATCH!==planned.length)fatal(`Verification incomplete: ${verification.counts.MATCH}/${planned.length} records match; ${verification.counts.CONFLICT} conflict(s).`);
 // Separate index, never touches old /catalogueLessons root records.
 const index=await limitedMap(bundle.lessons,12,async l=>{
  const path=['curriculumPilotIndex',l.lessonId],ref=doc(db,...path),snap=await getDoc(ref);
  if(snap.exists()&&snap.data().revisionId!==RELEASE_ID)fatal('Index conflict '+l.lessonId);
  return {path,lesson:l,new:!snap.exists()};
 });
 const missing=index.filter(x=>x.new);
 for(let i=0;i<missing.length;i+=CHUNK){
  const batch=writeBatch(db);
  for(const item of missing.slice(i,i+CHUNK)){const l=item.lesson;
   batch.set(doc(db,...item.path),{lessonId:l.lessonId,unitId:l.unitId,title:l.title,revisionId:RELEASE_ID,yearGroup:11,schoolId:SCHOOL_ID,releaseId:RELEASE_ID,visibility:'owner_private',studentPublished:false,curriculumRole:l.curriculumRole,createdByUid:auth.currentUser.uid,createdAt:serverTimestamp()});
  }await batch.commit();
 }
 const read=await Promise.all(index.map(async x=>getDoc(doc(db,...x.path))));
 if(read.some(s=>!s.exists()||s.data().revisionId!==RELEASE_ID))fatal('Private index readback failed');
 const releasePath=['curriculumPilotReleases',RELEASE_ID];
 const root=doc(db,...releasePath),existing=await getDoc(root);
 if(existing.exists()){
  if(existing.data().documentCount!==1410||existing.data().releaseId!==RELEASE_ID)fatal('Conflicting release marker: inspect manually');
 }else{
  const batch=writeBatch(db);batch.set(root,{releaseId:RELEASE_ID,schoolId:SCHOOL_ID,status:'READY_OWNER_PRIVATE',studentPublished:false,documentCount:1410,lessonCount:94,questionCount:376,questionFamilyCount:376,teacherKeysRestricted:true,teacherUseStatus:'approved_initial_pilot_review_during_teaching',independentModerationComplete:false,createdByUid:auth.currentUser.uid,createdAt:serverTimestamp()});await batch.commit();
 }
 log('privateIndexReady',{indexed:94,newIndexes:missing.length});
 show('finalStatus',`SUCCESS: 1,410 immutable documents verified; 94 owner-only index records present. Private release marker READY_OWNER_PRIVATE.\nNo student pages were published, no current course head pointers were overwritten, and no existing lessons were deleted.`);
}
el('finalize').onclick=async()=>{busySet(true);try{await finalize()}catch(e){show('finalStatus','FINAL VERIFICATION STOPPED: '+e.message);log('finalizeFailed',{message:e.message})}finally{busySet(false)}};
el('downloadLog').onclick=()=>{
 const sanitized={releaseId:RELEASE_ID,schoolId:SCHOOL_ID,events:importLog};const blob=new Blob([JSON.stringify(sanitized,null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='projectx-import-local-log.json';a.click();URL.revokeObjectURL(u);
};
state();
