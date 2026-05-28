import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';
import { history, useLocation } from 'umi';
import astronautJson from '@/assets/json/astronaut.json';
import shakyButtonJson from '@/assets/json/shaky_button.json';
import Lottie from 'react-lottie-player';
import yunyiImg from '@/assets/images/yunyi.webp';
import haoyiranImg from '@/assets/images/haoyiran.jpg';
import yunqiImg from '@/assets/images/yunqi.jpg';
import request from '@/utils/request';
import { message } from 'antd';

interface Props {}

const avatars = [
  { key: 'yunyi', src: yunyiImg, label: '云熠' },
  { key: 'haoyiran', src: haoyiranImg, label: '郝熠然' },
  { key: 'yunqi', src: yunqiImg, label: '云旗' },
];

const LoginPage: React.FC<Props> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const isManageLogin = location.pathname === '/manage/login';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current!;
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

  const handleSelectAvatar = async (key: string) => {
    try {
      const res: any = await request('/auth/login', {
        method: 'POST',
        data: { username: key, password: '123456' },
      });
      localStorage.setItem('user', res.user);
      localStorage.setItem('token', res.token);
      if (['yunyi', 'haoyiran', 'yunqi'].includes(key)) {
        history.push(`/${key}/data`);
      } else {
        history.push('/home');
      }
    } catch (err: any) {
      message.error(err?.message || '登录失败，请重试');
    }
  };

  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.error('请输入账号和密码');
      return;
    }
    try {
      const res: any = await request('/auth/login', {
        method: 'POST',
        data: { username, password },
      });
      localStorage.setItem('user', res.user);
      localStorage.setItem('token', res.token);
      history.push('/home');
    } catch (err: any) {
      message.error(err?.message || '登录失败，请重试');
    }
  };

  return (
    <div className={styles['login-page']}>
      {/* 星空背景 canvas */}
      <canvas ref={canvasRef} className={styles['star-canvas']} />

      {/* 左半：Lottie 动画 */}
      <div className={styles['login-left']}>
        <Lottie
          loop
          animationData={astronautJson}
          play
          style={{ width: '90%' }}
        />
      </div>

      {/* 右半：登录框 */}
      <div className={styles['login-right']}>
        <div className={styles['login-box']}>
          {!isManageLogin ? (
            <>
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
            </>
          ) : (
            <>
              <input
                className={styles['login-input']}
                type="text"
                placeholder="账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className={styles['login-input']}
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div
                className={styles['login-btn-wrap']}
                onClick={handleAdminLogin}
              >
                <Lottie
                  loop
                  animationData={shakyButtonJson}
                  play
                  style={{ width: 120 }}
                />
                <span className={styles['login-btn-text']}>登 录</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
