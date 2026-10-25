/* Project X optional non-destructive navigation enhancement.
   Does not change existing timetable, curriculum or Firebase data. */
(() => {
 'use strict';
 if(document.getElementById('px2026-connected-modules'))return;
 const root=document.querySelector('main')||document.body;
 const nav=document.createElement('nav');nav.id='px2026-connected-modules';nav.setAttribute('aria-label','Project X connected modules');
 Object.assign(nav.style,{display:'flex',flexWrap:'wrap',gap:'12px',padding:'12px 15px',margin:'8px 0 22px',border:'1px solid #8f68b5',borderRadius:'10px',background:'rgba(86,48,118,.12)'});
 const links=[
  ['Year 11 private curriculum','/rolandocvaldeshernandez/projectx/apps/curriculum/pilot-library/'],
  ['Year 11 observation','/rolandocvaldeshernandez/projectx/apps/curriculum/standards-observation-y11.html'],
  ['Google Classroom publisher','/rolandocvaldeshernandez/projectx/apps/classroom/y11-publisher/']
 ];
 for(const [label,href] of links){const a=document.createElement('a');a.textContent=label;a.href=href;a.style.color='#b78bdd';a.style.fontWeight='650';nav.append(a)}
 root.prepend(nav);
})();
