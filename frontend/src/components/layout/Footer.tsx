import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';

const footerColumns = [
  {
    title: 'Protocol',
    links: [
      { label: 'App', href: '/app' },
      { label: 'Docs', href: '/docs' },
      { label: 'GitHub', href: '#' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'Aleo', href: 'https://aleo.org' },
      { label: 'Shield Wallet', href: 'https://shield.app' },
      { label: 'NEAR Intents', href: 'https://docs.near-intents.org' },
      { label: 'Provable', href: 'https://docs.provable.tools' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Twitter', href: '#' },
      { label: 'Discord', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#050508] border-t border-[rgba(255,255,255,0.04)]">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo className="mb-4" />
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Privacy-first money market on Aleo
            </p>
            <p className="text-xs text-text-muted">© 2025 DARA Lend</p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-label uppercase text-text-muted tracking-widest mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2.5">
                {column.links.map((link) =>
                  link.href.startsWith('/') ? (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[rgba(255,255,255,0.04)] text-center">
          <p className="text-xs text-text-muted">
            Built for the Aleo Privacy Buildathon
          </p>
        </div>
      </div>
    </footer>
  );
}
