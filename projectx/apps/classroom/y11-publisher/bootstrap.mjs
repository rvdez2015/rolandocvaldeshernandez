/* Project X Classroom Bootstrap v1 — teacher-authorised, explicit writes only.
   Firebase reads owner-private index + student-safe lesson revisions; NEVER writes to Firebase.
   Class creation: separate action. 26 topics: separate action. 94 worksheet DRAFTS: 10 at a time.
   No student publications or non-worksheet teaching resource uploads. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,topicIdFromName} from './core-v5.mjs';
import {COURSE_NAME,COURSE_SECTION,planCurriculum,coursePayload,isTargetCourse,isActiveTarget,matchingCourse,createWorksheetOnly,worksheetDraft,worksheetMarker,matchWorksheet,nextBatch} from './bootstrap-core.mjs';
import {inferYearGroup} from './course-routing-v5.mjs';

const firebaseConfig={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(firebaseConfig,'px-y11-classroom-bootstrap'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={plan:null,token:null,courses:[],courseId:'',busy:false,createUncertain:false,topics:[],items:[],journal:[],confirmedDrive:false};
const activeOwner=()=>auth.currentUser?.uid===OWNER;
function status(id,message,cls=''){const el=$(id);el.textContent=message;el.className='status'+(cls?' '+cls:'');}
function journal(action,detail={}){state.journal.push({at:new Date().toISOString(),action,...detail});}
function lock(flag){state.busy=flag;controls();}
function fail(id,error){status(id,error.message||String(error),'error');journal('error',{section:id,errorType:error.name||'Error'});console.error('Classroom bootstrap operation failed:',error.name||'Error');}
function requireOwner(){if(!activeOwner())throw Error('Sign in to Project X with the authorised owner account.');}
function chosen(){return state.courses.find(c=>String(c.id)===String(state.courseId))||null;}
function readyCourse(){const c=chosen();if(!c||!isActiveTarget(c))throw Error('The selected 2026–2027 Year 11 Classroom must be ACTIVE. Accept/activate the course inside Google Classroom, then refresh.');return c;}
function controls(){const owner=activeOwner(),connected=!!state.token,c=chosen(),active=isActiveTarget(c);
 $('pxSignIn').disabled=!!auth.currentUser||state.busy;$('pxSignOut').disabled=!auth.currentUser||state.busy;$('refresh').disabled=!owner||state.busy;
 $('connect').disabled=!owner||!state.plan||state.busy;$('disconnect').disabled=!connected||state.busy;$('courseList').disabled=!connected||state.busy;$('reloadCourses').disabled=!connected||state.busy;
 const anySame=state.courses.some(c=>matchingCourse(c)||((c.section||'')===COURSE_SECTION&&inferYearGroup(c)===11))||!!localStorage.getItem('projectx.classroom.y11.bootstrap.courseId');
 $('createCourse').disabled=!connected||!state.plan||state.busy||anySame||state.createUncertain||$('createName').value.trim()!==COURSE_NAME;
 $('createTopics').disabled=!owner||!connected||!active||!state.plan||!$('topicApprove').checked||state.busy;
 $('createBatch').disabled=!owner||!connected||!active||!state.plan||!$('worksheetApprove').checked||!state.plan.units.every(unit=>topicIdFromName(state.topics,unit.name))||state.busy;
}
async function classroom(path,method='GET',body){if(!state.token)throw Error('Google Classroom connection is required.');const res=await fetch(`https://classroom.googleapis.com/v1/${path}`,{method,headers:{Authorization:`Bearer ${state.token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let payload;const text=await res.text();try{payload=text?JSON.parse(text):{}}catch{throw Error(`Classroom returned invalid JSON (HTTP ${res.status}).`)}
 if(!res.ok){if(res.status===401){state.token=null;controls()}throw Error(`Classroom HTTP ${res.status}: ${String(payload.error?.message||'Operation rejected').slice(0,220)}`)}return payload;}
async function paged(path,key){const list=[];let cursor='';let pageCount=0;do{const join=path.includes('?')?'&':'?';const result=await classroom(path+join+'pageSize=100'+(cursor?'&pageToken='+encodeURIComponent(cursor):''));list.push(...(result[key]||[]));cursor=result.nextPageToken||'';if(++pageCount>40)throw Error('Classroom list pagination exceeds safe limit');}while(cursor);return list;}
async function loadIndex(){requireOwner();lock(true);status('pxStatus','Validating 94 Year 11 lessons and 26 units…');try{const snap=await getDocs(collection(db,'curriculumPilotIndex'));state.plan=planCurriculum(snap.docs.map(s=>s.data()));status('pxStatus',`Verified ${state.plan.lessons.length} Year 11 lessons across ${state.plan.units.length} units. Firebase is read-only.`, 'ok');journal('curriculum_verified',{lessons:94,topics:26});}
 catch(e){state.plan=null;fail('pxStatus',e)}finally{lock(false)}}
async function connect(){requireOwner();const client=$('oauthClient').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Enter your existing Google OAuth Web Application client ID.');if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services is not loaded.');
 localStorage.setItem('projectx.classroom.oauthClientId.v1',client);
 const scopes=['https://www.googleapis.com/auth/classroom.courses','https://www.googleapis.com/auth/classroom.topics','https://www.googleapis.com/auth/classroom.coursework.students','https://www.googleapis.com/auth/drive.file'];
 const cli=window.google.accounts.oauth2.initTokenClient({client_id:client,scope:scopes.join(' '),callback:async authResult=>{
  if(authResult.error){status('googleStatus',`Google sign-in failed: ${authResult.error}`,'error');return}
  const granted=new Set(String(authResult.scope||'').split(/\s+/));if(scopes.some(s=>!granted.has(s))){state.token=null;status('googleStatus','Required Classroom course, topics, coursework or Drive permission was not granted. Check Google OAuth consent before continuing.','error');return}
  state.token=authResult.access_token;state.confirmedDrive=true;status('googleStatus','Connected with the necessary Classroom and Drive scopes.','ok');journal('oauth_connected');try{await listCourses()}catch(e){fail('googleStatus',e)}controls();}});
 cli.requestAccessToken({prompt:'consent'});
}
async function listCourses(){if(!state.token)throw Error('Connect Google first.');lock(true);try{
 state.courses=await paged('courses?teacherId=me','courses');const prev=state.courseId;
 const candidates=state.courses.filter(c=>isTargetCourse(c));const stored=localStorage.getItem('projectx.classroom.y11.bootstrap.courseId')||'';
 if(candidates.length>1)status('courseStatus','Multiple matching Year 11 courses found. Select the correct one deliberately; do not create another course.','error');
 const matched=candidates.find(c=>String(c.id)===String(prev))||candidates.find(c=>String(c.id)===String(stored))||(candidates.length===1?candidates[0]:null);
 state.courseId=matched?.id?String(matched.id):'';
 $('courseList').replaceChildren(new Option('Select your Year 11 course',''));
 for(const c of candidates)$('courseList').add(new Option(`${c.name} · ${c.section} · ${c.courseState} · ${c.id}`,c.id));
 $('courseList').value=state.courseId;
 state.topics=[];state.items=[];state.createUncertain=false;
 if(state.courseId)localStorage.setItem('projectx.classroom.y11.bootstrap.courseId',state.courseId);
 status('googleStatus',`Connected. ${state.courses.length} teacher courses checked; ${candidates.length} exact Year 11 course(s) found.`, 'ok');
 status('courseStatus',state.courseId?(isActiveTarget(chosen())?'Year 11 course selected and ACTIVE.':'Course found but not ACTIVE. Open Google Classroom to activate it, then Refresh available courses.'):'No matching Year 11 course found. You may explicitly create one.',state.courseId&&isActiveTarget(chosen())?'ok':'');
 if(state.courseId&&isActiveTarget(chosen())&&state.plan)await checkInventory();
 }finally{lock(false)}}
async function createCourse(){requireOwner();if(!state.plan||!state.token)throw Error('Verify curriculum and connect Google first.');if($('createName').value.trim()!==COURSE_NAME)throw Error('Type the exact new course name.');
 lock(true);state.createUncertain=true;status('courseStatus','Checking for duplicates before course creation…');try{
 const courses=await paged('courses?teacherId=me','courses');if(courses.some(c=>matchingCourse(c)||((c.section||'')===COURSE_SECTION&&inferYearGroup(c)===11)))throw Error('An existing Year 11 2026–2027 course was found. No course created; refresh and reuse it.');
 // No automatic retry: a network failure may mean Google created the course already.
 const created=await classroom('courses','POST',coursePayload());if(!created.id||!isTargetCourse(created))throw Error('Google course response did not match the intended Year 11 identity. STOP and inspect Classroom before retrying.');
 state.courseId=String(created.id);localStorage.setItem('projectx.classroom.y11.bootstrap.courseId',state.courseId);journal('course_created',{courseId:state.courseId,state:created.courseState});
 $('createName').value='';status('courseStatus',`Created Google Classroom course ${state.courseId} (${created.courseState}). Activate it in Google Classroom if required. No topics or worksheets created yet.`,'ok');
 await listCourses();
 }catch(e){fail('courseStatus',e);status('googleStatus','Course creation might have succeeded. Use Refresh available courses before considering any retry.','error');}
 finally{lock(false)}}
async function checkInventory(){if(!state.courseId||!state.token)return;
 const course=await classroom(`courses/${encodeURIComponent(state.courseId)}`);
 if(!isTargetCourse(course))throw Error('Selected Classroom course identity mismatch: stop to prevent cross-course publishing.');
 if(!isActiveTarget(course)){state.topics=[];state.items=[];status('topicStatus','Course is not ACTIVE. Activate it in Google Classroom then refresh.');status('worksheetStatus','Worksheets unavailable until the course is active.');return;}
 const cid=encodeURIComponent(state.courseId);
 const [topics,items]=await Promise.all([paged(`courses/${cid}/topics`,'topic'),paged(`courses/${cid}/courseWork?courseWorkStates=DRAFT&courseWorkStates=PUBLISHED`,'courseWork')]);
 state.topics=topics;state.items=items;
 const matched=state.plan.units.filter(u=>topicIdFromName(topics,u.name));
 status('topicStatus',`${matched.length}/26 topics currently present. ${26-matched.length} missing.`,matched.length===26?'ok':'');
 const published=items.filter(i=>i.state==='PUBLISHED'&&String(i.description||'').includes('worksheet-only-v1'));
 if(published.length)status('worksheetStatus',`${published.length} previously published worksheet(s) found. No automatic modifications permitted; inspect Classroom before continuing.`,'error');
 else {const existing=items.filter(i=>i.state==='DRAFT'&&String(i.description||'').includes('worksheet-only-v1'));status('worksheetStatus',`${existing.length}/94 worksheet draft(s) detected. Drafts are teacher-only.`,existing.length===94?'ok':'');}
}
async function ensureActiveCourse(){const live=await classroom(`courses/${encodeURIComponent(state.courseId)}`);if(!isActiveTarget(live)||String(live.id)!==String(state.courseId))throw Error('Course ID/name/state changed. Stop and refresh courses.');return live;}
async function createTopics(){requireOwner();readyCourse();if(!$('topicApprove').checked)throw Error('Confirm topic creation.');lock(true);
 try{await ensureActiveCourse();await checkInventory();let created=0;
 for(const item of state.plan.units){if(topicIdFromName(state.topics,item.name))continue;status('topicStatus',`Creating ${item.name}…`);
 try{const made=await classroom(`courses/${encodeURIComponent(state.courseId)}/topics`,'POST',{name:item.name});if(!made.topicId)throw Error('Created topic response had no topic ID');state.topics.push(made);journal('topic_created',{unitId:item.unitId,topicId:made.topicId});created++}
 catch(e){await checkInventory();if(!topicIdFromName(state.topics,item.name))throw e;}}
 await checkInventory();status('topicStatus',`Verified all 26 topics; ${created} new in this session. No lesson materials or worksheets were published.`, 'ok');
 }catch(e){fail('topicStatus',e)}finally{lock(false)}}
async function studentRecord(lessonId){requireOwner();const snap=await getDoc(doc(db,'catalogueStudentLessons',lessonId,'revisions',RELEASE_ID));if(!snap.exists())throw Error(`Student-safe lesson ${lessonId} is unavailable`);return snap.data();}
async function drive(path,opts={}){if(!state.confirmedDrive||!state.token)throw Error('Drive authorisation is missing. Reconnect Google.');const response=await fetch('https://www.googleapis.com/'+path,{...opts,headers:{Authorization:`Bearer ${state.token}`,...(opts.headers||{})}});const txt=await response.text();let data;try{data=txt?JSON.parse(txt):{}}catch{throw Error(`Drive API returned invalid JSON (HTTP ${response.status})`)}if(!response.ok)throw Error(`Drive HTTP ${response.status}: ${String(data.error?.message||'Operation rejected').slice(0,220)}`);return data;}
async function digest(text){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');}
async function ensureDriveWorksheet(worksheet){const key=`pxy11_${state.courseId}_${worksheet.lessonId}_worksheet_v1`.replace(/[^a-zA-Z0-9_-]/g,'_');
 const q=`trashed=false and appProperties has { key='pxKey' and value='${key}' }`;
 const list=await drive('drive/v3/files?'+new URLSearchParams({q,fields:'nextPageToken,files(id,mimeType,appProperties,name)',pageSize:'100'}));
 if(list.nextPageToken||(list.files||[]).length>1)throw Error('Duplicate Drive worksheets found. STOP and review manually.');
 const hash=await digest(worksheet.html),file=list.files?.[0];
 if(file){if(file.appProperties?.pxDigest!==hash||file.mimeType!=='application/vnd.google-apps.document')throw Error('Existing Drive worksheet differs. Never overwrite an existing file.');journal('drive_worksheet_reused',{lessonId:worksheet.lessonId,fileId:file.id});return file.id;}
 const metadata={name:`${worksheet.lessonId} - Worksheet`,mimeType:'application/vnd.google-apps.document',appProperties:{pxKey:key,pxDigest:hash,pxLesson:worksheet.lessonId,pxRelease:RELEASE_ID}};
 const boundary='projectx_'+crypto.randomUUID().replace(/-/g,'');
 const blob=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n`,new Blob([worksheet.html],{type:'text/html;charset=UTF-8'}),`\r\n--${boundary}--`],{type:`multipart/related; boundary=${boundary}`});
 const created=await drive('upload/drive/v3/files?uploadType=multipart&fields=id,mimeType,name',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body:blob});
 if(!created.id||created.mimeType!=='application/vnd.google-apps.document')throw Error('Drive worksheet creation response unexpected. Inspect Drive before retrying.');
 journal('drive_worksheet_created',{lessonId:worksheet.lessonId,fileId:created.id});return created.id;
}
async function createBatch(){requireOwner();readyCourse();if(!$('worksheetApprove').checked)throw Error('Confirm teacher-only worksheet creation.');if(!state.plan.units.every(unit=>topicIdFromName(state.topics,unit.name)))throw Error('Prepare all 26 topics first.');lock(true);let created=0,reused=0;
 try{await ensureActiveCourse();await checkInventory();if(state.plan.units.some(u=>!topicIdFromName(state.topics,u.name)))throw Error('Topics are incomplete.');
 const published=state.items.filter(i=>i.state==='PUBLISHED'&&String(i.description||'').includes('worksheet-only-v1'));if(published.length)throw Error('A published Project X worksheet exists; manual review required.');
 const ready=[];
 for(const entry of state.plan.lessons){const marker=worksheetMarker(entry.lessonId);if(matchWorksheet(state.items,{marker}))ready.push(entry.lessonId);}
 const batch=nextBatch(state.plan,ready);if(!batch.length){status('worksheetStatus','All 94 worksheet drafts already present. Nothing new created.','ok');return;}
 status('worksheetStatus',`Preparing ${batch.length} of ${state.plan.lessons.length-ready.length} remaining worksheets. No publishing…`);
 for(const [i,entry] of batch.entries()){
  const raw=await studentRecord(entry.lessonId);const worksheet=createWorksheetOnly(raw);
  const existing=matchWorksheet(state.items,worksheet);if(existing){reused++;continue;}
  const topicId=topicIdFromName(state.topics,state.plan.units.find(x=>x.unitId===entry.unitId)?.name);if(!topicId)throw Error(`Topic missing for ${entry.lessonId}`);
  const driveId=await ensureDriveWorksheet(worksheet);
  // Pre-write duplicate check after upload (avoid duplicate draft on a retry).
  state.items=await paged(`courses/${encodeURIComponent(state.courseId)}/courseWork?courseWorkStates=DRAFT&courseWorkStates=PUBLISHED`,'courseWork');
  if(matchWorksheet(state.items,worksheet)){reused++;continue;}
  const body=worksheetDraft(worksheet,topicId,driveId);
  status('worksheetStatus',`Creating draft ${i+1}/${batch.length}: ${entry.lessonId}`);
  const made=await classroom(`courses/${encodeURIComponent(state.courseId)}/courseWork`,'POST',body);
  if(made.state!=='DRAFT'||!made.id||made.maxPoints!==10)throw Error(`Unexpected Classroom draft response for ${entry.lessonId}; STOP and inspect before retry.`);
  state.items.push(made);created++;journal('worksheet_draft_created',{lessonId:entry.lessonId,courseWorkId:made.id});
 }
 await checkInventory();status('worksheetStatus',`Batch finished: ${created} drafts created, ${reused} reused. Review in Classroom before the next batch. No student publication occurred.`,'ok');
 }catch(e){fail('worksheetStatus',e);status('courseStatus','Partial work may have succeeded. Inspect Classroom drafts and Drive files before retrying. Duplicate checks will be applied.','error');}
 finally{lock(false)}}
function downloadLog(){const data={version:'Y11-bootstrap-v1',exportedAt:new Date().toISOString(),courseId:state.courseId||null,events:state.journal};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ProjectX_Y11_Classroom_Bootstrap_Log.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),15000)}
$('pxSignIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){fail('pxStatus',e)}};
$('pxSignOut').onclick=()=>signOut(auth).catch(e=>fail('pxStatus',e));$('refresh').onclick=()=>loadIndex().catch(e=>fail('pxStatus',e));
$('connect').onclick=()=>connect().catch(e=>fail('googleStatus',e));$('disconnect').onclick=()=>{if(state.token&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(state.token,()=>{});state.token=null;state.confirmedDrive=false;state.courses=[];state.courseId='';state.topics=[];state.items=[];controls();status('googleStatus','Disconnected. Browser OAuth token discarded.');};
$('reloadCourses').onclick=()=>listCourses().catch(e=>fail('googleStatus',e));$('courseList').onchange=async()=>{state.courseId=$('courseList').value;state.topics=[];state.items=[];if(state.courseId)localStorage.setItem('projectx.classroom.y11.bootstrap.courseId',state.courseId);try{if(state.courseId)await checkInventory()}catch(e){fail('courseStatus',e)}controls()};
$('createName').oninput=controls;$('topicApprove').onchange=controls;$('worksheetApprove').onchange=controls;
$('createCourse').onclick=()=>createCourse().catch(e=>fail('courseStatus',e));$('createTopics').onclick=()=>createTopics().catch(e=>fail('topicStatus',e));$('createBatch').onclick=()=>createBatch().catch(e=>fail('worksheetStatus',e));$('downloadLog').onclick=downloadLog;
$('oauthClient').value=localStorage.getItem('projectx.classroom.oauthClientId.v1')||'';
onAuthStateChanged(auth,user=>{state.plan=null;controls();if(activeOwner())loadIndex();else status('pxStatus',user?'This account is not authorised for Project X owner-only pilot.':'Sign in to verify the private Year 11 curriculum.');});
