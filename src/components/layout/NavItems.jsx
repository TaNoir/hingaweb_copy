import { NavLink } from 'react-router';
import { cx } from '../ui/cx.js';

/** items: { to, label, badge? }[]. NavLink sets aria-current="page" on the active item. */
export function NavItems({ items, onNavigate, vertical = false }) {
  return (
    <ul className={cx('flex gap-1', vertical ? 'flex-col' : 'flex-row items-center')}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end ?? false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px]',
                isActive ? 'bg-action font-semibold text-action-ink' : 'text-ink hover:bg-blush',
              )
            }
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className="rounded-full bg-blush-strong px-2 text-[12px] font-semibold text-ink"
                aria-label={item.badgeLabel}
              >
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
