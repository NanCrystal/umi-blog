const LoginPage = '@/pages/Login/index';
const HomePage = '@/pages/Home/index';
const DocumentPage = '@/pages/Document/index';
const EssayPage = '@/pages/Essay/index';
const EssayDetailPage = '@/pages/Essay/detail';
const AddPage = '@/pages/AddPage/index';
const CommentPage = '@/pages/Comment/index';
const WallPaperPage = '@/pages/WallPaper/index';
const WallPaperSchedulesPage = '@/pages/WallPaper/schedules';
const WallPaperEditPage = '@/pages/WallPaper/edit';
const WallPaperDetailPage = '@/pages/WallPaper/detail';

const WallPaperMgtPage = '@/pages/WallPaperMgt/index';
const ReleaseMgtPage = '@/pages/ReleaseMgt/index';
const AccountMgtPage = '@/pages/AccountMgt/index';

export default [
  // 根路径精确匹配，跳转到登录页
  { exact: true, path: '/', redirect: '/login' },

  // 登录页（无布局）
  { exact: true, path: '/login', component: LoginPage },

  // 管理后台布局（无顶部导航，仅左侧菜单）
  // 放在主布局前面，避免被 '/' 路由的 catch-all 拦截
  {
    path: '/admin',
    component: '@/layouts/AdminLayout/index',
    routes: [
      { exact: true, path: '/admin/wallpaper', component: WallPaperMgtPage },
      { exact: true, path: '/admin/release', component: ReleaseMgtPage },
      { exact: true, path: '/admin/account', component: AccountMgtPage },
      { redirect: '/admin/wallpaper' },
    ],
  },

  // 主布局内的页面
  {
    path: '/',
    component: '@/layouts/HomeLayout/index',
    routes: [
      { exact: true, path: '/home', component: HomePage },
      { exact: true, path: '/document', component: DocumentPage },
      { exact: true, path: '/essay', component: EssayPage },
      { exact: true, path: '/wallpaper', component: WallPaperPage },
      {
        exact: true,
        path: '/wallpaper/schedules',
        component: WallPaperSchedulesPage,
      },
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
