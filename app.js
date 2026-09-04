const WA='201012029678';
let products=[]; let cart=JSON.parse(localStorage.getItem('alnonatCart')||'[]');
const $=s=>document.querySelector(s);
async function load(){products=await fetch('/api/products').then(r=>r.json()); renderProducts(); updateCart();}
function renderProducts(){const grid=$('#productsGrid'); if(!products.length){grid.innerHTML='<div class="loading">لا توجد منتجات حاليًا.</div>';return}grid.innerHTML=products.map(p=>`<article class="product"><img class="product-img" src="${p.image}" alt="${escapeHtml(p.name)}"><div class="product-body">${p.badge?`<span class="badge">${escapeHtml(p.badge)}</span>`:''}<h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p><div class="price">${p.price} ج.م</div>${p.bundlePrice?`<div class="old-note">عرض ${p.bundleQty} منتجات بـ ${p.bundlePrice} ج.م</div>`:''}<button class="primary-btn" onclick="add('${p.id}')">أضف إلى السلة 🛒</button></div></article>`).join('')}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function add(id){const p=products.find(x=>x.id===id);const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});save();openCart()}
function save(){localStorage.setItem('alnonatCart',JSON.stringify(cart));updateCart()}
function updateCart(){$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0)}
function totals(){let total=0;for(const i of cart){const p=products.find(x=>x.id===i.id);if(!p)continue; total += (i.qty>=p.bundleQty && p.bundlePrice ? Math.floor(i.qty/p.bundleQty)*p.bundlePrice+(i.qty%p.bundleQty)*p.price : i.qty*p.price)}return total}
function openCart(){$('#cartModal').classList.remove('hidden');renderCart()}
function renderCart(){const box=$('#cartItems');if(!cart.length){box.innerHTML='<p>السلة فارغة.</p>'}else box.innerHTML=cart.map(i=>{const p=products.find(x=>x.id===i.id);return `<div class="cart-row"><div><b>${escapeHtml(p.name)}</b><br><small>${p.price} ج.م</small></div><div class="qty"><button onclick="changeQty('${i.id}',-1)">−</button> ${i.qty} <button onclick="changeQty('${i.id}',1)">+</button></div></div>`}).join('');$('#cartTotal').textContent=totals()}
function changeQty(id,d){const i=cart.find(x=>x.id===id);i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);save();renderCart()}
$('#cartBtn').onclick=openCart;
$('#checkoutBtn').onclick=()=>{$('#cartModal').classList.add('hidden');$('#orderModal').classList.remove('hidden')};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));
$('#orderForm').onsubmit=async e=>{e.preventDefault();if(!cart.length)return alert('السلة فارغة');const fd=new FormData(e.target);fd.append('items',JSON.stringify(cart));const r=await fetch('/api/order',{method:'POST',body:fd});const o=await r.json();const lines=cart.map(i=>{const p=products.find(x=>x.id===i.id);return `- ${p.name} × ${i.qty}`}).join('%0A');const msg=`مرحبًا، أريد عمل طلب من النون.%0Aرقم الطلب: ${o.orderId}%0Aالمنتجات:%0A${lines}%0Aالإجمالي: ${totals()} ج.م%0Aالاسم: ${encodeURIComponent(o.customer)}%0Aالهاتف: ${encodeURIComponent(o.phone)}%0Aالعنوان: ${encodeURIComponent(o.address)}%0Aملاحظات: ${encodeURIComponent(o.note||'لا يوجد')}`;window.location.href=`https://wa.me/${WA}?text=${msg}`;cart=[];save()};
load();
