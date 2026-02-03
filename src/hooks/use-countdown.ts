"use client";

import { useEffect, useState } from 'react';

export const useCountdown = (targetDate: string | number | Date) => {
  const countDownDate = new Date(targetDate).getTime();

  const [countDown, setCountDown] = useState(
    countDownDate - new Date().getTime()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountDown = countDownDate - new Date().getTime();
      if (newCountDown > 0) {
        setCountDown(newCountDown);
      } else {
        setCountDown(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countDownDate]);

  return getReturnValues(countDown);
};

const getReturnValues = (countDown: number) => {
  const hours = Math.floor(
    (countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((countDown % (1000 * 60)) / 1000);
  const isFinished = countDown <= 0;

  return { hours, minutes, seconds, isFinished };
};
    