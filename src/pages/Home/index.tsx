import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import { getArtistList } from '@/services/artist';

interface AvatarItem {
  key: string;
  src: string;
  label: string;
}

const HomePage = (props: IRouteComponentProps) => {
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getArtistList().then((res: any) => {
      const list: AvatarItem[] = (res.data ?? res).map((item: any) => ({
        key: item.artistId,
        src: item.avatar,
        label: item.name,
      }));
      setAvatars(list);
    });
  }, []);

  // 星空背景
  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.005,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1 || s.alpha <= 0) s.dir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSelectAvatar = (key: string) => {
    history.push('/admin/data');
  };

  return (
    <div className={styles['home_page']}>
      {/* 星空背景 */}
      <canvas ref={canvasRef} className={styles['star-canvas']} />

      <main className={styles['main_container']}>
        <section>
          <div className={styles['avatar-title']}>
            选择一个世界，开启你的跨时空羁绊
          </div>
          <div className={styles['avatar-list']}>
            {avatars.map((item) => (
              <div
                key={item.key}
                className={styles['avatar-item']}
                onClick={() => handleSelectAvatar(item.key)}
              >
                <img src={item.src} alt={item.label} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
