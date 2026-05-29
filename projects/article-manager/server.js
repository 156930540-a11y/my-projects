const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure dirs & files exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(ARTICLES_FILE)) fs.writeFileSync(ARTICLES_FILE, '[]');
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, '[]');

// Helpers
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
function addLog(type, title, status) {
  const logs = readJSON(LOGS_FILE);
  logs.unshift({
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    type,
    title,
    status
  });
  writeJSON(LOGS_FILE, logs);
}

// Multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'article-manager-local-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: '未登录' });
}

// === AUTH ===
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, error: '账号或密码错误，请重新输入' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// === ARTICLES ===
app.get('/api/articles', requireAuth, (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  res.json(articles);
});

app.post('/api/articles', requireAuth, upload.single('image'), (req, res) => {
  const { title, author, content } = req.body;
  if (!title || !title.trim()) {
    return res.json({ success: false, error: '文章标题不能为空' });
  }
  const articles = readJSON(ARTICLES_FILE);
  const article = {
    id: Date.now().toString(),
    title: title.trim(),
    author: (author || '').trim(),
    content: content || '',
    image: req.file ? req.file.filename : null,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  articles.unshift(article);
  writeJSON(ARTICLES_FILE, articles);
  addLog('新增上传', article.title, '成功');
  res.json({ success: true, article });
});

app.put('/api/articles/:id', requireAuth, upload.single('image'), (req, res) => {
  const { title, author, content } = req.body;
  const articles = readJSON(ARTICLES_FILE);
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.json({ success: false, error: '文章不存在' });

  if (!title || !title.trim()) {
    return res.json({ success: false, error: '文章标题不能为空' });
  }

  const old = articles[idx];
  // If new image uploaded, delete old one
  if (req.file && old.image) {
    const oldPath = path.join(UPLOADS_DIR, old.image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  articles[idx] = {
    ...old,
    title: title.trim(),
    author: (author || '').trim(),
    content: content || '',
    image: req.file ? req.file.filename : old.image,
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  writeJSON(ARTICLES_FILE, articles);
  addLog('内容编辑', articles[idx].title, '成功');
  res.json({ success: true, article: articles[idx] });
});

app.delete('/api/articles/:id', requireAuth, (req, res) => {
  let articles = readJSON(ARTICLES_FILE);
  const article = articles.find(a => a.id === req.params.id);
  if (!article) return res.json({ success: false, error: '文章不存在' });

  // Delete image
  if (article.image) {
    const imgPath = path.join(UPLOADS_DIR, article.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  articles = articles.filter(a => a.id !== req.params.id);
  writeJSON(ARTICLES_FILE, articles);
  addLog('删除文章', article.title, '成功');
  res.json({ success: true });
});

// === STATS ===
app.get('/api/stats', requireAuth, (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  res.json({ total: articles.length });
});

// === LOGS ===
app.get('/api/logs', requireAuth, (req, res) => {
  const logs = readJSON(LOGS_FILE);
  res.json(logs);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ✅ 文章管理系统已启动`);
  console.log(`  🌐 访问地址: http://localhost:${PORT}`);
  console.log(`  📂 数据目录: ${DATA_DIR}\n`);
});
