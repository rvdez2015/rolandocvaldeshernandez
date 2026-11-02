/* Owner-only manual ingestion of previously received tuition enquiries.
   The Firebase rules must restrict writes to this collection to the owner. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const config={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(config,'px-tuition-approval'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);let busy=false;
const owner=()=>auth.currentUser?.uid===OWNER;
function controls(){$('save').disabled=!owner()||busy;$('signIn').disabled=!!auth.currentUser||busy;$('signOut').disabled=!auth.currentUser||busy}
$('signIn').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$('identity').textContent=e.message}};
$('signOut').onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{$('identity').textContent=owner()?'Verified owner':u?'Wrong Firebase account':'Owner authentication required';controls()});
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
 }catch(err){$('status').textContent='Save not confirmed: '+err.message+'. Do not retry until Firestore rules and existing records are checked.'}
 finally{busy=false;controls()}
};