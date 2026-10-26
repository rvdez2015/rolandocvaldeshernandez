/* Project X AI Resource Studio — owner-private, teacher-reviewed pilot, v1.
   No AI API keys in the browser. No automatic student/Classroom publication. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc,query,where,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {TYPES,esc,contextFor,createOfflineDraft,validateDraft,exportHTML,diagramSVG,safeVideoUrl} from './studio-core.mjs';
const FIREBASE={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const TRUSTED_WORKER_ORIGIN = 'https://projectx-ai-resource-studio.staffcomplete-projectx.workers.dev';
const app=initializeApp(FIREBASE,'px-ai-resource-studio-v1'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),option=(v,t)=>new Option(t,v),state={user:null,lesson:null,type:'presentation',draft:null,source:'template',model:'none',index:[],saved:[],currentResourceId:null,busy:false};
const owner=()=>!!auth.currentUser&&auth.currentUser.uid===OWNER;
function status(id,txt,cls=''){const x=$(id);x.textContent=txt;x.className='notice '+cls;}
function needOwner(){if(!owner())throw Error('Please sign in with the authorised Project X owner account.');}
function busy(flag){state.busy=flag;controls();}
function controls(){const ok=owner(),selected=!!state.lesson,draft=!!state.draft;
 $('signIn').disabled=!!auth.currentUser;$('signOut').disabled=!auth.currentUser;$('refresh').disabled=!ok||state.busy;
 $('lesson').disabled=!ok||state.busy;$('localGenerate').disabled=!ok||!selected||state.busy;
 $('aiGenerate').disabled=!ok||!selected||!$('aiEndpoint').value.trim()||state.busy;
 $('downloadDraft').disabled=!draft||state.busy;$('downloadJSON').disabled=!draft||state.busy;
 $('saveRevision').disabled=!ok||!draft||state.busy;$('reloadHistory').disabled=!ok||!selected||state.busy;
}
function displayError(err){console.error(err);status('generationStatus',err.message||String(err),'error')}
const make=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e};
const add=(p,...elements)=>{for(const e of elements)p.append(e);return p};
function editorSet(d){validateDraft(state.type,d);state.draft=d;$('draftJSON').value=JSON.stringify(d,null,2);$('videoApprove').hidden=state.type!=='video';renderPreview();controls();}
function editorRead(){const data=JSON.parse($('draftJSON').value);return validateDraft(state.type,data)}
function renderPreview(){const c=$('draftPreview');c.replaceChildren();const d=state.draft;if(!d){c.textContent='No draft generated.';return}
 add(c,make('h3',d.title),make('p',`Source: ${state.source} · Lesson: ${state.lesson?.lessonId||'—'} · Review required`));
 if(state.type==='diagram'){const img=make('img');img.alt=`Draft concept map: ${d.title}`;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(diagramSVG(d));c.append(img);c.append(make('p',d.caption||'Teacher review required'));}
 else if(state.type==='presentation')d.slides.forEach((s,i)=>{const section=make('article');add(section,make('h3',`Slide ${i+1}: ${s.title}`));const ul=make('ul');(s.bullets||[]).forEach(b=>ul.append(make('li',b)));section.append(ul);section.append(make('p','Speaker notes: '+(s.speakerNotes||'none')));c.append(section)});
 else if(state.type==='worksheet'||state.type==='quiz'){const list=make('ol');const things=state.type==='worksheet'?d.tasks:d.questions;things.forEach(t=>{const li=make('li',t.prompt||t.question||'');if(t.marks)li.append(make('small',` (${t.marks} marks)`));list.append(li)});c.append(list)}
 else if(state.type==='video'){c.append(make('p','Search suggestions; teacher must verify any actual video before saving:'));d.searchTerms.forEach(t=>{const a=make('a',t+' ↗');a.href='https://www.youtube.com/results?search_query='+encodeURIComponent(t);a.target='_blank';a.rel='noopener';const li=make('p');li.append(a);c.append(li)});(d.approvedLinks||[]).forEach(item=>{const link=typeof item==='string'?item:item.url;const url=safeVideoUrl(link);if(url){const a=make('a','Teacher-checked: '+url);a.href=url;a.target='_blank';a.rel='noopener';c.append(make('p')).append(a)}})}
 else if(state.type==='code'){const pre=make('pre',d.code);pre.style.whiteSpace='pre-wrap';c.append(pre)};
}
function download(blob,name){const url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000)}
function resourceFilename(){return `${state.lesson?.lessonId||'ProjectX'}_${state.type}`;}
function setType(t){if(!TYPES.includes(t))return;state.type=t;state.draft=null;state.currentResourceId=null;$('existingResource').value='';$('draftJSON').value='';$('draftPreview').textContent='Choose Generate to create a '+t+' draft.';$('videoApprove').hidden=t!=='video';for(const b of document.querySelectorAll('[data-type]'))b.classList.toggle('selected',b.dataset.type===t);controls()}
async function loadIndex(){needOwner();const snap=await getDocs(collection(db,'curriculumPilotIndex'));state.index=snap.docs.map(s=>s.data()).filter(x=>x.yearGroup===11&&x.revisionId===RELEASE&&x.visibility==='owner_private').sort((a,b)=>a.lessonId.localeCompare(b.lessonId));
 if(state.index.length!==94)throw Error(`Expected 94 owner-private Year 11 lessons, got ${state.index.length}`);
 $('lesson').replaceChildren(option('','Choose a lesson (94 imported)'));state.index.forEach(x=>$('lesson').add(option(x.lessonId,x.title+' · '+x.lessonId)));
 const want=new URLSearchParams(location.search).get('lesson');if(want&&state.index.some(x=>x.lessonId===want))$('lesson').value=want;
 if($('lesson').value)await loadLesson();status('authStatus',`Signed in as owner · ${state.index.length} verified Year 11 lessons.`, 'ok');controls();}
async function loadLesson(){needOwner();const id=$('lesson').value;state.lesson=null;state.draft=null;state.currentResourceId=null;$('draftJSON').value='';$('draftPreview').textContent='No draft generated for this lesson.';controls();
 if(!id)return;
 const snap=await getDoc(doc(db,'catalogueLessons',id,'revisions',RELEASE));if(!snap.exists())throw Error('Unable to load this private lesson revision.');const l=snap.data();if(l.lessonId!==id||l.revisionId!==RELEASE||l.visibility!=='owner_private')throw Error('Lesson identity verification failed');state.lesson=l;
 $('lessonFacts').textContent=`${l.title} · ${l.unitId} · ${l.durationMinutes} min · ${l.curriculumRole} · owner-private pilot`;
 await loadHistory();controls();}
async function loadHistory(){const c=$('history');c.replaceChildren();$('existingResource').replaceChildren(option('','New resource'));state.saved=[];state.currentResourceId=null;if(!state.lesson)return;
 try{const snap=await getDocs(query(collection(db,'ownerLessonResourceDrafts'),where('lessonId','==',state.lesson.lessonId)));
  state.saved=snap.docs.map(d=>d.data()).filter(x=>x.schoolId==='project-x-personal').sort((a,b)=>a.title.localeCompare(b.title));
  for(const d of state.saved)$('existingResource').add(option(d.resourceId,`${d.title} · v${d.versionNumber}`));
  status('historyStatus',`${state.saved.length} owner-private saved resource(s). New edits are immutable revisions; nothing is published.`, 'ok');c.textContent='Select an existing resource to view its latest saved version.';
 }catch(err){status('historyStatus','Cloud save not yet enabled: '+err.message+'. Offline generation and downloads still work.','error');c.textContent='The resource-rule migration must pass security tests before cloud storage becomes available.';}
}
async function selectSaved(){needOwner();const id=$('existingResource').value;state.currentResourceId=id||null;state.draft=null;
 if(!id){$('draftPreview').textContent='Create a new resource for this lesson.';$('draftJSON').value='';$('history').textContent='No existing resource selected.';controls();return}
 const meta=state.saved.find(x=>x.resourceId===id);if(!meta||meta.lessonId!==state.lesson.lessonId)throw Error('Resource/lesson mismatch.');
 const snap=await getDoc(doc(db,'ownerLessonResourceDrafts',id,'revisions',meta.latestRevisionId));if(!snap.exists())throw Error('Missing saved revision');const v=snap.data();if(v.lessonId!==state.lesson.lessonId||v.resourceId!==id)throw Error('Revision/lesson mismatch.');
 setType(v.resourceType);state.currentResourceId=id;$('existingResource').value=id;state.source=v.source;state.model=v.model||'none';editorSet(v.content);
 const hist=await getDocs(collection(db,'ownerLessonResourceDrafts',id,'revisions'));const h=$('history');h.replaceChildren();hist.docs.map(s=>s.data()).sort((a,b)=>String(b.createdAt?.seconds||0).localeCompare(String(a.createdAt?.seconds||0))).forEach(v=>{const row=make('div');const when=v.createdAt?.toDate?.()?.toLocaleString?.()||'server timestamp';add(row,make('strong',`Revision ${v.revisionId.slice(0,8)} · ${v.source}`),make('p',`${v.changeSummary||'No summary'} · ${when} · ${v.createdByEmail||v.createdByUid}`),make('small',`Parent: ${v.parentRevisionId||'initial'} · ${v.teacherApproved?'Teacher approved':'Awaiting teacher review'}`));h.append(row)});
}
async function localGenerate(){needOwner();if(!state.lesson)throw Error('Choose a lesson');state.source='template';state.model='none';editorSet(createOfflineDraft(state.type,state.lesson));status('generationStatus','Offline draft created from this lesson. It is not AI model output; review and improve it before use.','ok')}
async function aiGenerate(){needOwner();if(!state.lesson)throw Error('Choose a lesson');const endpoint=$('aiEndpoint').value.trim();const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.pathname!=='/generate'||url.search||url.hash||url.username||url.password)throw Error('Use the exact secure HTTPS Worker /generate endpoint without query parameters.');
 // Do not send Firebase login tokens to unverified third-party endpoints.
 if(url.origin!==TRUSTED_WORKER_ORIGIN)throw Error('Only the verified Project X Cloudflare Worker is permitted.');
 busy(true);status('generationStatus','Requesting authenticated free-tier AI draft; no cloud resource write…');
 try{const token=await auth.currentUser.getIdToken();const res=await fetch(url.href,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({resourceType:state.type,lesson:contextFor(state.lesson),teacherInstruction:$('teacherBrief').value.slice(0,1200)})});
  const obj=await res.json();if(!res.ok)throw Error(obj.error||`AI service HTTP ${res.status}`);if(obj.resourceType!==state.type)throw Error('AI response has incorrect type');state.source='ai';state.model=obj.model||'AI service';editorSet(validateDraft(state.type,obj.resource));status('generationStatus','AI draft received. Teacher review required before saving or using it.','ok');
 }catch(err){state.source='template';state.model='none';editorSet(createOfflineDraft(state.type,state.lesson));status('generationStatus',`Online AI unavailable (${String(err.message||'service error').slice(0,150)}). Created a free offline draft instead; no cloud resource was saved.`, 'error');}
 finally{busy(false)}
}
async function saveRevision(){needOwner();if(!state.lesson)throw Error('Choose a lesson.');const content=editorRead();const comment=$('revisionReason').value.trim();if(comment.length<8)throw Error('Enter a revision description of at least 8 characters.');const uid=auth.currentUser.uid,email=auth.currentUser.email||'',id=state.currentResourceId||crypto.randomUUID(),rev=crypto.randomUUID(),approved=$('reviewApproved').checked;
 busy(true);status('historyStatus','Saving owner-private immutable revision…');
 try{const r=doc(db,'ownerLessonResourceDrafts',id),v=doc(db,'ownerLessonResourceDrafts',id,'revisions',rev);
  await runTransaction(db,async tx=>{const snap=await tx.get(r),old=snap.exists()?snap.data():null;
   if(old&&(old.lessonId!==state.lesson.lessonId||old.schoolId!=='project-x-personal'||old.resourceType!==state.type))throw Error('Existing resource belongs to a different lesson/type.');
   const meta={resourceId:id,lessonId:state.lesson.lessonId,schoolId:'project-x-personal',title:content.title,resourceType:state.type,latestRevisionId:rev,versionNumber:old?old.versionNumber+1:1,status:'draft',studentPublished:false,createdByUid:old?.createdByUid||uid,createdAt:old?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};
   const version={resourceId:id,lessonId:state.lesson.lessonId,schoolId:'project-x-personal',revisionId:rev,parentRevisionId:old?.latestRevisionId||null,resourceType:state.type,content,createdByUid:uid,createdByEmail:email,createdAt:serverTimestamp(),changeSummary:comment.slice(0,400),source:state.source,model:state.model,teacherApproved:approved,status:'draft',studentPublished:false};
   tx.set(v,version);tx.set(r,meta);
  });state.currentResourceId=id;$('reviewApproved').checked=false;$('revisionReason').value='';await loadHistory();$('existingResource').value=id;state.currentResourceId=id;status('historyStatus','Saved a new immutable private revision. No student or Classroom publication occurred.','ok');
 }finally{busy(false)}
}
$('signIn').onclick=async()=>{try{await setPersistence(auth,browserSessionPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){displayError(e)}};
$('signOut').onclick=()=>signOut(auth).catch(displayError);
$('refresh').onclick=()=>loadIndex().catch(displayError);
$('lesson').onchange=()=>{const url=new URL(location);url.searchParams.set('lesson',$('lesson').value);history.replaceState(null,'',url);loadLesson().catch(displayError)};
document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>setType(b.dataset.type));
$('localGenerate').onclick=()=>localGenerate().catch(displayError);
$('aiGenerate').onclick=()=>aiGenerate().catch(displayError);
$('aiEndpoint').value=localStorage.getItem('projectx.ai.workerEndpoint.v1')||'';$('aiEndpoint').oninput=()=>{localStorage.setItem('projectx.ai.workerEndpoint.v1',$('aiEndpoint').value.trim());controls()};
$('previewEdited').onclick=()=>{try{editorSet(editorRead());status('generationStatus','Edited resource validated. Save a revision or download when ready.','ok')}catch(e){displayError(e)}};
$('downloadDraft').onclick=()=>{try{const data=editorRead();const type=state.type,filename=resourceFilename();if(type==='diagram')download(new Blob([diagramSVG(data)],{type:'image/svg+xml'}),filename+'.svg');else if(type==='code')download(new Blob([data.code],{type:'text/plain;charset=utf-8'}),filename+'.py');else download(new Blob([exportHTML(type,data)],{type:'text/html;charset=utf-8'}),filename+'.html')}catch(e){displayError(e)}};
$('downloadJSON').onclick=()=>{try{const data=editorRead();download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),resourceFilename()+'.json')}catch(e){displayError(e)}};
$('addVideo').onclick=()=>{try{const u=safeVideoUrl($('videoUrl').value.trim());if(!u)throw Error('Enter a valid YouTube, Vimeo or BBC video URL using HTTPS.');const d=editorRead();d.approvedLinks=[...new Set([...(d.approvedLinks||[]),u])];editorSet(d);$('videoUrl').value='';status('generationStatus','Teacher-checked video URL added to this draft.','ok')}catch(e){displayError(e)}};
$('saveRevision').onclick=()=>saveRevision().catch(err=>{status('historyStatus','Save failed; no successful cloud revision confirmed: '+err.message,'error');busy(false)});
$('existingResource').onchange=()=>selectSaved().catch(displayError);
$('reloadHistory').onclick=()=>loadHistory().catch(displayError);
onAuthStateChanged(auth,user=>{state.user=user;state.lesson=null;state.draft=null;state.index=[];state.saved=[];state.currentResourceId=null;$('lesson').replaceChildren(option('','Sign in to load Year 11 lessons'));$('lessonFacts').textContent='Private library not loaded.';$('draftJSON').value='';$('draftPreview').textContent='No draft loaded.';status('authStatus',user?owner()?'Owner signed in. Loading Year 11 curriculum…':'Unauthorised account. Owner-only pilot.':'Sign in as the Project X owner.');controls();if(owner())loadIndex().catch(displayError)});
