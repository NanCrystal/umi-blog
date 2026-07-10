# umi project

## Getting Started

Install dependencies,

```bash
$ yarn
```

## 环境切换（本地 / 生产后端）

| 命令 | 后端地址 | 说明 |
|---|---|---|
| `yarn start` | `localhost:3000` | 连接本地 Nest 后端 |
| `yarn start:prod` | `api.tauol.online` | 连接生产环境后端 |

也可临时指定自定义地址：

```bash
API_TARGET=https://your-api.com yarn start
```

配置文件位于 `.env.local`（本地）和 `.env.production`（生产），通过 `API_TARGET` 变量控制代理目标。

## 开发

启动 dev server，

```bash
$ yarn start
```

<!-- npx prisma migrate dev --name init -->


```bash
$ sqlite3 prisma/dev.db ".tables" 
```
 
# 视频 URL 的三个层级
# 字段	用途	说明
# originalUrl	原始上传文件	未经处理的源视频
# playUrl	播放用	七牛 PFOP 转码后的压缩版本
# hdUrl	下载用	高清版本
 