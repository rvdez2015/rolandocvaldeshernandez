/* Project X owner-approved Year 11 Classroom DRAFT reconciliation.
 * All writes are limited to one existing Classroom description after preview.
 * No Firestore writes, no create calls, no token persistence. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,collection,getDocs} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {COURSE_NAME,COURSE_SECTION,planCurriculum,isActiveTarget,lessonMaterialDraft} from './bootstrap-core.mjs';
import {RELEASE_ID,topicIdFromName,classroomMarker} from './core-v5.mjs';
import {uniqueMaterial,assertUnchanged,checkPatchEligibility} from './sync-core.mjs';
import {approvedLessonClassroomPreview} from './approved-sync-core.mjs';
const config={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(config,'px-approved-classroom-sync'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={token:null,lessons:[],units:[],courseId:'',preview:null,busy:false};
const owner=()=>auth.currentUser?.uid===OWNER;
function say(id,msg){$(id).textContent=msg}
function reset(){state.preview=null;$('before').textContent='';$('after').value='';$('detail').textContent='';$('reviewed').checked=false;$('confirm').value='';$('phrase').textContent='';say('applyStatus','No write attempted.');controls()}
function controls(){const ok=owner()&&!state.busy;$('signIn').disabled=!!auth.currentUser||state.busy;$('signOut').disabled=!auth.currentUser||state.busy;$('connect').disabled=!ok;$('course').disabled=!ok||!state.token;$('lesson').disabled=!ok||!state.lessons.length;$('preview').disabled=!ok||!state.token||!state.courseId;$('reviewed').disabled=!state.preview||state.busy;$('confirm').disabled=!state.preview||state.busy;$('apply').disabled=!state.preview||state.busy||!$('reviewed').checked||$('confirm').value.trim()!==state.preview.phrase}
function busy(v){state.busy=v;controls()}
function requireOwner(){if(!owner())throw Error('Owner authentication required')}
async function google(path,method='GET',body){if(!state.token)throw Error('Connect Google first');const response=await fetch('https://classroom.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+state.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await response.json();if(!response.ok)throw Error('Classroom HTTP '+response.status+': '+String(json.error?.message||'unknown error').slice(0,180));return json}
async function paged(path,key){let items=[],next='';do{const j=await google(path+(path.includes('?')?'&':'?')+'pageSize=100'+(next?'&pageToken='+encodeURIComponent(next):''));items.push(...j[key]||[]);next=j.nextPageToken||'';if(items.length>2000)throw Error('Unexpected pagination')}while(next);return items}
const coursePath=()=> 'courses/'+encodeURIComponent(state.courseId);
async function ensureCourse(){const c=await google(coursePath());if(!isActiveTarget(c))throw Error('Selected course is not the expected active Year 11 course');return c}
async function readApproved(id){
 const h=await getDoc(doc(db,'ownerApprovedCurriculumLessons',id));
 if(!h.exists()||!h.data().latestApprovedRevisionId)throw Error('No approved revision saved for this lesson');
 const rev=String(h.data().latestApprovedRevisionId);
 if(!/^approved-[a-zA-Z0-9_-]{1,150}$/.test(rev))throw Error('Invalid approved revision');
 const s=await getDoc(doc(db,'ownerApprovedCurriculumLessons',id,'versions',rev));
 if(!s.exists()||s.data().lessonId!==id||s.data().revisionId!==rev||s.data().approvedByUid!==OWNER)
  throw Error('Invalid approved lesson document');
 return {data:s.data(),revisionId:rev};
}
async function loadIndex(){
 requireOwner();busy(true);
 try{const s=await getDocs(collection(db,'curriculumPilotIndex'));const p=planCurriculum(s.docs.map(x=>x.data()));state.lessons=p.lessons;state.units=p.units;
 $('lesson').replaceChildren(...p.lessons.map(l=>new Option(l.lessonId+' · '+l.title,l.lessonId)));
 say('firebaseStatus','Owner verified. '+p.lessons.length+' lessons available.');
 }catch(e){say('firebaseStatus',e.message)}finally{busy(false)}
}
async function connect(){
 requireOwner();const client=$('clientId').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Valid OAuth web client ID required');
 if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services unavailable');
 const scope='https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials';
 const authClient=window.google.accounts.oauth2.initTokenClient({client_id:client,scope,callback:async reply=>{
  try{if(reply.error||!reply.access_token)throw Error('Google authorisation rejected');const got=new Set(String(reply.scope||'').split(/\s+/));if(scope.split(' ').some(x=>!got.has(x)))throw Error('Required Classroom permission missing');state.token=reply.access_token;const cs=await paged('courses?teacherId=me','courses');const matches=cs.filter(isActiveTarget);
   $('course').replaceChildren(new Option('Select course',''),...matches.map(c=>new Option(c.name+' · '+c.id,c.id)));state.courseId=matches.length===1?String(matches[0].id):'';$('course').value=state.courseId;say('googleStatus','Connected; '+matches.length+' matching active courses.');
  }catch(e){state.token=null;say('googleStatus',e.message)}finally{reset()}
 }});authClient.requestAccessToken({prompt:'consent'});
}
async function buildPreview(){
 requireOwner();reset();busy(true);
 try{
  await ensureCourse();const id=$('lesson').value,entry=state.lessons.find(x=>x.lessonId===id);
  if(!entry)throw Error('Unknown Year 11 lesson');
  const [approved,sourceSnap,studentSnap]=await Promise.all([
   readApproved(id),getDoc(doc(db,'catalogueLessons',id,'revisions',RELEASE_ID)),
   getDoc(doc(db,'catalogueStudentLessons',id,'revisions',RELEASE_ID))
  ]);
  if(!sourceSnap.exists()||!studentSnap.exists())throw Error('Base lesson records missing');
  const topics=await paged(coursePath()+'/topics','topic'),unit=state.units.find(x=>x.unitId===entry.unitId);
  const topicId=topicIdFromName(topics,unit?.name);
  if(!topicId)throw Error('Expected Classroom topic missing');
  const posts=await paged(coursePath()+'/courseWorkMaterials?courseWorkMaterialStates=DRAFT&courseWorkMaterialStates=PUBLISHED','courseWorkMaterial');
  const remote=uniqueMaterial(posts,id);
  const baseline=lessonMaterialDraft(studentSnap.data(),topicId,sourceSnap.data());
  // New approved sync only permits original, unmodified DRAFTs with no attachments.
  if(remote.state!=='DRAFT'||remote.title!==baseline.title||String(remote.topicId)!==String(topicId)||
      remote.description!==baseline.description||(remote.materials||[]).length)
    throw Error('Classroom draft differs from original release or has attachments. Manual reconciliation is required; automatic overwrite blocked.');
  const suggestion=approvedLessonClassroomPreview({...approved.data,approvalStatus:'approved'},remote,classroomMarker(id,'material'));
  if(suggestion.proposedDescription===remote.description){say('previewStatus','Already current');return}
  const phrase='UPDATE '+id;
  state.preview={id,courseId:state.courseId,approvedRevisionId:approved.revisionId,remote:structuredClone(remote),topicId,phrase,description:suggestion.proposedDescription};
  $('before').textContent=remote.description;$('after').value=suggestion.proposedDescription;$('phrase').textContent=phrase;
  $('detail').textContent='Existing material ID: '+remote.id+' · Approved revision: '+approved.revisionId+' · Only description is eligible for update.';
  say('previewStatus','Read-only preview ready. No write performed.');
 }catch(e){say('previewStatus','Preview blocked: '+e.message)}finally{busy(false)}
}
async function apply(){
 requireOwner();const p=state.preview;
 if(!p||!$('reviewed').checked||$('confirm').value.trim()!==p.phrase)throw Error('Fresh preview and explicit approval required');
 if(p.courseId!==state.courseId||p.id!==$('lesson').value)throw Error('Selection changed');
 busy(true);
 try{
  await ensureCourse();const freshApproved=await readApproved(p.id);
  if(freshApproved.revisionId!==p.approvedRevisionId)throw Error('Approved lesson changed. Preview again.');
  const path=coursePath()+'/courseWorkMaterials/'+encodeURIComponent(p.remote.id);
  const live=await google(path);assertUnchanged(live,p.remote);
  // Recheck eligibility, marker and consent; no title, topic, state or attachments patch.
  if(live.state!=='DRAFT'||(live.materials||[]).length||
    !live.description.includes(classroomMarker(p.id,'material')))throw Error('Classroom material no longer eligible');
  const result=await google(path+'?updateMask=description','PATCH',{description:p.description});
  if(result.id!==p.remote.id||result.description!==p.description||result.state!=='DRAFT')throw Error('Unexpected update response; verify manually');
  const verify=await google(path);
  if(verify.id!==p.remote.id||verify.description!==p.description||verify.state!=='DRAFT')
   throw Error('Post-update verification mismatch; inspect Classroom');
  reset();say('applyStatus','Verified: existing Classroom DRAFT material '+verify.id+' updated to approved version '+p.approvedRevisionId+'. Firebase approval preserved.');
 }catch(e){reset();say('applyStatus','Update not confirmed: '+e.message+'. Inspect Classroom before retrying.')}finally{busy(false)}
}
$('signIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){say('firebaseStatus',e.message)}};
$('signOut').onclick=()=>signOut(auth);
$('connect').onclick=()=>connect().catch(e=>say('googleStatus',e.message));
$('course').onchange=()=>{state.courseId=$('course').value;reset()};
$('lesson').onchange=reset;$('preview').onclick=buildPreview;
$('reviewed').onchange=controls;$('confirm').oninput=controls;
$('apply').onclick=()=>apply().catch(e=>say('applyStatus',e.message));
onAuthStateChanged(auth,user=>{state.lessons=[];state.token=null;state.courseId='';reset();if(owner())loadIndex();else say('firebaseStatus',user?'Wrong Firebase account':'Owner sign-in required')});
