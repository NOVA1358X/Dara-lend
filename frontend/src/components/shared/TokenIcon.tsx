interface TokenIconProps {
  token: 'ALEO' | 'USDCx';
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
