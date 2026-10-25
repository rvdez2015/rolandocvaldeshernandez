/* Project X Classroom v4 — owner-controlled, student-safe draft resource publisher.
   Reads only curriculumPilotIndex + catalogueStudentLessons. Writes to Google Classroom
   and optional teacher-authorised Drive on explicit preview + approval. No Firestore writes. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,validateIndex,selectPlanEntries,safeStudentContent,topicTitle,classroomBody,classroomMarker,validateExistingDraft,findRemoteByMarker,topicIdFromName,unitName} from './core-v4.mjs';
import {createStudentPack,packSummary,resourceMarker,buildResourceMaterial} from './resources-v4.mjs';
import {createStoredZip} from './zip-v4.mjs';
const firebaseConfig={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const firebaseApp=initializeApp(firebaseConfig,'px-classroom-v4');const auth=getAuth(firebaseApp),db=getFirestore(firebaseApp);
const $=id=>document.getElementById(id);const option=(value,label)=>new Option(label,value);
const state={index:[],token:null,driveAuthorized:false,selected:new Set(),reviewed:null,busy:false,topics:[],materials:[],assignments:[],journal:[],indexMap:new Map()};
const isOwner=()=>auth.currentUser?.uid===OWNER;
function status(id,msg,type=''){const e=$(id);e.textContent=msg;e.className='status'+(type?' '+type:'');}
function log(event,props={}){state.journal.push({event,utc:new Date().toISOString(),...props});}
function requireOwner(){if(!isOwner())throw Error('Sign in with the private Project X owner account.');}
function requireClassroom(){if(!state.token||!$('course').value)throw Error('Connect Google Classroom and choose your teacher course first.');}
function course(){return $('course').value;}
function settings(){return {mode:$('operation').value,drive:$('autoDrive').checked,conflict:$('conflictPolicy').value,ids:[...state.selected].sort(),courseId:course()};}
function reviewValid(){const r=state.reviewed;return r&&JSON.stringify(r.settings)===JSON.stringify(settings());}
function controls(){const owner=isOwner();$('pxSignIn').disabled=!!auth.currentUser;$('pxSignOut').disabled=!auth.currentUser;$('pxRefresh').disabled=!owner;
 $('classroomConnect').disabled=state.busy;$('classroomDisconnect').disabled=!state.token||state.busy;$('course').disabled=!state.token||state.busy;
 $('review').disabled=!owner||!state.token||!course()||state.busy;$('downloadResources').disabled=!owner||!state.index.length||!state.selected.size||state.selected.size>10||state.busy;
 $('create').disabled=!reviewValid()||!$('confirmCourse').checked||!$('confirmPilot').checked||state.busy;}
function invalidate(){state.reviewed=null;$('confirmCourse').checked=false;$('confirmPilot').checked=false;status('preview','Selection or permissions changed. Run a new review before creating drafts.');controls();}
function displayError(id,e){status(id,e.message||String(e),'error');console.error('Project X Publisher v4',e);}
async function loadIndex(){requireOwner();status('pxStatus','Loading owner-private Year 11 index…');const snap=await getDocs(collection(db,'curriculumPilotIndex'));
 state.index=validateIndex(snap.docs.map(s=>s.data()));state.indexMap=new Map(state.index.map(x=>[x.lessonId,x]));state.selected.clear();
 $('unit').replaceChildren(option('all','All 26 units'));for(const id of [...new Set(state.index.map(x=>x.unitId))])$('unit').add(option(id,unitName(id)));
 renderLessons();status('pxStatus',`Loaded ${state.index.length} private lessons. Questions and teacher marking keys are never published automatically.`,'ok');log('curriculum_loaded',{lessons:state.index.length});invalidate();}
function renderLessons(){const area=$('lessons');area.replaceChildren();const needle=$('search').value.toLowerCase().trim(),unit=$('unit').value;
 const items=state.index.filter(x=>(unit==='all'||unit===x.unitId)&&(!needle||`${x.title} ${x.lessonId}`.toLowerCase().includes(needle)));
 for(const item of items){const label=document.createElement('label');label.className='lesson-row';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=item.lessonId;checkbox.checked=state.selected.has(item.lessonId);checkbox.disabled=$('operation').value==='topics';checkbox.onchange=()=>{if(checkbox.checked){if(state.selected.size>=10){checkbox.checked=false;status('selectionCount','Limit: select up to 10 lessons per batch.','error');return;}state.selected.add(item.lessonId)}else state.selected.delete(item.lessonId);invalidate();renderLessons();};
 const line=document.createElement('span');line.textContent=item.title||item.lessonId;const meta=document.createElement('small');meta.textContent=`${item.lessonId} · ${unitName(item.unitId)}`;line.append(meta);label.append(checkbox,line);area.append(label);}
 if(!items.length)area.textContent='No matching Year 11 lessons.';
 $('selectionCount').textContent=`${state.selected.size} selected · Up to 10 per batch · ${items.length} shown.`;controls();}
async function classroomApi(path,method='GET',body){if(!state.token)throw Error('Google Classroom sign-in required.');const res=await fetch('https://classroom.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+state.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await res.text();let json;
 try{json=raw?JSON.parse(raw):{}}catch{throw Error(`Google Classroom responded with invalid JSON (${res.status}).`)}
 if(!res.ok){if(res.status===401){state.token=null;state.driveAuthorized=false;controls();}throw Error(`Classroom HTTP ${res.status}: ${json.error?.message||raw.slice(0,250)}`)}return json;}
async function pages(prefix,field){let all=[],page='',counter=0;do{const sep=prefix.includes('?')?'&':'?';const res=await classroomApi(prefix+sep+'pageSize=100'+(page?'&pageToken='+encodeURIComponent(page):''));all.push(...(res[field]||[]));page=res.nextPageToken||'';if(++counter>35)throw Error('Too many pages; reduce course scope.');}while(page);return all;}
async function listCourses(){const courses=await pages('courses?teacherId=me','courses');$('course').replaceChildren(option('','Choose your teaching course'));for(const c of courses.filter(x=>['ACTIVE','PROVISIONED'].includes(x.courseState)||!x.courseState))$('course').add(option(c.id,`${c.name} · ${c.id}`));status('googleStatus',`${courses.length} teacher course(s) found. Drive resource authorisation: ${state.driveAuthorized?'granted':'not granted'}.`,'ok');controls();}
async function connect(){const client=$('oauthClient').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Enter your Google OAuth Web Application client ID.');if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services not available.');
 localStorage.setItem('projectx.classroom.oauthClientId.v1',client);
 const scopes=['https://www.googleapis.com/auth/classroom.courses.readonly','https://www.googleapis.com/auth/classroom.topics','https://www.googleapis.com/auth/classroom.courseworkmaterials','https://www.googleapis.com/auth/classroom.coursework.students'];
 if($('autoDrive').checked)scopes.push('https://www.googleapis.com/auth/drive.file');
 const clientObj=window.google.accounts.oauth2.initTokenClient({client_id:client,scope:scopes.join(' '),callback:async result=>{
  if(result.error){status('googleStatus','Google OAuth: '+result.error,'error');return;}
  state.token=result.access_token;state.driveAuthorized=!!result.scope?.includes('https://www.googleapis.com/auth/drive.file');
  if($('autoDrive').checked&&!state.driveAuthorized){status('googleStatus','Google Drive permission was not granted. Disconnect/reconnect after checking consent.','error');return;}
  log('classroom_connected',{driveAuthorized:state.driveAuthorized});controls();try{await listCourses()}catch(e){displayError('googleStatus',e)}
 }});
 clientObj.requestAccessToken({prompt:'consent'});
}
async function studentLesson(id){requireOwner();const found=await getDoc(doc(db,'catalogueStudentLessons',id,'revisions',RELEASE_ID));if(!found.exists())throw Error('Missing student-safe lesson revision '+id);safeStudentContent(found.data());return found.data();}
async function remoteInventory(){const id=encodeURIComponent(course());const [topics,materials,assignments]=await Promise.all([
 pages(`courses/${id}/topics`,'topic'),pages(`courses/${id}/courseWorkMaterials?courseWorkMaterialStates=DRAFT&courseWorkMaterialStates=PUBLISHED`,'courseWorkMaterial'),pages(`courses/${id}/courseWork?courseWorkStates=DRAFT&courseWorkStates=PUBLISHED`,'courseWork')]);
 state.topics=topics;state.materials=materials;state.assignments=assignments;}
async function ensureTopic(unitId){const name=topicTitle(unitId);let id=topicIdFromName(state.topics,name);if(id)return id;
 try{const t=await classroomApi(`courses/${encodeURIComponent(course())}/topics`,'POST',{name});state.topics.push(t);log('topic_created',{unitId,topicId:t.topicId});return t.topicId;}
 catch(e){if(!e.message.includes('ALREADY_EXISTS'))throw e;state.topics=await pages(`courses/${encodeURIComponent(course())}/topics`,'topic');id=topicIdFromName(state.topics,name);if(!id)throw e;return id;}}
function kinds(mode){return mode==='complete'?['resource','assignment']:mode==='both'?['material','assignment']:mode==='resources'?['resource']:mode==='materials'?['material']:mode==='assignments'?['assignment']:[];}
function proposalFor(raw,kind,topicId){if(kind==='resource'){const pack=createStudentPack(raw);return {kind,body:buildResourceMaterial(raw,topicId,pack),pack,marker:resourceMarker(raw.lessonId)};}
 const body=classroomBody(raw,kind,topicId);return {kind,body,pack:null,marker:classroomMarker(raw.lessonId,kind)};}
function remoteList(kind){return kind==='assignment'?state.assignments:state.materials;}
function matchExisting(proposal,includeAttachments=false){const old=findRemoteByMarker(remoteList(proposal.kind),proposal.marker);if(!old)return {status:'new',remote:null};
 if(old.state!=='DRAFT')return {status:'conflict',reason:'Existing matching Project X item is not a draft; never modify a published item.',remote:old};
 if(old.description!==proposal.body.description)return {status:'conflict',reason:'Older Project X item has different content. It will never be overwritten automatically.',remote:old};
 if(proposal.kind==='assignment' && old.maxPoints!==10)return {status:'conflict',reason:'Existing assignment has the wrong grading total.',remote:old};
 if(includeAttachments && (!Array.isArray(old.materials)||!old.materials.length))return {status:'reused_without_files',remote:old};
 return {status:'reused',remote:old};}
async function preview(){requireOwner();requireClassroom();const config=settings();
 if(config.drive&&!state.driveAuthorized)throw Error('To auto-attach resources, tick the Drive option BEFORE connecting Google. Then reconnect and approve Drive file access.');
 const plan=selectPlanEntries(state.index,config.ids,config.mode);
 status('preview','Checking Classroom drafts and building student resources…');await remoteInventory();const entries=[];
 for(const lesson of plan.lessons){const raw=await studentLesson(lesson.lessonId);const p=createStudentPack(raw);const planned=kinds(config.mode).map(kind=>{
  const proposal=proposalFor(raw,kind,'PREVIEW_TOPIC_ID');return {proposal,...matchExisting(proposal,config.drive)};
 });entries.push({lesson,raw,pack:p,planned});}
 const blocked=entries.flatMap(e=>e.planned.filter(p=>p.status==='conflict'));
 state.reviewed={config,plan,entries,blocked,settings:config};$('confirmCourse').checked=false;$('confirmPilot').checked=false;
 const lines=[`TEACHING PACKAGE v4 · READ-ONLY PREVIEW · NO WRITES`,`Classroom: ${course()} · ${plan.units.length} topic(s) · ${plan.lessons.length} lesson(s)`,`Mode: ${config.mode} · Drive auto-attachments: ${config.drive?'ON':'OFF (download and attach manually)'}`,`Conflict policy: ${config.conflict}`,`Conflicts: ${blocked.length}. ${blocked.length?'Review affected drafts; no replacements or deletions.':'No conflicting draft markers found.'}`];
 for(const e of entries){lines.push(`\n=== ${e.lesson.lessonId} · ${e.lesson.title} ===`,`Student resource files: ${packSummary(e.pack)}`);
  for(const x of e.planned){lines.push(`PLAN ${x.proposal.kind}: ${x.status.toUpperCase()}${x.reason?' — '+x.reason:''}`);
   if(x.proposal.kind==='assignment')lines.push(x.proposal.body.description);
   if(x.proposal.kind==='resource')lines.push(`Resource pack: ${e.pack.files.map(f=>f.name).join(', ')}. Files will be ${config.drive?'generated in Google Drive and attached':'available in the offline ZIP only'}.`);
  }
 }
 if(config.mode==='topics')lines.push('Will create or reuse existing unit topic names; topics may be visible in Classroom.');
 if(blocked.length && config.conflict==='stop')lines.push('BLOCKED: select Skip conflicting drafts and re-review if you want to continue other items without overwriting.');
 lines.push('Teacher-only answers are never loaded. Every new Classroom assignment/material remains a DRAFT.');
 $('preview').textContent=lines.join('\n');log('preview_ready',{course:course(),mode:config.mode,lessonCount:plan.lessons.length,conflicts:blocked.length});controls();}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function downloadResources(){requireOwner();if(state.selected.size<1||state.selected.size>10)throw Error('Select 1–10 lessons for resource download.');
 const files=[],summary=[];
 for(const id of [...state.selected].sort()){
  const raw=await studentLesson(id);const pack=createStudentPack(raw);for(const f of pack.files)files.push({name:id+'/'+f.name,content:f.content});
  summary.push({lessonId:id,files:pack.files.map(f=>f.name),teacherChecks:pack.resourceWarnings});
 }
 files.push({name:'TEACHER_CHECKLIST.json',content:JSON.stringify({releaseId:RELEASE_ID,generatedAt:new Date().toISOString(),lessons:summary},null,2)});
 downloadBlob(createStoredZip(files),`ProjectX_Y11_Resources_${state.selected.size}_Lessons.zip`);
 status('resourceStatus',`Downloaded ${files.length-1} student resources and a teacher checklist for ${summary.length} lesson(s). No Classroom or Drive writes.`,'ok');log('resource_download',{lessons:summary.length,files:files.length});}
async function sha256(str){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function driveRequest(path,options={}){if(!state.driveAuthorized||!state.token)throw Error('Drive permission missing: reconnect Google with automatic attachments enabled.');
 const url='https://www.googleapis.com/'+path;const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+state.token,...(options.headers||{})}});
 const txt=await r.text();let data;try{data=txt?JSON.parse(txt):{}}catch{throw Error(`Google Drive returned non-JSON HTTP ${r.status}`)}
 if(!r.ok)throw Error(`Drive HTTP ${r.status}: ${data.error?.message||txt.slice(0,200)}`);return data;}
function driveKey(lessonId,kind){return `pxv4_${course()}_${lessonId}_${kind}`.replace(/[^a-zA-Z0-9_-]/g,'_');}
async function findDriveResource(key){const q=`trashed = false and appProperties has { key='pxKey' and value='${key}' }`;
 const data=await driveRequest('drive/v3/files?'+new URLSearchParams({q,fields:'nextPageToken,files(id,name,mimeType,appProperties,webViewLink)',pageSize:'100'}));
 if(data.nextPageToken||data.files?.length>1)throw Error('Multiple matching Drive resources. Review duplicates manually before retrying.');return data.files?.[0]||null;}
async function svgToPng(svg){const svgBlob=new Blob([svg],{type:'image/svg+xml'}),src=URL.createObjectURL(svgBlob);
 try{const image=new Image();const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Cannot render diagram'));});image.src=src;await loaded;
  const canvas=document.createElement('canvas');canvas.width=1350;canvas.height=720;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unsupported');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export failed')),'image/png'));
 }finally{URL.revokeObjectURL(src);}}
async function createDriveResource(lessonId,f){
 const key=driveKey(lessonId,f.kind);const digest=await sha256(f.content);const existing=await findDriveResource(key);
 if(existing){if(existing.appProperties?.pxDigest!==digest)throw Error(`Drive ${f.kind} file differs from this lesson release. Review it before creating another.`);
  log('drive_file_reused',{lessonId,kind:f.kind,fileId:existing.id});return existing.id;}
 const uploadBlob=f.kind==='diagram'?await svgToPng(f.content):new Blob([f.content],{type:f.mime});
 const mime=f.kind==='diagram'?'image/png':f.convertToDoc?'text/html':'text/plain';
 const metadata={name:f.convertToDoc?f.name.replace(/\.html$/i,''):f.kind==='diagram'?f.name.replace(/\.svg$/i,'.png'):f.name,description:`Project X · ${lessonId} · ${f.kind} · initial pilot`,appProperties:{pxKey:key,pxDigest:digest,pxRelease:RELEASE_ID,pxLesson:lessonId},...(f.convertToDoc?{mimeType:'application/vnd.google-apps.document'}:{mimeType:mime})};
 const boundary='pxv4_'+Math.random().toString(36).slice(2);
 const start=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,end=`\r\n--${boundary}--`;
 const body=new Blob([start,uploadBlob,end],{type:`multipart/related; boundary=${boundary}`});
 const created=await driveRequest('upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
 if(!created.id)throw Error('Drive upload response missing file ID');log('drive_file_created',{lessonId,kind:f.kind,fileId:created.id});return created.id;}
async function driveFiles(pack){const attachments=[];for(const f of pack.files){status('progress',`Preparing Drive ${f.kind}: ${pack.title}`);const id=await createDriveResource(pack.lessonId,f);attachments.push({kind:f.kind,id,material:{driveFile:{driveFile:{id},shareMode:'VIEW'}}});}return attachments;}
async function createItem(raw,kind,topicId,pack,driveRefs){const p=proposalFor(raw,kind,topicId),matches=matchExisting(p,$('autoDrive').checked);
 if(matches.status==='reused'||matches.status==='reused_without_files'){
  log('draft_reused',{lessonId:raw.lessonId,kind,remoteId:matches.remote.id,attachmentsPresent:matches.status==='reused'});return matches.status;}
 if(matches.status==='conflict'){
  if($('conflictPolicy').value==='skip'){log('draft_conflict_skipped',{lessonId:raw.lessonId,kind,remoteId:matches.remote?.id,reason:matches.reason});return 'skipped';}
  throw Error(`${kind} conflict: ${matches.reason}`);
 }
 const body=p.body;
 if($('autoDrive').checked && driveRefs?.length){
  if(kind==='resource'||kind==='material')body.materials=driveRefs.map(x=>x.material);
  if(kind==='assignment'){
   const worksheet=driveRefs.find(x=>x.kind==='worksheet');if(worksheet)body.materials=[{driveFile:{driveFile:{id:worksheet.id},shareMode:'STUDENT_COPY'}}];
  }
 }
 const collection=kind==='assignment'?'courseWork':'courseWorkMaterials';
 const created=await classroomApi(`courses/${encodeURIComponent(course())}/${collection}`,'POST',body);
 if(created.state!=='DRAFT'||created.description!==body.description){log('draft_response_mismatch',{kind,lessonId:raw.lessonId,remoteId:created.id||null});throw Error(`Classroom draft response mismatch (${kind}); inspect before retrying.`)}
 remoteList(kind).push(created);log('draft_created',{kind,lessonId:raw.lessonId,remoteId:created.id,attachedFiles:body.materials?.length||0});return 'created';}
async function createDrafts(){requireOwner();requireClassroom();if(!reviewValid())throw Error('Preview must match selected lessons and settings.');
 if(!$('confirmCourse').checked||!$('confirmPilot').checked)throw Error('Review the destination and tick both confirmations.');
 const review=state.reviewed;
 if(review.blocked.length && review.config.conflict==='stop')throw Error('Conflicting items found. Choose Skip conflicting drafts, then review again.');
 if(review.config.drive&&!state.driveAuthorized)throw Error('Google Drive permission is missing. Reconnect with Drive option enabled.');
 state.busy=true;controls();let made=0,reused=0,skipped=0,topicsCreated=0;log('write_started',{course:course(),count:review.plan.lessons.length,mode:review.plan.mode,drive:review.config.drive});
 try{
  await remoteInventory();
  // Recheck conflicts immediately before any new Classroom or Drive writes.
  if(review.config.conflict==='stop'){for(const entry of review.entries){for(const kind of kinds(review.plan.mode)){const probe=proposalFor(entry.raw,kind,'PREVIEW_TOPIC_ID');const found=matchExisting(probe,review.config.drive);if(found.status==='conflict')throw Error(`Preflight conflict in ${entry.lesson.lessonId}: ${found.reason}`);}}}
  for(const unit of review.plan.units){const existing=topicIdFromName(state.topics,topicTitle(unit.unitId));await ensureTopic(unit.unitId);if(!existing)topicsCreated++;}
  for(let i=0;i<review.entries.length;i++){
   const e=review.entries[i],topic=topicIdFromName(state.topics,topicTitle(e.lesson.unitId));if(!topic)throw Error(`Topic not found: ${e.lesson.unitId}`);
   const kindList=kinds(review.plan.mode);
   // If every draft is reused or skipped, do not generate redundant Drive files.
   let driveRefs=null;
   for(const kind of kindList){
    status('progress',`Lesson ${i+1}/${review.entries.length}: ${e.lesson.title} (${kind})`);
    const current=matchExisting(proposalFor(e.raw,kind,topic),review.config.drive);
    if(current.status==='conflict' && review.config.conflict==='stop')throw Error(`Conflict detected after preview for ${e.lesson.lessonId}. No overwrite performed.`);
    if(current.status==='new' && review.config.drive && (kind==='resource'||kind==='material'||kind==='assignment')){
     if(!driveRefs)driveRefs=await driveFiles(e.pack);
    }
    const outcome=await createItem(e.raw,kind,topic,e.pack,driveRefs);
    if(outcome==='created')made++;else if(outcome==='skipped')skipped++;else reused++;
   }
  }
  status('progress',`Completed: ${topicsCreated} new topic(s), ${made} new draft(s), ${reused} matching existing draft(s) reused, ${skipped} conflicting draft(s) skipped. NO student publication. Open Classwork to check the attachments.`,skipped?'':'ok');
  log('write_completed',{topicsCreated,made,reused,skipped});
 }catch(e){log('write_interrupted',{error:e.message,made,reused,skipped});status('progress',`Stopped after partial progress: ${e.message}. Previously created Drive files can be reused on retry. Check Classroom drafts before retrying.`, 'error');}
 finally{state.busy=false;state.reviewed=null;$('confirmCourse').checked=false;$('confirmPilot').checked=false;controls();}
}
function downloadLog(){downloadBlob(new Blob([JSON.stringify({releaseId:RELEASE_ID,exportedAt:new Date().toISOString(),events:state.journal},null,2)],{type:'application/json'}),'ProjectX_Classroom_v4_Activity_Log.json');}
$('pxSignIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){displayError('pxStatus',e)}};
$('pxSignOut').onclick=()=>signOut(auth).catch(e=>displayError('pxStatus',e));
$('pxRefresh').onclick=()=>loadIndex().catch(e=>displayError('pxStatus',e));
$('classroomConnect').onclick=()=>connect().catch(e=>displayError('googleStatus',e));
$('classroomDisconnect').onclick=()=>{if(state.token&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(state.token,()=>{});state.token=null;state.driveAuthorized=false;$('course').replaceChildren(option('','Connect to Google Classroom'));invalidate();status('googleStatus','Disconnected. OAuth token has been discarded.');controls();};
$('course').onchange=invalidate;$('operation').onchange=()=>{invalidate();renderLessons()};$('unit').onchange=renderLessons;$('search').oninput=renderLessons;
$('autoDrive').onchange=()=>{invalidate();if($('autoDrive').checked&&!state.driveAuthorized)status('googleStatus','Drive access selected. Reconnect Google Classroom and approve the Drive file permission.','');};
$('conflictPolicy').onchange=invalidate;$('confirmCourse').onchange=controls;$('confirmPilot').onchange=controls;
$('review').onclick=()=>preview().catch(e=>displayError('preview',e));
$('create').onclick=()=>createDrafts().catch(e=>displayError('progress',e));
$('downloadResources').onclick=()=>downloadResources().catch(e=>displayError('resourceStatus',e));
$('logDownload').onclick=downloadLog;
$('oauthClient').value=localStorage.getItem('projectx.classroom.oauthClientId.v1')||'';
onAuthStateChanged(auth,user=>{state.index=[];state.indexMap.clear();state.selected.clear();renderLessons();invalidate();if(isOwner())loadIndex().catch(e=>displayError('pxStatus',e));else status('pxStatus',user?'Signed in as non-owner. Owner-only library unavailable.':'Sign in as Project X owner to continue.');controls();});
