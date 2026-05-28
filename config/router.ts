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

const DataMgtPage = '@/pages/DataMgt/index';
const ItineraryMgtPage = '@/pages/ItineraryMgt/index';
const SwiperMgtPage = '@/pages/SwiperMgt/index';
const PhotoMgtPage = '@/pages/PhotoMgt/index';
const VideoMgtPage = '@/pages/VideoMgt/index';
const VoiceMgtPage = '@/pages/VoiceMgt/index';
const ProfileMgtPage = '@/pages/ProfileMgt/index';

export default [
  // 根路径精确匹配，跳转到登录页
  { exact: true, path: '/', redirect: '/login' },

  // 登录页（无布局）
  { exact: true, path: '/login', component: LoginPage },
  { exact: true, path: '/manage/login', component: LoginPage },

  // 管理后台布局（无顶部导航，仅左侧菜单）
  // 放在主布局前面，避免被 '/' 路由的 catch-all 拦截
  {
    path: '/admin',
    component: '@/layouts/AdminLayout/index',
    routes: [
      { exact: true, path: '/admin/wallpaper', component: WallPaperMgtPage },
      { exact: true, path: '/admin/release', component: ReleaseMgtPage },
      { redirect: '/admin/wallpaper' },
    ],
  },

  // 角色管理后台（云熠 / 郝熠然 / 云旗）
  {
    path: '/yunyi',
    component: '@/layouts/RoleAdminLayout/index',
    routes: [
      { exact: true, path: '/yunyi/data', component: DataMgtPage },
      { exact: true, path: '/yunyi/itinerary', component: ItineraryMgtPage },
      { exact: true, path: '/yunyi/swiper', component: SwiperMgtPage },
      { exact: true, path: '/yunyi/photo', component: PhotoMgtPage },
      { exact: true, path: '/yunyi/video', component: VideoMgtPage },
      { exact: true, path: '/yunyi/voice', component: VoiceMgtPage },
      { exact: true, path: '/yunyi/profile', component: ProfileMgtPage },
      { redirect: '/yunyi/data' },
    ],
  },
  {
    path: '/haoyiran',
    component: '@/layouts/RoleAdminLayout/index',
    routes: [
      { exact: true, path: '/haoyiran/data', component: DataMgtPage },
      { exact: true, path: '/haoyiran/itinerary', component: ItineraryMgtPage },
      { exact: true, path: '/haoyiran/swiper', component: SwiperMgtPage },
      { exact: true, path: '/haoyiran/photo', component: PhotoMgtPage },
      { exact: true, path: '/haoyiran/video', component: VideoMgtPage },
      { exact: true, path: '/haoyiran/voice', component: VoiceMgtPage },
      { exact: true, path: '/haoyiran/profile', component: ProfileMgtPage },
      { redirect: '/haoyiran/data' },
    ],
  },
  {
    path: '/yunqi',
    component: '@/layouts/RoleAdminLayout/index',
    routes: [
      { exact: true, path: '/yunqi/data', component: DataMgtPage },
      { exact: true, path: '/yunqi/itinerary', component: ItineraryMgtPage },
      { exact: true, path: '/yunqi/swiper', component: SwiperMgtPage },
      { exact: true, path: '/yunqi/photo', component: PhotoMgtPage },
      { exact: true, path: '/yunqi/video', component: VideoMgtPage },
      { exact: true, path: '/yunqi/voice', component: VoiceMgtPage },
      { exact: true, path: '/yunqi/profile', component: ProfileMgtPage },
      { redirect: '/yunqi/data' },
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
