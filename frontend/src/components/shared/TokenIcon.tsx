interface TokenIconProps {
  token: 'ALEO' | 'USDCx' | 'USAD' | 'BTC' | 'ETH' | 'SOL';
  size?: number;
  className?: string;
}

export function TokenIcon({ token, size = 20, className = '' }: TokenIconProps) {
  if (token === 'ALEO') {
    return (
      <img
        src="/images/aleo.png"
        alt="ALEO"
        width={size}
        height={size}
        className={`inline-block rounded-full ${className}`}
      />
    );
  }

  if (token === 'USAD') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center rounded-full bg-secondary/20 text-secondary font-mono text-[9px] font-bold ${className}`}
      >
        U
      </div>
    );
  }

  if (token === 'ETH') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" className={`inline-block ${className}`}>
        <path fill="#8FFCF3" d="M12 3v6.65l5.625 2.516z"/>
        <path fill="#CABCF8" d="m12 3-5.625 9.166L12 9.651z"/>
        <path fill="#CBA7F5" d="M12 16.477v4.522l5.625-7.784z"/>
        <path fill="#74A0F3" d="M12 21v-4.523l-5.625-3.262z"/>
        <path fill="#CBA7F5" d="m12 15.43 5.625-3.263L12 9.65z"/>
        <path fill="#74A0F3" d="M6.375 12.167 12 15.429V9.651z"/>
        <path fill="#202699" fillRule="evenodd" d="m12 15.429-5.625-3.263L12 3l5.625 9.166zM6.749 11.9l5.16-8.41v6.115zm-.077.23 5.238-2.327v5.364zm5.418-2.327v5.364l5.233-3.038zm0-.198 5.16 2.295-5.16-8.41z" clipRule="evenodd"/>
        <path fill="#202699" fillRule="evenodd" d="M12 16.406 6.375 13.21 12 21l5.625-7.79zm-4.995-2.633 4.905 2.79v4.005zm5.085 2.79v4.005l4.905-6.795z" clipRule="evenodd"/>
      </svg>
    );
  }

  if (token === 'BTC') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" className={`inline-block ${className}`}>
        <path fill="#EAB300" d="M7.5 3v2.25H5.25V7.5h1.125a.56.56 0 0 1 .563.563v7.875a.563.563 0 0 1-.563.562h-.562l-.563 2.25H7.5V21h2.25v-2.25h1.688V21h2.25v-2.25h1.124v-.009c2.2-.134 3.938-1.842 3.938-3.928 0-1.589-1.008-2.958-2.46-3.58.815-.619 1.335-1.558 1.335-2.608 0-2.068-2.25-3.375-3.937-3.375V3h-2.25v2.25H9.75V3zm2.25 13.5v-3.937h3.656a1.97 1.97 0 0 1 0 3.937zm0-9h2.813a1.687 1.687 0 1 1 0 3.375H9.75z"/>
      </svg>
    );
  }

  if (token === 'SOL') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" className={`inline-block ${className}`}>
        <defs>
          <linearGradient id="sol-grad" x1="4" y1="21" x2="20" y2="3" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9945FF"/>
            <stop offset="0.5" stopColor="#14F195"/>
            <stop offset="1" stopColor="#00C2FF"/>
          </linearGradient>
        </defs>
        <path fill="url(#sol-grad)" d="M5.5 16.5h11.88l2.12 2.5H7.62zM5.5 5h11.88l2.12 2.5H7.62zM19.5 10.75H7.62l-2.12 2.5h11.88z"/>
      </svg>
    );
  }

  return (
    <img
      src="/images/usdcx.svg"
      alt="USDCx"
      width={size}
      height={size}
      className={`inline-block rounded-full ${className}`}
    />
  );
}
