import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,getDocs,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const cfg={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const $=id=>document.getElementById(id);let lesson=null,owner=false;
const safe=s=>String(s??'');const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=safe(text);if(cls)n.className=cls;return n};
let lessonChoices=[],selectedLessonKey='',formDirty=false,changingLesson=false;
const lessonKey=(d)=>d.lessonId+'::'+d.revisionId;
const displayUnit=d=>safe(d.unitTitle||d.unitName||d.unitId||d.schemeTitle||d.schemeOfWork||'Unit not yet assigned');
const yearValue=d=>String(d.yearGroup??d.year??'').replace(/^Year\s*/i,'').trim();
function setState(){owner=auth.currentUser?.uid===OWNER;$('login').disabled=!!auth.currentUser;$('logout').disabled=!auth.currentUser;$('load').disabled=!owner;$('selectLesson').disabled=!owner||!$('lessonSelect').value;$('save').disabled=!owner||!lesson;$('refresh').disabled=!owner;$('authStatus').textContent=owner?'Project X owner authenticated.':auth.currentUser?'Non-owner account: access denied.':'Not signed in.'}
function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o)}
function resetPicker(){lessonChoices=[];selectedLessonKey='';for(const id of ['yearSelect','unitSelect','lessonSelect']){$(id).replaceChildren();option($(id),'',id==='yearSelect'?'Select year group':id==='unitSelect'?'Select unit':'Select lesson');$(id).disabled=true;}setState()}
function resetLesson(){lesson=null;selectedLessonKey='';$('lessonStatus').textContent='No lesson selected.';$('lessonPreview').hidden=true;$('standards').replaceChildren(el('p','Select a lesson to display its standards alignment.'));setState()}
function hasUnsavedChanges(){return formDirty}
function confirmDiscard(){return !hasUnsavedChanges()||confirm('This observation contains unsaved changes. Switch lessons and discard those changes?')}
// Year 11 release is discovered through a bounded, owner-private *root index*.
// Collection-group scans can be denied by rules and may expose unwanted nested records.
const PX_RELEASE='y11-j277-canonical-pilot-20261024-r1';
const PX_ID=/^PX25-Y11-U\d{2}-L\d{3}$/;
const PX_UNITS={
 '01':'Systems architecture','02':'Memory and storage','03':'Data representation',
 '04':'Networks and protocols','05':'Network security','06':'Systems software',
 '07':'Ethical, legal, cultural and environmental impacts','08':'Algorithms',
 '09':'Programming fundamentals','10':'Robust programming','11':'Boolean logic',
 '12':'Languages and IDEs','13':'Impacts and law revision','14':'Python setup',
 '15':'Python output and variables','16':'Python input','17':'Python types and arithmetic',
 '18':'Python selection','19':'Python libraries','20':'Python iteration',
 '21':'Python subprograms','22':'Python collections','23':'Python strings and numbers',
 '24':'Python files','25':'Python GUI extension','26':'Python error handling'
};
const pxUnitTitle=id=>`Unit ${Number((id.match(/U(\d+)/)||[])[1]||0)} · ${PX_UNITS[(id.match(/U(\d+)/)||[])[1]]||id}`;
async function discoverLessons(){
 if(!owner)return;resetLesson();resetPicker();
 $('catalogueStatus').textContent='Reading the private Year 11 curriculum index…';
 try{
  const docs=await getDocs(collection(db,'curriculumPilotIndex'));
  const records=docs.docs.map(s=>s.data()).filter(d=>
   PX_ID.test(d.lessonId||'')&&d.revisionId===PX_RELEASE&&d.visibility==='owner_private'&&d.studentPublished===false
  ).map(d=>({...d,yearGroup:11,unitTitle:pxUnitTitle(d.unitId),__source:'canonical-pilot'}));
  if(records.length!==94)throw Error(`Expected 94 Year 11 lessons, received ${records.length}. Check the private index and sign-in.`);
  lessonChoices=records;
  // Preserve discovery of the legacy 1.1d lesson if its v2 revision exists.
  try{
   const old=await getDoc(doc(db,'catalogueLessons','1.1d','revisions','v2-pilot'));
   if(old.exists()){
    const legacy=old.data();
    if(legacy.schemaVersion===2&&legacy.lessonId==='1.1d'&&Array.isArray(legacy.standardsAlignment))
     lessonChoices.push({...legacy,revisionId:'v2-pilot',__source:'legacy-v2'});
   }
  }catch(err){console.info('Legacy v2 observation lesson unavailable:',err.code||err.message)}
  lessonChoices.sort((a,b)=>Number(yearValue(a))-Number(yearValue(b))||displayUnit(a).localeCompare(displayUnit(b))||safe(a.title).localeCompare(safe(b.title)));
  for(const y of [...new Set(lessonChoices.map(yearValue))])option($('yearSelect'),y,'Year '+y);
  $('yearSelect').disabled=false;
  $('catalogueStatus').textContent=`${records.length} imported Year 11 lessons available`+(lessonChoices.length>records.length?' · 1 separate legacy lesson (1.1d) preserved.':'.')+' Choose a year, unit and lesson.';
  // Deep-link from the private library: ?lessonId=PX25-Y11-U01-L001
  const target=new URLSearchParams(location.search).get('lessonId');
  if(target&&lessonChoices.some(x=>x.lessonId===target)){
   const d=lessonChoices.find(x=>x.lessonId===target);
   $('yearSelect').value=yearValue(d);$('yearSelect').onchange?.();
   $('unitSelect').value=displayUnit(d);$('unitSelect').onchange?.();
   $('lessonSelect').value=lessonKey(d);await loadLesson();
  }
 }catch(err){$('catalogueStatus').textContent='Curriculum index not available: '+err.message+'. No documents modified.';}
 setState();
}
$('yearSelect').onchange=()=>{if(!confirmDiscard()){$('yearSelect').value=lesson?yearValue(lesson):'';return}resetLesson();$('unitSelect').replaceChildren();option($('unitSelect'),'','Select unit');$('lessonSelect').replaceChildren();option($('lessonSelect'),'','Select lesson');$('lessonSelect').disabled=true;const choices=lessonChoices.filter(d=>yearValue(d)===$('yearSelect').value);for(const unit of [...new Set(choices.map(displayUnit))].sort())option($('unitSelect'),unit,unit);$('unitSelect').disabled=!choices.length;setState()};
$('unitSelect').onchange=()=>{if(!confirmDiscard()){$('unitSelect').value=lesson?displayUnit(lesson):'';return}resetLesson();$('lessonSelect').replaceChildren();option($('lessonSelect'),'','Select lesson');for(const d of lessonChoices.filter(d=>yearValue(d)===$('yearSelect').value&&displayUnit(d)===$('unitSelect').value))option($('lessonSelect'),lessonKey(d),`${d.lessonId} — ${d.title||'Untitled'} (${d.revisionId})`);$('lessonSelect').disabled=false;setState()};
$('lessonSelect').onchange=()=>{if(!confirmDiscard()){$('lessonSelect').value=lesson?lessonKey(lesson):'';return}resetLesson();setState()};
async function loadLesson(){if(!owner)return;const key=$('lessonSelect').value;const meta=lessonChoices.find(d=>lessonKey(d)===key);if(!meta){$('lessonStatus').textContent='Choose a lesson first.';return}if(!confirmDiscard())return;
 try{const snap=await getDoc(doc(db,'catalogueLessons',meta.lessonId,'revisions',meta.revisionId));if(!snap.exists())throw Error('Selected revision no longer exists.');const d=snap.data();if(d.schemaVersion!==2||d.lessonId!==meta.lessonId||!Array.isArray(d.standardsAlignment)||d.standardsAlignment.length!==8)throw Error('Selected revision fails schema / Teachers Standards checks.');
 if(meta.__source==='canonical-pilot'&&d.revisionId!==PX_RELEASE)throw Error('Unexpected imported revision.');
 clearObservationForm();lesson={...d,revisionId:d.revisionId||meta.revisionId};selectedLessonKey=key;$('lessonStatus').textContent=`Loaded: ${d.title} · Year ${yearValue(d)} · ${d.durationMinutes||'?'} minutes · ${meta.revisionId}`;
 $('lessonPreview').hidden=false;renderLessonPreview(d,meta);
 renderStandards();formDirty=false;await refresh();setState();
 }catch(e){resetLesson();$('lessonStatus').textContent='Load failed: '+e.message}}

// Render an accessible, structured owner-private lesson preview, without innerHTML.
// No student publication, cloud writes, or marking-key fetches are introduced here.
function renderLessonPreview(d,meta){
 const root=$('lessonPreview'); root.replaceChildren();
 const tp=d.teacherPlan||{};
 root.append(el('h3',`${d.title||'Untitled lesson'}`));
 root.append(el('p',`${d.lessonId} · Year ${yearValue(d)} · ${displayUnit(d)} · ${d.durationMinutes||'?'} minutes · ${meta.revisionId}`,'px-subtle'));
 function section(title){const block=el('div','','px-section');block.append(el('h4',title));root.append(block);return block;}
 function list(parent,items){const values=Array.isArray(items)?items.filter(Boolean):(items?[String(items)]:[]);if(!values.length){parent.append(el('p','Not specified in this draft.','px-subtle'));return;}const ul=el('ul');for(const value of values)ul.append(el('li',value));parent.append(ul);}
 function paragraph(parent,value){parent.append(el('p',value||'Not specified in this draft.'));}
 const objectives=section('Learning objectives');list(objectives,tp.learningObjectives||d.learningObjectives||d.objectives);
 const criteria=section('Success criteria');list(criteria,tp.successCriteria);
 const align=section('Planned Teachers’ Standards alignment');paragraph(align,(d.standardsAlignment||[]).map(s=>s.standardId).join(', ')||'No proposed alignment.');
 const plan=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Show complete lesson plan and teaching sequence';plan.append(summary);
 function detail(title,value){plan.append(el('h4',title));if(Array.isArray(value))list(plan,value);else paragraph(plan,value);}
 detail('Subject explanation',tp.subjectExplanation);
 detail('Prior knowledge',tp.priorKnowledge);
 detail('Vocabulary',tp.vocabulary);
 detail('Misconceptions',tp.misconceptions);
 detail('Differentiation',typeof tp.differentiation==='object'?JSON.stringify(tp.differentiation,null,2):tp.differentiation);
 const acts=Array.isArray(d.activities)?d.activities:[];
 plan.append(el('h4','45-minute teaching sequence'));
 if(acts.length){for(const a of acts){const stage=el('div','','px-stage');stage.append(el('strong',`${a.sequence||''}. ${a.stageId||a.phase||'Stage'} · ${a.minutes||0} min`));stage.append(el('p',`Teacher: ${a.teacherActions||'Not specified'}`));stage.append(el('p',`Student: ${a.studentActions||'Not specified'}`));plan.append(stage)}}else paragraph(plan,'No stages found in this record.');
 detail('Homework',tp.homework);
 root.append(plan);
}

$('selectLesson').onclick=loadLesson;$('load').onclick=async()=>{if(!confirmDiscard())return;await discoverLessons()};
onAuthStateChanged(auth,async()=>{setState();if(owner){await discoverLessons();$('history').textContent='Select a lesson to see its observation history.'}else{resetLesson();resetPicker();$('history').textContent='Sign in to view saved drafts.';if($('observationViewer').open)$('observationViewer').close()}},e=>$('authStatus').textContent='Authentication error: '+e.message);
$('login').onclick=async()=>{try{await signInWithPopup(auth,provider)}catch(e){$('authStatus').textContent=e.message}};
$('logout').onclick=async()=>{try{await signOut(auth)}catch(e){$('authStatus').textContent=e.message}};
function renderStandards(){const root=$('standards');root.replaceChildren();for(const s of lesson.standardsAlignment){const card=el('article','', 'standard');card.append(el('h3',s.standardId+' · '+(s.plannedOpportunity?'Planned opportunity':'Not evidenced in plan')),el('span',s.status,'chip'),el('p',s.rationale));if(s.stageIds?.length)card.append(el('p','Lesson stages: '+s.stageIds.join(', '),'small'));if(s.evidenceToCollect?.length)card.append(el('p','Possible evidence to collect: '+s.evidenceToCollect.join('; '),'small'));root.append(card)}}
// Guided training prompts: selected indicators require explicit human confirmation.
const FOCUS_LIBRARY=[
 {id:'afl',name:'Assessment for learning',standards:['TS6'],evidence:['Teacher checks understanding during activities','Questions reveal misconceptions','Feedback informs subsequent teaching','Exit ticket measures progress against objectives']},
 {id:'explain',name:'Explanations and modelling',standards:['TS3','TS4'],evidence:['Teacher models a worked example','Explanations use accurate subject terminology','Teacher checks understanding after modelling']},
 {id:'adapt',name:'Adaptive teaching',standards:['TS5'],evidence:['Scaffolds are available when needed','Tasks provide appropriate challenge','Teacher adapts support in response to learner needs']},
 {id:'engage',name:'Participation and engagement',standards:['TS1','TS2'],evidence:['Pupils participate in purposeful activities','Pupils can explain what they are learning','Teacher maintains ambitious expectations']},
 {id:'behaviour',name:'Behaviour and routines',standards:['TS7'],evidence:['Classroom routines are clearly established','Transitions between tasks are managed','Teacher responds consistently to disruption']},
 {id:'progress',name:'Curriculum progression',standards:['TS2','TS3','TS4'],evidence:['Activities build on prior knowledge','Tasks progress from guided to independent work','Teacher identifies the next learning steps']}
];
const SUGGESTIONS={
 strengths:['Clear explanations supported pupil understanding','Checks for understanding identified misconceptions','Adaptations supported access to learning','Pupils demonstrated progress during the lesson'],
 priorities:['Develop more targeted questioning to diagnose misconceptions','Strengthen the link between exit-ticket findings and next steps','Refine scaffolding for learners requiring additional support','Increase opportunities for independent application'],
 reflection:['I noticed that pupils responded most effectively when…','The evidence suggests that my next teaching adjustment should be…','I would change the following aspect of the lesson because…'],
 actions:['Trial a revised questioning strategy in the next lesson','Review exit-ticket responses and plan a targeted starter','Prepare alternative scaffolds and evaluate their impact','Agree a follow-up observation focus and review date']
};
const checkedValues=selector=>[...document.querySelectorAll(selector+':checked')].map(n=>n.value);
function guideCheckbox(name,value,label){const wrap=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name=name;input.value=value;wrap.append(input,document.createTextNode(' '+label));return wrap;}
function buildGuidance(){const root=$('focusChoices');root.replaceChildren();for(const f of FOCUS_LIBRARY){const c=guideCheckbox('guideFocus',f.id,`${f.name} · ${f.standards.join(', ')}`);c.querySelector('input').addEventListener('change',()=>{renderEvidence();syncFactualEvidence();updateStandardsAlignment()});root.append(c)}for(const [field,choices] of Object.entries(SUGGESTIONS)){const group=el('div','','guide-topic');group.append(el('h4',({strengths:'Possible strengths',priorities:'Possible development priorities',reflection:'Reflection sentence starters',actions:'Suggested follow-up actions'})[field]));const options=el('div','','guide-choices');choices.forEach(v=>options.append(guideCheckbox('guide_'+field,v,v)));group.append(options);$('guidedSuggestions').append(group)}renderEvidence();}
function renderEvidence(){const root=$('evidenceChoices');const previous=new Set(checkedValues('input[name="guideEvidence"]'));root.replaceChildren();const ids=checkedValues('input[name="guideFocus"]');if(!ids.length){root.append(el('p','Select one or more focus areas to display evidence checkboxes.','guide-empty'));return;}for(const f of FOCUS_LIBRARY.filter(x=>ids.includes(x.id))){const group=el('div','','guide-topic');group.append(el('h4',`${f.name} · ${f.standards.join(', ')}`));const opts=el('div','','guide-choices');for(const evidence of f.evidence){const input=guideCheckbox('guideEvidence',f.id+'::'+evidence,evidence);input.querySelector('input').checked=previous.has(f.id+'::'+evidence);input.querySelector('input').addEventListener('change',()=>{syncFactualEvidence();updateStandardsAlignment()});opts.append(input)}group.append(opts);root.append(group)}}
// Standards are recommendations based on explicitly checked evidence, never automatic attainment.
function recommendedStandards(){
 const ids=new Set(checkedValues('input[name="guideEvidence"]').map(v=>v.split('::')[0]));
 return [...new Set(FOCUS_LIBRARY.filter(f=>ids.has(f.id)).flatMap(f=>f.standards))].sort();
}
function alignmentState(d){
 const ids=d?new Set((d.observationGuidance?.observedIndicators||[]).map(v=>v.split('::')[0])):null;
 const expected=d?[...new Set(FOCUS_LIBRARY.filter(f=>ids.has(f.id)).flatMap(f=>f.standards))].sort():recommendedStandards();
 const chosen=d?.evidenceStandards||checkedValues('input[name="evidenceStandards"]');
 return {expected,chosen,missing:expected.filter(x=>!chosen.includes(x)),extra:chosen.filter(x=>!expected.includes(x))};
}
function updateStandardsAlignment(){
 const s=alignmentState();const note=$('standardAlignmentNotice');
 const focusNames=FOCUS_LIBRARY.filter(f=>checkedValues('input[name="guideFocus"]').includes(f.id)).map(f=>f.name);
 const lines=[];
 if(focusNames.length)lines.push('Selected focus: '+focusNames.join('; '));
 lines.push('Suggested from confirmed evidence: '+(s.expected.join(', ')||'None yet'));
 lines.push('Currently linked: '+(s.chosen.join(', ')||'None'));
 if(s.missing.length)lines.push('Review missing evidence-linked standards: '+s.missing.join(', '));
 if(s.extra.length)lines.push('Additional selected standards need separate evidence: '+s.extra.join(', '));
 if(!s.expected.length)lines.push('Selecting a focus alone does not establish observed evidence.');
 note.textContent=lines.join('\n');note.classList.toggle('warning',!!(s.missing.length||s.extra.length));note.classList.toggle('good',!!s.expected.length&&!s.missing.length&&!s.extra.length);
 updateReadiness();
}
$('alignStandards').onclick=()=>{
 const expected=new Set(recommendedStandards());
 document.querySelectorAll('input[name="evidenceStandards"]').forEach(n=>n.checked=expected.has(n.value));
 updateStandardsAlignment();
};
document.querySelectorAll('input[name="evidenceStandards"]').forEach(n=>n.addEventListener('change',updateStandardsAlignment));
$('alignmentReason').addEventListener('input',updateReadiness);
function reportIssues(d){
 const issues=[];const s=alignmentState(d);
 if(!d.observationGuidance?.focusIds?.length&&!d.focus)issues.push('Choose an observation focus or describe one.');
 if(s.missing.length)issues.push('Review standards supported by observed evidence: '+s.missing.join(', ')+'.');
 if(s.extra.length&&!d.alignmentReason)issues.push('Explain additional linked standards ('+s.extra.join(', ')+') or deselect them.');
 for(const k of ['strengths','priorities','reflection','actions']){
  const v=d[k]||'';
  if(/\[[^\]\n]+\]/.test(v))issues.push('Complete or remove bracketed prompts in '+NARRATIVE_LABELS[k]+'.');
 }
 return issues;
}
function updateReadiness(){
 const el=$('reportReadiness');if(!el)return;
 const issues=reportIssues(draft());
 el.textContent=issues.length?'REPORT CHECK — '+issues.length+' item(s) need review before final export:\n• '+issues.join('\n• '):'Report check passed: no incomplete prompts or standards mismatches detected. Confirm the wording is accurate before sharing.';
 el.classList.toggle('warning',issues.length>0);el.classList.toggle('good',issues.length===0);
}
function reportApproved(d){
 const issues=reportIssues(d);
 if(!issues.length)return true;
 alert('Please address these items before producing a final PDF:\n\n• '+issues.join('\n• '));
 $('observationPreviewPanel').hidden=false;renderObservationPreview();
 return false;
}
// Only checked, explicitly confirmed indicators populate the factual evidence field.
// A separate manual section is preserved when selections change.
const AUTO_START='[Confirmed observation checklist]';
const AUTO_END='[/Confirmed observation checklist]';
function syncFactualEvidence(){
 const field=$('facts');
 const old=field.value;
 const start=old.indexOf(AUTO_START),end=old.indexOf(AUTO_END);
 let manual=old;
 if(start>=0&&end>start){manual=(old.slice(0,start)+old.slice(end+AUTO_END.length)).trim();}
 const checked=checkedValues('input[name="guideEvidence"]');
 const entries=checked.map(v=>{const [id,...rest]=v.split('::');const f=FOCUS_LIBRARY.find(x=>x.id===id);return '• '+(f?.name||id)+': '+rest.join('::')});
 const generated=entries.length?AUTO_START+'\n'+entries.join('\n')+'\n'+AUTO_END:'';
 field.value=[generated,manual].filter(Boolean).join('\n\n');
 $('evidenceAutoStatus').textContent=entries.length?`${entries.length} confirmed indicator(s) inserted below. Add specific examples and context; you can edit the text.`:'No indicators confirmed. Add your own factual observations below.';
}
// Guided editable narrative drafting. Generated sections are delimited so that
// changing a checkbox never deletes manually entered text outside those sections.
const NARRATIVE_LABELS={strengths:'Strengths',priorities:'Development priorities',reflection:'Teacher reflection',actions:'Follow-up actions'};
const NARRATIVE_START=k=>'[Project X suggested '+k+']';
const NARRATIVE_END=k=>'[/Project X suggested '+k+']';
const narrativeTemplate=(k,s)=>{
 if(k==='strengths')return 'A strength observed was '+s.charAt(0).toLowerCase()+s.slice(1).replace(/\.$/,'')+'. Specific example: [describe what was seen or heard].';
 if(k==='priorities')return 'A possible development priority is to '+s.charAt(0).toLowerCase()+s.slice(1).replace(/\.$/,'')+'. Rationale/evidence: [explain what needs improvement and why].';
 if(k==='reflection')return s.replace('…','[complete in the teacher’s own words]');
 return 'Proposed follow-up: '+s.replace(/\.$/,'')+'. Owner: [name/role]. By: [date]. Success measure: [observable impact].';
};
function syncNarrative(k){
 const area=$(k),start=NARRATIVE_START(k),end=NARRATIVE_END(k),old=area.value;
 const a=old.indexOf(start),b=old.indexOf(end);
 const manual=(a>=0&&b>a?(old.slice(0,a)+old.slice(b+end.length)):old).trim();
 const choices=checkedValues('input[name="guide_'+k+'"]');
 const auto=choices.length?start+'\n'+choices.map(x=>'• '+narrativeTemplate(k,x)).join('\n\n')+'\n'+end:'';
 area.value=[auto,manual].filter(Boolean).join('\n\n');
}
function syncAllNarratives(){for(const k of Object.keys(NARRATIVE_LABELS))syncNarrative(k);$('narrativeStatus').textContent='Editable suggested wording updated. Complete the bracketed prompts and review the preview before saving.';renderObservationPreview();}
function renderObservationPreview(){const root=$('observationPreviewContent');root.replaceChildren();for(const [k,title] of Object.entries({facts:'Factual evidence',...NARRATIVE_LABELS})){const article=el('article');article.append(el('h4',title));const content=el('p',$(k).value.trim()||'Not yet provided');article.append(content);root.append(article)}const d=draft();const focuses=(d.observationGuidance.focusIds||[]).map(id=>FOCUS_LIBRARY.find(f=>f.id===id)?.name||id);root.prepend(el('p','Observation focus: '+([ ...focuses, d.focus ].filter(Boolean).join('; ')||'Not recorded')));const a=alignmentState(d);root.append(el('p','Linked standards: '+(a.chosen.join(', ')||'None')+' · Evidence suggests: '+(a.expected.join(', ')||'None')));const warn=/\[[^\]\n]+\]/.test([d.strengths,d.priorities,d.reflection,d.actions].join(' '));if(warn){root.prepend(el('p','Incomplete bracketed prompts remain. Replace or delete them before finalising.','incomplete'))}updateReadiness()}
$('previewObservation').onclick=()=>{$('observationPreviewPanel').hidden=false;renderObservationPreview();$('observationPreviewPanel').scrollIntoView({behavior:'smooth',block:'start'});};
$('closeObservationPreview').onclick=()=>$('observationPreviewPanel').hidden=true;
$('refreshNarratives').onclick=syncAllNarratives;
for(const k of ['facts',...Object.keys(NARRATIVE_LABELS)])$(k).addEventListener('input',()=>{if(!$('observationPreviewPanel').hidden)renderObservationPreview();else updateReadiness()});
for(const k of Object.keys(NARRATIVE_LABELS))document.querySelectorAll('input[name="guide_'+k+'"]').forEach(n=>n.addEventListener('change',()=>{syncNarrative(k);$('narrativeStatus').textContent='Suggestion updated for '+NARRATIVE_LABELS[k]+'. Personalise the generated text.';if(!$('observationPreviewPanel').hidden)renderObservationPreview();else updateReadiness()}));
buildGuidance();
const fields=['session','type','date','focus','facts','strengths','priorities','reflection','actions','reviewDate'];
function draft(){const d={schemaVersion:1,lessonId:lesson?.lessonId||'',lessonRevisionId:lesson?.revisionId||'',lessonTitle:lesson?.title||'',curriculumSource:lesson?.lessonId?.startsWith('PX25-Y11-')?'year11-canonical-pilot':'legacy-v2',curriculumReleaseId:lesson?.revisionId||'',yearGroup:lesson?yearValue(lesson):'',unitTitle:lesson?displayUnit(lesson):'',status:'draft_unverified',source:'owner_observation_form',verificationStatus:'self_reported'};for(const k of fields)d[k]=$(k).value.trim();d.evidenceStandards=[...document.querySelectorAll('input[name="evidenceStandards"]:checked')].map(e=>e.value);d.evidenceStandard=d.evidenceStandards[0]||'';d.alignmentReason=$('alignmentReason').value.trim();d.observationGuidance={focusIds:checkedValues('input[name="guideFocus"]'),observedIndicators:checkedValues('input[name="guideEvidence"]'),otherEvidence:$('evidenceOther').value.trim(),selectedSuggestions:Object.fromEntries(Object.keys(SUGGESTIONS).map(k=>[k,checkedValues('input[name="guide_'+k+'"]')]))};return d}
updateStandardsAlignment();
function validate(d){if(!owner||!lesson)throw Error('Owner must load the v2 lesson first.');if(!/^[A-Za-z0-9_-]{4,100}$/.test(d.session))throw Error('Enter a session reference (4–100 letters, digits, _ or -).');if(!d.date)throw Error('Enter a lesson date.');if(!d.facts&&!d.reflection)throw Error('Provide factual evidence or a teacher reflection.');if(!Array.isArray(d.evidenceStandards)||d.evidenceStandards.some(s=>!/^TS[1-8]$/.test(s))||new Set(d.evidenceStandards).size!==d.evidenceStandards.length)throw Error('Invalid Teachers’ Standards selection.');}
function download(d,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export').onclick=()=>{if(!lesson){alert('Select a lesson first.');return;}download(draft(),'projectx-observation-draft-'+(lesson?.lessonId||'unselected')+'.json');};
function clearObservationForm(){for(const k of fields)$(k).value='';$('type').value='self_reflection';document.querySelectorAll('input[name="evidenceStandards"],input[name="guideFocus"],input[name="guideEvidence"],input[name^="guide_"]').forEach(e=>e.checked=false);$('evidenceOther').value='';$('alignmentReason').value='';renderEvidence();syncFactualEvidence();updateStandardsAlignment();$('observationPreviewPanel').hidden=true;$('narrativeStatus').textContent='Select a suggested statement to build an editable draft.';$('saveStatus').textContent='Form cleared.';formDirty=false;}
$('clear').onclick=clearObservationForm;
$('save').onclick=async()=>{try{const d=draft();validate(d);$('save').disabled=true;const id=d.lessonId+'__'+d.session;const ref=doc(db,'ownerObservationDrafts',id);const prior=await getDoc(ref);if(prior.exists()&&!confirm('A draft exists for this lesson/session. Replace that draft?'))return;await setDoc(ref,{...d,ownerUid:OWNER,updatedAt:serverTimestamp(),...(prior.exists()?{}:{createdAt:serverTimestamp()})});$('saveStatus').textContent='Saved private observation draft: '+id+(reportIssues(d).length?' (report needs review before PDF export)':'');formDirty=false;await refresh()}catch(e){$('saveStatus').textContent='Save failed: '+e.message}finally{setState()}};
let viewedObservation=null;
function linkedStandards(d){const v=Array.isArray(d.evidenceStandards)?d.evidenceStandards:[];const all=v.length?v:(d.evidenceStandard?[d.evidenceStandard]:[]);return [...new Set(all.filter(x=>/^TS[1-8]$/.test(x)))];}
const historyLabels={session:'Teaching session',type:'Observation type',date:'Lesson date',focus:'Observation focus',facts:'Factual evidence',strengths:'Strengths',priorities:'Development priorities',reflection:'Teacher reflection',actions:'Follow-up actions',evidenceStandards:'Linked Teachers’ Standards',reviewDate:'Review date',observationGuidance:'Guided observation selections'};
function formatGuidance(g){if(!g)return 'Not recorded';const focuses=(g.focusIds||[]).map(id=>FOCUS_LIBRARY.find(f=>f.id===id)?.name||id);const indicators=(g.observedIndicators||[]).map(x=>x.split('::').slice(1).join('::'));const suggestions=Object.entries(g.selectedSuggestions||{}).flatMap(([k,vs])=>(vs||[]).map(v=>k+': '+v));return ['Focus areas: '+(focuses.join('; ')||'None'),'Confirmed observed indicators: '+(indicators.join('; ')||'None'),'Other evidence: '+(g.otherEvidence||'None'),'Selected guidance prompts: '+(suggestions.join('; ')||'None')].join('\n');}
function viewObservation(d){
 if(!owner)return;
 viewedObservation=d;
 const content=$('viewerContent');content.replaceChildren();
 for(const [key,label] of Object.entries(historyLabels)){
  const item=el('div','','readonly-field');item.append(el('strong',label),el('div',key==='evidenceStandards'?(linkedStandards(d).join(', ')||'Not assigned'):cleanedReportValue(key,d)));content.append(item);
 }
 $('viewerTitle').textContent='Saved observation — '+(d.session||d.id||'Draft');
 $('observationViewer').showModal();
}
$('viewerClose').onclick=()=>$('observationViewer').close();
$('viewerPrint').onclick=()=>{if(viewedObservation&&owner)printReport(viewedObservation)};
$('observationViewer').addEventListener('close',()=>{viewedObservation=null;$('viewerContent').replaceChildren()});
async function refresh(){if(!owner||!lesson){$('history').textContent='Select a lesson to see its observation history.';return;}try{const results=await getDocs(collection(db,'ownerObservationDrafts'));const items=results.docs.map(s=>({id:s.id,...s.data()})).filter(d=>lesson&&d.lessonId===lesson.lessonId).sort((a,b)=>safe(b.date).localeCompare(safe(a.date))||safe(a.session).localeCompare(safe(b.session)));const root=$('history');root.replaceChildren();if(!items.length){root.textContent='No observation drafts yet.';return}for(const d of items){const card=el('div','','standard');const link=el('a',`${d.date||'Undated'} — ${d.session||d.id}`,'history-link');link.href='#observationViewer';link.onclick=e=>{e.preventDefault();viewObservation(d)};card.append(link,el('p',`${(d.type||'Unknown').replace(/_/g,' ')} · ${d.verificationStatus||'unverified'} · Read-only record`,'small'));const actions=el('div','','history-actions');const pdfBtn=el('button','Print / Save PDF','secondary');pdfBtn.onclick=()=>printReport(d);actions.append(pdfBtn);card.append(actions);root.append(card)}}catch(e){$('history').textContent='History unavailable: '+e.message}}
$('refresh').onclick=refresh;

// A4 print-ready report. Browser's Print dialog provides "Save as PDF" without sending data to an external PDF service.
function escapeHtml(value){return safe(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cleanedReportValue(key,d){
 if(key==='focus'){
  const names=(d.observationGuidance?.focusIds||[]).map(id=>FOCUS_LIBRARY.find(f=>f.id===id)?.name||id);
  return [...names,d.focus].filter(Boolean).join('; ')||'Not recorded';
 }
 if(key==='evidenceStandards')return linkedStandards(d).join(', ')||'Not assigned';
 if(key==='observationGuidance')return formatGuidance(d.observationGuidance);
 let value=safe(d[key]||'Not recorded');
 // Internal drafting delimiters are never part of the professional report.
 value=value.replace(/^\[(?:\/)?(?:Project X suggested [^\]]+|Confirmed observation checklist)\]\s*$/gm,'').trim();
 return value;
}
function reportHtml(d){
 const labels={session:'Teaching session',type:'Observation type',date:'Lesson date',focus:'Observation focus',facts:'Factual evidence',strengths:'Strengths',priorities:'Development priorities',reflection:'Teacher reflection',actions:'Follow-up actions',evidenceStandards:'Linked Teachers’ Standards',reviewDate:'Review date',observationGuidance:'Guided observation selections'};
 const section=(key)=>`<section><h2>${escapeHtml(labels[key])}</h2><div class="content">${escapeHtml(key==='evidenceStandards'?(linkedStandards(d).join(', ')||'Not assigned'):cleanedReportValue(key,d)).replace(/\n/g,'<br>')}</div></section>`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Project X Observation — ${escapeHtml(d.session||'Draft')}</title><style>
 @page{size:A4;margin:17mm 16mm 18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1d304a;background:#fff;margin:0;font-size:11pt;line-height:1.48}
 .top{border-bottom:3px solid #225aa1;padding-bottom:13px;margin-bottom:20px}.brand{color:#225aa1;font-size:10pt;letter-spacing:.15em;font-weight:700;text-transform:uppercase}h1{font-size:21pt;margin:6px 0 4px}.subtitle{color:#596b80;font-size:10pt}.status{border:1px solid #dfb65b;background:#fff8e6;padding:9px 12px;border-radius:5px;font-size:9pt;margin:15px 0}
 .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-bottom:18px}.meta div{border-bottom:1px solid #dfe5ee;padding:6px 0}.meta strong{display:block;color:#596b80;text-transform:uppercase;font-size:8pt;letter-spacing:.04em}section{break-inside:avoid;page-break-inside:avoid;margin:15px 0}h2{font-size:11pt;color:#225aa1;border-bottom:1px solid #dfe5ee;margin:0 0 6px;padding-bottom:4px}.content{white-space:normal;overflow-wrap:anywhere;min-height:20px}.footer{border-top:1px solid #dfe5ee;margin-top:26px;padding-top:10px;font-size:9pt;color:#64748b}
 .actions{padding:15px;background:#edf4ff;margin-bottom:20px;border-radius:8px}.actions button{padding:10px 16px;background:#225aa1;color:white;border:0;border-radius:5px;cursor:pointer}
 @media print{.actions{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
 </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button> &nbsp; Choose “Save as PDF” in your browser's print dialog.</div>
 <div class="top"><div class="brand">Project X · Professional Development</div><h1>Lesson Observation & Reflection</h1><div class="subtitle">${escapeHtml(d.lessonId||'Unspecified lesson')} · ${escapeHtml(d.lessonTitle||'Lesson observation')}</div></div>
 <div class="status"><strong>UNVERIFIED DRAFT</strong> — Self-reported observation record. This report does not certify Teachers’ Standards attainment or constitute an independently verified observation.</div>
 <div class="meta"><div><strong>Session reference</strong>${escapeHtml(d.session||'Not recorded')}</div><div><strong>Lesson date</strong>${escapeHtml(d.date||'Not recorded')}</div><div><strong>Observation type</strong>${escapeHtml((d.type||'').replace(/_/g,' '))}</div><div><strong>Standards linked</strong>${escapeHtml(linkedStandards(d).join(', ')||'Not assigned')}</div><div><strong>Review date</strong>${escapeHtml(d.reviewDate||'Not scheduled')}</div><div><strong>Record status</strong>Draft · Unverified</div></div>
 ${['focus','facts','strengths','priorities','reflection','actions'].map(section).join('')}<h2>Guided observation checklist</h2><section>${escapeHtml(formatGuidance(d.observationGuidance)).replace(/\n/g,'<br>')}</section>
 <div class="footer">Project X · Confidential professional-development draft · Prepared for teacher review · No pupil personal information should be included.</div></body></html>`;
}
function printReport(d){
 if(!reportApproved(d))return;
 const w=window.open('','_blank');if(!w){$('saveStatus').textContent='Popup blocked. Allow popups for Project X to print the report.';return}
 w.document.open();w.document.write(reportHtml(d));w.document.close();w.focus();
}
$('printPdf').onclick=()=>printReport(draft());


// Warn before changing lesson when a teacher has started recording an observation.
document.querySelectorAll('#session,#type,#date,#focus,#facts,#strengths,#priorities,#reflection,#actions,#reviewDate,#evidenceOther,#alignmentReason,input[name="evidenceStandards"],input[name="guideFocus"],input[name="guideEvidence"],input[name^="guide_"]').forEach(node=>{node.addEventListener('input',()=>{if(lesson)formDirty=true});node.addEventListener('change',()=>{if(lesson)formDirty=true})});
window.addEventListener('beforeunload',e=>{if(formDirty){e.preventDefault();e.returnValue='';}});
