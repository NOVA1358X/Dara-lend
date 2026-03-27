interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 shadow-[0_0_16px_rgba(201,221,255,0.2)] flex-shrink-0">
        <img src="/logo.png" alt="DARA" className="w-full h-full object-cover" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
      </div>
      {!collapsed && (
        <span className="font-headline text-xl text-primary tracking-wide">DARA</span>
      )}
    </div>
  );
}
