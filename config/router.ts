const LoginPage = '@/pages/Login/index';
const HomePage = '@/pages/Home/index';
const DocumentPage = '@/pages/Document/index';
const EssayPage = '@/pages/Essay/index';
const EssayDetailPage = '@/pages/Essay/detail';
const AddPage = '@/pages/Essay/AddPage/index';
const CommentPage = '@/pages/Comment/index';
const CommentListPage = '@/pages/Comment/List';
const WallPaperPage = '@/pages/WallPaper/index';
const WallPaperSchedulesPage = '@/pages/WallPaper/schedules';
const WallPaperEditPage = '@/pages/WallPaper/edit';
const WallPaperDetailPage = '@/pages/WallPaper/detail';

const WallPaperMgtPage = '@/pages/WallPaperMgt/index';
const ReleaseMgtPage = '@/pages/ReleaseMgt/index';
const ArtistMgtPage = '@/pages/ArtistMgt/index';
const ArtistMgtAddPage = '@/pages/ArtistMgt/Add';
const ArtistMgtAppSet = '@/pages/ArtistMgt/AppSet';
const AppSetMgt = '@/pages/AppSetMgt/index';
const AppSetMgtAddPage = '@/pages/AppSetMgt/Add';
const SyncMgtPage = '@/pages/SyncMgt/index';

const DataMgtPage = '@/pages/DataMgt/index';
const ItineraryMgtPage = '@/pages/ItineraryMgt/index';
const SwiperMgtPage = '@/pages/SwiperMgt/index';
const PhotoMgtPage = '@/pages/PhotoMgt/index';
const PhotoMgtAddPage = '@/pages/PhotoMgt/Add';
const PhotoInfoPage = '@/pages/PhotoTag/index';
const VideoMgtPage = '@/pages/VideoMgt/index';
const VideoMgtAddPage = '@/pages/VideoMgt/Add';
const VoiceMgtPage = '@/pages/VoiceMgt/index';
const VoiceMgtAddPage = '@/pages/VoiceMgt/Add';
const BookMgtPage = '@/pages/BookMgt/index';
const PhotoCardsMgtPage = '@/pages/PhotoCardsMgt/index';
const PhotoCardsMgtAddPage = '@/pages/PhotoCardsMgt/Add';
const ImportTasksPage = '@/pages/ImportMgt/index';

const FeedbackPage = '@/pages/Feedback/index';

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
      { exact: true, path: '/admin/photo', component: PhotoMgtPage },
      { exact: true, path: '/admin/photo/add', component: PhotoMgtAddPage },
      { exact: true, path: '/admin/video', component: VideoMgtPage },
      { exact: true, path: '/admin/video/add', component: VideoMgtAddPage },
      { exact: true, path: '/admin/voice', component: VoiceMgtPage },
      { exact: true, path: '/admin/voice/add', component: VoiceMgtAddPage },
      { exact: true, path: '/admin/photocards', component: PhotoCardsMgtPage },
      {
        exact: true,
        path: '/admin/photocards/add',
        component: PhotoCardsMgtAddPage,
      },
      { exact: true, path: '/admin/book', component: BookMgtPage },
      { exact: false, path: '/admin/profile', component: EssayPage },
      { exact: false, path: '/admin/profile/add', component: AddPage },
      {
        exact: false,
        path: '/admin/profile/detail',
        component: EssayDetailPage,
      },
      { exact: true, path: '/admin/import/tasks', component: ImportTasksPage },
      { exact: true, path: '/admin/data', component: DataMgtPage },
      { exact: true, path: '/admin/itinerary', component: ItineraryMgtPage },
      { exact: true, path: '/admin/swiper', component: SwiperMgtPage },
      { exact: true, path: '/admin/wallpaper', component: WallPaperMgtPage },
      { exact: true, path: '/admin/release', component: ReleaseMgtPage },
      {
        exact: true,
        path: '/admin/artist/settings',
        component: ArtistMgtAppSet,
      },
      { exact: true, path: '/admin/artist/add', component: ArtistMgtAddPage },
      { exact: true, path: '/admin/artist', component: ArtistMgtPage },
      { exact: true, path: '/admin/app_settings', component: AppSetMgt },
      {
        exact: true,
        path: '/admin/app_settings/add',
        component: AppSetMgtAddPage,
      },
      { exact: true, path: '/admin/sync', component: SyncMgtPage },
      { exact: true, path: '/admin/photo_info', component: PhotoInfoPage },
      { exact: true, path: '/admin/photo_info', component: PhotoInfoPage },
      { exact: true, path: '/admin/comments', component: CommentListPage },
      { exact: true, path: '/admin/feedback', component: FeedbackPage },

      { redirect: '/admin/photo' },
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
