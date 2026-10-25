/* Project X Year 11 -> Google Classroom teacher-controlled DRAFT publisher.
   The only curriculum records this page reads are curriculumPilotIndex and catalogueStudentLessons.
   No teacher marking keys, lesson teacherPlans, or OAuth secrets are accessed. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,validateIndex,selectPlanEntries,safeStudentContent,topicTitle,classroomBody,classroomMarker,findRemoteByMarker,topicIdFromName,unitName} from './core.mjs';
const cfg={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(cfg,'px-y11-classroom-publisher');const auth=getAuth(app);const db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={index:[],token:null,tokenClient:null,course:null,reviewed:null,selected:new Set(),busy:false,journal:[],topics:[],materials:[],assignments:[]};
const isOwner=()=>auth.currentUser?.uid===OWNER;
function setStatus(id,msg,type=''){const el=$(id);el.textContent=msg;el.className='status'+(type?' '+type:'')}
function log(event,extra={}){state.journal.push({event,time:new Date().toISOString(),...extra})}
function checkOwner(){if(!isOwner())throw Error('Sign in as the Project X pilot owner before loading curriculum.');}
function checkGoogle(){if(!state.token||!$('course').value)throw Error('Connect Google Classroom and choose a course.');}
function courseId(){return $('course').value}
function guard(){if(!state.reviewed||state.reviewed.courseId!==courseId()||state.reviewed.mode!==$('operation').value||JSON.stringify(state.reviewed.ids)!==JSON.stringify([...state.selected].sort()))throw Error('Review the current selections again before creating anything.');}
function setControls(){const owner=isOwner();$('pxSignIn').disabled=!!auth.currentUser;$('pxSignOut').disabled=!auth.currentUser;$('pxRefresh').disabled=!owner;$('classroomConnect').disabled=state.busy;$('classroomDisconnect').disabled=!state.token||state.busy;$('course').disabled=!state.token||state.busy;$('review').disabled=!owner||!state.token||!courseId()||state.busy; const ready=!!state.reviewed&&owner&&!!state.token&&!!courseId()&&$('confirmCourse').checked&&$('confirmPilot').checked&&!state.busy;$('create').disabled=!ready;}
function invalidate(){state.reviewed=null;$('confirmCourse').checked=false;$('confirmPilot').checked=false;$('create').disabled=true;$('preview').textContent='Changes to your selections require a new review. No Classroom writes made.';setControls()}
const opt=(value,label)=>new Option(label,value);
async function loadCurriculum(){checkOwner();setStatus('pxStatus','Reading private Year 11 lesson index…');const s=await getDocs(collection(db,'curriculumPilotIndex'));state.index=validateIndex(s.docs.map(x=>x.data()));
 $('unit').replaceChildren(opt('all','All Year 11 units'));for(const u of [...new Set(state.index.map(x=>x.unitId))])$('unit').add(opt(u,unitName(u)));
 state.selected.clear();renderLessons();setStatus('pxStatus',`Owner signed in. ${state.index.length} lessons loaded across 26 units. Imported material remains private until you explicitly create Classroom drafts.`,'ok');log('index_loaded',{lessonCount:state.index.length});invalidate();}
function renderLessons(){const c=$('lessons');c.replaceChildren();const filter=$('unit').value,needle=$('search').value.toLowerCase().trim();const shown=state.index.filter(l=>(filter==='all'||l.unitId===filter)&&(!needle||`${l.title} ${l.lessonId}`.toLowerCase().includes(needle)));
 if(!shown.length){c.textContent='No matching lessons. Check the unit and search filters.';return}
 for(const l of shown){const row=document.createElement('label');row.className='lesson-row';const box=document.createElement('input');box.type='checkbox';box.value=l.lessonId;box.checked=state.selected.has(l.lessonId);box.disabled=$('operation').value==='topics';box.onchange=()=>{if(box.checked)state.selected.add(l.lessonId);else state.selected.delete(l.lessonId);invalidate();renderLessons()};const wrap=document.createElement('span');wrap.textContent=l.title||l.lessonId;const sm=document.createElement('small');sm.textContent=`${l.lessonId} · ${unitName(l.unitId)}`;wrap.append(sm);row.append(box,wrap);c.append(row)}$('selectionCount').textContent=$('operation').value==='topics'?'All 26 unit topics will be created or reused; no lesson selection necessary.':`${state.selected.size} lesson(s) selected. Maximum ten lessons per Classroom batch.`}
async function api(path,method='GET',body){if(!state.token)throw Error('Google Classroom OAuth token required.');const r=await fetch('https://classroom.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+state.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{throw Error('Unexpected Classroom response');}
 if(!r.ok){const message=data.error?.message||raw.slice(0,250);if(r.status===401){state.token=null;setControls();}throw Error(`Google Classroom ${r.status}: ${message}`)}return data;}
async function pages(prefix,field){let next='',all=[],count=0;do{const separator=prefix.includes('?')?'&':'?';const path=prefix+separator+'pageSize=100'+(next?'&pageToken='+encodeURIComponent(next):'');const data=await api(path);all.push(...(data[field]||[]));next=data.nextPageToken||'';count++;if(count>20)throw Error('Classroom pagination exceeded limit. Use a smaller course.')}while(next);return all;}
async function loadCourses(){const list=await pages('courses?teacherId=me','courses');$('course').replaceChildren(opt('','Select a course you teach'));for(const c of list.filter(x=>['ACTIVE','PROVISIONED'].includes(x.courseState)||!x.courseState))$('course').add(opt(c.id,`${c.name} · ${c.id}`));setStatus('googleStatus',`${list.length} courses found. Choose your own teaching course. The first create operation remains teacher-controlled.`,'ok');log('classroom_courses_loaded',{count:list.length});setControls()}
async function connectClassroom(){const id=$('oauthClient').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('Enter an OAuth Web client ID, not a secret.');if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services has not loaded. Refresh the page.');localStorage.setItem('projectx.classroom.oauthClientId.v1',id);
 state.tokenClient=window.google.accounts.oauth2.initTokenClient({client_id:id,scope:['https://www.googleapis.com/auth/classroom.courses.readonly','https://www.googleapis.com/auth/classroom.topics','https://www.googleapis.com/auth/classroom.courseworkmaterials','https://www.googleapis.com/auth/classroom.coursework.students'].join(' '),callback:result=>{
  if(result.error){setStatus('googleStatus','Google authorisation failed: '+result.error,'error');return}state.token=result.access_token;setControls();loadCourses().catch(e=>setStatus('googleStatus',e.message,'error'));
 }});
 state.tokenClient.requestAccessToken({prompt:'consent'});
}
async function studentLesson(id){checkOwner();const s=await getDoc(doc(db,'catalogueStudentLessons',id,'revisions',RELEASE_ID));if(!s.exists())throw Error('Student-safe projection missing: '+id);safeStudentContent(s.data());return s.data();}
async function remoteInventory(){const c=encodeURIComponent(courseId());const [topics,materials,assignments]=await Promise.all([
 pages(`courses/${c}/topics`,'topic'),pages(`courses/${c}/courseWorkMaterials?courseWorkMaterialStates=DRAFT&courseWorkMaterialStates=PUBLISHED`,'courseWorkMaterial'),pages(`courses/${c}/courseWork?courseWorkStates=DRAFT&courseWorkStates=PUBLISHED`,'courseWork')]);
 state.topics=topics;state.materials=materials;state.assignments=assignments;}
async function ensureTopic(unitId){const name=topicTitle(unitId);let id=topicIdFromName(state.topics,name);if(id)return {topicId:id,created:false};const course=encodeURIComponent(courseId());
 try{const t=await api(`courses/${course}/topics`,'POST',{name});state.topics.push(t);log('topic_created',{unitId,topicId:t.topicId,name});return {topicId:t.topicId,created:true}}
 catch(err){if(!String(err.message).includes('ALREADY_EXISTS'))throw err;const current=await pages(`courses/${course}/topics`,'topic');state.topics=current;id=topicIdFromName(current,name);if(!id)throw err;return {topicId:id,created:false};}}
async function createEntry(lesson,kind,topicId){const marker=classroomMarker(lesson.lessonId,kind);const coll=kind==='material'?'courseWorkMaterials':'courseWork';const remote=kind==='material'?state.materials:state.assignments;const old=findRemoteByMarker(remote,marker);if(old){log('item_reused',{kind,lessonId:lesson.lessonId,remoteId:old.id});return 'reused'}
 const student=await studentLesson(lesson.lessonId);const body=classroomBody(student,kind,topicId);const result=await api(`courses/${encodeURIComponent(courseId())}/${coll}`,'POST',body);remote.push(result);log('draft_created',{kind,lessonId:lesson.lessonId,remoteId:result.id,courseId:courseId(),state:result.state});return 'created';}
async function review(){checkOwner();checkGoogle();const plan=selectPlanEntries(state.index,[...state.selected],$('operation').value);const cid=courseId();if(!cid)throw Error('Choose a class before reviewing.');
 // Read-only preflight: validate every projected student lesson, do NOT read teacher keys.
 const entries=[];
 for(const item of plan.lessons){const student=safeStudentContent(await studentLesson(item.lessonId));entries.push({id:item.lessonId,title:student.title,assessmentCount:student.questions.length,requiresTeacherExample:student.activities.some(x=>x.requiresTeacherProvidedExample)});}
 const count=plan.itemCount;
 state.reviewed={courseId:cid,mode:plan.mode,ids:[...state.selected].sort(),plan,entries};
 $('confirmCourse').checked=false;$('confirmPilot').checked=false;
 $('preview').textContent=[`DRY PREVIEW: ${count} planned item(s); NO Classroom changes made.`,`Target course ID: ${cid}`,`Mode: ${plan.mode}`,`Topics: ${plan.units.length} (reused if name already exists)`,...entries.map(x=>`• ${x.id} — ${x.title} — 10-mark assignment ${x.requiresTeacherExample?'[teacher example still required]':''}`),'','Student projections contain no teacher marking keys.','All materials and assignments will be created as DRAFTS and require manual Classroom review.'].join('\n');
 log('preview_completed',{courseId:cid,mode:plan.mode,itemCount:count});setControls();}
async function createDrafts(){checkOwner();checkGoogle();guard();if(!$('confirmCourse').checked||!$('confirmPilot').checked)throw Error('Confirm the destination and initial pilot status.');const plan=state.reviewed.plan;
 state.busy=true;setControls();setStatus('progress','Reading existing Classroom topics and draft IDs…');log('create_started',{courseId:courseId(),mode:plan.mode,itemCount:plan.itemCount});
 let topicsCreated=0,draftsCreated=0,existing=0;try{
  await remoteInventory();
  for(let i=0;i<plan.units.length;i++){
   const u=plan.units[i],t=await ensureTopic(u.unitId);if(t.created)topicsCreated++;
   setStatus('progress',`Topic ${i+1}/${plan.units.length}: ${u.name}`);
  }
  if(plan.mode!=='topics')for(let i=0;i<plan.lessons.length;i++){
   const l=plan.lessons[i],topic=topicIdFromName(state.topics,topicTitle(l.unitId));if(!topic)throw Error('Topic was not returned for '+l.unitId);
   for(const kind of (plan.mode==='both'?['material','assignment']:[plan.mode==='materials'?'material':'assignment'])){
    setStatus('progress',`Preparing lesson ${i+1}/${plan.lessons.length}: ${l.title} (${kind})`);
    const outcome=await createEntry(l,kind,topic);if(outcome==='created')draftsCreated++;else existing++;
   }
  }
  setStatus('progress',`Finished: ${topicsCreated} new topics, ${draftsCreated} new drafts and ${existing} existing matching drafts reused. Nothing was published to students. Review the drafts in your Google Classroom Classwork tab.`,'ok');log('create_complete',{courseId:courseId(),topicsCreated,draftsCreated,existing});
 }catch(err){log('create_error',{message:err.message,courseId:courseId()});setStatus('progress',`Stopped after partial progress: ${err.message}. Retry safely: matching Project X markers are checked before creating another item.`,'error');}
 finally{state.busy=false;state.reviewed=null;$('confirmCourse').checked=false;$('confirmPilot').checked=false;setControls();}
}
function downloadLog(){const blob=new Blob([JSON.stringify({project:'Project X',releaseId:RELEASE_ID,exportedAt:new Date().toISOString(),containsCredentials:false,events:state.journal},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ProjectX_Classroom_Publisher_Log.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function displayError(id,error){setStatus(id,error.message||String(error),'error');console.error('Project X publisher:',error)}
$('pxSignIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){displayError('pxStatus',e)}};
$('pxSignOut').onclick=()=>signOut(auth).catch(e=>displayError('pxStatus',e));
$('pxRefresh').onclick=()=>loadCurriculum().catch(e=>displayError('pxStatus',e));
$('classroomConnect').onclick=()=>connectClassroom().catch(e=>displayError('googleStatus',e));
$('classroomDisconnect').onclick=()=>{if(state.token&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(state.token,()=>{});state.token=null;$('course').replaceChildren(opt('','Connect to Google Classroom'));state.course=null;invalidate();setStatus('googleStatus','Disconnected. Access token discarded from this page.');setControls()};
$('course').onchange=()=>{invalidate();state.course=courseId()};
$('operation').onchange=()=>{invalidate();renderLessons()};
$('unit').onchange=renderLessons;$('search').oninput=renderLessons;
$('confirmCourse').onchange=setControls;$('confirmPilot').onchange=setControls;
$('review').onclick=()=>review().catch(e=>displayError('preview',e));
$('create').onclick=()=>createDrafts().catch(e=>displayError('progress',e));
$('logDownload').onclick=downloadLog;
$('oauthClient').value=localStorage.getItem('projectx.classroom.oauthClientId.v1')||'';
onAuthStateChanged(auth,user=>{state.index=[];state.selected.clear();renderLessons();invalidate();if(isOwner())loadCurriculum().catch(e=>displayError('pxStatus',e));else setStatus('pxStatus',user?'Signed in with a non-owner account. The private Year 11 catalogue is inaccessible.':'Sign in with Project X owner account to load private lessons.');setControls()});
