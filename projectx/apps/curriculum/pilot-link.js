/* Additive navigation bridge: does not change legacy ProjectXCurriculum state or methods. */
(()=>{
 const root='/rolandocvaldeshernandez/projectx/apps/curriculum/';
 const insert=()=>{
  const menu=document.getElementById('moduleNavigation');if(!menu||menu.querySelector('[data-px-pilot-link]'))return false;
  const a=document.createElement('a');a.className='module-nav-item';a.dataset.pxPilotLink='true';a.href=root+'pilot-library/';a.textContent='📚 Year 11 Pilot Library ↗';a.title='Owner-private Firestore lesson plans, canonical question bank, teacher marking and revision proposals';a.style.cssText='display:block;text-decoration:none;';
  const after=menu.querySelector('[data-view="lessons"]');if(after)after.insertAdjacentElement('afterend',a);else menu.append(a);
  return true;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insert,{once:true});else insert();
 // Some historic Curriculum Centre releases render the navigation asynchronously.
 let attempts=0;const id=setInterval(()=>{if(insert()||++attempts>=20)clearInterval(id)},400);
})();
