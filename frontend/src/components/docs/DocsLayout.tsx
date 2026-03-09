import { useState } from 'react';
import { DocsSidebar, type DocSection } from './DocsSidebar';
import { DocsContent } from './DocsContent';

const sections: DocSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'privacy-model', label: 'Privacy Model' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'smart-contract', label: 'Smart Contract' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'oracle', label: 'Oracle System' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'faq', label: 'FAQ' },
];

export function DocsLayout() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-20">
      <div className="flex gap-12">
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <DocsSidebar
              sections={sections}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </div>
        </div>

        <div className="flex-1 max-w-[680px]">
          <DocsContent onSectionVisible={setActiveSection} />
        </div>
      </div>
    </div>
  );
}
