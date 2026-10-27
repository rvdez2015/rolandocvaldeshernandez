/* Read-only Project X Year 11 audit. Does NOT request Google Classroom scopes,
   write to Firebase, publish materials, call a Gemini API, or transmit reports.
   The generated report is downloaded locally by the authorised owner. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {RELEASE_ID,validateIndex} from './core-v5.mjs';
import {buildEntry,makeExport} from './audit-core.mjs';
const cfg={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const app=initializeApp(cfg,'px-y11-curriculum-readonly-audit'),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
let running=false,report=null;
function owner(){return auth.currentUser?.uid===OWNER}
function update(message,isError=false){$('status').textContent=message;$('status').className='status '+(isError?'error':'');}
function controls(){ $('signin').disabled=!!auth.currentUser||running;$('signout').disabled=!auth.currentUser||running;$('run').disabled=!owner()||running;$('download').disabled=!report||running;}
async function run(){if(!owner()||running)throw Error('Only the authorised Project X owner can audit private lessons.');
  running=true;report=null;controls();$('results').textContent='';
  try{
    update('Reading 94 private Year 11 lesson index records…');
    const snap=await getDocs(collection(db,'curriculumPilotIndex'));
    const index=validateIndex(snap.docs.map(d=>d.data()));
    const entries=[],failures=[];
    // Bounded reads, no Firestore writes or mutations. Continue past individual
    // invalid lessons so the report captures ALL identity/schema problems.
    for(let i=0;i<index.length;i+=6){
      const batch=index.slice(i,i+6);
      const found=await Promise.all(batch.map(async entry=>{
        try{
          const [o,s]=await Promise.all([
            getDoc(doc(db,'catalogueLessons',entry.lessonId,'revisions',RELEASE_ID)),
            getDoc(doc(db,'catalogueStudentLessons',entry.lessonId,'revisions',RELEASE_ID))
          ]);
          if(!o.exists()||!s.exists())throw Error('Revision absent in owner or student catalogue');
          return {entry:buildEntry(entry,o.data(),s.data())};
        }catch(err){return {failure:{lessonId:entry.lessonId,error:String(err.message||err).slice(0,160)}};}
      }));
      for(const x of found){if(x.entry)entries.push(x.entry);else failures.push(x.failure)}
      update(`Checked ${Math.min(i+batch.length,index.length)}/94 lessons… ${failures.length} record(s) require manual inspection.`);
    }
    report=makeExport(entries,failures);
    $('results').textContent=`${report.lessonsRead}/94 complete records | ${report.withFlags} with content-review flags | ${failures.length} unreadable or invalid records.\n`+
     Object.entries(report.flagCounts).map(([k,v])=>`${k}: ${v}`).join('\n')+
     '\n\nThese flags are screening indicators, NOT claims that topics are definitely missing.';
    update('Read-only audit finished. Download the report and review it before any edits.');
  }catch(err){update(`Audit stopped safely: ${String(err.message||err)}`,true)}
  finally{running=false;controls();}
}
$('signin').onclick=async()=>{try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){update(String(e.message||e),true)}};
$('signout').onclick=()=>signOut(auth).catch(e=>update(String(e.message||e),true));
$('run').onclick=run;
$('download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ProjectX_Y11_Live_Curriculum_Readonly_Audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),15000)};
onAuthStateChanged(auth,user=>{report=null;controls();update(user?(owner()?'Owner authenticated. Run read-only audit when ready.':'This account is not authorised for private curriculum records.'):'Sign in with the Project X owner account.');});
