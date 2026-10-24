/** OWNER-ONLY, READ-ONLY back-up helper for currently KNOWN Project X paths.
 * NO Firestore writes: the module imports ONLY read functions.
 * Do not mistake this partial known-path export for a managed full-database backup.
 */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,collection,getDocs,Timestamp,GeoPoint,Bytes,DocumentReference} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const config={apiKey:'AIzaSyBb9NLPonqTiRFGO3kDdUzIgnjGNDmy6MQ',authDomain:'project-x-personal.firebaseapp.com',projectId:'project-x-personal',storageBucket:'project-x-personal.firebasestorage.app',messagingSenderId:'504310230612',appId:'1:504310230612:web:bb636f480af9a6a010c7c1'};
const OWNER_UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const COLLECTIONS=['catalogueLessons','classroomPublications','lessons','ownerObservationDrafts'];
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const e=id=>document.getElementById(id);
let busy=false;
const isOwner=()=>auth.currentUser?.uid===OWNER_UID;
const output=(message)=>{e('log').textContent+=message+'\n';};
function state(){e('backup').disabled=!isOwner()||busy;e('signIn').disabled=!!auth.currentUser||busy;e('signOut').disabled=!auth.currentUser||busy;}
async function startSignIn(){try{await setPersistence(auth,inMemoryPersistence);await signInWithPopup(auth,new GoogleAuthProvider());}catch(err){e('authStatus').textContent='Sign-in error: '+err.message;}}
e('signIn').onclick=startSignIn;
e('signOut').onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{e('authStatus').textContent=!user?'Not signed in.':isOwner()?`Signed in as Project X owner: ${user.email}`:`This account (${user.email}) is not configured as the Project X owner. Export unavailable.`;state();});
function valueToJSON(v){
 if(v===null||typeof v!=='object')return v;
 if(v instanceof Timestamp)return {__firestoreType:'Timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds};
 if(v instanceof GeoPoint)return {__firestoreType:'GeoPoint',latitude:v.latitude,longitude:v.longitude};
 if(v instanceof Bytes)return {__firestoreType:'Bytes',base64:v.toBase64()};
 if(v instanceof DocumentReference)return {__firestoreType:'DocumentReference',path:v.path};
 if(Array.isArray(v))return v.map(valueToJSON);
 const o={};for(const [k,x] of Object.entries(v))o[k]=valueToJSON(x);return o;
}
async function readCollection(path,records,knownDocuments){
 if(!isOwner())throw new Error('Owner session missing.');
 const query=await getDocs(collection(db,path));
 const docs=query.docs.map(d=>({path:d.ref.path,id:d.id,data:valueToJSON(d.data())}));
 records.push(...docs);knownDocuments.push(...docs.map(x=>x.path));
 output(`${path}: ${docs.length} document(s)`);
}
function download(name,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
e('backup').onclick=async()=>{
 if(!isOwner())return;
 busy=true;state();e('log').textContent='';e('backupStatus').textContent='Reading Firestore (read-only)…';
 const records=[],knownDocuments=[],paths=[];
 try{
  // Collect root collection docs; do not assume all parent documents exist.
  for(const name of COLLECTIONS){paths.push(name);await readCollection(name,records,knownDocuments);}
  // Known named subcollections. A parent can be nonexistent and still have revision documents.
  const targets=new Set([...knownDocuments.map(path=>path+'/revisions'),'catalogueLessons/1.1d/revisions']);
  for(const path of [...targets].sort()){paths.push(path);await readCollection(path,records,[]);}
  const countByRoot=Object.fromEntries(COLLECTIONS.map(c=>[c,records.filter(x=>x.path.startsWith(c+'/')).length]));
  const backup={format:'ProjectX-Firestore-known-paths-v1',projectId:'project-x-personal',database:'(default)',exportedAt:new Date().toISOString(),scope:{rootCollections:COLLECTIONS,revisionSubcollection:'revisions',includesKnownOrphanParent:'catalogueLessons/1.1d',limitation:'NOT a guaranteed complete database snapshot. Only known paths and directly nested revisions were queried. Unknown subcollection names are not enumerated.'},counts:{totalDocuments:records.length,byRoot:countByRoot,queriedPaths:paths.length},documents:records};
  const date=new Date().toISOString().replace(/[:.]/g,'-');
  download(`ProjectX_Firestore_KNOWN_PATHS_${date}.json`,backup);
  output(`Exported ${records.length} document(s); JSON download requested.`);
  e('backupStatus').textContent=`Completed read-only export: ${records.length} documents across ${paths.length} queried paths. Verify the file appears in Downloads and store it safely.`;
 }catch(err){output('ERROR: '+err.message);e('backupStatus').textContent='Export incomplete: '+err.message+' (no complete backup downloaded).';}
 finally{busy=false;state();}
};
