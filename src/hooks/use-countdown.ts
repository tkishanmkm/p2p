
"use client";

import { useEffect, useState } from 'react';

export const useCountdown = (targetDate: string | number | Date) => {
  const getInitialCountDown = () => {
    const targetTime = new Date(targetDate).getTime();
    if (isNaN(targetTime)) {
      return 0; // Invalid date, countdown is finished
    }
    return targetTime - new Date().getTime();
  };

  const [countDown, setCountDown] = useState(getInitialCountDown());

  useEffect(() => {
    // This effect runs whenever targetDate changes, resetting the countdown state.
    setCountDown(getInitialCountDown());

    const targetTime = new Date(targetDate).getTime();
    if (isNaN(targetTime)) {
      setCountDown(0);
      return;
    }

    const interval = setInterval(() => {
      const newCountDown = targetTime - new Date().getTime();
      if (newCountDown > 0) {
        setCountDown(newCountDown);
      } else {
        setCountDown(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

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
    
