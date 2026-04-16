import React, { useEffect, useState } from 'react';
import Lottie from 'react-lottie-player';
import shakyButtonJson from '@/assets/json/shaky_button.json';
import styles from './index.less';
import cycleJson from '@/assets/json/cycle.json';
const HomePage = (props: IRouteComponentProps) => {
  const handleIn = () => {};

  return (
    <div className={styles['home_page']}>
      <main className={styles['main_container']}>
        <section>
          <Lottie loop animationData={cycleJson} play style={{ width: 600 }} />
        </section>
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
