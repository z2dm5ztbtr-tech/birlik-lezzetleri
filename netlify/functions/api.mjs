import { timingSafeEqual } from 'node:crypto';
// Garson anahtarla doğrulanır. Diğer roller isteğe bağlı olarak herkese açıktır.
const publicRoles=['mutfak','gorevli','kasa','admin'];
const roleOf = h => {
 const requested=h['x-bl-role']||h['X-BL-Role']||'';
 if(publicRoles.includes(requested)) return requested;
 const token=(h.authorization||h.Authorization||'').replace(/^Bearer /,'');
 const secret=process.env.BL_GARSON_KEY;
 if((!requested||requested==='garson')&&token&&secret&&secret.length>=16&&Buffer.byteLength(token)===Buffer.byteLength(secret)&&timingSafeEqual(Buffer.from(token),Buffer.from(secret))) return 'garson';
 return null;
};
class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
const requireThat=(ok,msg='Geçersiz işlem',status=400)=>{if(!ok)throw new ApiError(status,msg);};
const result=(status,data)=>({statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)});
const tableNo=x=>{const n=Number(x);requireThat(Number.isInteger(n)&&n>=1&&n<=20,'Masa numarası 1–20 olmalı.');return n;};
const uuid=x=>{requireThat(typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x),'Geçersiz kayıt.');return x;};
const str=(x,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
async function db(table,query='',method='GET',body){
 const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 requireThat(base&&key,'Veritabanı ayarları eksik. Yöneticiye başvurun.',503);
 const r=await fetch(base.replace(/\/$/,'')+'/rest/v1/'+table+'?'+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await r.json().catch(()=>null);
 if(!r.ok){if(data?.code==='23505')throw new ApiError(409,'Bu masa için açık çağrı zaten var.');console.error('Database error',r.status,data?.code);throw new ApiError(502,'Veritabanı işlemi başarısız.');}return data;
}
const can=(role,...allowed)=>requireThat(allowed.includes(role),'Bu işlem için yetkiniz yok.',403);
function menuData(b){const name=str(b.name,100),category=str(b.category,60),description=str(b.description,400),photo=str(b.photo,1000);const price=b.price===''||b.price==null?null:Number(b.price);requireThat(name&&category,'Ürün adı ve kategori gerekli.');requireThat(price===null||(Number.isFinite(price)&&price>=0&&price<=99999999),'Geçersiz fiyat.');requireThat(!photo||/^https:\/\//i.test(photo),'Fotoğraf bağlantısı HTTPS olmalı.');return {name,category,description,photo,price,active:b.active!==false};}
export async function handler(event){
 try{
 const action=event.path.split('/').filter(Boolean).at(-1);const method=event.httpMethod;const role=roleOf(event.headers||{});let b={};
 if(method==='POST'){requireThat((event.body||'').length<=25000,'İstek çok büyük.',413);try{b=JSON.parse(event.body||'{}');}catch{throw new ApiError(400,'Geçersiz JSON.');}requireThat(b&&typeof b==='object'&&!Array.isArray(b),'Geçersiz veri.');}
 if(action==='menu'&&method==='GET')return result(200,await db('bl_menu','active=eq.true&order=category.asc,id.asc'));
 if(action==='call'&&method==='POST'){
 const table_no=tableNo(b.table_no);requireThat(['garson','gorevli'].includes(b.kind),'Geçersiz çağrı.');const rows=await db('bl_calls','','POST',{table_no,kind:b.kind});return result(201,{id:rows[0].id,status:rows[0].status});}
 if(action==='callstatus'&&method==='GET'){
 const id=uuid(event.queryStringParameters?.id);const rows=await db('bl_calls','id=eq.'+id+'&select=status');requireThat(rows.length,'Çağrı bulunamadı.',404);return result(200,rows[0]);}
 requireThat(role,'Personel anahtarı gerekli.',401);
 if(action==='login'&&method==='GET')return result(200,{role});
 if(action==='state'&&method==='GET'){
 const cq=role==='garson'?'&kind=eq.garson':['mutfak','gorevli'].includes(role)?'&kind=eq.gorevli':'';
 const oq=role==='mutfak'?'&status=eq.pending':role==='garson'?'&status=neq.delivered':'';
 const [calls,orders,menu]=await Promise.all([
 db('bl_calls','order=created_at.desc&limit=300'+cq+(['kasa','admin'].includes(role)?'':'&status=neq.done')),
 role==='gorevli'?[]:db('bl_orders','order=created_at.desc&limit=300'+oq),
 ['garson','admin'].includes(role)?db('bl_menu','order=category.asc,id.asc'+(role==='garson'?'&active=eq.true':'')):[]]);
 return result(200,{calls,orders,menu});}
 if(action==='order'&&method==='POST'){
 can(role,'garson');const table_no=tableNo(b.table_no);requireThat(Array.isArray(b.items)&&b.items.length>0&&b.items.length<=30,'En az bir ürün seçin.');
 const counts=new Map();for(const item of b.items){const id=Number(item.id),qty=Number(item.qty);requireThat(Number.isSafeInteger(id)&&id>0&&Number.isInteger(qty)&&qty>=1&&qty<=30,'Geçersiz ürün veya adet.');counts.set(id,(counts.get(id)||0)+qty);requireThat(counts.get(id)<=30,'Bir üründen en fazla 30 adet.');}
 const menu=await db('bl_menu','active=eq.true&id=in.('+[...counts.keys()].join(',')+')');requireThat(menu.length===counts.size,'Bir ürün artık satışta değil.');
 const items=menu.map(m=>({id:m.id,name:m.name,price:m.price,qty:counts.get(Number(m.id))}));return result(201,(await db('bl_orders','','POST',{table_no,items,note:str(b.note,400)}))[0]);}
 if(action==='orderstatus'&&method==='POST'){
 const id=uuid(b.id);let previous;if(b.status==='ready'){can(role,'mutfak');previous='pending';}else if(b.status==='delivered'){can(role,'garson','kasa');previous='ready';}else throw new ApiError(400,'Geçersiz durum.');
 const rows=await db('bl_orders','id=eq.'+id+'&status=eq.'+previous,'PATCH',{status:b.status,updated_at:new Date().toISOString()});requireThat(rows.length,'Sipariş durumu değişmiş. Ekranı yenileyin.',409);return result(200,rows[0]);}
 if(action==='callupdate'&&method==='POST'){
 can(role,'garson','gorevli','kasa');const id=uuid(b.id);requireThat(['attending','done'].includes(b.status),'Geçersiz durum.');const previous=b.status==='attending'?'waiting':'attending';const kind=role==='kasa'?'':'&kind=eq.'+role;
 const rows=await db('bl_calls','id=eq.'+id+'&status=eq.'+previous+kind,'PATCH',{status:b.status,updated_at:new Date().toISOString()});requireThat(rows.length,'Çağrı durumu değişmiş veya yetkiniz yok.',409);return result(200,rows[0]);}
 if(action==='menuupdate'&&method==='POST'){
 can(role,'admin');const data=menuData(b);if(b.id==null)return result(201,(await db('bl_menu','','POST',data))[0]);const id=Number(b.id);requireThat(Number.isSafeInteger(id)&&id>0,'Geçersiz ürün.');const rows=await db('bl_menu','id=eq.'+id,'PATCH',data);requireThat(rows.length,'Ürün bulunamadı.',404);return result(200,rows[0]);}
 throw new ApiError(404,'İşlem bulunamadı.');
 }catch(e){if(!(e instanceof ApiError))console.error('Unexpected error',e.message);return result(e.status||500,{error:e.status?e.message:'Sunucu hatası. Tekrar deneyin.'});}
}
