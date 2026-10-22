(() => {
  'use strict';
  const ROOT='/rolandocvaldeshernandez/projectx/';
  const DBKEY='projectx.curriculum.database.v1_1alpha.milestone2.teaching_intelligence';
  const CLIENTKEY='projectx.classroom.oauthClientId.v1';
  const MAPKEY='projectx.classroom.published.v1';
  const SCOPES=['https://www.googleapis.com/auth/classroom.courses.readonly','https://www.googleapis.com/auth/classroom.topics','https://www.googleapis.com/auth/classroom.courseworkmaterials','https://www.googleapis.com/auth/classroom.coursework.students'].join(' ');
  let token=null,tokenClient=null,db=null,links=JSON.parse(localStorage.getItem(MAPKEY)||'{}');
  const el=id=>document.getElementById(id);
  const say=msg=>el('status').textContent=msg;
  const lines=v=>Array.isArray(v)?v.filter(Boolean).map(x=>typeof x==='string'?x:JSON.stringify(x)):typeof v==='string'?v.split('\n').filter(Boolean):[];
  const clean=v=>String(v??'').slice(0,4000);
  function options(node,arr,placeholder){node.replaceChildren(new Option(placeholder,''));arr.forEach(([name,id])=>node.add(new Option(name,id)));}
  async function load(){
    try{const stored=localStorage.getItem(DBKEY);if(stored){const parsed=JSON.parse(stored);if(Array.isArray(parsed.lessons))db=parsed;}}
    catch(e){say('Error al leer el currículo local: '+e.message)}
    if(!db){const response=await fetch(ROOT+'data/curriculum/database-curriculum.json');if(!response.ok)throw Error('No se puede leer el currículo');db=await response.json();}
    const years=[...new Set(db.lessons.map(x=>x.yearGroup).filter(Boolean))].sort((a,b)=>(parseInt(a.match(/\d+/)?.[0]||0)-parseInt(b.match(/\d+/)?.[0]||0)));
    options(el('year'),years.map(x=>[x,x]),'Todos');refreshLessons();
  }
  function refreshLessons(){const year=el('year').value;const ls=db.lessons.filter(x=>!year||x.yearGroup===year);options(el('lesson'),ls.map(x=>[`${x.yearGroup||''} · ${x.title}`,x.id]),'Selecciona una lección');preview();}
  function selected(){return db?.lessons.find(x=>String(x.id)===el('lesson').value);}
  function unit(l){return db.units?.find(x=>x.id===l.unitId)||{};}
  function preview(){const l=selected();el('preview').textContent=l?`${unit(l).title||'Unidad sin título'} · ${lines(l.objectives).length} objetivos · ${lines(l.successCriteria).length} criterios de éxito`:'';updateButtons();}
  function updateButtons(){const yes=!!(token&&el('course').value&&selected()&&el('ack').checked);['topic','material','assignment'].forEach(x=>el(x).disabled=!yes);}
  async function api(path,method='GET',body=null){
    if(!token)throw Error('Debes conectar tu cuenta de Google.');
    const r=await fetch('https://classroom.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const text=await r.text();let result={};try{result=text?JSON.parse(text):{}}catch{throw Error('Respuesta inesperada de Classroom: '+text.slice(0,300))}
    if(!r.ok)throw Error(`${r.status}: ${result.error?.message||text}`);return result;
  }
  async function courses(){let next='',all=[];do{const r=await api('courses?teacherId=me&pageSize=100'+(next?'&pageToken='+encodeURIComponent(next):''));all.push(...(r.courses||[]));next=r.nextPageToken||'';}while(next);options(el('course'),all.map(c=>[c.name+(c.courseState?' ['+c.courseState+']':''),c.id]),'Selecciona una clase');say(`Conectado. ${all.length} clases encontradas. Selecciona Project X Integration Test.`);}
  function linkKey(){return el('course').value+'::'+selected().id;}
  function persist(){localStorage.setItem(MAPKEY,JSON.stringify(links));}
  async function ensureTopic(){const l=selected(),c=el('course').value,u=unit(l),title=clean(u.title||u.unitTitle||'Unidad de '+l.yearGroup);if(!c||!l)throw Error('Selecciona clase y lección');
    let next='',found=null;do{const r=await api(`courses/${encodeURIComponent(c)}/topics?pageSize=100`+(next?'&pageToken='+encodeURIComponent(next):''));found=(r.topic||[]).find(t=>t.name===title);if(found)break;next=r.nextPageToken||'';}while(next);
    if(!found)found=await api(`courses/${encodeURIComponent(c)}/topics`,'POST',{name:title});
    const key=linkKey();links[key]={...(links[key]||{}),topicId:found.topicId};persist();return found;
  }
  function description(l){const blocks=[['Objetivos de aprendizaje',l.objectives],['Criterios de éxito',l.successCriteria],['Actividad',l.studentInstructions||l.notes||'Lee los objetivos y completa las actividades indicadas por el docente.']];return blocks.map(([name,v])=>name+'\n'+lines(v).map(x=>'• '+x).join('\n')).join('\n\n').slice(0,30000);}
  async function publish(kind){const l=selected(),c=el('course').value;if(!l||!c||!el('ack').checked)throw Error('Confirma la clase, la lección y la revisión.');const t=await ensureTopic(),key=linkKey(),record=links[key]||{};
    const title=clean(l.title),desc=description(l),isMaterial=kind==='material';const field=isMaterial?'materialId':'assignmentId';let id=record[field];
    const path=`courses/${encodeURIComponent(c)}/${isMaterial?'courseWorkMaterials':'courseWork'}`;
    const body=isMaterial?{title,description:desc,topicId:t.topicId,state:'DRAFT'}:{title,description:desc,topicId:t.topicId,state:'DRAFT',workType:'ASSIGNMENT'};
    let result;
    if(id){try{result=await api(`${path}/${encodeURIComponent(id)}?updateMask=title,description,topicId`,'PATCH',{title,description:desc,topicId:t.topicId});}
      catch(e){if(!String(e.message).startsWith('404:'))throw e;id=null;}}
    if(!id)result=await api(path,'POST',body);
    links[key]={...record,topicId:t.topicId,[field]:result.id,lastPublished:new Date().toISOString()};persist();
    say(`${isMaterial?'Material':'Tarea'} ${id?'actualizado':'creado'} en borrador.\nCurso: ${c}\nLección: ${title}\nID de Classroom: ${result.id}\nNo se ha publicado a los alumnos.`);
  }
  async function run(fn){try{say('Procesando...');await fn();}catch(e){console.error(e);say('Error: '+e.message)}}
  el('clientId').value=localStorage.getItem(CLIENTKEY)||'';
  el('connect').onclick=()=>run(async()=>{const id=el('clientId').value.trim();if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('Introduce un ID de cliente OAuth válido; nunca el secreto.');if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services todavía no está cargado. Vuelve a intentarlo.');localStorage.setItem(CLIENTKEY,id);
    tokenClient=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPES,callback:response=>{if(response.error){say('OAuth: '+response.error);return;}token=response.access_token;run(courses);}});tokenClient.requestAccessToken({prompt:'consent'});
  });
  el('disconnect').onclick=()=>{if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});token=null;options(el('course'),[],'Conecta primero tu cuenta');say('Desconectado.');updateButtons();};
  el('year').onchange=refreshLessons;el('lesson').onchange=preview;el('course').onchange=updateButtons;el('ack').onchange=updateButtons;
  el('topic').onclick=()=>run(async()=>{const t=await ensureTopic();say('Tema listo: '+t.name+' · ID '+t.topicId);});
  el('material').onclick=()=>run(()=>publish('material'));el('assignment').onclick=()=>run(()=>publish('assignment'));
  run(load);
})();