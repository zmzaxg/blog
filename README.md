# 轻社区博客系统

## 部署步骤

1. 安装依赖：`npm install`
2. 构建：`npm run build`
3. 部署：`wrangler deploy`

## 首次使用

1. 访问网站，自动跳转到 `/setup` 初始化页面
2. 使用内置账号登录：`zmzaxg` / `mmaA123456`
3. 点击「初始化数据库」
4. 配置站点信息，点击「写入数据库」
5. 完成！

## WebDAV 存储

在管理后台 → 存储配置中添加 WebDAV，支持 Nextcloud、坚果云等。

## 技术栈

- 前端：React 19 + Tailwind CSS v4 + shadcn/ui
- 后端：Cloudflare Workers + D1
- 存储：WebDAV（可选）
