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
window.editProduct=id=>{const p=products.find(x=>x.id===id);if(!p)return;const f=$('#productForm');f.elements.id.value=p.id||'';f.elements.name.value=p.name||'';f.elements.price.value=p.price??'';f.elements.bundleQty.value=p.bundleQty??2;f.elements.bundlePrice.value=p.bundlePrice??'';f.elements.badge.value=p.badge||'';f.elements.description.value=p.description||'';f.elements.images.value=(p.images||[p.image]).filter(Boolean).join('\n');showPreviews((p.images||[p.image]).filter(Boolean));window.scrollTo({top:0,behavior:'smooth'})};
window.del=async id=>{if(!confirm('هل تريد حذف المنتج نهائيًا؟'))return;try{await api('/api/admin/products/'+encodeURIComponent(id),{method:'DELETE'});alert('تم حذف المنتج بنجاح.');await refresh()}catch(e){alert(e.message)}};
$('#productForm').onsubmit=async e=>{e.preventDefault();const f=e.target;const fd=new FormData(f);try{await api('/api/admin/products',{method:'POST',body:fd});alert('تم حفظ المنتج بنجاح.');f.reset();f.elements.bundleQty.value='2';await refresh()}catch(e){alert(e.message)}};
$('#pass').addEventListener('change',refresh);

const imageInput=$('#imageFiles');
const uploadBtn=$('#uploadBtn');
const imagePreview=$('#imagePreview');
const uploadStatus=$('#uploadStatus');
function showPreviews(urls){
  imagePreview.innerHTML=urls.map(u=>`<div style="position:relative"><img src="${escapeAttr(u)}" style="width:78px;height:78px;object-fit:cover;border-radius:10px;border:1px solid #eee"><button type="button" data-remove="${escapeAttr(u)}" style="position:absolute;top:-6px;left:-6px;border:0;border-radius:50%;width:22px;height:22px;cursor:pointer">×</button></div>`).join('');
  imagePreview.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
    const ta=$('#productForm').elements.images;
    ta.value=ta.value.split(/\r?\n/).filter(x=>x.trim()!==b.dataset.remove).join('\n');
    showPreviews(ta.value.split(/\r?\n/).filter(Boolean));
  });
}
imageInput.addEventListener('change',()=>{
  const files=[...imageInput.files];
  if(!files.length){uploadStatus.textContent='';return;}
  const bad=files.find(f=>!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type));
  if(bad){alert('الملف '+bad.name+' ليس صورة مدعومة.');imageInput.value='';return;}
  const big=files.find(f=>f.size>2*1024*1024);
  if(big){alert('الصورة '+big.name+' أكبر من 2 ميجابايت.');imageInput.value='';return;}
  uploadStatus.textContent=`تم اختيار ${files.length} صورة. اضغط «رفع الصور للموقع».`;
  imagePreview.innerHTML='';
  files.forEach(f=>{const u=URL.createObjectURL(f);const img=document.createElement('img');img.src=u;img.style='width:78px;height:78px;object-fit:cover;border-radius:10px;border:1px solid #eee';imagePreview.appendChild(img);});
});

uploadBtn.addEventListener('click',async()=>{
  const files=[...imageInput.files];
  if(!files.length){alert('اختار الصور من زر «اختيار الصور من الجهاز» أولًا.');return;}
  const total=files.reduce((n,f)=>n+f.size,0);
  if(total>4*1024*1024){alert('إجمالي الصور لازم يكون 4 ميجابايت أو أقل في الرفعة الواحدة.');return;}
  uploadBtn.disabled=true; imageInput.disabled=true; uploadStatus.textContent='جاري رفع الصور...';
  const fd=new FormData(); files.forEach(f=>fd.append('images',f,f.name));
  try{
    const data=await api('/api/admin/upload-images',{method:'POST',body:fd});
    if(!data.urls||!data.urls.length) throw new Error('لم يرجع السيرفر روابط للصور.');
    const ta=$('#productForm').elements.images;
    const old=ta.value.trim();
    ta.value=[old,...data.urls].filter(Boolean).join('\n');
    showPreviews(ta.value.split(/\r?\n/).filter(Boolean));
    uploadStatus.textContent=`✅ تم رفع ${data.urls.length} صورة بنجاح.`;
    imageInput.value='';
  }catch(err){uploadStatus.textContent='❌ فشل رفع الصور.';alert('لم يتم رفع الصور: '+err.message)}
  finally{uploadBtn.disabled=false;imageInput.disabled=false;}
});
