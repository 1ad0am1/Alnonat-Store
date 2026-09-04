let products = [];

const $ = (s) => document.querySelector(s);
const password = () => $('#pass').value.trim();

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}), 'x-admin-password': password() };
  const r = await fetch(url, { ...options, headers });
  let data = {};
  try { data = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(data.error || 'حدث خطأ.');
  return data;
}

async function refresh() {
  try {
    products = await api('/api/admin/products');
    render();
  } catch (err) {
    $('#adminList').innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function render() {
  $('#adminList').innerHTML = products.map(p => `
    <div class="cart-row" style="align-items:center;gap:10px">
      <div style="flex:1">
        <b>${escapeHtml(p.name)}</b><br>
        <small>${p.price} ج.م</small>
      </div>
      <button type="button" onclick="editProduct('${escapeAttr(p.id)}')">تعديل</button>
      <button type="button" onclick="del('${escapeAttr(p.id)}')">حذف</button>
    </div>
  `).join('') || '<p class="muted">لا توجد منتجات.</p>';
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(v) {
  return String(v ?? '').replace(/'/g, "\\'");
}

window.editProduct = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const f = $('#productForm');
  f.elements.id.value = p.id || '';
  f.elements.name.value = p.name || '';
  f.elements.price.value = p.price ?? '';
  f.elements.bundleQty.value = p.bundleQty ?? '';
  f.elements.bundlePrice.value = p.bundlePrice ?? '';
  f.elements.badge.value = p.badge || '';
  f.elements.description.value = p.description || '';
  f.elements.image.value = p.image || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.del = async function(id) {
  if (!confirm('هل تريد حذف المنتج نهائيًا؟')) return;
  try {
    await api('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE' });
    alert('تم حذف المنتج بنجاح.');
    await refresh();
  } catch (err) {
    alert(err.message);
  }
};

$('#productForm').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f);

  try {
    await api('/api/admin/products', { method: 'POST', body: fd });
    alert('تم حفظ المنتج بنجاح.');
    f.reset();
    f.elements.bundleQty.value = '2';
    await refresh();
  } catch (err) {
    alert(err.message);
  }
};

$('#pass').addEventListener('change', refresh);
