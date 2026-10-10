// Administrator helpers (Phase 09). Pure functions, tested in adminHelpers.test.js.

/** The newest record of one type for one student, or null. */
function latest(records, type) {
  return (
    records
      .filter((r) => r.type === type)
      .sort((a, b) => new Date(b.signed_at) - new Date(a.signed_at))[0] ?? null
  );
}

/**
 * One row per student for the consent register (Fig 29; Table 14; D-26, D-27).
 * category: 'withdrawn' | 'both' | 'awaiting' | 'noAssent'
 */
export function consentRows(students, records) {
  const byStudent = new Map();
  for (const r of records) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id).push(r);
  }
  return students
    .map((s) => {
      const mine = byStudent.get(s.id) ?? [];
      const parental = latest(mine, 'parental');
      const assent = latest(mine, 'assent');
      let category = 'noAssent';
      if (parental?.status === 'withdrawn' || assent?.status === 'withdrawn')
        category = 'withdrawn';
      else if (parental?.status === 'granted' && assent?.status === 'granted') category = 'both';
      else if (assent?.status === 'granted') category = 'awaiting';
      return { ...s, parental, assent, category };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'en'));
}

export function countBy(rows, key) {
  return rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + 1 }), {});
}

/** Which copy key explains a failed staff_accounts update (Phase 01 trigger messages). */
export function staffUpdateErrorKey(error) {
  const msg = error?.message ?? '';
  if (/own role or status/i.test(msg)) return 'admin.accounts.errors.own';
  if (/at least one active administrator/i.test(msg)) return 'admin.accounts.errors.lastAdmin';
  return 'admin.accounts.errors.generic';
}

/** Valid resource attributes: four integers 0-5 with at least one above 0 (Table 16 CHECK). */
export function validAttributes(a) {
  const values = ['school_work', 'home_family', 'future', 'managing'].map((k) => a?.[k]);
  return values.every((v) => Number.isInteger(v) && v >= 0 && v <= 5) && values.some((v) => v > 0);
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text (header + rows) for the audit export. rows: string[][] */
export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
