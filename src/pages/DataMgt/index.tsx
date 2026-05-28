import React, { useState } from 'react';
import styles from './index.less';
import {
  Row,
  Col,
  Card,
  Statistic,
  Tabs,
  Badge,
  Timeline,
  Progress,
  Avatar,
} from 'antd';
import {
  FileTextOutlined,
  RiseOutlined,
  EyeOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileTextFilled,
  PlayCircleOutlined,
  ArrowUpOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { TabPane } = Tabs;

/* ─── mock 数据 ─── */
const coreStats = [
  {
    title: '总内容数',
    value: 2847,
    suffix: '项',
    icon: <FileTextOutlined />,
    color: '#4fc3f7',
    key: 'total',
  },
  {
    title: '本月新增',
    value: 156,
    suffix: '项',
    icon: <RiseOutlined />,
    color: '#7ee787',
    key: 'month',
  },
  {
    title: '总浏览量',
    value: 128460,
    suffix: '次',
    icon: <EyeOutlined />,
    color: '#c084fc',
    key: 'views',
  },
  {
    title: '粉丝互动',
    value: 8942,
    suffix: '次',
    icon: <HeartOutlined />,
    color: '#fb923c',
    key: 'interact',
  },
  {
    title: '最近更新',
    value: '2小时前',
    suffix: '',
    icon: <ClockCircleOutlined />,
    color: '#f472b6',
    key: 'update',
    isText: true,
  },
  {
    title: '存储占用',
    value: 86.4,
    suffix: 'GB',
    icon: <CloudOutlined />,
    color: '#22d3ee',
    key: 'storage',
  },
];

const growthData = [
  { month: '1月', value: 120 },
  { month: '2月', value: 180 },
  { month: '3月', value: 240 },
  { month: '4月', value: 310 },
  { month: '5月', value: 450 },
  { month: '6月', value: 380 },
];

const hotRank = [
  { title: '海边写真', views: 12421 },
  { title: '演唱会饭拍', views: 9882 },
  { title: '机场路透', views: 7113 },
  { title: '生日会现场', views: 6820 },
  { title: '品牌活动', views: 5430 },
];

const categoryPie = [
  { name: '行程', value: 35, color: '#4fc3f7' },
  { name: '照片', value: 28, color: '#f472b6' },
  { name: '视频', value: 20, color: '#fb923c' },
  { name: '音频', value: 10, color: '#7ee787' },
  { name: '档案', value: 7, color: '#c084fc' },
];

const recentActivity = [
  { time: '14:32', content: '上传了《春日写真》相册', type: 'photo' },
  { time: '15:01', content: '新增了杭州行程', type: 'itinerary' },
  { time: '18:22', content: '发布了生日福利视频', type: 'video' },
  { time: '昨天', content: '添加了晚安语音《月光》', type: 'voice' },
  { time: '昨天', content: '更新了档案荣誉信息', type: 'profile' },
  { time: '05-26', content: '新增 Swiper 开屏动画', type: 'swiper' },
];

/* ─── 模块详细数据 ─── */
const moduleData: Record<string, any> = {
  itinerary: {
    stats: [
      { label: '行程总数', value: 186, icon: <EnvironmentOutlined /> },
      { label: '本月行程', value: 12, icon: <RiseOutlined /> },
      { label: '城市覆盖', value: 28, icon: <CloudOutlined /> },
      { label: '最活跃月份', value: '2026-05', icon: <StarOutlined /> },
    ],
    timeline: [
      { month: '2026-05', count: 12 },
      { month: '2026-04', count: 8 },
      { month: '2026-03', count: 15 },
      { month: '2026-02', count: 6 },
      { month: '2026-01', count: 9 },
    ],
    cities: [
      { name: '北京', count: 12 },
      { name: '上海', count: 9 },
      { name: '杭州', count: 5 },
      { name: '成都', count: 4 },
      { name: '深圳', count: 3 },
    ],
    types: [
      { name: '品牌活动', value: 40 },
      { name: '演唱会', value: 25 },
      { name: '拍摄', value: 20 },
      { name: '直播', value: 10 },
      { name: '综艺', value: 5 },
    ],
  },
  swiper: {
    stats: [
      { label: '动画总数', value: 64, icon: <PlayCircleOutlined /> },
      { label: '当前启用', value: 8, icon: <EyeOutlined /> },
      { label: '点击量', value: 45231, icon: <ArrowUpOutlined /> },
      { label: '展示量', value: 182400, icon: <EyeOutlined /> },
    ],
    ctr: 24.8,
    bannerRank: [
      { title: '春日写真', clicks: 12421 },
      { title: '机场路透', clicks: 9882 },
      { title: '生日会', clicks: 7113 },
    ],
    types: [
      { name: '视频', value: 45 },
      { name: 'GIF', value: 30 },
      { name: '图片轮播', value: 25 },
    ],
  },
  photo: {
    stats: [
      { label: '照片总数', value: 1284, icon: <PictureOutlined /> },
      { label: '相册数量', value: 56, icon: <FileTextOutlined /> },
      { label: '本月新增', value: 231, icon: <RiseOutlined /> },
      { label: '总浏览量', value: 89200, icon: <EyeOutlined /> },
    ],
    extra: [
      { label: '收藏量', value: 12450, icon: <StarOutlined /> },
      { label: '下载量', value: 8932, icon: <DownloadOutlined /> },
    ],
    topPhotos: [
      { title: '海边写真', views: 12421 },
      { title: '演唱会舞台', views: 9882 },
      { title: '机场私服', views: 7113 },
      { title: '生日会', views: 6820 },
      { title: '杂志封面', views: 5430 },
    ],
    tags: [
      { name: '舞台', count: 120 },
      { name: '机场', count: 87 },
      { name: '写真', count: 66 },
      { name: '自拍', count: 21 },
      { name: '杂志', count: 18 },
    ],
    monthly: [
      { month: '5月', count: 231 },
      { month: '6月', count: 522 },
      { month: '7月', count: 380 },
      { month: '8月', count: 410 },
    ],
    orientations: [
      { name: '横版', value: 45 },
      { name: '竖版', value: 40 },
      { name: '方图', value: 15 },
    ],
    colors: [
      { name: '红调', value: 30 },
      { name: '蓝调', value: 25 },
      { name: '黑白', value: 20 },
      { name: '胶片', value: 15 },
      { name: '暖调', value: 10 },
    ],
  },
  video: {
    stats: [
      { label: '视频总数', value: 420, icon: <VideoCameraOutlined /> },
      { label: '总播放量', value: 256000, icon: <PlayCircleOutlined /> },
      { label: '平均播放时长', value: '3:42', icon: <ClockCircleOutlined /> },
      { label: '总时长', value: '86h', icon: <ClockCircleOutlined /> },
    ],
    extra: [
      { label: '点赞数', value: 45200, icon: <HeartOutlined /> },
      { label: '分享数', value: 12800, icon: <ShareAltOutlined /> },
    ],
    types: [
      { name: '舞台', value: 35 },
      { name: 'vlog', value: 25 },
      { name: 'cut', value: 20 },
      { name: '花絮', value: 12 },
      { name: 'MV', value: 8 },
    ],
    resolutions: [
      { name: '4K', value: 15 },
      { name: '1080p', value: 65 },
      { name: '720p', value: 20 },
    ],
    durations: [
      { name: '0-30s', value: 30 },
      { name: '30-60s', value: 35 },
      { name: '1-5min', value: 25 },
      { name: '>5min', value: 10 },
    ],
    topVideos: [
      { title: '演唱会全场', views: 45200 },
      { title: '生日vlog', views: 32100 },
      { title: '机场走秀', views: 28400 },
    ],
  },
  voice: {
    stats: [
      { label: '音频总数', value: 156, icon: <SoundOutlined /> },
      { label: '总播放量', value: 89000, icon: <PlayCircleOutlined /> },
      { label: '收藏量', value: 12400, icon: <StarOutlined /> },
      { label: '总时长', value: '18h', icon: <ClockCircleOutlined /> },
    ],
    types: [
      { name: '电台', value: 30 },
      { name: '晚安语音', value: 25 },
      { name: 'live音频', value: 20 },
      { name: '清唱', value: 15 },
      { name: 'ASMR', value: 6 },
      { name: '采访', value: 4 },
    ],
    topVoices: [
      { title: '晚安《月光》', views: 8900 },
      { title: '电台EP01', views: 7200 },
      { title: '清唱《追光》', views: 6800 },
    ],
  },
  profile: {
    stats: [
      { label: '信息完整度', value: '92%', icon: <FileTextFilled /> },
      { label: '已更新字段', value: 48, icon: <RiseOutlined /> },
      { label: '社交平台', value: 6, icon: <CloudOutlined /> },
      { label: '荣誉数量', value: 24, icon: <StarOutlined /> },
    ],
    extra: [{ label: '作品数量', value: 86, icon: <FileTextOutlined /> }],
    history: [
      { year: '2022', event: '正式出道' },
      { year: '2023', event: '发行首专' },
      { year: '2024', event: '首次巡演' },
      { year: '2025', event: '品牌合作' },
    ],
    workTypes: [
      { name: '音乐', value: 45 },
      { name: '影视', value: 25 },
      { name: '杂志', value: 18 },
      { name: '综艺', value: 12 },
    ],
  },
};

/* ─── 辅助组件 ─── */
const StatCard: React.FC<{ item: (typeof coreStats)[0] }> = ({ item }) => (
  <Card className={styles['stat-card']} bordered={false}>
    <div className={styles['stat-icon']} style={{ color: item.color }}>
      {item.icon}
    </div>
    <div className={styles['stat-info']}>
      <div className={styles['stat-title']}>{item.title}</div>
      {item.isText ? (
        <div className={styles['stat-value']} style={{ fontSize: 18 }}>
          {item.value}
        </div>
      ) : (
        <Statistic
          value={item.value as number}
          suffix={item.suffix}
          valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
        />
      )}
    </div>
  </Card>
);

const MiniBarChart: React.FC<{
  data: { month: string; value: number }[];
  color?: string;
}> = ({ data, color = '#4fc3f7' }) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className={styles['mini-bar-chart']}>
      {data.map((d) => (
        <div key={d.month} className={styles['bar-item']}>
          <div className={styles['bar-track']}>
            <div
              className={styles['bar-fill']}
              style={{ height: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className={styles['bar-label']}>{d.month}</span>
        </div>
      ))}
    </div>
  );
};

const RankList: React.FC<{
  data: { title: string; views: number }[];
  color?: string;
}> = ({ data, color = '#4fc3f7' }) => {
  const max = Math.max(...data.map((d) => d.views));
  return (
    <div className={styles['rank-list']}>
      {data.map((item, i) => (
        <div key={item.title} className={styles['rank-item']}>
          <span className={styles['rank-num']} style={{ color }}>
            {i + 1}
          </span>
          <span className={styles['rank-title']}>{item.title}</span>
          <div className={styles['rank-track']}>
            <div
              className={styles['rank-fill']}
              style={{
                width: `${(item.views / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span className={styles['rank-value']}>
            {item.views.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const DonutChart: React.FC<{
  data: { name: string; value: number; color: string }[];
}> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const segments = data.map((d) => {
    const start = acc;
    acc += d.value;
    return { ...d, start, end: acc };
  });
  const r = 50;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={styles['donut-chart-wrap']}>
      <svg viewBox="0 0 120 120" className={styles['donut-chart']}>
        {segments.map((s) => {
          const offset = circumference - (s.start / total) * circumference;
          const dash = (s.value / total) * circumference;
          return (
            <circle
              key={s.name}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          );
        })}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize="14"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="8"
        >
          总计
        </text>
      </svg>
      <div className={styles['donut-legend']}>
        {data.map((d) => (
          <div key={d.name} className={styles['legend-item']}>
            <span
              className={styles['legend-dot']}
              style={{ background: d.color }}
            />
            <span className={styles['legend-name']}>{d.name}</span>
            <span className={styles['legend-value']}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalBar: React.FC<{
  data: { name: string; value: number }[];
  color?: string;
}> = ({ data, color = '#4fc3f7' }) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className={styles['hbar-list']}>
      {data.map((d) => (
        <div key={d.name} className={styles['hbar-item']}>
          <span className={styles['hbar-name']}>{d.name}</span>
          <div className={styles['hbar-track']}>
            <div
              className={styles['hbar-fill']}
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className={styles['hbar-value']}>{d.value}</span>
        </div>
      ))}
    </div>
  );
};

const TagCloud: React.FC<{ tags: { name: string; count: number }[] }> = ({
  tags,
}) => {
  const max = Math.max(...tags.map((t) => t.count));
  return (
    <div className={styles['tag-cloud']}>
      {tags.map((tag) => {
        const ratio = tag.count / max;
        const fontSize = 12 + ratio * 14;
        const opacity = 0.5 + ratio * 0.5;
        return (
          <span
            key={tag.name}
            className={styles['tag-cloud-item']}
            style={{ fontSize, opacity }}
          >
            {tag.name}
            <sup>{tag.count}</sup>
          </span>
        );
      })}
    </div>
  );
};

/* ─── 模块详情卡片 ─── */
const ModulePanel: React.FC<{ name: string }> = ({ name }) => {
  const d = moduleData[name];
  if (!d) return null;

  return (
    <div className={styles['module-panel']}>
      <Row gutter={[16, 16]}>
        {d.stats.map((s: any) => (
          <Col key={s.label} xs={12} sm={12} md={6}>
            <Card className={styles['module-stat-card']} bordered={false}>
              <div className={styles['module-stat-icon']}>{s.icon}</div>
              <div className={styles['module-stat-value']}>{s.value}</div>
              <div className={styles['module-stat-label']}>{s.label}</div>
            </Card>
          </Col>
        ))}
        {d.extra?.map((s: any) => (
          <Col key={s.label} xs={12} sm={12} md={4}>
            <Card className={styles['module-stat-card']} bordered={false}>
              <div className={styles['module-stat-icon']}>{s.icon}</div>
              <div className={styles['module-stat-value']}>{s.value}</div>
              <div className={styles['module-stat-label']}>{s.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* itinerary 专属 */}
      {name === 'itinerary' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="行程时间轴"
              bordered={false}
            >
              <HorizontalBar
                data={d.timeline.map((t: any) => ({
                  name: t.month,
                  value: t.count,
                }))}
                color="#4fc3f7"
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="城市热力排行"
              bordered={false}
            >
              <RankList
                data={d.cities.map((c: any) => ({
                  title: c.name,
                  views: c.count,
                }))}
                color="#7ee787"
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="行程类型占比"
              bordered={false}
            >
              <DonutChart
                data={d.types.map((t: any) => ({
                  name: t.name,
                  value: t.value,
                  color: getTypeColor(t.name),
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* swiper 专属 */}
      {name === 'swiper' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card className={styles['chart-card']} bordered={false}>
              <div className={styles['ctr-circle']}>
                <Progress
                  type="circle"
                  percent={d.ctr}
                  format={() => (
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {d.ctr}%
                    </span>
                  )}
                  strokeColor="#c084fc"
                  trailColor="rgba(255,255,255,0.08)"
                  width={120}
                />
                <div className={styles['ctr-label']}>CTR 点击率</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="Banner 点击排行"
              bordered={false}
            >
              <RankList data={d.bannerRank} color="#c084fc" />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="动画类型占比"
              bordered={false}
            >
              <DonutChart
                data={d.types.map((t: any) => ({
                  name: t.name,
                  value: t.value,
                  color: getSwiperTypeColor(t.name),
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* photo 专属 */}
      {name === 'photo' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="最热门照片 TOP5"
              bordered={false}
            >
              <RankList data={d.topPhotos} color="#f472b6" />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="标签云"
              bordered={false}
            >
              <TagCloud tags={d.tags} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="上传趋势"
              bordered={false}
            >
              <MiniBarChart
                data={d.monthly.map((m: any) => ({
                  month: m.month,
                  value: m.count,
                }))}
                color="#f472b6"
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="照片尺寸分布"
              bordered={false}
            >
              <DonutChart
                data={d.orientations.map((o: any) => ({
                  name: o.name,
                  value: o.value,
                  color: getOrientationColor(o.name),
                }))}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="色系统计"
              bordered={false}
            >
              <HorizontalBar
                data={d.colors.map((c: any) => ({
                  name: c.name,
                  value: c.value,
                }))}
                color="#fb923c"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* video 专属 */}
      {name === 'video' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="热门视频排行"
              bordered={false}
            >
              <RankList data={d.topVideos} color="#fb923c" />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="视频类型占比"
              bordered={false}
            >
              <DonutChart
                data={d.types.map((t: any) => ({
                  name: t.name,
                  value: t.value,
                  color: getVideoTypeColor(t.name),
                }))}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              className={styles['chart-card']}
              title="清晰度分布"
              bordered={false}
            >
              <HorizontalBar
                data={d.resolutions.map((r: any) => ({
                  name: r.name,
                  value: r.value,
                }))}
                color="#4fc3f7"
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="时长区间分布"
              bordered={false}
            >
              <MiniBarChart
                data={d.durations.map((d: any) => ({
                  month: d.name,
                  value: d.value,
                }))}
                color="#fb923c"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* voice 专属 */}
      {name === 'voice' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="热门音频 TOP3"
              bordered={false}
            >
              <RankList data={d.topVoices} color="#7ee787" />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="音频分类占比"
              bordered={false}
            >
              <DonutChart
                data={d.types.map((t: any) => ({
                  name: t.name,
                  value: t.value,
                  color: getVoiceTypeColor(t.name),
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* profile 专属 */}
      {name === 'profile' && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="年份履历"
              bordered={false}
            >
              <Timeline mode="left" className={styles['profile-timeline']}>
                {d.history.map((h: any) => (
                  <Timeline.Item
                    key={h.year}
                    label={
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {h.year}
                      </span>
                    }
                  >
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {h.event}
                    </span>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className={styles['chart-card']}
              title="作品类型占比"
              bordered={false}
            >
              <DonutChart
                data={d.workTypes.map((t: any) => ({
                  name: t.name,
                  value: t.value,
                  color: getWorkTypeColor(t.name),
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

/* ─── 颜色映射 ─── */
function getTypeColor(name: string) {
  const map: Record<string, string> = {
    品牌活动: '#4fc3f7',
    演唱会: '#f472b6',
    拍摄: '#7ee787',
    直播: '#fb923c',
    综艺: '#c084fc',
  };
  return map[name] || '#fff';
}
function getSwiperTypeColor(name: string) {
  const map: Record<string, string> = {
    视频: '#c084fc',
    GIF: '#4fc3f7',
    图片轮播: '#f472b6',
  };
  return map[name] || '#fff';
}
function getOrientationColor(name: string) {
  const map: Record<string, string> = {
    横版: '#4fc3f7',
    竖版: '#f472b6',
    方图: '#7ee787',
  };
  return map[name] || '#fff';
}
function getVideoTypeColor(name: string) {
  const map: Record<string, string> = {
    舞台: '#fb923c',
    vlog: '#4fc3f7',
    cut: '#f472b6',
    花絮: '#7ee787',
    MV: '#c084fc',
  };
  return map[name] || '#fff';
}
function getVoiceTypeColor(name: string) {
  const map: Record<string, string> = {
    电台: '#4fc3f7',
    晚安语音: '#c084fc',
    live音频: '#f472b6',
    清唱: '#7ee787',
    ASMR: '#fb923c',
    采访: '#22d3ee',
  };
  return map[name] || '#fff';
}
function getWorkTypeColor(name: string) {
  const map: Record<string, string> = {
    音乐: '#f472b6',
    影视: '#4fc3f7',
    杂志: '#fb923c',
    综艺: '#7ee787',
  };
  return map[name] || '#fff';
}

const activityColorMap: Record<string, string> = {
  photo: '#f472b6',
  itinerary: '#4fc3f7',
  video: '#fb923c',
  voice: '#7ee787',
  profile: '#c084fc',
  swiper: '#22d3ee',
};

const activityIconMap: Record<string, React.ReactNode> = {
  photo: <PictureOutlined />,
  itinerary: <EnvironmentOutlined />,
  video: <VideoCameraOutlined />,
  voice: <SoundOutlined />,
  profile: <FileTextOutlined />,
  swiper: <PlayCircleOutlined />,
};

/* ─── 主页面 ─── */
const DataMgtPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={styles['data-mgt-page']}>
      {/* 页面标题 */}
      <div className={styles['page-header']}>
        <h1>数据面板</h1>
        <span className={styles['page-subtitle']}>实时运营数据概览</span>
      </div>

      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} className={styles['core-stats-row']}>
        {coreStats.map((item) => (
          <Col key={item.key} xs={12} sm={12} md={8} lg={4}>
            <StatCard item={item} />
          </Col>
        ))}
      </Row>

      {/* 概览图表区 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            className={styles['chart-card']}
            title="内容增长趋势"
            bordered={false}
          >
            <MiniBarChart data={growthData} color="#4fc3f7" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className={styles['chart-card']}
            title="热门内容榜"
            bordered={false}
          >
            <RankList data={hotRank} color="#f472b6" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            className={styles['chart-card']}
            title="内容分类占比"
            bordered={false}
          >
            <DonutChart data={categoryPie} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className={styles['chart-card']}
            title="最近上传动态"
            bordered={false}
          >
            <Timeline className={styles['activity-timeline']}>
              {recentActivity.map((act, i) => (
                <Timeline.Item
                  key={i}
                  dot={
                    <Avatar
                      size="small"
                      icon={activityIconMap[act.type]}
                      style={{
                        background: activityColorMap[act.type] || '#4fc3f7',
                        fontSize: 12,
                      }}
                    />
                  }
                >
                  <div className={styles['activity-item']}>
                    <Badge
                      color={activityColorMap[act.type] || '#4fc3f7'}
                      text={act.time}
                    />
                    <div className={styles['activity-content']}>
                      {act.content}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* 各模块详情 Tabs */}
      <Card
        className={styles['module-tabs-card']}
        bordered={false}
        style={{ marginTop: 16 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={styles['dark-tabs']}
        >
          <TabPane
            tab={
              <span>
                <EnvironmentOutlined /> 行程管理
              </span>
            }
            key="itinerary"
          >
            <ModulePanel name="itinerary" />
          </TabPane>
          <TabPane
            tab={
              <span>
                <PlayCircleOutlined /> 动画管理
              </span>
            }
            key="swiper"
          >
            <ModulePanel name="swiper" />
          </TabPane>
          <TabPane
            tab={
              <span>
                <PictureOutlined /> 照片管理
              </span>
            }
            key="photo"
          >
            <ModulePanel name="photo" />
          </TabPane>
          <TabPane
            tab={
              <span>
                <VideoCameraOutlined /> 视频管理
              </span>
            }
            key="video"
          >
            <ModulePanel name="video" />
          </TabPane>
          <TabPane
            tab={
              <span>
                <SoundOutlined /> 音频管理
              </span>
            }
            key="voice"
          >
            <ModulePanel name="voice" />
          </TabPane>
          <TabPane
            tab={
              <span>
                <FileTextOutlined /> 档案管理
              </span>
            }
            key="profile"
          >
            <ModulePanel name="profile" />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DataMgtPage;
