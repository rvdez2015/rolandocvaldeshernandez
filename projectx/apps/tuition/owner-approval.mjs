/* Owner-only manual ingestion of previously received tuition enquiries.
   The Firebase rules must restrict writes to this collection to the owner. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const config={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(config,'px-tuition-approval'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);let busy=false,selectedPending=null;
const workerBase=()=>{const url=new URL($('workerUrl').value.trim());if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Enter only the HTTPS Worker origin, with a trailing /');return url.origin};
const ownerHeaders=async()=>({Authorization:'Bearer '+await auth.currentUser.getIdToken()});
function clearQueue(){selectedPending=null;$('pendingList').replaceChildren();$('queueStatus').textContent='Sign in as owner, then load pending enquiries.'}
function choosePending(item){selectedPending=item;$('name').value=item.name;$('email').value=item.email;$('course').value=item.course;$('language').value=item.language;$('message').value=item.message;$('consent').checked=false;$('approve').checked=false;$('status').textContent='Loaded pending enquiry '+item.id+'. Verify consent and deliberately tick both approval checkboxes before saving.';$('approveForm').scrollIntoView({behavior:'smooth',block:'start'})}
$('loadPending').onclick=async()=>{if(!owner())return;try{const root=workerBase(),res=await fetch(root+'/owner/pending',{headers:await ownerHeaders()});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to load');$('pendingList').replaceChildren();for(const item of data.items||[]){if(!item||!item.id)continue;const row=document.createElement('p'),button=document.createElement('button');button.type='button';button.textContent='Review '+item.id;button.onclick=()=>choosePending(item);row.append(button,document.createTextNode(' '+item.course+' · '+item.receivedAt));$('pendingList').append(row)}$('queueStatus').textContent=(data.items||[]).length+' pending (first page).'+(data.hasMore?' More entries require pagination.':'')}catch(e){$('queueStatus').textContent='Queue unavailable: '+e.message}};

const owner=()=>auth.currentUser?.uid===OWNER;
function controls(){$('save').disabled=!owner()||busy;$('signIn').disabled=!!auth.currentUser||busy;$('signOut').disabled=!auth.currentUser||busy}
$('signIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$('identity').textContent=e.message}};
$('signOut').onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{$('identity').textContent=owner()?'Verified owner':u?'Wrong Firebase account':'Owner authentication required';controls();if(!owner())clearQueue()});
$('approveForm').onsubmit=async e=>{
 e.preventDefault();
 if(!owner()||busy||!$('approveForm').reportValidity())return;
 if(!$('consent').checked||!$('approve').checked)return;
 const payload={name:$('name').value.trim(),email:$('email').value.trim(),course:$('course').value,language:$('language').value,message:$('message').value.trim()};
 if(!payload.name||!payload.email||!payload.message)return;
 if(!confirm('Save this explicitly approved enquiry to the owner-only Firebase collection?'))return;
 busy=true;controls();
 try{
  // Unique ID prevents accidental overwrite; retries after uncertainty require checking saved records.
  const id=crypto.randomUUID(),ref=doc(db,'ownerApprovedTuitionEnquiries',id);
  await runTransaction(db,async tx=>{
   const previous=await tx.get(ref);
   if(previous.exists())throw Error('Duplicate identifier');
   tx.set(ref,{...payload,enquiryId:id,approvedByUid:auth.currentUser.uid,approvalStatus:'owner_approved',consentVerified:true,createdAt:serverTimestamp(),source:'owner_manual_email_review'});
  });
  $('status').textContent='Saved approved enquiry '+id+'. Verify the record in Firestore.';
  $('approveForm').reset();
  if(selectedPending){const pending=selectedPending;selectedPending=null;try{const root=workerBase(),response=await fetch(root+'/owner/pending/'+encodeURIComponent(pending.id),{method:'DELETE',headers:await ownerHeaders()});if(!response.ok)throw Error('Queue removal failed');$('status').textContent='Approved record '+id+' verified by successful Firestore write; removed temporary submission '+pending.id+'.'}catch(e){$('status').textContent='Approved record '+id+' saved, but temporary item '+pending.id+' remains. Do not approve it again; remove from queue after checking Firestore. '+e.message}}
 }catch(err){$('status').textContent='Save not confirmed: '+err.message+'. Do not retry until Firestore rules and existing records are checked.'}
 finally{busy=false;controls()}
};