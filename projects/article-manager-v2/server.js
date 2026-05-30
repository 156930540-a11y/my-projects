const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ============ 路径配置 ============
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// ============ 初始化目录与文件 ============
[UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
[ARTICLES_FILE, LOGS_FILE].forEach(file => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
});
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    username: 'admin',
    password: '123456'
  }, null, 2), 'utf-8');
}

// ============ 工具函数 ============
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { username: 'admin', password: '123456' };
  }
}
function addLog(type, title, status) {
  const logs = readJSON(LOGS_FILE);
  logs.unshift({
    id: Date.now().toString(),
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    type,
    title,
    status
  });
  // 保留最近 5000 条日志
  if (logs.length > 5000) logs.length = 5000;
  writeJSON(LOGS_FILE, logs);
}

// ============ 文件上传配置 ============
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
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件'));
    }
  }
});

// ============ 中间件 ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'article-manager-local-2024-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// 鉴权中间件
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: '未登录，请先登录系统' });
}

// ============ 认证接口 ============
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const config = getConfig();
  if (username === config.username && password === config.password) {
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

// ============ 文章接口 ============
// 获取全部文章
app.get('/api/articles', requireAuth, (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  res.json(articles);
});

// 新增文章
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

// 编辑文章
app.put('/api/articles/:id', requireAuth, upload.single('image'), (req, res) => {
  const { title, author, content, removeImage } = req.body;
  const articles = readJSON(ARTICLES_FILE);
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.json({ success: false, error: '文章不存在' });
  if (!title || !title.trim()) {
    return res.json({ success: false, error: '文章标题不能为空' });
  }

  const old = articles[idx];

  // 处理图片：新上传 → 删旧图；移除图片 → 删旧图
  if (req.file && old.image) {
    const oldPath = path.join(UPLOADS_DIR, old.image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  if (removeImage === 'true' && old.image && !req.file) {
    const oldPath = path.join(UPLOADS_DIR, old.image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  articles[idx] = {
    ...old,
    title: title.trim(),
    author: (author || '').trim(),
    content: content || '',
    image: req.file ? req.file.filename : (removeImage === 'true' ? null : old.image),
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  writeJSON(ARTICLES_FILE, articles);
  addLog('内容编辑', articles[idx].title, '成功');
  res.json({ success: true, article: articles[idx] });
});

// 删除文章
app.delete('/api/articles/:id', requireAuth, (req, res) => {
  let articles = readJSON(ARTICLES_FILE);
  const article = articles.find(a => a.id === req.params.id);
  if (!article) return res.json({ success: false, error: '文章不存在' });

  if (article.image) {
    const imgPath = path.join(UPLOADS_DIR, article.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  articles = articles.filter(a => a.id !== req.params.id);
  writeJSON(ARTICLES_FILE, articles);
  addLog('删除文章', article.title, '成功');
  res.json({ success: true });
});

// ============ 统计接口 ============
app.get('/api/stats', requireAuth, (req, res) => {
  const articles = readJSON(ARTICLES_FILE);
  const logs = readJSON(LOGS_FILE);
  const today = new Date().toLocaleDateString('zh-CN');
  const todayLogs = logs.filter(l => l.time && l.time.startsWith(today));
  res.json({
    total: articles.length,
    todayUploads: todayLogs.filter(l => l.type === '新增上传').length,
    todayEdits: todayLogs.filter(l => l.type === '内容编辑').length,
    todayDeletes: todayLogs.filter(l => l.type === '删除文章').length,
    totalLogs: logs.length
  });
});

// ============ 日志接口 ============
app.get('/api/logs', requireAuth, (req, res) => {
  const logs = readJSON(LOGS_FILE);
  res.json(logs);
});

// ============ SPA 回退 ============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ 启动 ============
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     ✅ 文章管理系统已成功启动          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  🌐 访问地址: http://localhost:${PORT}    ║`);
  console.log(`  ║  📂 数据目录: ${DATA_DIR}  `);
  console.log('  ║  🔑 默认账号: admin / 123456          ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
