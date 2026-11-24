import assert from 'node:assert/strict';
import {handler} from '../netlify/functions/api.mjs';
const roles=['garson','mutfak','gorevli','kasa','admin'];
for(const r of roles) process.env['BL_'+r.toUpperCase()+'_KEY']='test-only-'+r+'-123456789';
process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='mock-key';
let calls=[], orders=[], menu=[{id:1,name:'Mantı',category:'Ana yemek',price:null,active:true}];let counter=0;const id=()=>`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`;
globalThis.fetch=async (url,opts)=>{const u=new URL(url),p=u.searchParams,t=u.pathname.split('/').at(-1),arr=t==='bl_calls'?calls:t==='bl_orders'?orders:menu;
const matches=row=>[...p].every(([k,v])=>{if(['order','select','limit'].includes(k))return true;if(v.startsWith('eq.'))return String(row[k])===v.slice(3);if(v.startsWith('neq.'))return String(row[k])!==v.slice(4);if(v.startsWith('in.('))return v.slice(4,-1).split(',').includes(String(row[k]));return true;});
let rows=arr.filter(matches);if(opts.method==='POST'){const b=JSON.parse(opts.body);if(t==='bl_calls'&&arr.some(x=>x.table_no===b.table_no&&x.kind===b.kind&&x.status!=='done'))return Response.json({code:'23505'},{status:409});const row={id:t==='bl_menu'?++counter:id(),status:t==='bl_calls'?'waiting':'pending',...b};arr.push(row);rows=[row];}if(opts.method==='PATCH'){rows.forEach(x=>Object.assign(x,JSON.parse(opts.body)));}return Response.json(rows);};
async function req(action,role,body,query){const r=await handler({path:'/api/'+action,httpMethod:body===undefined?'GET':'POST',headers:role?{authorization:'Bearer '+process.env['BL_'+role.toUpperCase()+'_KEY']}:{},body:body===undefined?undefined:JSON.stringify(body),queryStringParameters:query});return [r.statusCode,JSON.parse(r.body)];}
assert.equal((await req('state'))[0],401);assert.equal((await req('menu'))[1].length,1);
assert.equal((await req('call',null,{table_no:21,kind:'garson'}))[0],400);
const [status,a]=await req('call',null,{table_no:1,kind:'garson'});assert.equal(status,201);assert.equal((await req('call',null,{table_no:1,kind:'garson'}))[0],409);
const [,b]=await req('call',null,{table_no:1,kind:'gorevli'});
for(const r of roles){const [,s]=await req('state',r);assert.equal(s.calls.length,['kasa','admin'].includes(r)?2:1);if(r==='garson')assert.equal(s.calls[0].kind,'garson');if(['mutfak','gorevli'].includes(r))assert.equal(s.calls[0].kind,'gorevli');}
assert.equal((await req('callupdate','mutfak',{id:b.id,status:'attending'}))[0],403);
assert.equal((await req('callupdate','garson',{id:a.id,status:'attending'}))[0],200);assert.equal((await req('callstatus',null,undefined,{id:a.id}))[1].status,'attending');
assert.equal((await req('callupdate','garson',{id:a.id,status:'done'}))[0],200);
assert.equal((await req('order','kasa',{table_no:1,items:[{id:1,qty:2}]}))[0],403);
const [os,o]=await req('order','garson',{table_no:1,items:[{id:1,qty:2}]});assert.equal(os,201);assert.equal(o.items[0].qty,2);
assert.equal((await req('state','mutfak'))[1].orders.length,1);assert.equal((await req('orderstatus','garson',{id:o.id,status:'ready'}))[0],403);
assert.equal((await req('orderstatus','mutfak',{id:o.id,status:'ready'}))[0],200);assert.equal((await req('state','mutfak'))[1].orders.length,0);assert.equal((await req('state','kasa'))[1].orders[0].status,'ready');
assert.equal((await req('orderstatus','kasa',{id:o.id,status:'delivered'}))[0],200);
assert.equal((await req('menuupdate','garson',{name:'X',category:'Y'}))[0],403);assert.equal((await req('menuupdate','admin',{name:'Çay',category:'İçecek',price:''}))[0],201);
console.log('API mock tests: passed');
