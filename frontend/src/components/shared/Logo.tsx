interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 1.5L3 7.5v6c0 6.3 4.5 12.18 11 13.5 6.5-1.32 11-7.2 11-13.5v-6L14 1.5z"
          stroke="#00E5CC"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 9.5a2.5 2.5 0 0 0-2.5 2.5v1.5a2.5 2.5 0 0 0 5 0V12a2.5 2.5 0 0 0-2.5-2.5z"
          stroke="#00E5CC"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="14"
          y1="15.5"
          x2="14"
          y2="19"
          stroke="#00E5CC"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      {!collapsed && (
        <span className="font-heading text-[18px] tracking-tight">
          <span className="font-semibold text-text-primary">DARA</span>
          <span className="font-normal text-text-primary ml-1">Lend</span>
        </span>
      )}
    </div>
  );
}
