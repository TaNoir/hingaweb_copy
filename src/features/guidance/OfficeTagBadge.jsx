// Shows an office tag a staff member assigned (Table 13). Never computed or suggested by HingaWeb.
import { OFFICE_TAGS, labelFor } from '../../config/vocabulary.js';
import './office-tag.css';

export function OfficeTagBadge({ tag }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[14px] font-semibold text-ink">
      <span aria-hidden="true" className="office-tag-dot" data-tag={tag} />
      {labelFor(OFFICE_TAGS, tag)}
    </span>
  );
}
