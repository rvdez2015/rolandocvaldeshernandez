/* Project X Curriculum Centre — Visual release v2, 26 Oct 2026.
 * ADDITIVE owner-private read-only experience: no Firestore writes or student publication.
 * Shares authoritative release paths and checks with the deployed Year 11 Cloud Library.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore,doc,getDoc,collection,getDocs,query,limit } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {normaliseIndex,pathToLesson,pathToQuestion,pathToKeys,RELEASE_ID} from '../pilot-library/core.mjs';
import {buildUnits,searchCurriculum,validateRelease,roleLabel,formatMinutes} from './model.mjs';
const FIREBASE={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER_UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const BASE='/rolandocvaldeshernandez/projectx';
const app=initializeApp(FIREBASE,'projectx-curriculum-hub-v2');const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const state={index:[],units:[],view:'overview',unit:null,lesson:null,questions:[],keys:null,tab:'plan',variant:'standard',recent:[],search:'',user:null,loaded:false,dialogFocus:null,requestToken:0};
const owner=()=>!!auth.currentUser&&auth.currentUser.uid===OWNER_UID;
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const append=(p,...items)=>{for(const x of items)if(x)p.append(x);return p};
const btn=(text,action,cls)=>{const n=make('button',text,cls);n.type='button';n.addEventListener('click',action);return n};
const link=(text,url,cls)=>{const n=make('a',text,cls);n.href=url;return n};
const notice=(msg)=>{const e=$('toast');e.textContent=msg;e.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>{e.hidden=true},5000)};
const setPill=(text,cls='')=>{const e=$('connectionPill');e.textContent=text;e.className='connection '+cls};
async function read(parts){const snap=await getDoc(doc(db,...parts));if(!snap.exists())throw Error('Missing private revision: '+parts.join('/'));return snap.data()}
function safeUser(){if(!owner())throw Error('Sign in as the authorised Project X owner. Firestore rules provide the server-side access boundary.')}
function statusReset(){state.index=[];state.units=[];state.loaded=false;state.unit=null;state.lesson=null;state.questions=[];state.keys=null;state.recent=[];const grid=$('featuredUnits');grid.replaceChildren(make('p','Sign in as the Project X owner to load the private curriculum.','empty-inline'));$('allUnits').replaceChildren();$('lessonList').replaceChildren();$('recent').replaceChildren(make('p','No lessons opened in this session.','muted'));$('statUnits').textContent='—';$('statLessons').textContent='—';$('statQuestions').textContent='—';$('readiness').textContent='This page does not expose private curriculum to signed-out users.';$('unitFeature').replaceChildren(make('p','Sign in, then choose a unit to see its lessons.','empty-inline'));$('unitFeatureHeading').textContent='Teaching sequence';$('lessonUnitFilter').replaceChildren(new Option('All units','all'));}
async function loadCurriculum(){safeUser();setPill('Loading private library…');
 const release=await read(['curriculumPilotReleases',RELEASE_ID]);
 const snapshots=await getDocs(query(collection(db,'curriculumPilotIndex'),limit(200)));
 const rows=[];snapshots.forEach(x=>{const value=x.data();if(value.revisionId===RELEASE_ID)rows.push(value)});
 const index=normaliseIndex(rows),counts=validateRelease(release,index);
 state.index=index;state.units=buildUnits(index);state.loaded=true;
 state.unit=state.units.find(x=>x.unitId===state.unit?.unitId)||state.units[0];
 $('statUnits').textContent=String(counts.unitCount);$('statLessons').textContent=String(counts.lessonCount);$('statQuestions').textContent=String(counts.questionCount);
 $('readiness').textContent=`Owner-private release verified: ${counts.lessonCount} lessons across ${counts.unitCount} units. No writes or student publication.`;
 const sel=$('lessonUnitFilter');const keep=sel.value;sel.replaceChildren(new Option('All units','all'));for(const unit of state.units)sel.add(new Option(`${unit.title} (${unit.lessons.length})`,unit.unitId));if([...sel.options].some(x=>x.value===keep))sel.value=keep;
 renderOverview();renderUnits();renderLessons();renderAssessments();setPill('Private library verified','connected');
 const params=new URLSearchParams(location.search);const lesson=params.get('lesson');if(lesson&&state.index.some(x=>x.lessonId===lesson))await openLesson(lesson);
}
function unitVisual(unit){const files=['cpu','storage','data','networks','security','software','ethics'];const names=unit.number<=7?files[unit.number-1]:files[(unit.number-1)%7];return `url('./assets/${names}.svg')`}
function unitCard(unit){const el=make('button',undefined,'unit-card');el.type='button';el.classList.toggle('selected',state.unit?.unitId===unit.unitId);el.setAttribute('aria-label',`${unit.title}, ${unit.lessons.length} lessons`);
 const art=make('div',undefined,'unit-art');art.style.setProperty('--unit-image',unitVisual(unit));append(art,make('span',unit.number,'unit-num'));
 const cap=make('div',undefined,'unit-caption');const info=make('div');append(info,make('strong',unit.name),make('small',`${unit.lessons.length} lessons · ${unit.totalMinutes} min`));append(cap,info,make('span','›','unit-arrow'));append(el,art,cap);
 el.onclick=()=>{state.unit=unit;renderOverview();renderUnits();changeView('overview');document.getElementById('unitFeatureHeading').scrollIntoView({block:'start',behavior:'smooth'})};return el;
}
function renderOverview(){const grid=$('featuredUnits');grid.replaceChildren();if(!state.loaded){grid.append(make('p','Sign in to browse Year 11 units.','empty-inline'));return}
 const showAll=$('toggleAllUnits').getAttribute('aria-expanded')==='true';for(const unit of (showAll?state.units:state.units.slice(0,6)))grid.append(unitCard(unit));
 const u=state.unit||state.units[0];$('unitFeatureHeading').textContent=u?u.name:'Teaching sequence';const f=$('unitFeature');f.replaceChildren();if(!u)return;
 const content=make('div',undefined,'feature-content');append(content,make('span',`UNIT ${u.number} · OCR J277 YEAR 11`,'feature-id'),make('h3',u.name),make('p',`Explore ${u.lessons.length} imported lesson plans, classroom activities and their linked exam-style assessment questions.`));
 const stats=make('div',undefined,'feature-stats');for(const [val,label] of [[u.lessons.length,'lesson plans'],[`${u.totalMinutes} min`,'planned lesson time'],[10,'marks per lesson assessment']]){const s=make('span',undefined,'feature-stat');append(s,make('strong',val),make('span',label));stats.append(s)}content.append(stats);
 const actions=make('div',undefined,'feature-actions');actions.append(btn('Browse unit lessons →',()=>{changeView('lessons');$('lessonUnitFilter').value=u.unitId;renderLessons()},'button primary'),btn('View all units',()=>changeView('units'),'button outline'));content.append(actions);
 const block=make('div',undefined,'feature-lessons');append(block,make('h4','Lessons in this unit'));
 for(let i=0;i<u.lessons.length;i++){const lesson=u.lessons[i];const b=make('button',undefined,'lesson-mini');const text=make('span');append(text,make('strong',lesson.title),make('small',`${roleLabel(lesson.curriculumRole)} · ${lesson.lessonId}`));append(b,make('span',String(i+1),'lesson-ordinal'),text,make('span',formatMinutes(lesson.durationMinutes),'lesson-time'),make('span','›','lesson-chevron'));b.onclick=()=>openLesson(lesson.lessonId);block.append(b)}content.append(block);f.append(content)
}
function renderUnits(){const cont=$('allUnits');cont.replaceChildren();if(!state.loaded){cont.append(make('p','Private curriculum not loaded.','empty-inline'));return}
 $('unitsSummary').textContent=`${state.units.length} imported units · ${state.index.length} lessons · selection opens the unit teaching sequence.`;for(const u of state.units)cont.append(unitCard(u));}
function renderLessons(){const el=$('lessonList');el.replaceChildren();if(!state.loaded){el.append(make('p','Sign in to access the lesson library.','empty-inline'));return}
 const rows=searchCurriculum(state.index,state.search,$('lessonUnitFilter').value,$('lessonRoleFilter').value);$('lessonsSummary').textContent=`Showing ${rows.length} of ${state.index.length} privately imported lessons.`;
 if(!rows.length){el.append(make('p','No lessons match your filters.','empty-inline'));return}
 for(const l of rows){const u=state.units.find(x=>x.unitId===l.unitId);const b=make('button',undefined,'lesson-row');const mid=make('span');append(mid,make('strong',l.title),make('small',`${u?.name||l.unitId} · ${roleLabel(l.curriculumRole)} · ${l.lessonId}`));append(b,make('span',String(u?.number||'•'),'lesson-row-icon'),mid,make('span',`${formatMinutes(l.durationMinutes)} ›`,'row-right'));b.addEventListener('click',()=>openLesson(l.lessonId));el.append(b)}
}
function renderAssessments(){const p=$('assessmentRecent');p.replaceChildren();if(!state.loaded){p.append(make('p','Sign in to explore private assessment references.','empty-inline'));return}
 for(const unit of state.units){const group=make('details',undefined,'assessment-group');if(unit.number===1)group.open=true;const head=make('summary',`${unit.title} · ${unit.lessons.length} lessons`);group.append(head);for(const l of unit.lessons)group.append(btn(`${l.title} · view 10-mark questions →`,()=>{openLesson(l.lessonId).then(()=>{if(state.lesson?.lessonId===l.lessonId)setTab('questions')})},'assessment-launch'));p.append(group)}
}
function recentRender(){const p=$('recent');p.replaceChildren();if(!state.recent.length){p.append(make('p','No lessons opened in this session.','muted'));return}
 for(const l of state.recent){const el=btn(l.title,()=>openLesson(l.lessonId),'recent-item');el.append(make('small','View lesson details →'));p.append(el)}
}
function changeView(next){state.view=next;for(const e of document.querySelectorAll('.app-view'))e.hidden=e.id!==`view-${next}`;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===next);if(b.matches('.side-link')){if(b.dataset.view===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
 if(next==='units')renderUnits();if(next==='lessons')renderLessons();if(next==='assessment')renderAssessments();closeMobile();window.scrollTo({top:0,behavior:'smooth'});
}
function section(container,title,values){container.append(make('h3',title));if(Array.isArray(values)){const ul=make('ul');for(const v of values){if(v==null)continue;ul.append(make('li',v))}container.append(ul)}else for(const chunk of String(values||'Not specified in this draft.').split(/\n\s*\n/)){if(chunk.trim())container.append(make('p',chunk))}}
function renderPlan(c){const l=state.lesson,p=l.teacherPlan||{};section(c,'Learning objectives',p.learningObjectives||[]);section(c,'Success criteria',p.successCriteria||[]);section(c,'Subject explanation',p.subjectExplanation||'');section(c,'Prior knowledge',p.priorKnowledge||'');section(c,'Common misconceptions',p.misconceptions||[]);section(c,'Homework',p.homework||'');c.append(make('h3','45-minute teaching sequence'));for(const a of (l.activities||[])){const card=make('div',undefined,'stage-box');append(card,make('strong',`${a.sequence||''}. ${a.phase||a.stageId} · ${a.minutes} min`),make('p',`Teacher: ${a.teacherActions||''}`),make('p',`Student: ${a.studentActions||''}`));c.append(card)}}
function renderQuestions(c){if(!state.questions.length){c.append(make('p','No question records loaded.'));return}
 c.append(make('div','Each question is linked to a canonical assessment family. Supported and extension versions are learning presentations, not extra compulsory marks.','notice'));
 const variants=make('div',undefined,'variant-tabs');for(const k of ['standard','supported','extension']){const b=btn(k==='standard'?'Standard':k==='supported'?'Supported':'Extension',()=>{state.variant=k;renderDialogContent()});b.classList.toggle('active',state.variant===k);variants.append(b)}c.append(variants);
 for(const [i,q] of state.questions.entries()){const box=make('article',undefined,'question-box');append(box,make('strong',`Question ${i+1}`),make('span',` · ${q.marks} mark${q.marks===1?'':'s'}`,'marks'));
 const presentation=q.presentations?.[state.variant]||q.presentations?.standard;append(box,make('p',presentation?.stem||q.canonicalStem||'Question text unavailable'));
 const hints=presentation?.scaffolding||presentation?.unmarkedExtensionInstructions;if(hints?.length)section(box,state.variant==='supported'?'Support prompts':'Extension prompts',hints);
 box.append(make('small',`Reference: ${q.questionId} · Concept family: ${q.familyId}`));c.append(box)}
 const sum=state.questions.reduce((n,q)=>n+(q.marks||0),0);c.append(make('p',`Assessment marks: ${sum}. Teacher-only answers are not included in this panel.`,'notice'))
}
async function renderKeys(c){if(!owner())return section(c,'Restricted', 'Owner sign-in required.');if(!state.keys){append(c,make('p','Teacher marking data is not loaded automatically. Select the button below to retrieve the protected record.'),btn('Reveal teacher-only marking for this lesson',loadKeys,'button primary'));return}
 c.append(make('div','PRIVATE TEACHER GUIDANCE. Do not copy this panel into student resources or public webpages.','notice'));
 c.append(make('h3','Provisional marking guidance'));
 const items=state.keys.questionMarkSchemes||[];
 for(const [i,k] of items.entries()){const card=make('div',undefined,'question-box');append(card,make('strong',`Question ${i+1} · ${k.marks} marks`));section(card,'Marking points',k.markingPoints||k.provisionalMarkingCriteria||[]);c.append(card)}
 if(!items.length)c.append(make('p','No teacher marking points were supplied.'))
}
async function loadKeys(){if(!owner()||!state.lesson)return;const id=state.lesson.lessonId;const c=$('dialogContent');c.replaceChildren(make('p','Loading restricted marking…'));try{const data=await read(pathToKeys(id));if(state.lesson?.lessonId!==id)return;if(data.teacherOnly!==true||data.lessonId!==id)throw Error('Incorrect marking-scheme ownership or record');state.keys=data;renderDialogContent()}catch(e){c.replaceChildren(make('p','Teacher marking unavailable: '+e.message,'notice'))}}
function renderDialogContent(){const c=$('dialogContent');c.replaceChildren();if(!state.lesson)return;switch(state.tab){case 'plan':renderPlan(c);break;case 'questions':renderQuestions(c);break;case 'marking':renderKeys(c);break;}}
function setTab(t){state.tab=t;for(const b of document.querySelectorAll('.dialog-tabs button')){b.classList.toggle('active',b.dataset.tab===t);b.setAttribute('aria-selected',String(b.dataset.tab===t))}renderDialogContent()}
async function openLesson(id){safeUser();const serial=++state.requestToken;const prior=document.activeElement;state.dialogFocus=prior;
 const backdrop=$('lessonDialog');backdrop.hidden=false;$('dialogTitle').textContent='Loading lesson…';$('dialogMeta').textContent=id;state.lesson=null;state.keys=null;state.questions=[];state.variant='standard';setTab('plan');$('dialogContent').replaceChildren(make('p','Retrieving immutable lesson and linked questions…'));$('dialogClose').focus();
 try{const l=await read(pathToLesson(id));if(serial!==state.requestToken)return;if(l.lessonId!==id||l.revisionId!==RELEASE_ID||l.visibility!=='owner_private'||l.schoolId!=='project-x-personal')throw Error('Unexpected lesson identity or access scope');
 const refs=l.assessmentItemRefs||[];const qq=await Promise.all(refs.map(r=>read(pathToQuestion(r.itemId))));if(serial!==state.requestToken)return;
 qq.forEach((q,i)=>{if(q.questionId!==refs[i].itemId||q.familyId!==refs[i].familyId||q.marks!==refs[i].marks)throw Error('Question reference mismatch at '+refs[i].itemId)});
 state.lesson=l;state.questions=qq;state.keys=null;$('dialogTitle').textContent=l.title;$('dialogMeta').textContent=`${l.lessonId} · ${formatMinutes(l.durationMinutes)} · ${roleLabel(l.curriculumRole)} · Owner-private`;
 $('openFullLesson').href=`${BASE}/apps/curriculum/pilot-library/?lesson=${encodeURIComponent(id)}`;
 state.recent=[{lessonId:id,title:l.title},...state.recent.filter(x=>x.lessonId!==id)].slice(0,6);recentRender();renderDialogContent();
 }catch(e){if(serial!==state.requestToken)return;$('dialogTitle').textContent='Unable to load lesson';$('dialogContent').replaceChildren(make('p',e.message,'notice'));notice(e.message)}
}
function closeDialog(){state.requestToken++;$('lessonDialog').hidden=true;state.lesson=null;state.questions=[];state.keys=null;if(state.dialogFocus?.isConnected)state.dialogFocus.focus();}
function mobileToggle(){const s=$('sidebar');const open=s.classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',String(open));$('mobileBackdrop').hidden=!open}
function closeMobile(){$('sidebar').classList.remove('open');$('menuToggle').setAttribute('aria-expanded','false');$('mobileBackdrop').hidden=true}
function bind(){document.querySelectorAll('[data-view]').forEach(x=>x.addEventListener('click',()=>changeView(x.dataset.view)));
 $('toggleAllUnits').onclick=()=>{const e=$('toggleAllUnits'),v=e.getAttribute('aria-expanded')!=='true';e.setAttribute('aria-expanded',String(v));e.textContent=v?'Show featured units ↑':'View all units →';renderOverview()};
 $('search').addEventListener('input',e=>{state.search=e.target.value;changeView('lessons')});$('search').addEventListener('keydown',e=>{if(e.key==='Escape'){$('search').value='';state.search='';renderLessons()}});
 for(const x of ['lessonUnitFilter','lessonRoleFilter'])$(x).addEventListener('change',renderLessons);
 $('clearFilters').onclick=()=>{$('search').value='';state.search='';$('lessonUnitFilter').value='all';$('lessonRoleFilter').value='all';renderLessons()};
 $('signIn').onclick=async()=>{try{await setPersistence(auth,browserSessionPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){setPill('Sign-in failed','error');notice('Google sign-in failed: '+e.message)}};
 $('signOut').onclick=()=>signOut(auth).catch(e=>notice(e.message));
 $('dialogClose').onclick=closeDialog;$('lessonDialog').addEventListener('click',e=>{if(e.target===$('lessonDialog'))closeDialog()});
 for(const b of document.querySelectorAll('.dialog-tabs button'))b.onclick=()=>setTab(b.dataset.tab);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('lessonDialog').hidden)closeDialog();else if(e.key==='Escape')closeMobile();else if(e.key==='Tab'&&!$('lessonDialog').hidden){const dialog=$('lessonDialog');const els=[...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')].filter(x=>x.offsetParent!==null);if(els.length){if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}}}else if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)&&$('lessonDialog').hidden){e.preventDefault();$('search').focus()}});
 $('menuToggle').onclick=mobileToggle;$('mobileBackdrop').onclick=closeMobile;
}
bind();statusReset();
onAuthStateChanged(auth,user=>{state.user=user;$('signIn').hidden=!!user;$('signOut').hidden=!user;$('avatar').textContent=user?(user.displayName||user.email||'PX').split(/[\s@]/).map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase():'PX';statusReset();if(!user){setPill('Sign in to view lessons');return}if(!owner()){setPill('Not authorised','error');notice('This private release is currently restricted to the Project X owner.');return}loadCurriculum().catch(e=>{setPill('Connection error','error');$('readiness').textContent=`Private curriculum unavailable: ${e.message}`;notice('Unable to load private curriculum: '+e.message)})});
