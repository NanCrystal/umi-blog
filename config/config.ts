import { defineConfig } from 'umi';
import routes from './router';
import path from 'path';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes,
  fastRefresh: {},
  // antd less 变量：从源头替换主色，干掉蓝色
  theme: {
    'primary-color': 'rgba(255,255,255,0.75)',
    'btn-primary-bg': 'rgba(255,255,255,0.1)',
    'btn-primary-border': 'rgba(255,255,255,0.25)',
    'btn-default-bg': 'transparent',
    'btn-default-border': 'rgba(255,255,255,0.2)',
    'btn-default-color': 'rgba(255,255,255,0.55)',
    'btn-border-radius-base': '6px',
  },
  chainWebpack(memo) {
    memo.resolve.alias.set(
      'react',
      path.resolve(__dirname, '../node_modules/react'),
    );
    memo.resolve.alias.set(
      'react-dom',
      path.resolve(__dirname, '../node_modules/react-dom'),
    );
  },
});
