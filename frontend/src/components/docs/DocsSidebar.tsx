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
      <p className="text-label uppercase text-text-muted tracking-widest mb-4">
        Documentation
      </p>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => handleClick(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                activeSection === section.id
                  ? 'text-accent bg-accent/10 font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
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
