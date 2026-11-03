// Project X tuition intake — Cloudflare Worker (NOT deployed).
// Bindings: TUITION_PENDING (KV), TURNSTILE_SECRET (secret), ADMIN_FIREBASE_PROJECT (text).
// Public submissions stay in TTL-limited KV, never in approved Firestore.
const allowedOrigins=new Set(['https://rvdez2015.github.io','https://rolando-cs-tuition.github.io']);
const json=(x,status=200,origin)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store',...(allowedOrigins.has(origin)?{'access-control-allow-origin':origin}:{}),'vary':'Origin'}});
const OWNER_UID='UnsKCIgOTBbbVfGYy9ATeuIaRZ53';
const LIMIT=7*24*60*60;
const verificationHostnames=new Set(['rvdez2015.github.io','rolando-cs-tuition.github.io']);
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
async function ownerAuth(req,env){
 const match=/^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.get('authorization')||'');if(!match)return false;
 try{
  const [h,p,s]=match[1].split('.');if(!s)return false;
  const header=JSON.parse(new TextDecoder().decode(bytes(h))),payload=JSON.parse(new TextDecoder().decode(bytes(p)));
  const project=env.ADMIN_FIREBASE_PROJECT;
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||!header.kid||payload.aud!==project||payload.iss!=='https://securetoken.google.com/'+project||payload.sub!==OWNER_UID||payload.user_id&&payload.user_id!==OWNER_UID||payload.exp<=now||payload.iat>now||payload.auth_time>now)return false;
  const jwks=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if(!jwks.ok)return false;
  const jwk=(await jwks.json()).keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(s),new TextEncoder().encode(h+'.'+p));
 }catch{return false}
}
const allowedCourses=['gcse','alevel','python','other'];
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(!allowedOrigins.has(origin))return json({error:'Origin not allowed'},403);
 const reply=(payload,status=200)=>json(payload,status,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, GET, DELETE, OPTIONS','access-control-allow-headers':'content-type, authorization','access-control-max-age':'3600'}});
 if(!env.TUITION_PENDING||!env.TURNSTILE_SECRET||!env.ADMIN_FIREBASE_PROJECT)return reply({error:'Intake not configured'},503);
 if(url.pathname==='/intake'&&request.method==='POST'){
  const length=Number(request.headers.get('content-length')||0);if(length>6000)return reply({error:'Payload too large'},413);
  let x;try{x=await request.json()}catch{return reply({error:'Invalid JSON'},400)}
  if(!x||Array.isArray(x)||typeof x!=='object'||Object.keys(x).some(k=>!['name','email','course','language','message','consent','turnstileToken'].includes(k))
    ||typeof x.name!=='string'||!x.name.trim()||x.name.length>100
    ||typeof x.email!=='string'||x.email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)
    ||!allowedCourses.includes(x.course)||!['en','es'].includes(x.language)
    ||typeof x.message!=='string'||!x.message.trim()||x.message.length>2500
    ||x.consent!==true||typeof x.turnstileToken!=='string')return reply({error:'Invalid form fields'},400);
  const body=new FormData();body.append('secret',env.TURNSTILE_SECRET);body.append('response',x.turnstileToken);
  const verified=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
  if(!verified.ok)return reply({error:'Verification unavailable'},503);
  const result=await verified.json();
  if(!result.success||!verificationHostnames.has(result.hostname)||result.hostname!==new URL(origin).hostname)return reply({error:'Verification failed'},403);
  const id=crypto.randomUUID(),record={id,name:x.name.trim(),email:x.email.trim(),course:x.course,language:x.language,message:x.message.trim(),consent:true,receivedAt:new Date().toISOString(),status:'pending_review'};
  await env.TUITION_PENDING.put('pending:'+id,JSON.stringify(record),{expirationTtl:LIMIT});
  return reply({accepted:true,reference:id},202);
 }
 if(url.pathname==='/owner/pending'&&request.method==='GET'){
  if(!await ownerAuth(request,env))return reply({error:'Forbidden'},403);
  const keys=await env.TUITION_PENDING.list({prefix:'pending:',limit:100});
  const items=(await Promise.all(keys.keys.map(k=>env.TUITION_PENDING.get(k.name,'json')))).filter(Boolean);
  return reply({items,hasMore:!keys.list_complete});
 }
 if(url.pathname.startsWith('/owner/pending/')&&request.method==='DELETE'){
  if(!await ownerAuth(request,env))return reply({error:'Forbidden'},403);
  const id=url.pathname.split('/').pop();if(!/^[a-f0-9-]{36}$/.test(id))return reply({error:'Invalid reference'},400);
  await env.TUITION_PENDING.delete('pending:'+id);
  return reply({deleted:true});
 }
 return reply({error:'Not found'},404);
}};