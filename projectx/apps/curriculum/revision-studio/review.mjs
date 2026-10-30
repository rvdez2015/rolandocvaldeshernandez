/* Project X · Curriculum Review Studio.
   Source is immutable. Optional review_draft writes only to the segregated owner-only proposals collection,
   subject to deployed Firestore rules. Never touches catalogueLessons, student projections, question bank or Classroom. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {FIELDS,SOURCE_RELEASE,ID_PATTERN,displayField,collectChanges,makeRevision,linesDiff,stableLessonSnapshot} from './review-core.mjs';
import {LESSON_23_ID,LESSON_23_FIELDS,LESSON_23_WARNING} from './lesson23-suggestion.mjs';
import {buildApprovedLesson} from './approval-core.mjs';
const config={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER_UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(config,'px-curriculum-review-v1');const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);let rows=[],source=null,baseHash='',proposed={},head=null,latest=null,validation=null,busy=false;
const isOwner=()=>auth.currentUser?.uid===OWNER_UID;
const status=(id,content,mode='')=>{const e=$(id);e.textContent=content;e.className='status '+mode};
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function requireOwner(){if(!isOwner())throw Error('Owner authentication required. No private data is available.');}
function control(){const owner=isOwner(),selected=!!source;
 if($('approve'))$('approve').disabled=!owner||busy||!latest||!source;
 $('signIn').disabled=!!auth.currentUser||busy;$('signOut').disabled=!auth.currentUser||busy;$('reload').disabled=!owner||busy;
 $('lesson').disabled=!owner||busy;$('load').disabled=!owner||!$('lesson').value||busy;
 for(const id of ['copyAll','sample23','compare','validate','download','history','useLatest','save'])$(id).disabled=busy||!selected||(id==='download'&&!validation)||(id==='save'&&(!validation||!$('confirmSave').checked))||(id==='useLatest'&&!latest);
}
function wait(b){busy=b;control()}
function edited(){const values={};for(const f of FIELDS)values[f.id]=$('field-'+f.id).value;return values}
function unchanged(){validation=null;$('download').disabled=true;$('save').disabled=true;$('confirmSave').checked=false;status('validationStatus','Proposal changed. Validate again before saving.');control()}
function render(){if(!source)return;const host=$('sections');host.replaceChildren();for(const f of FIELDS){
 const div=node('section','field'),top=node('div','fieldHead');top.append(node('h3',null,f.label));const copy=node('button','subtle','Copy source');copy.type='button';copy.onclick=()=>{$('field-'+f.id).value=displayField(source,f);unchanged();showDiff(f.id)};
 const compare=node('button','subtle','Compare section');compare.type='button';compare.onclick=()=>showDiff(f.id);
 const actions=node('div','toolbar');actions.append(copy,compare);top.append(actions);div.append(top);
 const cols=node('div','two'),orig=node('div'),next=node('div');orig.append(node('label',null,'Current approved source (read-only)'));orig.append(node('pre','source',displayField(source,f)));
 next.append(node('label',null,'Proposed revision (editable)'));const area=node('textarea','proposal');area.id='field-'+f.id;area.value=proposed[f.id]??displayField(source,f);area.rows=f.id==='activities'?16:f.id==='explanation'?12:5;area.spellcheck=false;area.addEventListener('input',unchanged);next.append(area);cols.append(orig,next);div.append(cols);host.append(div);
 }control()}
function showDiff(fieldId){const f=FIELDS.find(x=>x.id===fieldId)||FIELDS[0],a=displayField(source,f),b=$('field-'+f.id).value;const host=$('diff');host.replaceChildren(node('h3',null,`Change comparison · ${f.label}`));let added=0,removed=0;const pre=node('pre');for(const line of linesDiff(a,b)){const span=node('span',line.kind,(line.kind==='minus'?'- ':line.kind==='plus'?'+ ':'  ')+line.text+'\n');pre.append(span);if(line.kind==='minus')removed++;if(line.kind==='plus')added++;}
 host.append(pre);status('compareStatus',`Compared ${f.label}: ${added} added and ${removed} removed line(s). No database changes.`,added||removed?'':'ok');}
function compareAll(){try{const ch=collectChanges(source,edited());const keys=Object.keys(ch);status('compareStatus',keys.length?`Changed sections (${keys.length}): ${keys.map(k=>FIELDS.find(f=>f.id===k).label).join(', ')}`:'No differences from the authoritative source.');showDiff(keys[0]||'title')}catch(e){status('compareStatus',e.message,'error')}}
async function sha(text){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('')}
async function loadIndex(){requireOwner();wait(true);try{const snaps=await getDocs(collection(db,'curriculumPilotIndex'));rows=snaps.docs.map(s=>s.data()).filter(r=>r.revisionId===SOURCE_RELEASE&&r.visibility==='owner_private'&&ID_PATTERN.test(r.lessonId)).sort((a,b)=>a.lessonId.localeCompare(b.lessonId));if(rows.length!==94)throw Error(`Expected 94 owner-private lessons; loaded ${rows.length}. Stop and verify release.`);updateList();status('authStatus',`Authenticated Project X owner. ${rows.length} pilot lessons available (source read-only).`,'ok');const query=new URLSearchParams(location.search).get('lesson');if(query&&rows.some(x=>x.lessonId===query)){$('lesson').value=query;await loadLesson()}else{$('lesson').value=LESSON_23_ID}}
 catch(e){status('authStatus',e.message,'error')}finally{wait(false)}}
function updateList(){const term=$('search').value.toLowerCase().trim(),sel=$('lesson').value;const matches=rows.filter(x=>!term||[x.title,x.lessonId].some(z=>String(z||'').toLowerCase().includes(term)));$('lesson').replaceChildren(new Option(`Select a lesson (${matches.length} matching)`,'') ,...matches.map(r=>new Option(`${r.lessonId} · ${r.title||'Untitled'}`,r.lessonId)));if(matches.some(r=>r.lessonId===sel))$('lesson').value=sel;control()}
async function loadLesson(){requireOwner();const id=$('lesson').value;if(!ID_PATTERN.test(id))throw Error('Select a valid lesson.');wait(true);try{const snap=await getDoc(doc(db,'catalogueLessons',id,'revisions',SOURCE_RELEASE));if(!snap.exists())throw Error('Authoritative private lesson not found');const s=snap.data();if(s.lessonId!==id||s.revisionId!==SOURCE_RELEASE||s.visibility!=='owner_private'||s.schoolId!=='project-x-personal')throw Error('Source lesson failed identity or privacy verification');source=s;proposed=Object.fromEntries(FIELDS.map(f=>[f.id,displayField(s,f)]));baseHash=await sha(stableLessonSnapshot(s));validation=null;head=null;latest=null;
 $('editorSection').hidden=false;$('saveSection').hidden=false;$('sample23').hidden=id!==LESSON_23_ID;$('confirmSave').checked=false;
 $('metadata').textContent=`${s.lessonId} · ${s.title} · ${s.unitId} · source ${SOURCE_RELEASE} · SHA-256 ${baseHash.slice(0,12)}…`;render();status('sourceStatus','Owner-private source loaded and protected. You may edit the right-hand fields.','ok');$('historyList').replaceChildren();status('validationStatus','No proposal validated.');status('saveStatus','No changes saved.');await refreshHistory(false);
 }catch(e){source=null;$('editorSection').hidden=true;$('saveSection').hidden=true;status('sourceStatus',e.message,'error')}finally{wait(false)}}
async function refreshHistory(report=true){if(!source)return;const ref=doc(db,'ownerCurriculumReviewDrafts',source.lessonId);try{const snap=await getDoc(ref);head=snap.exists()?snap.data():null;latest=null;const host=$('historyList');host.replaceChildren();if(head?.latestVersionId){const p=await getDoc(doc(db,'ownerCurriculumReviewDrafts',source.lessonId,'versions',head.latestVersionId));if(!p.exists())throw Error('Review head points to a missing version.');latest=p.data();const row=node('article');row.append(node('strong',null,`Saved review proposal #${head.versionNumber} · ${latest.revisionId}`));row.append(node('p',null,`${latest.changeReason||''} · ${latest.status||''} · source ${latest.sourceReleaseId||''}`));host.append(row);}
 else host.textContent='No owner-private review proposals found for this lesson.';
 if(report)status('saveStatus','Review history refreshed. Source lesson and Classroom unchanged.','ok');control();
 }catch(e){head=null;latest=null;status('saveStatus',`Review history unavailable: ${e.message}. Saving requires owner-only Firestore review rules.`, 'error');control()}}
async function prepare(){requireOwner();if(!source)throw Error('Load a lesson first.');const changes=collectChanges(source,edited());const revId=crypto.randomUUID();const pack=makeRevision({lesson:source,changes,reason:$('reason').value,uid:auth.currentUser.uid,email:auth.currentUser.email||'',sourceFingerprint:baseHash,revisionId:revId,parentRevisionId:head?.latestVersionId||null});validation=pack;status('validationStatus',`Validated ${pack.changedFields.length} changed sections: ${pack.changedFields.join(', ')}. No canonical questions or student materials are modified.`, 'ok');control();return pack;}
function downloadJSON(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function save(){requireOwner();if(!validation||!$('confirmSave').checked)throw Error('Validate and explicitly approve saving the review draft.');if(!source)throw Error('Source missing');wait(true);
 try{const id=source.lessonId, pack=validation;const canonical=doc(db,'catalogueLessons',id,'revisions',SOURCE_RELEASE),headRef=doc(db,'ownerCurriculumReviewDrafts',id),versionRef=doc(db,'ownerCurriculumReviewDrafts',id,'versions',pack.revisionId);const expectedHead=head?.latestVersionId||null;
 await runTransaction(db,async tx=>{
  const [src,currentHead,oldVersion]=await Promise.all([tx.get(canonical),tx.get(headRef),tx.get(versionRef)]);
  if(!src.exists()||await sha(stableLessonSnapshot(src.data()))!==baseHash)throw Error('The authoritative lesson changed since you loaded it. Reload before saving.');
  if(oldVersion.exists())throw Error('This revision ID already exists; no overwrite permitted.');
  const current=currentHead.exists()?currentHead.data():null;
  if((current?.latestVersionId||null)!==expectedHead)throw Error('Another proposal was saved since your last preview. Refresh history before saving.');
  const rebuilt=makeRevision({lesson:source,changes:collectChanges(source,edited()),reason:$('reason').value,uid:auth.currentUser.uid,email:auth.currentUser.email||'',sourceFingerprint:baseHash,revisionId:pack.revisionId,parentRevisionId:expectedHead});
  if(JSON.stringify(rebuilt)!==JSON.stringify(pack))throw Error('Proposal changed after validation. Validate it again.');
  const versionNumber=(Number(current?.versionNumber)||0)+1;
  tx.set(versionRef,{...pack,versionNumber,createdAt:serverTimestamp()});
  tx.set(headRef,{lessonId:id,schoolId:'project-x-personal',latestVersionId:pack.revisionId,versionNumber,sourceReleaseId:SOURCE_RELEASE,createdByUid:auth.currentUser.uid,studentPublished:false,updatedAt:serverTimestamp()});
 });
 const saved=await getDoc(versionRef);if(!saved.exists()||saved.data().revisionId!==pack.revisionId)throw Error('Commit result uncertain; inspect saved proposals before retrying.');
 status('saveStatus',`Saved owner-private REVIEW DRAFT version ${saved.data().versionNumber}. The canonical lesson, question bank, student projection and Classroom are unchanged.`, 'ok');$('confirmSave').checked=false;validation=null;await refreshHistory(false);
 }catch(e){status('saveStatus',`Save blocked: ${e.message}. No canonical lesson has been modified. If PERMISSION_DENIED, review and deploy the provided rules addition before retrying.`, 'error')}finally{wait(false)}}

/* Explicit owner-only promotion: immutable approved revision + approved pointer
   in one Firestore transaction. The source release and student projection are untouched.
   Deployed Firestore security rules MUST protect BOTH new write destinations. */
async function approveLatest(){
 requireOwner();
 if(!source||!latest||!head||head.latestVersionId!==latest.revisionId)
   throw Error('Load the current saved proposal before approval.');
 const id=source.lessonId, approvedId='approved-'+latest.revisionId;
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(approvedId))throw Error('Unsafe revision identifier.');
 if(!confirm('Approve the latest saved proposal as an OWNER-PRIVATE version? This will NOT update Classroom or publish student resources.'))return;
 wait(true);
 try{
  const sourceRef=doc(db,'catalogueLessons',id,'revisions',SOURCE_RELEASE);
  const proposalHeadRef=doc(db,'ownerCurriculumReviewDrafts',id);
  const proposalRef=doc(db,'ownerCurriculumReviewDrafts',id,'versions',latest.revisionId);
  const approvedRef=doc(db,'ownerApprovedCurriculumLessons',id,'versions',approvedId);
  const approvedHeadRef=doc(db,'ownerApprovedCurriculumLessons',id);
  const expectedProposalId=latest.revisionId;
  const expectedApprovedHead=(await getDoc(approvedHeadRef)).data()?.latestApprovedRevisionId||null;
  const verifiedHash=baseHash;
  await runTransaction(db,async tx=>{
   const [sourceSnap,proposalHeadSnap,proposalSnap,approvedSnap,approvedHeadSnap]=await Promise.all([
    tx.get(sourceRef),tx.get(proposalHeadRef),tx.get(proposalRef),tx.get(approvedRef),tx.get(approvedHeadRef)
   ]);
   if(!sourceSnap.exists()||await sha(stableLessonSnapshot(sourceSnap.data()))!==verifiedHash)
    throw Error('Source changed; reload before approval.');
   if(!proposalHeadSnap.exists()||proposalHeadSnap.data().latestVersionId!==expectedProposalId)
    throw Error('Proposal head changed; reload before approval.');
   if(!proposalSnap.exists()||proposalSnap.data().revisionId!==expectedProposalId)
    throw Error('Saved proposal changed; reload before approval.');
   if(approvedSnap.exists())throw Error('Already approved; inspect history instead of duplicating.');
   const currentApproved=approvedHeadSnap.exists()?approvedHeadSnap.data():null;
   if((currentApproved?.latestApprovedRevisionId||null)!==expectedApprovedHead)
    throw Error('Another approval was committed; reload.');
   const savedProposal=proposalSnap.data();
   if(savedProposal.sourceFingerprint!==verifiedHash||savedProposal.createdByUid!==auth.currentUser.uid)
    throw Error('Proposal owner or source fingerprint mismatch.');
   const projected=buildApprovedLesson(sourceSnap.data(),savedProposal,{
    approvalId:approvedId,approvedByUid:auth.currentUser.uid,
    approvedAt:new Date().toISOString()
   });
   tx.set(approvedRef,{...projected,approvalStatus:'approved',approvedProposalId:expectedProposalId});
   tx.set(approvedHeadRef,{lessonId:id,schoolId:'project-x-personal',
    latestApprovedRevisionId:approvedId,previousApprovedRevisionId:expectedApprovedHead,
    approvedByUid:auth.currentUser.uid,updatedAt:serverTimestamp(),
    classroomSyncStatus:'pending_student_projection'});
  });
  const verified=await getDoc(approvedRef);
  if(!verified.exists()||verified.data().approvedProposalId!==expectedProposalId)
   throw Error('Approval result uncertain. Inspect Firestore before retry.');
  status('approvalStatus','Approved owner-private lesson '+approvedId+' saved and verified. Student projection and Classroom synchronisation are still pending.','ok');
 }catch(e){status('approvalStatus','Approval not confirmed: '+e.message+'. Check deployed owner-only Firestore rules and current approved revision before retrying.','error')}
 finally{wait(false)}
}

$('approve').onclick=()=>approveLatest().catch(e=>status('approvalStatus',e.message,'error'));
$('signIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){status('authStatus',e.message,'error')}};
$('signOut').onclick=()=>signOut(auth).catch(e=>status('authStatus',e.message,'error'));
$('reload').onclick=()=>loadIndex();$('search').oninput=updateList;$('lesson').onchange=()=>control();$('load').onclick=()=>loadLesson().catch(e=>status('sourceStatus',e.message,'error'));
$('copyAll').onclick=()=>{if(!confirm('Reset ALL proposed fields to the current authoritative lesson? Your unsaved edits will be lost.'))return;proposed=Object.fromEntries(FIELDS.map(f=>[f.id,displayField(source,f)]));render();unchanged();status('compareStatus','Proposed copy reset to source; no database changes.');};
$('sample23').onclick=()=>{if(source?.lessonId!==LESSON_23_ID)return;if(!confirm('Replace selected proposed fields with the draft Units and Conversions scope? Source and questions are unchanged.'))return;for(const [k,v] of Object.entries(LESSON_23_FIELDS))$('field-'+k).value=v;
 const acts=JSON.parse($('field-activities').value);const clean=acts.filter(a=>!/(?:\bcharacters?\b|text[ -]?file|bits\s*per\s*character)/i.test(JSON.stringify(a)));
 if(clean.length&&clean.length!==acts.length)$('field-activities').value=JSON.stringify(clean,null,2);
 unchanged();showDiff('objectives');status('compareStatus',`Units-only suggestion applied to the editable copy. ${LESSON_23_WARNING}`);};
$('compare').onclick=compareAll;$('validate').onclick=()=>prepare().catch(e=>{validation=null;status('validationStatus',e.message,'error');control()});
$('download').onclick=()=>{if(!validation)return;downloadJSON({...validation,serverCommitStatus:'NOT_SUBMITTED',createdAt:null},`${source.lessonId}-review-proposal.json`);status('saveStatus','Downloaded review proposal. Firestore was not modified.','ok')};
$('confirmSave').onchange=control;$('reason').oninput=unchanged;$('save').onclick=save;$('history').onclick=()=>refreshHistory();$('useLatest').onclick=()=>{if(!latest)return;if(!confirm('Load the most recent saved proposal into the right-hand editor? Unsaved edits will be replaced.'))return;for(const [k,ch] of Object.entries(latest.changes||{})){const f=FIELDS.find(x=>x.id===k);if(!f)continue;$('field-'+k).value=f.kind==='json'?JSON.stringify(ch.after,null,2):Array.isArray(ch.after)?ch.after.join('\n'):String(ch.after??'')};$('reason').value=latest.changeReason||'';unchanged();status('compareStatus',`Loaded saved review proposal ${latest.revisionId}; no source changes.`)};
onAuthStateChanged(auth,u=>{source=null;rows=[];latest=null;head=null;validation=null;$('editorSection').hidden=true;$('saveSection').hidden=true;if(isOwner())loadIndex();else status('authStatus',u?'Signed in, but not as the authorised Project X owner.':'Sign in as the Project X owner to load private lessons.',u?'error':'');control()});
