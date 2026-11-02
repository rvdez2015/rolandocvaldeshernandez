import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './intake-worker.mjs';
const origin='https://rvdez2015.github.io';
const queue=new Map();
const env={TURNSTILE_SECRET:'test-secret',ADMIN_FIREBASE_PROJECT:'project-x-personal',TUITION_PENDING:{
 async put(key,value){queue.set(key,value)},
 async get(key){return JSON.parse(queue.get(key)||'null')},
 async list(){return {keys:[...queue.keys()].map(name=>({name})),list_complete:true}},
 async delete(key){queue.delete(key)}
}};
const req=(path,method='GET',body,headers={})=>new Request('https://worker.example'+path,{method,headers:{origin,...headers,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const submission={name:'Parent Test',email:'parent@example.org',course:'gcse',language:'en',message:'Could we discuss lessons?',consent:true,turnstileToken:'test-token'};
test('reject cross-origin and unconfigured requests',async()=>{
 assert.equal((await worker.fetch(req('/intake','POST',submission,{origin:'https://attacker.example'}),env)).status,403);
 assert.equal((await worker.fetch(req('/intake','POST',submission),{})).status,503);
});
test('reject anonymous queue inspection and deletion',async()=>{
 assert.equal((await worker.fetch(req('/owner/pending'),env)).status,403);
 assert.equal((await worker.fetch(req('/owner/pending/123e4567-e89b-12d3-a456-426614174000','DELETE'),env)).status,403);
});
test('reject malformed, nonconsensual, or oversized submissions before external verification',async()=>{
 for(const change of [{consent:false},{name:''},{course:'admin'},{message:'x'.repeat(2501)},{email:'bad'}]){
  const response=await worker.fetch(req('/intake','POST',{...submission,...change}),env);
  assert.equal(response.status,400);
 }
 assert.equal(queue.size,0);
});
test('verify successful Turnstile check and temporary queue write',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:'rvdez2015.github.io'}),{status:200});
 try{
  const response=await worker.fetch(req('/intake','POST',submission),env);
  assert.equal(response.status,202);
  const payload=await response.json();
  assert.equal(payload.accepted,true);
  assert.ok(queue.has('pending:'+payload.reference));
 }finally{globalThis.fetch=original;queue.clear()}
});
test('reject Turnstile result from other host',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:'attacker.example'}),{status:200});
 try{assert.equal((await worker.fetch(req('/intake','POST',submission),env)).status,403)}
 finally{globalThis.fetch=original}
});
