import { Link } from 'react-router-dom';

const footerColumns = [
  {
    title: 'Protocol',
    links: [
      { label: 'Launch App', href: '/app' },
      { label: 'Documentation', href: '/docs' },
      { label: 'GitHub', href: '#' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'Aleo', href: 'https://aleo.org' },
      { label: 'Shield Wallet', href: 'https://shield.app' },
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
    <footer className="bg-black border-t border-white/[0.06]">
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1">
            <span className="font-headline text-2xl text-primary block mb-2">DARA</span>
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-text-muted mb-6">
              The Obsidian Ledger
            </p>
            <p className="text-sm text-text-secondary font-light leading-relaxed">
              Privacy-first DeFi suite on Aleo.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-label text-[10px] uppercase tracking-[0.25em] text-text-muted mb-5">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) =>
                  link.href.startsWith('/') ? (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-300 font-light"
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
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-300 font-light"
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

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
            &copy; 2025 DARA &mdash; Built for the Aleo Privacy Buildathon
          </p>
          <div className="flex items-center gap-6">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Privacy Policy
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Terms
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
