/* Minimal dependency-free ZIP (store method), for user-initiated exports only. */
const utf=new TextEncoder();
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
const u16=(view,o,v)=>view.setUint16(o,v,true),u32=(view,o,v)=>view.setUint32(o,v>>>0,true);
function header(length){const a=new Uint8Array(length);return {a,v:new DataView(a.buffer)}}
export function createStoredZip(entries){
 const local=[],central=[];let offset=0;
 for(const entry of entries){
  const name=String(entry.name).replace(/\\/g,'/');if(!name||name.startsWith('/')||name.includes('..')||name.includes('\0'))throw Error('Invalid ZIP filename');
  const n=utf.encode(name),b=typeof entry.content==='string'?utf.encode(entry.content):entry.content;
  if(!(b instanceof Uint8Array)||b.length>0xffffffff||n.length>65535)throw Error('ZIP entry exceeds capacity');
  const crc=crc32(b);
  const {a:lh,v:l}=header(30);u32(l,0,0x04034b50);u16(l,4,20);u16(l,6,0x0800);u16(l,8,0);u32(l,14,crc);u32(l,18,b.length);u32(l,22,b.length);u16(l,26,n.length);
  local.push(lh,n,b);
  const {a:ch,v:c}=header(46);u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x0800);u16(c,10,0);u32(c,16,crc);u32(c,20,b.length);u32(c,24,b.length);u16(c,28,n.length);u32(c,42,offset);central.push(ch,n);
  offset+=lh.length+n.length+b.length;
 }
 if(entries.length>65535)throw Error('ZIP supports at most 65535 files');
 const centralLen=central.reduce((a,x)=>a+x.length,0);const {a:e,v:d}=header(22);
 u32(d,0,0x06054b50);u16(d,8,entries.length);u16(d,10,entries.length);u32(d,12,centralLen);u32(d,16,offset);
 return new Blob([...local,...central,e],{type:'application/zip'});
}
