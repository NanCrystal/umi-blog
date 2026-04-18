import React, { useEffect, useRef, useState } from 'react';
import Lottie from 'react-lottie-player';
import shakyButtonJson from '@/assets/json/shaky_button.json';
import styles from './index.less';
import catJson from '@/assets/json/cat.json';
import helloJson from '@/assets/json/hello.json';
import cycleJson from '@/assets/json/cycle.json';
const HomePage = (props: IRouteComponentProps) => {
  const lockRef = useRef(false); // 3s 内锁定，禁止再次触发
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toggleCat, setToggleCat] = useState(false);

  const togglleBtn = () => {
    // 3s 锁定期间任何点击都无效
    if (lockRef.current) return;

    // 清掉可能残留的旧 timer（防御性处理）
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 切换到 hello，加锁
    lockRef.current = true;
    setToggleCat(true);

    // 3s 后自动切回 cat，解锁
    timerRef.current = setTimeout(() => {
      setToggleCat(false);
      lockRef.current = false;
      timerRef.current = null;
    }, 3000);
  };
  // 组件卸载时清除 toggle timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return (
    <div className={styles['home_page']}>
      <main className={styles['main_container']}>
        <section>
          <Lottie loop animationData={cycleJson} play style={{ width: 600 }} />
        </section>
        <div className={styles['cat-btn']} onClick={togglleBtn}>
          {!!toggleCat ? (
            <Lottie
              animationData={helloJson}
              play
              loop
              style={{ width: 200 }}
            />
          ) : (
            <Lottie
              animationData={catJson}
              play
              loop
              style={{ width: 200, cursor: 'pointer' }}
            />
          )}
        </div>
        {/* <section className={styles['home_btn_container']}>
          <Lottie
            loop
            animationData={shakyButtonJson}
            play
            style={{ width: 200 }}
          />
          <div className={styles['home_btn']} onClick={handleIn}>
            欢迎访问
          </div>
        </section> */}
      </main>
    </div>
  );
};

export default HomePage;
