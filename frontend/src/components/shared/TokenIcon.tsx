interface TokenIconProps {
  token: 'ALEO' | 'USDCx' | 'USAD';
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
