import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 1800 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) {
        setTimeout(onFinish, 400); // Allow smooth exit fade
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onFinish) {
      setTimeout(onFinish, 200);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#471032] text-white cursor-pointer select-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center text-center"
          >
            {/* Meesho M Emblem Icon */}
            <svg
              viewBox="0 0 140 100"
              className="w-28 h-20 sm:w-32 sm:h-24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 80V40C24 25.5 35.5 14 50 14C64.5 14 74 25.5 74 40V80M74 40C74 25.5 84.5 14 99 14C113.5 14 125 25.5 125 40V80"
                stroke="#FA9E1B"
                strokeWidth="19"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Meesho Wordmark */}
            <span className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight font-sans mt-3 lowercase select-none">
              meesho
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
