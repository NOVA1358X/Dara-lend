import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { label: string; href: string }[];
  onLinkClick: (href: string) => void;
}

export function MobileMenu({ isOpen, onClose, links, onLinkClick }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="fixed top-16 left-0 right-0 z-40 bg-[rgba(8,10,18,0.95)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.05)] md:hidden"
    >
      <div className="px-6 py-4 space-y-1">
        {links.map((link) => (
          <button
            key={link.href}
            onClick={() => {
              onLinkClick(link.href);
              onClose();
            }}
            className="block w-full text-left py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            {link.label}
          </button>
        ))}
        <div className="pt-3 border-t border-border-default">
          <Link
            to="/app"
            onClick={onClose}
            className="block w-full text-center py-3 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent-hover transition-colors duration-200"
          >
            Launch App
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
