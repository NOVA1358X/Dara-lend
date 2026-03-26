import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { WalletIcon } from '@/components/icons/WalletIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import { ChartIcon } from '@/components/icons/ChartIcon';
import { ZapIcon } from '@/components/icons/ZapIcon';
import { KeyIcon } from '@/components/icons/KeyIcon';
import { ClockIcon } from '@/components/icons/ClockIcon';
import { LinkIcon } from '@/components/icons/LinkIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';

const navItems = [
  { path: '/app', label: 'Dashboard', icon: ShieldIcon, end: true },
  { path: '/app/supply', label: 'Supply', icon: WalletIcon, end: false },
  { path: '/app/borrow', label: 'Borrow', icon: ArrowDownIcon, end: false },
  { path: '/app/repay', label: 'Repay', icon: UnlockIcon, end: false },
  { path: '/app/withdraw', label: 'Withdraw', icon: KeyIcon, end: false },
  { path: '/app/positions', label: 'Positions', icon: LockIcon, end: false },
  { path: '/app/liquidate', label: 'Liquidate', icon: ZapIcon, end: false },
  { path: '/app/yield', label: 'Yield', icon: LinkIcon, end: false },
  { path: '/app/transfer', label: 'Transfer', icon: EyeOffIcon, end: false },
  { path: '/app/history', label: 'History', icon: ClockIcon, end: false },
  { path: '/app/analytics', label: 'Analytics', icon: ChartIcon, end: false },
  { path: '/app/stats', label: 'Stats', icon: ShieldIcon, end: false },
  { path: '/app/admin', label: 'Admin', icon: KeyIcon, end: false },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-black border-r border-white/[0.06] transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`h-[72px] flex items-center border-b border-white/[0.06] ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}>
          <NavLink to="/" aria-label="DARA Lend Home">
            {sidebarCollapsed ? (
              <span className="font-headline text-lg text-primary">D</span>
            ) : (
              <span className="font-headline text-xl text-primary tracking-wide">DARA</span>
            )}
          </NavLink>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/app';
            const isDashActive = item.path === '/app' && location.pathname === '/app';
            const active = isActive || isDashActive;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg transition-all duration-300 relative ${
                  sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-white/[0.04] text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
                }`}
                aria-label={item.label}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 signature-gradient rounded-r" />
                )}
                <Icon size={20} />
                {!sidebarCollapsed && (
                  <span className="font-label text-xs uppercase tracking-[0.12em]">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-2 h-2 rounded-full bg-accent-success flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted">Aleo Testnet</span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-white/[0.03] transition-all duration-300"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width={16} height={16} viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            >
              <polyline points="10 4 6 8 10 12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 border-t border-white/[0.06] backdrop-blur-[20px]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/app';
            const isDashActive = item.path === '/app' && location.pathname === '/app';
            const active = isActive || isDashActive;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors duration-300 ${
                  active ? 'text-primary' : 'text-text-muted'
                }`}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span className="font-label text-[9px] uppercase tracking-[0.1em]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
