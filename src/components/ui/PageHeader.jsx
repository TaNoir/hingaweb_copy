import { Chip } from './Chip.jsx';

export function PageHeader({ eyebrow = null, title, lead = '' }) {
  return (
    <header className="flex flex-col gap-3">
      {eyebrow && <Chip>{eyebrow}</Chip>}
      <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
        {title}
      </h1>
      {lead && <p className="max-w-2xl text-base text-ink-muted">{lead}</p>}
    </header>
  );
}
