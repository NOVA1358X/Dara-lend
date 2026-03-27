import { useEffect, useRef, useState } from 'react';

interface TextScrambleProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  trigger?: boolean;
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

export function TextScramble({
  text,
  className = '',
  speed = 30,
  delay = 0,
  trigger = true,
}: TextScrambleProps) {
  const [display, setDisplay] = useState(text);
  const [started, setStarted] = useState(false);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!trigger || started) return;

    const timeout = setTimeout(() => {
      setStarted(true);
      let iteration = 0;
      const maxIterations = text.length;

      const scramble = () => {
        const result = text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iteration) return text[i];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');

        setDisplay(result);
        iteration += 0.5;

        if (iteration <= maxIterations) {
          rafRef.current = window.setTimeout(scramble, speed) as unknown as number;
        } else {
          setDisplay(text);
        }
      };

      scramble();
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [trigger, text, speed, delay, started]);

  return <span className={className}>{display}</span>;
}
