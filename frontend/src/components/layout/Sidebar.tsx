import { NavLink, useLocation } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
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

const navItems = [
  { path: '/app', label: 'Dashboard', icon: ShieldIcon, end: true },
  { path: '/app/supply', label: 'Supply', icon: WalletIcon, end: false },
  { path: '/app/borrow', label: 'Borrow', icon: ArrowDownIcon, end: false },
  { path: '/app/repay', label: 'Repay', icon: UnlockIcon, end: false },
  { path: '/app/withdraw', label: 'Withdraw', icon: KeyIcon, end: false },
  { path: '/app/positions', label: 'Positions', icon: LockIcon, end: false },
  { path: '/app/liquidate', label: 'Liquidate', icon: ZapIcon, end: false },
  { path: '/app/history', label: 'History', icon: ClockIcon, end: false },
  { path: '/app/stats', label: 'Stats', icon: ChartIcon, end: false },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-bg-primary border-r border-[rgba(255,255,255,0.05)] transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`h-16 flex items-center border-b border-[rgba(255,255,255,0.05)] ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}>
          <NavLink to="/" aria-label="DARA Lend Home">
            <Logo collapsed={sidebarCollapsed} />
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
                className={`flex items-center gap-3 rounded-lg transition-all duration-200 relative ${
                  sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-[rgba(0,229,204,0.05)] text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-[rgba(255,255,255,0.02)]'
                }`}
                aria-label={item.label}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-accent rounded-r" />
                )}
                <Icon size={20} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className={`border-t border-[rgba(255,255,255,0.05)] p-3 space-y-2`}>
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-2 h-2 rounded-full bg-accent-success flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-xs text-text-muted">Aleo Testnet</span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface transition-all duration-200"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            >
              <polyline points="10 4 6 8 10 12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-primary border-t border-[rgba(255,255,255,0.05)] backdrop-blur-[16px]">
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
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  active ? 'text-accent' : 'text-text-muted'
                }`}
                aria-label={item.label}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
