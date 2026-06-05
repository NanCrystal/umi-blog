import { defineConfig } from 'umi';
import routes from './config/router';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: routes,
  links: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@400&family=Cormorant+Garamond:wght@400&family=JetBrains+Mono:wght@400&display=swap',
    },
  ],

  // routes: [
  //   { path: '/', component: '@/pages/index' },
  // ],
  fastRefresh: {},
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // Nest 后端
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
      timeout: 15 * 60 * 1000, // 视频上传 15 分钟超时
    },
    '/uploads': {
      target: 'http://localhost:3000', // 将前端对 /uploads 的请求代理到 Nest 后端
      changeOrigin: true,
    },
  },
  chainWebpack(memo) {
    memo.module
      .rule('media')
      .test(/\.(mp3)$/) // 仅 mp3，排除 mp4（避免拦截视频上传请求）
      .use('file-loader')
      .loader(require.resolve('file-loader'));
  },
});
