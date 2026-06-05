import { defineConfig } from 'umi';
import routes from './router';
import path from 'path';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes,
  fastRefresh: {},
  // antd less 变量：Bugatti 极简工程美学主题
  theme: {
    'primary-color': '#ffffff',
    'btn-primary-bg': 'transparent',
    'btn-primary-border': '#ffffff',
    'btn-default-bg': 'transparent',
    'btn-default-border': 'rgba(255,255,255,0.35)',
    'btn-default-color': 'rgba(255,255,255,0.75)',
    'btn-border-radius-base': '9999px',
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-weight-base': '400',
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
