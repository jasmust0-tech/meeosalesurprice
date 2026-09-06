import React, { useState, useEffect, useMemo, useRef } from 'react';

const format2 = (num: number) => String(num).padStart(2, '0');

export function OfferTimer({ seconds = 11 * 60 + 23 }: { seconds?: number }) {
  const targetRef = useRef(Date.now() + seconds * 1000);

  const calculateTimeLeft = () => {
    const diff = Math.max(0, Math.floor((targetRef.current - Date.now()) / 1000));
    return {
      days: Math.floor(diff / 86400),
      minutes: Math.floor((diff % 86400) / 60),
      seconds: diff % 60
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [flipStates, setFlipStates] = useState({ days: false, minutes: false, seconds: false });

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();

      setFlipStates({
        days: newTime.days !== timeLeft.days,
        minutes: newTime.minutes !== timeLeft.minutes,
        seconds: newTime.seconds !== timeLeft.seconds
      });

      setTimeLeft(newTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const particles = useMemo(() => {
    const colors = ['#17a066', '#ffc94b', '#5fe0a3', '#ff8a3d', '#0b6b47', '#ffe4ad'];
    return Array.from({ length: 22 }).map((_, i) => {
      const isSpark = Math.random() < 0.4;
      const size = isSpark ? (6 + Math.random() * 6) : (3 + Math.random() * 4);
      return {
        id: i,
        className: `particle ${isSpark ? 'spark' : (Math.random() < 0.5 ? 'dot' : '')}`,
        style: {
          left: `${Math.random() * 100}%`,
          width: isSpark ? '2px' : `${size}px`,
          height: `${size}px`,
          background: colors[Math.floor(Math.random() * colors.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          '--drift': `${(Math.random() * 40 - 20).toFixed(0)}px`,
          animationDuration: `${1.6 + Math.random() * 1.8}s`,
          animationDelay: `${Math.random() * 2.6}s`
        } as React.CSSProperties
      };
    });
  }, []);

  return (
    <div className="ticket-container">
      <div className="ticket">
        <div className="icon-badge" role="img" aria-label="gift">
          <div className="particles">
            {particles.map(p => (
              <div key={p.id} className={p.className} style={p.style} />
            ))}
          </div>
          🎁
          <span className="sparkle s1">✦</span>
          <span className="sparkle s2">✦</span>
          <span className="sparkle s3">✦</span>
        </div>

        <div className="label">Offer<br />Ends in</div>

        <div className="timer">
          <span className="segment">
            <span className={`box ${flipStates.days ? 'flip' : ''}`}>
              {format2(timeLeft.days)}
            </span>
            <span className="unit">DAY</span>
          </span>
          <span className="colon">:</span>
          <span className="segment">
            <span className={`box ${flipStates.minutes ? 'flip' : ''}`}>
              {format2(timeLeft.minutes)}
            </span>
            <span className="unit">MIN</span>
          </span>
          <span className="colon">:</span>
          <span className="segment">
            <span className={`box ${flipStates.seconds ? 'flip' : ''}`}>
              {format2(timeLeft.seconds)}
            </span>
            <span className="unit">SEC</span>
          </span>
        </div>
      </div>
    </div>
  );
}
