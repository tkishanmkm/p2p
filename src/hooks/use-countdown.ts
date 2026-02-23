
"use client";

import { useEffect, useState } from 'react';

const useCountdown = (targetDate: string | number | Date) => {
  const [countDown, setCountDown] = useState(0);

  useEffect(() => {
    const getRemainingTime = () => {
        const targetTime = new Date(targetDate).getTime();
        if (isNaN(targetTime)) {
          return 0;
        }
        const currentTime = new Date().getTime();
        return Math.max(0, targetTime - currentTime);
    };
    
    setCountDown(getRemainingTime());

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setCountDown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const hours = Math.floor((countDown / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((countDown / 1000 / 60) % 60);
  const seconds = Math.floor((countDown / 1000) % 60);
  const isFinished = countDown <= 0;

  return { hours, minutes, seconds, isFinished };
};

export { useCountdown };
