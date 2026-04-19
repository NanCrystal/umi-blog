const LoginPage = '@/pages/Login/index';
const HomePage = '@/pages/Home/index';
const DocumentPage = '@/pages/Document/index';
const EssayPage = '@/pages/Essay/index';
const EssayDetailPage = '@/pages/Essay/detail';
const AddPage = '@/pages/AddPage/index';
const CommentPage = '@/pages/Comment/index';
const WallPaperPage = '@/pages/WallPaper/index';
const WallPaperEditPage = '@/pages/WallPaper/edit';
const WallPaperDetailPage = '@/pages/WallPaper/detail';

export default [
  // 根路径精确匹配，跳转到登录页
  { exact: true, path: '/', redirect: '/login' },

  // 登录页（无布局）
  { exact: true, path: '/login', component: LoginPage },

  // 主布局内的页面
  {
    path: '/',
    component: '@/layouts/HomeLayout/index',
    routes: [
      { exact: true, path: '/home', component: HomePage },
      { exact: true, path: '/document', component: DocumentPage },
      { exact: true, path: '/essay', component: EssayPage },
      { exact: true, path: '/wallpaper', component: WallPaperPage },
      { exact: true, path: '/wallpaper/edit', component: WallPaperEditPage },
      {
        exact: true,
        path: '/wallpaper/detail',
        component: WallPaperDetailPage,
      },
      { exact: true, path: '/essay/detail', component: EssayDetailPage },
      { exact: true, path: '/add', component: AddPage },
      { exact: true, path: '/comment', component: CommentPage },
      // 未匹配路由重定向到首页
      { redirect: '/home' },
    ],
  },
];
