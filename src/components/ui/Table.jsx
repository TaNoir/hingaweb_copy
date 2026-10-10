/**
 * Accessible table. Below md each row is its own card (labels from data-label), with a gap between
 * cards; from md it is a normal table inside one bordered card.
 * columns: { key, header, render?: (row) => node }[]
 */
export function Table({ columns, rows, caption, getRowKey }) {
  return (
    <div className="md:overflow-hidden md:rounded-card md:border md:border-line md:bg-surface">
      <table className="block w-full border-collapse text-left text-[14px] md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden bg-canvas md:table-header-group">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-ink-muted"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="flex flex-col gap-3 md:table-row-group">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="block rounded-card border border-line bg-surface px-4 py-3 md:table-row md:rounded-none md:border-0 md:border-t md:bg-transparent md:p-0"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.header}
                  className="flex justify-between gap-4 py-1 before:font-semibold before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:px-4 md:py-3 md:before:content-none"
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
