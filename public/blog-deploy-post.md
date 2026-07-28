## 记一次博客部署的血泪史

### 前言

花了不少功夫写的博客终于上线了，本来以为部署就是「打包—上传—启动」三连，结果从零到能访问折腾了两三个小时。写篇文章记录一下踩过的坑，也许能帮到后来人。

### 项目背景

博客是 Next.js 16 + SQLite 写的，用 `output: 'standalone'` 模式构建。服务器是阿里云 ECS，系统 Ubuntu，装了宝塔面板。同一台服务器上已经跑了一个 EZTor（背单词项目），占着 3000 端口。

### Round 1：打包

一开始参考 EZTor 项目的 `deploy.sh` 写了个打包脚本，把 `.next/standalone/` 输出打包成 `tar.gz`。

第一版脚本：

```bash
cp -r .next/standalone/app/* deploy/
cp -r .next/static deploy/.next/static
cp -r prisma deploy/prisma-bundled
cp -r scripts deploy/scripts
```

第一次运行失败，发现 Next.js 在不同构建中 standalone 输出的目录结构不一样——有时候套一层 `app/` 目录，有时候不套。后来改用 `cp -r .next/standalone/. deploy/` 解决。

**教训：别假设构建输出的结构是固定的。**

### Round 2：Prisma 找不到了

上传到服务器解压后，用 pm2 启动，日志一直输出：

```
Syncing database schema...
Syncing database schema...
Syncing database schema...
```

明显卡住了。排查后发现两个问题：

1. `entrypoint.sh` 里 `cp prisma-bundled/schema.prisma prisma/schema.prisma` 报错——因为 `prisma/` 目录压根不存在。加一行 `mkdir -p prisma` 解决。

2. `npx prisma` 找不到 CLI——因为 Next.js 的 standalone 模式只打包应用代码实际 import 的依赖，而 `prisma` 和 `@prisma/client` 是通过 `npx` 调用的，不在静态追踪范围内。需要在打包脚本里手动复制：

```bash
cp -r node_modules/prisma deploy/node_modules/prisma
cp -r node_modules/@prisma deploy/node_modules/@prisma
cp -r node_modules/.prisma deploy/node_modules/.prisma
```

**教训：standalone 模式不包含所有 node_modules，prisma 这种通过 CLI 调用的需要手动补上。**

### Round 3：端口冲突

服务器上 EZTor 占了 3000 端口，博客也想抢 3000，日志：

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

在 `.env.production` 里加了 `PORT=3001`，但是 server.js 根本不读 `.env` 文件。Next.js 在开发模式下会自动加载 `.env`，但生产环境的 standalone 模式下不会。

需要在 entrypoint.sh 里手动加载环境变量：

```bash
set -a; . ./.env.production; set +a
exec node server.js
```

加上 `set -a` 才能让 `.env.production` 里的变量被子进程（node）继承。

**教训：生产环境别指望框架帮你加载环境变量，自己动手。**

### Round 4：pm2 的环境变量缓存

修复了 entrypoint.sh 后删掉进程重建，结果还是报端口 3000 被占用。查了半天发现 pm2 在 `pm2 restart` 时会复用旧的环境变量，只有 `pm2 delete` 再 `pm2 start` 才会用新的。

```bash
pm2 delete lb-blog
pm2 start scripts/entrypoint.sh --name lb-blog
```

**教训：pm2 restart ≠ pm2 delete + pm2 start，环境变量变更时必须用后者。**

### Round 5：NextAuth 的 UntrustedHost

终于端口通了，访问 `https://blog.dogeggcode.cyou` 报：

```
[auth][error] UntrustedHost: Host must be trusted.
```

NextAuth 默认只信任 `localhost` 和 `NEXTAUTH_URL` 配置的域名，但生产环境还有一个安全检查。加一行：

```bash
echo 'AUTH_TRUST_HOST=true' >> .env
```

重启后一切正常。

**教训：NextAuth 的安全机制不少，部署前先把文档过一遍。**

### 最终成果

博客成功上线在 [blog.dogeggcode.cyou](https://blog.dogeggcode.cyou)，同一台服务器上同时跑着 EZTor（3000）和博客（3001），用 Nginx 反向代理分别映射到不同域名。

部署流程图：

```
本地构建 → tar.gz → 宝塔上传 → 解压 → pm2 启动
                                          ↓
                                    Prisma 初始化
                                          ↓
                                    node server.js
                                          ↓
                                    Nginx 反向代理
                                          ↓
                                    浏览器访问 ✓
```

### 收尾建议

如果你也要部署 Next.js 项目到自建服务器，几点建议：

1. **写个 deploy.sh**，一键打包，避免手动操作出错
2. **检查 standalone 输出的 node_modules**，缺啥补啥
3. **entrypoint.sh 里手动加载环境变量**，不要依赖框架自动读取
4. **pm2 更新环境变量时要 delete + start**，restart 不管用
5. **先在本地的 Docker 容器里跑一遍**，能提前暴露 80% 的问题

这篇博客本身就是用这个项目发布的，算是 dogfooding 了。
