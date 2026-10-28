/* Project X · One-lesson Classroom Material reconciliation pilot.
   Default read-only; teacher must preview, inspect, confirm, and click Apply.
   No Firebase writes, new Classroom posts, Drive operations, student publications or bulk patches. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,topicIdFromName} from './core-v5.mjs';
import {COURSE_NAME,COURSE_SECTION,planCurriculum,isActiveTarget,lessonMaterialDraft} from './bootstrap-core.mjs';
import {proposedMaterial,uniqueMaterial,checkPatchEligibility,assertUnchanged,validateTeacherEditedDescription} from './sync-core.mjs';

const firebaseConfig={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(firebaseConfig,'px-y11-classroom-sync-v1'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={lessons:[],units:[],courses:[],token:null,courseId:'',preview:null,busy:false,ownerReady:false};
const owner=()=>auth.currentUser?.uid===OWNER;
function info(id,message,error=false){$(id).textContent=message;$(id).className='status'+(error?' error':'');}
function resetPreview(message='Preview is required before any update.'){
 state.preview=null;$('before').textContent='Nothing loaded.';$('after').value='';$('after').disabled=true;
 $('metadata').textContent=message;$('diff').textContent='';$('warnings').hidden=true;$('warnings').textContent='';
 $('reviewed').checked=false;$('reviewed').disabled=true;$('confirmText').value='';$('confirmText').disabled=true;$('phrase').textContent='';
 info('applyStatus','No changes applied.');controls();
}
function controls(){
 const logged=owner(),connected=!!state.token,ready=logged&&state.ownerReady;
 $('pxSignIn').disabled=!!auth.currentUser||state.busy;$('pxSignOut').disabled=!auth.currentUser||state.busy;
 $('connect').disabled=!ready||state.busy;$('disconnect').disabled=!connected||state.busy;
 $('course').disabled=!connected||state.busy;$('lesson').disabled=!ready||state.busy;
 $('preview').disabled=!connected||!ready||!state.courseId||state.busy;
 $('apply').disabled=!state.preview||state.preview.status!=='ready'||state.busy||!$('reviewed').checked||
  $('confirmText').value.trim()!==state.preview.phrase;
}
function busy(value){state.busy=value;controls()}
function handle(id,e){info(id,e.message||String(e),true);console.error('Sync operation blocked:',e.name||'Error');}
function requireOwner(){if(!owner())throw Error('Sign in as the Project X owner first.');}
async function google(path,method='GET',body){
 if(!state.token)throw Error('Connect Google Classroom first.');
 const res=await fetch('https://classroom.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+state.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let response;try{response=await res.json()}catch{throw Error('Google Classroom returned invalid JSON (HTTP '+res.status+').')}
 if(!res.ok){if(res.status===401){state.token=null;resetPreview();controls()}
  throw Error(`Google Classroom HTTP ${res.status}: ${String(response.error?.message||'Operation rejected').slice(0,200)}`)}
 return response;
}
async function paged(path,key){let cursor='',n=0;const result=[];do{
 const q=path.includes('?')?'&':'?';const page=await google(path+q+'pageSize=100'+(cursor?'&pageToken='+encodeURIComponent(cursor):''));
 result.push(...(page[key]||[]));cursor=page.nextPageToken||'';if(++n>40)throw Error('Unexpected Google Classroom pagination volume');
}while(cursor);return result;}
async function hash(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function coursePath(){return 'courses/'+encodeURIComponent(state.courseId)}
async function exactActiveCourse(){
 const found=state.courses.find(c=>String(c.id)===String(state.courseId));if(!isActiveTarget(found))throw Error('Select an exact active Year 11 2026-2027 course.');
 const live=await google(coursePath());if(!isActiveTarget(live)||String(live.id)!==String(state.courseId))throw Error('Course changed or is not ACTIVE. Stop.');return live;
}
async function loadCurriculum(){
 requireOwner();busy(true);try{
 const docs=await getDocs(collection(db,'curriculumPilotIndex'));const plan=planCurriculum(docs.docs.map(s=>s.data()));
 state.lessons=plan.lessons;state.units=plan.units;state.ownerReady=true;
 $('lesson').replaceChildren(...plan.lessons.map(l=>new Option(`${l.lessonId} · ${l.title||'Lesson'}`,l.lessonId)));
 $('lesson').value='PX25-Y11-U02-L003';info('pxStatus','Owner verified. 94 lessons, 26 topics; Firebase remains read-only.');
 }catch(e){state.ownerReady=false;handle('pxStatus',e)}finally{busy(false)}
}
async function connect(){
 requireOwner();if(!state.ownerReady)throw Error('Verify the private lesson index first.');
 const client=$('oauthClient').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Enter the same Google OAuth Web Application client ID used in Classroom Setup.');
 if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services failed to load.');
 localStorage.setItem('projectx.classroom.oauthClientId.v1',client);
 const scopes=['https://www.googleapis.com/auth/classroom.courses.readonly','https://www.googleapis.com/auth/classroom.courseworkmaterials'];
 const tok=window.google.accounts.oauth2.initTokenClient({client_id:client,scope:scopes.join(' '),callback:async reply=>{
  try{
   if(reply.error)throw Error('Google sign-in rejected: '+reply.error);
   const granted=new Set(String(reply.scope||'').split(/\s+/));if(scopes.some(x=>!granted.has(x)))throw Error('Google Classroom course-read and Materials permissions are both required.');
   state.token=reply.access_token;info('googleStatus','Google connected. Checking the exact Year 11 course…');await listCourses();
  }catch(e){state.token=null;handle('googleStatus',e);resetPreview()}finally{controls()}
 }});
 tok.requestAccessToken({prompt:'consent'});
}
async function listCourses(){
 resetPreview();busy(true);try{
 state.courses=await paged('courses?teacherId=me','courses');
 const matches=state.courses.filter(isActiveTarget);
 $('course').replaceChildren(new Option('Select the ACTIVE Year 11 class',''),...matches.map(c=>new Option(`${c.name} · ${c.section} · ${c.id}`,c.id)));
 const stored=localStorage.getItem('projectx.classroom.y11.bootstrap.courseId')||'';
 state.courseId=matches.length===1?String(matches[0].id):matches.some(c=>String(c.id)===stored)?stored:'';
 $('course').value=state.courseId;
 info('googleStatus',`${matches.length} ACTIVE exact course(s) found. ${state.courseId?'Course selected.':'Select your course manually.'}`);
 }finally{busy(false)}
}
async function readPair(id){
 requireOwner();const [s,t]=await Promise.all([
  getDoc(doc(db,'catalogueStudentLessons',id,'revisions',RELEASE_ID)),
  getDoc(doc(db,'catalogueLessons',id,'revisions',RELEASE_ID))
 ]);
 if(!s.exists()||!t.exists())throw Error('Missing owner or student record for '+id);
 return [s.data(),t.data()];
}
async function assemble(id,topicId){
 const [student,teacher]=await readPair(id);
 const base=lessonMaterialDraft(student,topicId,teacher);
 const proposed=proposedMaterial(student,teacher,topicId);
 const digest=await hash(JSON.stringify({base:base.description,proposed:proposed.description}));
 return {base,proposed,digest,student};
}
async function preview(){
 requireOwner();resetPreview();busy(true);info('previewStatus','Reading source lesson and existing Classroom draft (read-only)…');
 try{
  await exactActiveCourse();const id=$('lesson').value;
  const entry=state.lessons.find(e=>e.lessonId===id);if(!entry)throw Error('Lesson missing from verified Year 11 index.');
  const topics=await paged(coursePath()+'/topics','topic');
  const topicName=state.units.find(u=>u.unitId===entry.unitId)?.name;
  const topicId=topicIdFromName(topics,topicName);if(!topicId)throw Error('Expected unit topic missing in Classroom. Stop.');
  const posts=await paged(coursePath()+'/courseWorkMaterials?courseWorkMaterialStates=DRAFT&courseWorkMaterialStates=PUBLISHED','courseWorkMaterial');
  const remote=uniqueMaterial(posts,id);
  const built=await assemble(id,topicId);
  const status=checkPatchEligibility(remote,built.base,built.proposed,id);
  const phrase=`UPDATE ${id}`;
  state.preview={id,courseId:state.courseId,topicId,remote:structuredClone(remote),digest:built.digest,status,phrase};
  $('before').textContent=remote.description;
  $('after').value=built.proposed.description;
  $('after').disabled=status!=='ready';
  $('metadata').textContent=`Lesson ${id} | release ${RELEASE_ID} | Classroom Material ID ${remote.id} | status ${remote.state} | topic ${topicName} | updateTime ${remote.updateTime||'unavailable'} | ${status}`;
  $('diff').textContent=`Original: ${remote.description.length} characters · Proposed: ${built.proposed.description.length} characters · Additional: ${built.proposed.description.length-remote.description.length} characters`;
  const teacherExamples=built.student.studentPlan?.activities?.filter(a=>a.requiresTeacherProvidedExample).length||0;
  $('warnings').hidden=false;
  $('warnings').textContent=`TEACHER REVIEW REQUIRED: ${teacherExamples} activities explicitly require a teacher-provided example. Check that those examples are actually present in the proposed explanation and that no model answers, private marking guidance or student data have been included.`;
  $('reviewed').disabled=status!=='ready';$('confirmText').disabled=status!=='ready';$('phrase').textContent=status==='ready'?phrase:'No update needed or this draft differs from the expected v1.2 baseline.';
  info('previewStatus',status==='already-current'?'Already synchronised; no update needed.':'Preview ready. No changes made to Classroom.');
 }catch(e){resetPreview('Comparison blocked; original Classroom drafts remain unchanged.');handle('previewStatus',e)}finally{busy(false)}
}
async function apply(){
 requireOwner();const p=state.preview;if(!p||p.status!=='ready')throw Error('Generate a fresh eligible preview first.');
 if(!$('reviewed').checked||$('confirmText').value.trim()!==p.phrase)throw Error('Teacher review confirmation required.');
 if(state.courseId!==p.courseId||$('lesson').value!==p.id)throw Error('Course or lesson changed since preview.');
 const edited=validateTeacherEditedDescription($('after').value,p.id);
 busy(true);info('applyStatus','Re-reading source and Classroom draft before the one-description update…');
 try{
  await exactActiveCourse();
  const fresh=await assemble(p.id,p.topicId);
  if(fresh.digest!==p.digest)throw Error('Project X lesson changed since preview. No Classroom write; preview again.');
  const posts=await paged(coursePath()+'/courseWorkMaterials?courseWorkMaterialStates=DRAFT&courseWorkMaterialStates=PUBLISHED','courseWorkMaterial');
  const listed=uniqueMaterial(posts,p.id);
  if(String(listed.id)!==String(p.remote.id))throw Error('Classroom matching Material ID changed; stop.');
  assertUnchanged(listed,p.remote);
  const path=coursePath()+'/courseWorkMaterials/'+encodeURIComponent(p.remote.id);
  const remote=await google(path);assertUnchanged(remote,p.remote);
  if(checkPatchEligibility(remote,fresh.base,fresh.proposed,p.id)!=='ready')throw Error('Draft is no longer eligible; preview again.');
  // Only description can change; state/topic/title/materials are not part of the PATCH mask.
  const saved=await google(path+'?updateMask=description','PATCH',{description:edited});
  if(saved.state!=='DRAFT'||String(saved.topicId)!==String(p.topicId)||saved.description!==edited||String(saved.id)!==String(p.remote.id))
    throw Error('Unexpected Google response. Inspect Classroom manually before retrying.');
  resetPreview('Update completed. Re-preview this lesson to verify the live draft.');
  info('applyStatus',`Success: updated description of existing DRAFT Material ${saved.id} for ${p.id}. No new posts, publication, worksheet or Firebase changes.`);
  info('previewStatus','One draft updated. Re-preview to confirm.');
 }catch(e){resetPreview('Update attempt stopped or response uncertain. Inspect Classroom and preview afresh; do not retry blindly.');handle('applyStatus',e)}finally{busy(false)}
}
$('pxSignIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){handle('pxStatus',e)}};
$('pxSignOut').onclick=()=>signOut(auth).catch(e=>handle('pxStatus',e));
$('connect').onclick=()=>connect().catch(e=>handle('googleStatus',e));
$('disconnect').onclick=()=>{if(state.token&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(state.token,()=>{});state.token=null;state.courses=[];state.courseId='';resetPreview();info('googleStatus','Disconnected; access token discarded.');controls()};
$('course').onchange=()=>{state.courseId=$('course').value;resetPreview()};$('lesson').onchange=()=>resetPreview();
$('preview').onclick=()=>preview().catch(e=>handle('previewStatus',e));
$('reviewed').onchange=controls;$('confirmText').oninput=controls;
$('apply').onclick=()=>apply().catch(e=>handle('applyStatus',e));
$('oauthClient').value=localStorage.getItem('projectx.classroom.oauthClientId.v1')||'';
onAuthStateChanged(auth,user=>{state.ownerReady=false;resetPreview();controls();if(owner())loadCurriculum();else info('pxStatus',user?'This Firebase user is not the Project X owner.':'Sign in to Project X as owner to begin.');});
