import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';
import { history } from 'umi';
import astronautJson from '@/assets/json/astronaut.json';
import shakyButtonJson from '@/assets/json/shaky_button.json';
import Lottie from 'react-lottie-player';

interface Props {}

const LoginPage: React.FC<Props> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [value, setValue] = useState<any>(null);

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

  const handleEnter = () => {
    console.log('value', value);

    localStorage.setItem('token', value);
    history.push('/home');
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
        {/* width: '80%',maxWidth: 420  */}
      </div>

      {/* 右半：登录框 */}
      <div className={styles['login-right']}>
        <div className={styles['login-box']}>
          <input
            className={styles['login-input']}
            type="text"
            placeholder="请任意输入你想说的"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className={styles['login-btn-wrap']} onClick={handleEnter}>
            <Lottie
              loop
              animationData={shakyButtonJson}
              play
              style={{ width: 120 }}
            />
            <span className={styles['login-btn-text']}>进 入</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
