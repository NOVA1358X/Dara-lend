export interface DocSection {
  id: string;
  label: string;
}

interface DocsSidebarProps {
  sections: DocSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export function DocsSidebar({
  sections,
  activeSection,
  onSectionChange,
}: DocsSidebarProps) {
  const handleClick = (id: string) => {
    onSectionChange(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav aria-label="Documentation sections">
      <p className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
        Documentation
      </p>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => handleClick(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                activeSection === section.id
                  ? 'text-primary bg-primary/10 font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
              }`}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
