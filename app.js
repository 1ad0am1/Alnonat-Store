const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const uploadDir = path.join(__dirname, 'public', 'uploads');

// Uploads are useful for local/Render hosting. Vercel's filesystem is ephemeral,
// so the storefront itself does not depend on uploads being writable at runtime.
let upload;
try {
  fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('يسمح فقط بصور JPG أو PNG أو WEBP'));
    }
  });
} catch {
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function readProducts() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}
function auth(req, res, next) {
  const supplied = req.headers['x-admin-password'] || req.body?.password || req.query?.password;
  if (supplied !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة مرور الإدارة غير صحيحة' });
  next();
}

function isApi(pathname) {
  return pathname === '/api' || pathname.startsWith('/api/');
}

app.get(['/api/products', '/products'], (_req, res) => {
  res.json(readProducts().filter(p => p.active !== false));
});

app.get(['/api/admin/products', '/admin/products'], auth, (_req, res) => res.json(readProducts()));

app.post(['/api/admin/products', '/admin/products'], auth, upload.single('image'), (req, res) => {
  const products = readProducts();
  const id = (req.body.id || `${Date.now()}`).trim();
  const product = {
    id,
    name: (req.body.name || '').trim(),
    price: Number(req.body.price || 0),
    bundlePrice: Number(req.body.bundlePrice || 0),
    bundleQty: Number(req.body.bundleQty || 2),
    description: (req.body.description || '').trim(),
    badge: (req.body.badge || '').trim(),
    image: req.file ? `/public/uploads/${req.file.filename}` : (req.body.image || ''),
    active: req.body.active !== 'false'
  };
  if (!product.name || !product.price || !product.image) return res.status(400).json({ error: 'اكتب اسم المنتج والسعر وأضف صورة.' });
  const index = products.findIndex(p => p.id === id);
  if (index >= 0) products[index] = product; else products.push(product);
  writeProducts(products);
  res.json(product);
});

app.put(['/api/admin/products/:id', '/admin/products/:id'], auth, upload.single('image'), (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'المنتج غير موجود' });
  const old = products[index];
  products[index] = {
    ...old,
    name: (req.body.name ?? old.name).trim(),
    price: Number(req.body.price ?? old.price),
    bundlePrice: Number(req.body.bundlePrice ?? old.bundlePrice),
    bundleQty: Number(req.body.bundleQty ?? old.bundleQty),
    description: (req.body.description ?? old.description).trim(),
    badge: (req.body.badge ?? old.badge).trim(),
    active: req.body.active === undefined ? old.active : req.body.active !== 'false',
    image: req.file ? `/public/uploads/${req.file.filename}` : old.image
  };
  writeProducts(products);
  res.json(products[index]);
});

app.delete(['/api/admin/products/:id', '/admin/products/:id'], auth, (req, res) => {
  const products = readProducts();
  const next = products.filter(p => p.id !== req.params.id);
  if (next.length === products.length) return res.status(404).json({ error: 'المنتج غير موجود' });
  writeProducts(next);
  res.json({ ok: true });
});

app.post(['/api/order', '/order'], upload.array('photos', 10), (req, res) => {
  const orderId = `NN-${Date.now().toString().slice(-8)}`;
  const photos = (req.files || []).map(f => `/public/uploads/${f.filename}`);
  res.json({
    orderId,
    customer: req.body.customer || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    photos,
    note: req.body.note || ''
  });
});

// Never try to read public/index.html from the Vercel Function bundle.
app.use((req, res) => {
  if (isApi(req.path)) return res.status(404).json({ error: 'غير موجود' });
  res.status(404).json({ error: 'الصفحة غير موجودة' });
});

app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || 'حدث خطأ' }));

module.exports = app;
