import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,getDocs,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const cfg={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const $=id=>document.getElementById(id);let lesson=null,owner=false;
const safe=s=>String(s??'');const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=safe(text);if(cls)n.className=cls;return n};
function setState(){owner=auth.currentUser?.uid===OWNER;$('login').disabled=!!auth.currentUser;$('logout').disabled=!auth.currentUser;$('load').disabled=!owner;$('save').disabled=!owner||!lesson;$('refresh').disabled=!owner;$('authStatus').textContent=owner?'Project X owner authenticated.':auth.currentUser?'Non-owner account: access denied.':'Not signed in.'}
onAuthStateChanged(auth,async()=>{setState();if(owner){await loadLesson();await refresh()}else{lesson=null;$('standards').replaceChildren(el('p','Owner sign-in required.'));$('history').textContent='Sign in to view saved drafts.';if($('observationViewer').open)$('observationViewer').close()}},e=>$('authStatus').textContent='Authentication error: '+e.message);
$('login').onclick=async()=>{try{await signInWithPopup(auth,provider)}catch(e){$('authStatus').textContent=e.message}};
$('logout').onclick=async()=>{try{await signOut(auth)}catch(e){$('authStatus').textContent=e.message}};
async function loadLesson(){if(!owner)return;try{const snap=await getDoc(doc(db,'catalogueLessons','1.1d','revisions','v2-pilot'));if(!snap.exists())throw Error('v2-pilot revision not found. Complete migration first.');const d=snap.data();if(d.schemaVersion!==2||d.lessonId!=='1.1d'||!Array.isArray(d.standardsAlignment)||d.standardsAlignment.length!==8)throw Error('Stored revision fails basic v2 alignment checks.');lesson=d;$('lessonStatus').textContent=`Loaded: ${d.title} · Year ${d.yearGroup} · ${d.durationMinutes} minutes · ${d.revisionId}`;renderStandards();setState()}catch(e){lesson=null;$('lessonStatus').textContent='Load failed: '+e.message;setState()}}
$('load').onclick=loadLesson;
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
function buildGuidance(){const root=$('focusChoices');root.replaceChildren();for(const f of FOCUS_LIBRARY){const c=guideCheckbox('guideFocus',f.id,`${f.name} · ${f.standards.join(', ')}`);c.querySelector('input').addEventListener('change',renderEvidence);root.append(c)}for(const [field,choices] of Object.entries(SUGGESTIONS)){const group=el('div','','guide-topic');group.append(el('h4',({strengths:'Possible strengths',priorities:'Possible development priorities',reflection:'Reflection sentence starters',actions:'Suggested follow-up actions'})[field]));const options=el('div','','guide-choices');choices.forEach(v=>options.append(guideCheckbox('guide_'+field,v,v)));group.append(options);$('guidedSuggestions').append(group)}renderEvidence();}
function renderEvidence(){const root=$('evidenceChoices');const previous=new Set(checkedValues('input[name="guideEvidence"]'));root.replaceChildren();const ids=checkedValues('input[name="guideFocus"]');if(!ids.length){root.append(el('p','Select one or more focus areas to display evidence checkboxes.','guide-empty'));return;}for(const f of FOCUS_LIBRARY.filter(x=>ids.includes(x.id))){const group=el('div','','guide-topic');group.append(el('h4',`${f.name} · ${f.standards.join(', ')}`));const opts=el('div','','guide-choices');for(const evidence of f.evidence){const input=guideCheckbox('guideEvidence',f.id+'::'+evidence,evidence);input.querySelector('input').checked=previous.has(f.id+'::'+evidence);input.querySelector('input').addEventListener('change',syncFactualEvidence);opts.append(input)}group.append(opts);root.append(group)}}
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
function renderObservationPreview(){const root=$('observationPreviewContent');root.replaceChildren();for(const [k,title] of Object.entries({facts:'Factual evidence',...NARRATIVE_LABELS})){const article=el('article');article.append(el('h4',title));const content=el('p',$(k).value.trim()||'Not yet provided');article.append(content);root.append(article)}const d=draft();const warn=/\[[^\]\n]+\]/.test([d.strengths,d.priorities,d.reflection,d.actions].join(' '));if(warn){root.prepend(el('p','Incomplete bracketed prompts remain. Replace or delete them before finalising.','incomplete'))}}
$('previewObservation').onclick=()=>{$('observationPreviewPanel').hidden=false;renderObservationPreview();$('observationPreviewPanel').scrollIntoView({behavior:'smooth',block:'start'});};
$('closeObservationPreview').onclick=()=>$('observationPreviewPanel').hidden=true;
$('refreshNarratives').onclick=syncAllNarratives;
for(const k of ['facts',...Object.keys(NARRATIVE_LABELS)])$(k).addEventListener('input',()=>{if(!$('observationPreviewPanel').hidden)renderObservationPreview()});
for(const k of Object.keys(NARRATIVE_LABELS))document.querySelectorAll('input[name="guide_'+k+'"]').forEach(n=>n.addEventListener('change',()=>{syncNarrative(k);$('narrativeStatus').textContent='Suggestion updated for '+NARRATIVE_LABELS[k]+'. Personalise the generated text.';if(!$('observationPreviewPanel').hidden)renderObservationPreview()}));
buildGuidance();
const fields=['session','type','date','focus','facts','strengths','priorities','reflection','actions','reviewDate'];
function draft(){const d={schemaVersion:1,lessonId:'1.1d',lessonRevisionId:'v2-pilot',status:'draft_unverified',source:'owner_observation_form',verificationStatus:'self_reported'};for(const k of fields)d[k]=$(k).value.trim();d.evidenceStandards=[...document.querySelectorAll('input[name="evidenceStandards"]:checked')].map(e=>e.value);d.evidenceStandard=d.evidenceStandards[0]||'';d.observationGuidance={focusIds:checkedValues('input[name="guideFocus"]'),observedIndicators:checkedValues('input[name="guideEvidence"]'),otherEvidence:$('evidenceOther').value.trim(),selectedSuggestions:Object.fromEntries(Object.keys(SUGGESTIONS).map(k=>[k,checkedValues('input[name="guide_'+ + k + +'"]')]))};return d}
function validate(d){if(!owner||!lesson)throw Error('Owner must load the v2 lesson first.');if(!/^[A-Za-z0-9_-]{4,100}$/.test(d.session))throw Error('Enter a session reference (4–100 letters, digits, _ or -).');if(!d.date)throw Error('Enter a lesson date.');if(!d.facts&&!d.reflection)throw Error('Provide factual evidence or a teacher reflection.');if(!Array.isArray(d.evidenceStandards)||d.evidenceStandards.some(s=>!/^TS[1-8]$/.test(s))||new Set(d.evidenceStandards).size!==d.evidenceStandards.length)throw Error('Invalid Teachers’ Standards selection.');}
function download(d,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export').onclick=()=>download(draft(),'projectx-observation-draft-1-1d.json');
$('clear').onclick=()=>{for(const k of fields)$(k).value='';$('type').value='self_reflection';document.querySelectorAll('input[name="evidenceStandards"],input[name="guideFocus"],input[name="guideEvidence"],input[name^="guide_"]').forEach(e=>e.checked=false);$('evidenceOther').value='';renderEvidence();syncFactualEvidence();$('observationPreviewPanel').hidden=true;$('narrativeStatus').textContent='Select a suggested statement to build an editable draft.';$('saveStatus').textContent='Form cleared.'};
$('save').onclick=async()=>{try{const d=draft();validate(d);$('save').disabled=true;const id='1.1d__'+d.session;const ref=doc(db,'ownerObservationDrafts',id);const prior=await getDoc(ref);if(prior.exists()&&!confirm('A draft exists for this lesson/session. Replace that draft?'))return;await setDoc(ref,{...d,ownerUid:OWNER,updatedAt:serverTimestamp(),...(prior.exists()?{}:{createdAt:serverTimestamp()})});$('saveStatus').textContent='Saved private observation draft: '+id;await refresh()}catch(e){$('saveStatus').textContent='Save failed: '+e.message}finally{setState()}};
let viewedObservation=null;
function linkedStandards(d){const v=Array.isArray(d.evidenceStandards)?d.evidenceStandards:[];const all=v.length?v:(d.evidenceStandard?[d.evidenceStandard]:[]);return [...new Set(all.filter(x=>/^TS[1-8]$/.test(x)))];}
const historyLabels={session:'Teaching session',type:'Observation type',date:'Lesson date',focus:'Observation focus',facts:'Factual evidence',strengths:'Strengths',priorities:'Development priorities',reflection:'Teacher reflection',actions:'Follow-up actions',evidenceStandards:'Linked Teachers’ Standards',reviewDate:'Review date',observationGuidance:'Guided observation selections'};
function formatGuidance(g){if(!g)return 'Not recorded';const focuses=(g.focusIds||[]).map(id=>FOCUS_LIBRARY.find(f=>f.id===id)?.name||id);const indicators=(g.observedIndicators||[]).map(x=>x.split('::').slice(1).join('::'));const suggestions=Object.entries(g.selectedSuggestions||{}).flatMap(([k,vs])=>(vs||[]).map(v=>k+': '+v));return ['Focus areas: '+(focuses.join('; ')||'None'),'Confirmed observed indicators: '+(indicators.join('; ')||'None'),'Other evidence: '+(g.otherEvidence||'None'),'Selected guidance prompts: '+(suggestions.join('; ')||'None')].join('\n');}
function viewObservation(d){
 if(!owner)return;
 viewedObservation=d;
 const content=$('viewerContent');content.replaceChildren();
 for(const [key,label] of Object.entries(historyLabels)){
  const item=el('div','','readonly-field');item.append(el('strong',label),el('div',key==='evidenceStandards'?(linkedStandards(d).join(', ')||'Not assigned'):(key==='observationGuidance'?formatGuidance(d.observationGuidance):(d[key]||'Not recorded'))));content.append(item);
 }
 $('viewerTitle').textContent='Saved observation — '+(d.session||d.id||'Draft');
 $('observationViewer').showModal();
}
$('viewerClose').onclick=()=>$('observationViewer').close();
$('viewerPrint').onclick=()=>{if(viewedObservation&&owner)printReport(viewedObservation)};
$('observationViewer').addEventListener('close',()=>{viewedObservation=null;$('viewerContent').replaceChildren()});
async function refresh(){if(!owner)return;try{const results=await getDocs(collection(db,'ownerObservationDrafts'));const items=results.docs.map(s=>({id:s.id,...s.data()})).filter(d=>d.lessonId==='1.1d').sort((a,b)=>safe(b.date).localeCompare(safe(a.date))||safe(a.session).localeCompare(safe(b.session)));const root=$('history');root.replaceChildren();if(!items.length){root.textContent='No observation drafts yet.';return}for(const d of items){const card=el('div','','standard');const link=el('a',`${d.date||'Undated'} — ${d.session||d.id}`,'history-link');link.href='#observationViewer';link.onclick=e=>{e.preventDefault();viewObservation(d)};card.append(link,el('p',`${(d.type||'Unknown').replace(/_/g,' ')} · ${d.verificationStatus||'unverified'} · Read-only record`,'small'));const actions=el('div','','history-actions');const pdfBtn=el('button','Print / Save PDF','secondary');pdfBtn.onclick=()=>printReport(d);actions.append(pdfBtn);card.append(actions);root.append(card)}}catch(e){$('history').textContent='History unavailable: '+e.message}}
$('refresh').onclick=refresh;

// A4 print-ready report. Browser's Print dialog provides "Save as PDF" without sending data to an external PDF service.
function escapeHtml(value){return safe(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function reportHtml(d){
 const labels={session:'Teaching session',type:'Observation type',date:'Lesson date',focus:'Observation focus',facts:'Factual evidence',strengths:'Strengths',priorities:'Development priorities',reflection:'Teacher reflection',actions:'Follow-up actions',evidenceStandards:'Linked Teachers’ Standards',reviewDate:'Review date',observationGuidance:'Guided observation selections'};
 const section=(key)=>`<section><h2>${escapeHtml(labels[key])}</h2><div class="content">${escapeHtml(key==='evidenceStandards'?(linkedStandards(d).join(', ')||'Not assigned'):(key==='observationGuidance'?formatGuidance(d.observationGuidance):(d[key]||'Not recorded'))).replace(/\n/g,'<br>')}</div></section>`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Project X Observation — ${escapeHtml(d.session||'Draft')}</title><style>
 @page{size:A4;margin:17mm 16mm 18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1d304a;background:#fff;margin:0;font-size:11pt;line-height:1.48}
 .top{border-bottom:3px solid #225aa1;padding-bottom:13px;margin-bottom:20px}.brand{color:#225aa1;font-size:10pt;letter-spacing:.15em;font-weight:700;text-transform:uppercase}h1{font-size:21pt;margin:6px 0 4px}.subtitle{color:#596b80;font-size:10pt}.status{border:1px solid #dfb65b;background:#fff8e6;padding:9px 12px;border-radius:5px;font-size:9pt;margin:15px 0}
 .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-bottom:18px}.meta div{border-bottom:1px solid #dfe5ee;padding:6px 0}.meta strong{display:block;color:#596b80;text-transform:uppercase;font-size:8pt;letter-spacing:.04em}section{break-inside:avoid;page-break-inside:avoid;margin:15px 0}h2{font-size:11pt;color:#225aa1;border-bottom:1px solid #dfe5ee;margin:0 0 6px;padding-bottom:4px}.content{white-space:normal;overflow-wrap:anywhere;min-height:20px}.footer{border-top:1px solid #dfe5ee;margin-top:26px;padding-top:10px;font-size:9pt;color:#64748b}
 .actions{padding:15px;background:#edf4ff;margin-bottom:20px;border-radius:8px}.actions button{padding:10px 16px;background:#225aa1;color:white;border:0;border-radius:5px;cursor:pointer}
 @media print{.actions{display:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
 </style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button> &nbsp; Choose “Save as PDF” in your browser's print dialog.</div>
 <div class="top"><div class="brand">Project X · Professional Development</div><h1>Lesson Observation & Reflection</h1><div class="subtitle">Lesson 1.1d · Embedded Systems: Purpose and Characteristics</div></div>
 <div class="status"><strong>UNVERIFIED DRAFT</strong> — Self-reported observation record. This report does not certify Teachers’ Standards attainment or constitute an independently verified observation.</div>
 <div class="meta"><div><strong>Session reference</strong>${escapeHtml(d.session||'Not recorded')}</div><div><strong>Lesson date</strong>${escapeHtml(d.date||'Not recorded')}</div><div><strong>Observation type</strong>${escapeHtml((d.type||'').replace(/_/g,' '))}</div><div><strong>Standards linked</strong>${escapeHtml(linkedStandards(d).join(', ')||'Not assigned')}</div><div><strong>Review date</strong>${escapeHtml(d.reviewDate||'Not scheduled')}</div><div><strong>Record status</strong>Draft · Unverified</div></div>
 ${['focus','facts','strengths','priorities','reflection','actions'].map(section).join('')}<h2>Guided observation checklist</h2><section>${escapeHtml(formatGuidance(d.observationGuidance)).replace(/\n/g,'<br>')}</section>
 <div class="footer">Project X · Confidential professional-development draft · Prepared for teacher review · No pupil personal information should be included.</div></body></html>`;
}
function printReport(d){
 const w=window.open('','_blank');if(!w){$('saveStatus').textContent='Popup blocked. Allow popups for Project X to print the report.';return}
 w.document.open();w.document.write(reportHtml(d));w.document.close();w.focus();
}
$('printPdf').onclick=()=>printReport(draft());

