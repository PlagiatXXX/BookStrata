import { memo } from 'react';
import type { TemplateLibrarySidebarProps } from '../types';
import { SECTION_LABELS } from '../constants';

export const TemplateLibrarySidebar = memo(({
  activeSection,
  onSectionChange,
  onCreateClick,
}: TemplateLibrarySidebarProps) => {
  const sections: Array<{ key: TemplateLibrarySidebarProps['activeSection'] }> = [
    { key: 'private' },
    { key: 'public' },
    { key: 'new' },
    { key: 'favorites' },
  ];

  return (
    <aside className="tpl-sidebar">
      <ul className="tpl-sidebar-list">
        {sections.map(({ key }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSectionChange(key)}
              className={`tpl-sidebar-link ${activeSection === key ? 'tpl-sidebar-link--active' : ''}`}
            >
              {SECTION_LABELS[key]}
            </button>
          </li>
        ))}
        <li className="tpl-sidebar-create">
          <button
            type="button"
            className="tpl-sidebar-create-btn"
            onClick={onCreateClick}
          >
            Новый тир-лист
          </button>
        </li>
      </ul>
    </aside>
  );
});
