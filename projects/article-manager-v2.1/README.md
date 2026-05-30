# 文章管理系统

本地网页版文章管理测试系统，纯本地部署，无需联网。

## 功能

- ✅ 登录验证（固定账号密码，可修改）
- ✅ 文章卡片展示（缩略图 + 标题 + 作者 + 预览）
- ✅ 全文阅读（弹窗阅读模式）
- ✅ 文章上传（含配图上传）
- ✅ 文章编辑（修改标题、作者、正文、配图）
- ✅ 文章删除（二次确认）
- ✅ 数据统计（文章总数、今日操作统计）
- ✅ 操作日志（自动记录每次操作）
- ✅ 搜索功能（按标题/作者搜索）
- ✅ 数据持久化（重启不丢失）

## 快速开始

### 前置条件

安装 [Node.js](https://nodejs.org/)（建议 v16 以上）

### 一键启动

**Windows：** 双击 `start.bat`

**Mac / Linux：**
```bash
chmod +x start.sh
./start.sh
```

### 手动启动

```bash
npm install
node server.js
```

启动后浏览器打开：**http://localhost:3000**

### 默认账号

- 账号：`admin`
- 密码：`123456`

> 修改账号密码：编辑 `data/config.json` 文件

## 目录结构

```
article-manager/
├── server.js          # 后端服务
├── package.json       # 依赖配置
├── start.sh           # Mac/Linux 启动脚本
├── start.bat          # Windows 启动脚本
├── public/
│   └── index.html     # 前端页面
└── data/
    ├── config.json    # 账号密码配置
    ├── articles.json  # 文章数据
    ├── logs.json      # 操作日志
    └── uploads/       # 上传的图片
```

## 技术栈

- 后端：Node.js + Express
- 前端：纯 HTML / CSS / JS
- 存储：本地 JSON 文件 + 文件系统

## 注意事项

- 所有数据存储在 `data/` 目录，备份此目录即可备份全部数据
- 上传的图片存储在 `data/uploads/` 目录
- 仅作本地测试使用，无需公网部署
