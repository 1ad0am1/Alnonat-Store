const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const DEFAULT_PRODUCTS = [
  { id:'sketch-15', name:'سكتش رسم النون', price:400, bundleQty:2, bundlePrice:700, badge:'الأكثر طلبًا', description:'سكتش رسم مكوّن من 15 ورقة، نحول صور أطفالكم إلى رسومات جميلة قابلة للتلوين والاحتفاظ بها كذكرى مميزة.', image:'/uploads/sketch-15-sheets.jpg' },
  { id:'teddy-bear', name:'دبدوب لطيف', price:199, badge:'جديد', description:'دبدوب لطيف مناسب للأطفال.', image:'/uploads/teddy-bear.jpg' },
  { id:'school-pens', name:'أقلام مدرسية ملونة', price:149, description:'مجموعة أقلام جميلة ومناسبة للمدرسة والرسم.', image:'/uploads/school-pens.jpg' },
  { id:'kids-bottle', name:'زجاجة مياه للأطفال', price:89, description:'زجاجة عملية وخفيفة للاستخدام اليومي.', image:'/uploads/kids-bottle.jpg' },
  { id:'unicorn-bag', name:'شنطة يونيكورن', price:299, badge:'مميز', description:'شنطة أطفال بتصميم لطيف ومبهج.', image:'/uploads/unicorn-bag.jpg' },
  { id:'kids-watch', name:'ساعة أطفال', price:159, description:'ساعة أطفال بتصميم مرح.', image:'/uploads/kids-watch.jpg' },
  { id:'hair-bows', name:'توكة شعر بناتي', price:79, description:'مجموعة توك شعر بألوان جميلة.', image:'/uploads/hair-bows.jpg' },
  { id:'rabbit-light', name:'إضاءة أرنب', price:109, description:'إضاءة لطيفة لغرفة الأطفال.', image:'/uploads/rabbit-light.jpg' }
];

function auth(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'لم يتم ضبط ADMIN_PASSWORD على Vercel.' });
  }
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
  }
  next();
}

const GH_API = 'https://api.github.com';

function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.GITHUB_PRODUCTS_PATH || 'data/products.json'
  };
}

async function githubRequest(url, options = {}) {
  const cfg = githubConfig();
  if (!cfg.token || !cfg.repo) {
    throw new Error('GITHUB_TOKEN أو GITHUB_REPO غير مضبوط.');
  }

  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${cfg.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) {
    throw new Error(data?.message || `GitHub API error ${response.status}`);
  }
  return data;
}

async function readProducts() {
  const cfg = githubConfig();

  if (!cfg.token || !cfg.repo) {
    return DEFAULT_PRODUCTS;
  }

  try {
    const data = await githubRequest(
      `${GH_API}/repos/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`
    );

    const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    const products = JSON.parse(decoded);

    if (!Array.isArray(products)) throw new Error('ملف المنتجات غير صالح.');
    return products;
  } catch (err) {
    // If the file does not exist yet, the first write will create it.
    // For storefront availability, return the built-in products on read failure.
    return DEFAULT_PRODUCTS;
  }
}

async function writeProducts(products, message) {
  const cfg = githubConfig();
  if (!cfg.token || !cfg.repo) {
    throw new Error('اضبط GITHUB_TOKEN و GITHUB_REPO في Vercel أولًا.');
  }

  let sha = null;

  try {
    const current = await githubRequest(
      `${GH_API}/repos/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`
    );
    sha = current.sha;
  } catch (err) {
    // File may not exist; PUT below will create it.
  }

  const content = Buffer.from(JSON.stringify(products, null, 2), 'utf8').toString('base64');

  const body = {
    message: message || 'Update products',
    content,
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  return githubRequest(
    `${GH_API}/repos/${cfg.repo}/contents/${cfg.path}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

function cleanProduct(body, old = {}) {
  const name = String(body.name ?? old.name ?? '').trim();
  const price = Number(body.price ?? old.price ?? 0);
  const bundleQty = Number(body.bundleQty ?? old.bundleQty ?? 0);
  const bundlePrice = body.bundlePrice === '' || body.bundlePrice == null
    ? undefined
    : Number(body.bundlePrice);
  const image = String(body.image ?? old.image ?? '').trim();
  const description = String(body.description ?? old.description ?? '').trim();
  const badge = String(body.badge ?? old.badge ?? '').trim();

  if (!name) throw new Error('اسم المنتج مطلوب.');
  if (!Number.isFinite(price) || price < 0) throw new Error('السعر غير صحيح.');
  if (!image) throw new Error('رابط الصورة مطلوب.');

  const product = {
    id: String(body.id ?? old.id ?? '').trim() || `product-${Date.now()}`,
    name,
    price,
    description,
    image
  };

  if (badge) product.badge = badge;
  if (Number.isFinite(bundleQty) && bundleQty > 0 && Number.isFinite(bundlePrice) && bundlePrice >= 0) {
    product.bundleQty = bundleQty;
    product.bundlePrice = bundlePrice;
  }

  return product;
}

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({
    error: err?.message || 'حدث خطأ أثناء حفظ المنتجات.'
  });
}

app.get(['/api/products', '/products'], async (req, res) => {
  try {
    res.json(await readProducts());
  } catch (err) {
    handleError(res, err);
  }
});

app.get(['/api/admin/products', '/admin/products'], auth, async (req, res) => {
  try {
    res.json(await readProducts());
  } catch (err) {
    handleError(res, err);
  }
});

app.post(['/api/admin/products', '/admin/products'], auth, upload.none(), async (req, res) => {
  try {
    const products = await readProducts();
    const product = cleanProduct(req.body);
    const existing = products.findIndex(p => p.id === product.id);

    if (existing >= 0) products[existing] = product;
    else products.push(product);

    await writeProducts(products, existing >= 0 ? `Update product ${product.id}` : `Add product ${product.id}`);
    res.json({ ok: true, product });
  } catch (err) {
    handleError(res, err);
  }
});

app.put(['/api/admin/products/:id', '/admin/products/:id'], auth, upload.none(), async (req, res) => {
  try {
    const products = await readProducts();
    const index = products.findIndex(p => p.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'المنتج غير موجود.' });

    const product = cleanProduct({ ...req.body, id: req.params.id }, products[index]);
    products[index] = product;

    await writeProducts(products, `Update product ${product.id}`);
    res.json({ ok: true, product });
  } catch (err) {
    handleError(res, err);
  }
});

app.delete(['/api/admin/products/:id', '/admin/products/:id'], auth, async (req, res) => {
  try {
    const products = await readProducts();
    const next = products.filter(p => p.id !== req.params.id);

    if (next.length === products.length) {
      return res.status(404).json({ error: 'المنتج غير موجود.' });
    }

    await writeProducts(next, `Delete product ${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.post(['/api/order', '/order'], async (req, res) => {
  console.log('New order:', req.body);
  res.json({ ok: true, message: 'تم استلام الطلب.' });
});

module.exports = app;
