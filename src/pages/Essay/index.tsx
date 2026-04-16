import React, { useEffect } from 'react';
import styles from './index.less';
import { history } from 'umi';

interface EssayItem {
  value: number;
  title: string;
  desc: string;
  date: string;
}

const EssayPage: React.FC = () => {
  useEffect(() => {}, []);

  const list: EssayItem[] = [
    {
      value: 1,
      title: '暑意尚存，立秋已至',
      desc: '在某个人潮涌动的城市街角对视相遇的一众人 相识已久，却又各奔东西，留下的是彼此都懂的眼神和心照不宣。',
      date: '发表于 2021年09月06日',
    },
    {
      value: 2,
      title: '情信鸿三折',
      desc: '有人 说我 对你的感情是若即若离 是忽冷忽热 忽远忽近 那是因为我始终在你身边 却从未拥有过你。',
      date: '发表于 2021年06月28日',
    },
    {
      value: 3,
      title: '查无此人',
      desc: '故人忘了我 我也忘了故人 曾经的我们站在阳光里 光线穿过发梢 以为未来无限可期。',
      date: '发表于 2021年04月23日',
    },
    {
      value: 1,
      title: '还差有多少',
      desc: '还差多少才能抵达你 还差多少才能抱到你 不知道自己还差多少 只是每一步都朝着你走着。',
      date: '发表于 2021年02月07日',
    },
    {
      value: 2,
      title: '猫笔',
      desc: '我知道你要离开了 天知道我有多舍不得 火光在闪 山在摇 我想握住你的手说 留下来吧 可是我没有。',
      date: '发表于 2021年02月02日',
    },
    {
      value: 3,
      title: '神殿',
      desc: '旅人走了 忘了是几次告别 忘了曾几何时 为那几句 沿途风景 山和海 走了一程又一程。',
      date: '发表于 2021年02月01日',
    },
    {
      value: 1,
      title: '房',
      desc: '某一个小城市的深夜 灯火通明却空无一人 梦里的你敲了敲我的窗 说，我回来了 我睁眼 只有月色。',
      date: '发表于 2021年01月12日',
    },
    {
      value: 2,
      title: '我好想离开了',
      desc: '喜欢的人突然就变成时间的时候就有一点失落 时间过去了 就再也回不来了 也找不到我想 我就守着那些 温暖的心情 和回忆 把你收起 就像收起那些珍贵的老照片 一点点发黄一点点的变老你是我生命里的一部分所以生命总是不完整的我知道你也一定是去寻找你生命中的那部分不管错过多少次流连 不管多少次误会爱上别人 不管多么晚才发现自己的心意 兜兜转转绕了一个圈回来 你也刚好站在那里如果是百分百恋人的话.... 我也会以百分百的热情寻找百分百的恋人',
      date: '发表于 2020年12月23日',
    },
  ];

  const handlePush = (item: EssayItem) => {
    const token = localStorage.getItem('token');
    const isAdmin = token === '121414';
    if (isAdmin) {
      // admin：跳转到编辑页并回显数据
      history.push('/add', { editMode: true, data: item });
    } else {
      // guest：跳转到详情页
      history.push('/essay/detail', { data: item });
    }
  };

  return (
    <div className={styles['essay-wrapper']}>
      <div className={styles['essay-main']}>
        {list.map((item, index) => (
          <div
            key={index}
            className={styles['essay-card']}
            onClick={() => handlePush(item)}
          >
            <div className={styles['card-cover']}>
              <img
                alt={item.title}
                src={require(`../../assets/images/${item.value}.jpg`)}
              />
            </div>
            <div className={styles['card-body']}>
              <div className={styles['card-title']}>{item.title}</div>
              <div className={styles['card-desc']}>{item.desc}</div>
              <div className={styles['card-date']}>{item.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EssayPage;
