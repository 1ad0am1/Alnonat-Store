let products=[];
const $=s=>document.querySelector(s);
const password=()=>$('#pass').value.trim();
async function api(url,options={}){const headers={...(options.headers||{}),'x-admin-password':password()};const r=await fetch(url,{...options,headers});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||'حدث خطأ.');return data;}
async function refresh(){try{products=await api('/api/admin/products');render()}catch(e){$('#adminList').innerHTML=`<p class="muted">${escapeHtml(e.message)}</p>`}}
function render(){
 $('#adminList').innerHTML=products.map(p=>`<div class="cart-row" style="align-items:center;gap:10px"><div style="flex:1"><b>${escapeHtml(p.name)}</b><br><small>${p.price} ج.م — ${(p.images||[p.image]).filter(Boolean).length} صور</small></div><button type="button" onclick="editProduct('${escapeAttr(p.id)}')">تعديل</button><button type="button" onclick="del('${escapeAttr(p.id)}')">حذف</button></div>`).join('')||'<p class="muted">لا توجد منتجات.</p>';
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(v){return String(v??'').replace(/'/g,"\\'")}
window.editProduct=id=>{const p=products.find(x=>x.id===id);if(!p)return;const f=$('#productForm');f.elements.id.value=p.id||'';f.elements.name.value=p.name||'';f.elements.price.value=p.price??'';f.elements.bundleQty.value=p.bundleQty??2;f.elements.bundlePrice.value=p.bundlePrice??'';f.elements.badge.value=p.badge||'';f.elements.description.value=p.description||'';f.elements.images.value=(p.images||[p.image]).filter(Boolean).join('\n');$('#imagePreview').innerHTML=(p.images||[p.image]).filter(Boolean).map(u=>`<img src="${escapeAttr(u)}" style="width:70px;height:70px;object-fit:cover;border-radius:10px">`).join('');window.scrollTo({top:0,behavior:'smooth'})};
window.del=async id=>{if(!confirm('هل تريد حذف المنتج نهائيًا؟'))return;try{await api('/api/admin/products/'+encodeURIComponent(id),{method:'DELETE'});alert('تم حذف المنتج بنجاح.');await refresh()}catch(e){alert(e.message)}};
$('#productForm').onsubmit=async e=>{e.preventDefault();const f=e.target;const fd=new FormData(f);try{await api('/api/admin/products',{method:'POST',body:fd});alert('تم حفظ المنتج بنجاح.');f.reset();f.elements.bundleQty.value='2';await refresh()}catch(e){alert(e.message)}};
$('#pass').addEventListener('change',refresh);

$('#imageFiles').addEventListener('change',async e=>{
  const files=[...e.target.files];
  if(!files.length)return;
  const status=$('#uploadStatus');
  status.textContent='جاري رفع الصور...';
  const fd=new FormData(); files.forEach(f=>fd.append('images',f));
  try{
    const data=await api('/api/admin/upload-images',{method:'POST',body:fd});
    const ta=$('#productForm').elements.images;
    const old=ta.value.trim();
    ta.value=[old,...data.urls].filter(Boolean).join('\\n');
    $('#imagePreview').innerHTML=[...ta.value.split(/\\n+/).filter(Boolean)].map(u=>`<img src="${escapeAttr(u)}" style="width:70px;height:70px;object-fit:cover;border-radius:10px">`).join('');
    status.textContent=`تم رفع ${data.urls.length} صورة بنجاح.`;
    e.target.value='';
  }catch(err){status.textContent='';alert(err.message)}
});
