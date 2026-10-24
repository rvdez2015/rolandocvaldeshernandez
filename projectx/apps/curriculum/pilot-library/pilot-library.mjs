/*
Project X Curriculum Intelligence · Year 11 private pilot library
- Reads canonical immutable revisions; does not modify legacy collections.
- Never sends teacher keys to students; authentication and Firestore rules enforce access.
- Revision proposals are OFFLINE DOWNLOADS, not live writes or server-certified history.
*/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, inMemoryPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, query, limit } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID, SCHOOL_ID, EXPECTED, REV, pathToLesson, pathToKeys, pathToQuestion, pathToFamily, pathToStudentLesson, normaliseIndex, groupByUnit,filterLessons, reconcileQuestions, textForEdit, createDraftProposal, ensureOwnerPrivate} from './core.mjs';
const firebaseConfig={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER_UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(firebaseConfig,'projectx-pilot-library');const auth=getAuth(app);const db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={index:[],lesson:null,keys:null,questions:[],families:[],selection:null,actor:null,activeTab:'lesson',questionVariant:'standard',keysLoaded:false,historyLoaded:false,editor:null,sourceHash:null};
const isOwner=()=>auth.currentUser?.uid===OWNER_UID;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
const add=(p,...elems)=>{elems.forEach(x=>x&&p.append(x));return p};
function status(message,type=''){const e=$('cloudStatus');e.textContent=message;e.className='status '+type}
function ensureOwner(){if(!isOwner())throw Error('Owner sign-in required. Firestore security rules must also enforce this restriction.')}
function setButtons(){const signed=!!auth.currentUser;$('signin').disabled=signed;$('signout').disabled=!signed;$('refresh').disabled=!isOwner()}
function clearData(){Object.assign(state,{index:[],lesson:null,keys:null,questions:[],families:[],selection:null,activeTab:'lesson',keysLoaded:false,historyLoaded:false,editor:null});$('lessonList').replaceChildren(node('div','Sign in to load owner-private curriculum.','empty'));$('detail').replaceChildren(node('div','Select a lesson after sign-in.','empty'));$('resultCount').textContent='No cloud lesson data loaded';$('unitFilter').replaceChildren(new Option('All 26 units','all'));$('releaseStatus').textContent='Not connected';setButtons()}
async function get(path){const snapshot=await getDoc(doc(db,...path));if(!snapshot.exists())throw Error('Private revision missing: '+path.join('/'));return snapshot.data()}
async function loadIndex(){ensureOwner();status('Reading private release marker and lesson index…');
 const release=await get(['curriculumPilotReleases',RELEASE_ID]);
 if(release.studentPublished!==false||release.status!=='READY_OWNER_PRIVATE'||release.lessonCount!==EXPECTED.lessons||release.schoolId!==SCHOOL_ID)throw Error('Unexpected release status or scope');
 const s=await getDocs(query(collection(db,'curriculumPilotIndex'),limit(150)));
 const rows=[];s.forEach(d=>rows.push(d.data()));
 const idx=normaliseIndex(rows.filter(x=>x.revisionId===RELEASE_ID));
 if(idx.length!==EXPECTED.lessons)throw Error(`Expected ${EXPECTED.lessons} indexed lessons; found ${idx.length}. Check the import release and index.`);
 state.index=idx;$('releaseStatus').textContent='Owner private';$('lessonCount').textContent=String(idx.length);$('unitCount').textContent=String(groupByUnit(idx).length);
 $('unitFilter').replaceChildren(new Option('All 26 units','all'));
 for(const unit of groupByUnit(idx))$('unitFilter').append(new Option(`${unit.title} (${unit.lessons.length})`,unit.unitId));
 renderList();status(`OWNER-PRIVATE RELEASE VERIFIED: ${idx.length} lessons, ${groupByUnit(idx).length} units. No student publication and no writes.`, 'ok');
 const preselected=new URLSearchParams(location.search).get('lesson');
 if(preselected&&idx.some(x=>x.lessonId===preselected))await choose(preselected);
}
function renderList(){const list=$('lessonList');list.replaceChildren();const arr=filterLessons(state.index,{query:$('search').value,unit:$('unitFilter').value,role:$('roleFilter').value});$('resultCount').textContent=`${arr.length} of ${state.index.length} indexed lessons`;
 if(!arr.length){add(list,node('div','No matching lessons.','empty'));return}
 for(const l of arr){const b=node('button',undefined,'lesson-link');b.type='button';b.classList.toggle('active',state.selection===l.lessonId);b.append(node('span',l.title||l.lessonId));b.append(node('small',`${l.lessonId} · ${l.curriculumRole||'pilot'}`));b.onclick=()=>choose(l.lessonId);add(list,b)}
}
async function choose(id){ensureOwner();state.selection=id;state.lesson=null;state.questions=[];state.keys=null;state.families=[];state.keysLoaded=false;state.historyLoaded=false;state.editor=null;state.activeTab='lesson';state.questionVariant='standard';renderList();$('detail').replaceChildren(node('div','Loading immutable lesson revision and linked question records…','empty'));
 try{
  const lesson=await get(pathToLesson(id));ensureOwnerPrivate(lesson);
  if(lesson.lessonId!==id||lesson.revisionId!==RELEASE_ID)throw Error('Lesson ID or revision does not match the private index');
  state.lesson=lesson;state.sourceHash=lesson.sourceHash||null;
  // Canonical questions are loaded, but marking keys are NOT requested until the owner explicitly opens them.
  const refs=lesson.assessmentItemRefs||[];
  const questions=await Promise.all(refs.map(r=>get(pathToQuestion(r.itemId))));
  questions.forEach((q,i)=>{if(q.questionId!==refs[i].itemId||q.familyId!==refs[i].familyId||q.marks!==refs[i].marks)throw Error('Canonical question reference mismatch at '+refs[i].itemId)});
  state.questions=questions;
  renderDetail();
 }catch(e){$('detail').replaceChildren(node('div',`Unable to load lesson: ${e.message}`,'status error'))}
}
function heading(parent,level,text){return add(parent,node(level,text))}
function paragraphs(parent,content){for(const line of String(content||'').split(/\n\s*\n/)){if(line.trim())add(parent,node('p',line,'preline'))}}
function bulleted(parent,values){const items=Array.isArray(values)?values:[values];const ul=node('ul');for(const v of items)if(v!==undefined&&v!==null)add(ul,node('li',v));add(parent,ul)}
function section(parent,title,contents){heading(parent,'h3',title);if(Array.isArray(contents))bulleted(parent,contents);else paragraphs(parent,contents)}
function renderDetail(){const d=$('detail');d.replaceChildren();const l=state.lesson;if(!l)return;
 heading(d,'h2',l.title);add(d,node('div',`${l.lessonId} · ${l.durationMinutes||45} minutes · ${l.unitId}`,'meta'));
 const tags=node('div',undefined,'tags');for(const value of [l.curriculumRole,l.revisionStatus||'owner-private pilot',...(l.frameworkObjectiveIds||[])])add(tags,node('span',value,'tag'));add(d,tags);
 const caution=node('div','Approved for initial teaching; detailed classroom moderation is ongoing. This is NOT student-published.','callout');add(d,caution);
 const tabs=node('div',undefined,'tabbar');for(const [key,label] of [['lesson','Teaching plan'],['questions','Question bank'],['keys','Teacher marking'],['history','Revision history'],['edit','Propose correction'],['student','Student-safe preview']]){
  const b=node('button',label);b.type='button';b.setAttribute('aria-selected',String(state.activeTab===key));b.onclick=()=>switchTab(key);add(tabs,b)
 }add(d,tabs);
 const content=node('section');content.id='lessonTab';add(d,content);renderTab();
}
async function switchTab(tab){state.activeTab=tab;renderDetail();if(tab==='keys'&&!state.keysLoaded)await showKeys();if(tab==='history'&&!state.historyLoaded)await showHistory();if(tab==='student')await renderStudent()}
function renderTab(){const l=state.lesson,c=$('lessonTab');if(!c||!l)return;c.replaceChildren();switch(state.activeTab){case 'lesson':renderPlan(c,l);break;case 'questions':renderQuestions(c);break;case 'keys':if(state.keysLoaded)drawKeys(c);else add(c,node('p','The teacher-only marking file is loaded on request.'));break;case 'history':add(c,node('p','Loading immutable revision history…'));break;case 'edit':drawEditor(c);break;case 'student':add(c,node('p','Loading the student-safe draft preview (owner only)…'));break}}
function renderPlan(c,l){
 const p=l.teacherPlan||{};section(c,'Learning objectives',p.learningObjectives||[]);section(c,'Success criteria',p.successCriteria||[]);
 section(c,'Subject explanation',p.subjectExplanation||'');section(c,'Prerequisite knowledge',p.priorKnowledge||'');
 section(c,'Common misconceptions',p.misconceptions||[]);
 if(p.vocabulary?.length)section(c,'Vocabulary',p.vocabulary.join(' · '));
 heading(c,'h3','45-minute lesson sequence');
 for(const a of l.activities||[]){const card=node('article',undefined,'stage');heading(card,'h4',`${a.sequence||''}. ${a.phase||a.stageId} · ${a.minutes} min`);add(card,node('p',`Teacher: ${a.teacherActions||''}`,'preline'));add(card,node('p',`Student: ${a.studentActions||''}`,'preline'));
  if(a.checksForUnderstanding?.length){add(card,node('small','Checks for understanding'));bulleted(card,a.checksForUnderstanding)}add(c,card)
 }
 if(p.differentiation){heading(c,'h3','Differentiation');for(const [k,v] of Object.entries(p.differentiation))if(v)add(c,node('p',`${k}: ${v}`,'preline'))}
 section(c,'Homework',p.homework||'');
 const a=node('button','Print teaching plan');a.onclick=()=>window.print();add(c,a)
}
function renderQuestions(c){c.replaceChildren();const all=state.lesson.assessmentItemRefs||[];
 const counter=node('p',`${all.length} canonical assessment questions; ${all.reduce((n,r)=>n+r.marks,0)} marks. The wording follows the canonical question bank. Variants share the same assessment core.`,'meta');add(c,counter);
 for(const ref of all){const q=state.questions.find(x=>x.questionId===ref.itemId);if(!q)continue;const card=node('article',undefined,'question-card');heading(card,'h4',`${ref.itemId.split('-').at(-1)} — ${q.marks} mark${q.marks!==1?'s':''}`);
  add(card,node('div',`Family: ${q.familyId} · ${q.sourceType||'exam-style draft'}`,'meta'));
  const variants=node('div',undefined,'variant-group');for(const variant of ['standard','supported','extension']){const btn=node('button',variant);btn.type='button';btn.setAttribute('aria-pressed',String(variant===state.questionVariant));btn.onclick=()=>{state.questionVariant=variant;renderQuestions(c)};add(variants,btn)}add(card,variants);
  const view=q.presentations?.[state.questionVariant]||q.presentations?.standard||{};
  add(card,node('p',view.stem||q.canonicalStem||'','preline'));
  if(view.scaffolding?.length){add(card,node('small','Support prompts'));bulleted(card,view.scaffolding)}
  if(view.unmarkedExtensionInstructions?.length){add(card,node('small','Unmarked extension'));bulleted(card,view.unmarkedExtensionInstructions)}
  const more=node('button','Check concept linkage');more.onclick=()=>showFamily(card,q);add(card,more);add(c,card)
 }
}
async function showFamily(parent,q){ensureOwner();const button=[...parent.querySelectorAll('button')].find(b=>b.textContent==='Check concept linkage');if(button)button.disabled=true;
 try{const family=await get(pathToFamily(q.familyId));if(family.familyId!==q.familyId)throw Error('Concept ID mismatch');const box=node('div',undefined,'key-detail');heading(box,'h4','Canonical assessment family');add(box,node('p',`Specification: ${(family.specificationObjectiveIds||[]).join(', ')}`));add(box,node('p',`Shared concept status: ${family.familyReviewStatus||'pilot'}`));add(box,node('p','This family connects differentiated presentations to a single assessment core. Marking detail belongs in the private teacher tab.'));add(parent,box)}catch(e){add(parent,node('p','Unable to load concept family: '+e.message,'status error'))}finally{if(button)button.disabled=false}
}
async function showKeys(){try{ensureOwner();const data=await get(pathToKeys(state.selection));if(data.teacherOnly!==true||data.lessonId!==state.selection)throw Error('Marking payload lacks required teacher-only metadata');reconcileQuestions(state.lesson,state.questions,data);state.keys=data;state.keysLoaded=true;drawKeys($('lessonTab'));}catch(e){const c=$('lessonTab');if(c)add(c,node('div','Teacher marking could not be loaded: '+e.message,'status error'))}}
function drawKeys(c){c.replaceChildren();const k=state.keys;add(c,node('div','RESTRICTED TEACHER VIEW — not for Google Classroom or student pages.','callout'));
 add(c,node('p',`Marking status: ${k.markSchemeStatus||'draft'}. Independent final moderation: ${k.independentModerationComplete?'recorded as complete':'not complete'}.`,'meta'));
 for(const key of k.questionMarkSchemes||[]){const card=node('section',undefined,'question-card');heading(card,'h4',`${key.itemId.split('-').at(-1)} · ${key.marks} marks`);add(card,node('p',key.question,'preline'));bulleted(card,key.markingPoints||[]);if(key.modelAnswer)add(card,node('div','Draft model answer: '+key.modelAnswer,'key-detail'));add(c,card)}
}
async function showHistory(){try{ensureOwner();const results=await getDocs(query(collection(db,'catalogueLessons',state.selection,'revisions'),limit(40)));
 const c=$('lessonTab');if(state.activeTab!=='history')return;c.replaceChildren();heading(c,'h3','Immutable revision history');
 const revisions=[];results.forEach(x=>revisions.push({id:x.id,...x.data()}));
 revisions.sort((a,b)=>Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
 for(const x of revisions){const card=node('article',undefined,'history-card');heading(card,'h4',x.id);const when=x.createdAt?.toDate?.()?.toLocaleString?.()||'Timestamp unavailable';add(card,node('p',`When: ${when}`));add(card,node('p',`Recorded actor: ${x.createdByEmail||x.createdByUid||'not recorded'}`));add(card,node('p',`Changed fields: ${(x.changedFields||[]).join(', ')}`));add(card,node('p',`Reason: ${x.changeReason||'not provided'}`));
 const compare=node('button','Compare with selected release');compare.onclick=()=>{
  const base=textForEdit(state.lesson),other=textForEdit(x),changed=Object.keys(base).filter(f=>base[f]!==other[f]);
  const old=card.querySelector('.revision-comparison');if(old)old.remove();const view=node('section',undefined,'revision-comparison key-detail');heading(view,'h4',`Version comparison · ${changed.length} changed editable field(s)`);
  for(const field of changed){heading(view,'h4',field);add(view,node('small','Current selected release'));add(view,node('p',base[field]||'(empty)','preline'));add(view,node('small','Compared revision'));add(view,node('p',other[field]||'(empty)','preline'))}
  if(!changed.length)add(view,node('p','No differences in supported teacher-plan fields. Other metadata may differ.'));
  add(card,view)
 };add(card,compare);add(c,card)}
 if(revisions.length===0)add(c,node('p','No immutable revision documents returned.'));
 state.historyLoaded=true;
 }catch(e){const c=$('lessonTab');if(c)add(c,node('p','History unavailable: '+e.message,'status error'))}}
async function renderStudent(){try{ensureOwner();const student=await get(pathToStudentLesson(state.selection));if(student.studentPublicationApproved!==false||student.approvedForAutomaticStudentRelease!==false)throw Error('Student publication flags are unsafe');const c=$('lessonTab');if(state.activeTab!=='student')return;c.replaceChildren();add(c,node('div','OWNER-ONLY PREVIEW. This content is NOT published to students.','callout'));section(c,'Student introduction',student.studentPlan?.intro||'');heading(c,'h3','Student activities');for(const a of student.studentPlan?.activities||[]){const s=node('article',undefined,'stage');heading(s,'h4',a.stageId);add(s,node('p',a.instructions||''));add(c,s)}heading(c,'h3','Assessment questions (no answer keys)');for(const q of student.studentPlan?.assessmentQuestions||[]){add(c,node('p',`${q.question} [${q.marks}]`))}}catch(e){const c=$('lessonTab');if(c)add(c,node('p','Student draft preview unavailable: '+e.message,'status error'))}}
function drawEditor(c){c.replaceChildren();add(c,node('div','Create a proposed revision for teacher review. This does NOT modify Firestore, publish lessons or establish server-certified attribution.','callout'));
 const original=textForEdit(state.lesson);const form=node('form',undefined,'editor');const fields=[['objectives','Learning objectives (one per line)'],['success','Success criteria (one per line)'],['explanation','Subject explanation'],['misconceptions','Misconceptions (one per line)'],['homework','Homework'],['reflections','Teacher-only guidance / reflection']];const edited={};
 for(const [key,label] of fields){const wrap=node('label',label);const el=node('textarea');el.value=original[key];el.classList.toggle('tall',key==='explanation');edited[key]=el;add(wrap,el);add(form,wrap)}
 const reasonLabel=node('label','Reason for revision');const reason=node('input');reason.required=true;reason.placeholder='e.g. Corrected trace table after classroom trial';add(reasonLabel,reason);add(form,reasonLabel);
 const btn=node('button','Download proposed revision JSON','primary');btn.type='submit';add(form,btn);const feedback=node('div','No changes saved.','status');add(form,feedback);
 form.onsubmit=e=>{e.preventDefault();try{ensureOwner();const proposed=createDraftProposal({lesson:state.lesson,original,edited:Object.fromEntries(Object.entries(edited).map(([k,v])=>[k,v.value])),actor:{uid:auth.currentUser.uid,email:auth.currentUser.email,displayName:auth.currentUser.displayName},reason:reason.value,baseHash:state.sourceHash});downloadJson(proposed,`${state.lesson.lessonId}-proposed-revision.json`);feedback.textContent=`Exported ${proposed.changes.length} changed field(s). Firestore unchanged. Save this in your private Project X revision folder.`;feedback.className='status ok'}catch(err){feedback.textContent=err.message;feedback.className='status error'}};
 add(c,form)
}
function downloadJson(obj,file){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('signin').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){status('Sign-in failed: '+e.message,'error')}};
$('signout').onclick=()=>signOut(auth).catch(e=>status(e.message,'error'));
$('refresh').onclick=()=>loadIndex().catch(e=>status('Library load failed: '+e.message,'error'));
for(const id of ['search','unitFilter','roleFilter'])$(id).addEventListener(id==='search'?'input':'change',renderList);
onAuthStateChanged(auth,user=>{state.actor=user;clearData();$('authStatus').textContent=user?(isOwner()?`Signed in as owner: ${user.email}`:`Signed in as ${user.email}. This account is not authorised for the owner-private pilot.`):'Signed out. Private curriculum data is not loaded.';setButtons();if(isOwner())loadIndex().catch(e=>status('Owner Firestore read failed: '+e.message,'error'));else status('Private Firestore reads disabled.','');});
