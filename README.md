# umi project

## Getting Started

Install dependencies,

```bash
$ yarn
```

Start the dev server,

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
 