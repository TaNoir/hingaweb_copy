// 00 Section 10.4. Fails if a traffic-light colour word appears outside the allowed places.
// Inside src/config/vocabulary.js and src/copy/en.js, colour words are allowed ONLY between the
// marker comments  // office-tags:start  and  // office-tags:end .
import { walk, read } from './lib.js';

export const COLOUR = /\b(green|yellow|red|amber|emerald|lime|crimson|scarlet)\b/i;

const ALLOWED_WHOLE_FILE = [
  /^supabase\/migrations\/[^/]*_office_tags[^/]*\.sql$/,
  /^src\/features\/guidance\/OfficeTag[^/]*\.jsx$/,
  /^src\/features\/guidance\/office-tag\.css$/,
];
const MARKER_FILES = ['src/config/vocabulary.js', 'src/copy/en.js'];

/** Returns violations [{file, line, text}] for one file's contents. */
export function scanFile(file, text) {
  if (ALLOWED_WHOLE_FILE.some((re) => re.test(file))) return [];
  const markers = MARKER_FILES.includes(file);
  let inside = false;
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (markers && line.includes('office-tags:start')) inside = true;
    if (!(markers && inside) && COLOUR.test(line))
      out.push({ file, line: i + 1, text: line.trim() });
    if (markers && line.includes('office-tags:end')) inside = false;
  });
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('check-colour-words.js')) {
  const files = [
    ...walk('src', ['.js', '.jsx', '.css', '.html', '.json']),
    ...walk('supabase/functions', ['.js', '.json', '.ts']),
    ...walk('supabase/migrations', ['.sql']),
  ];
  const v = files.flatMap((f) => scanFile(f, read(f)));
  if (v.length) {
    for (const x of v) console.error(`check:colours: ${x.file}:${x.line}: ${x.text}`);
    process.exit(1);
  }
  console.log(`check:colours: OK (${files.length} files scanned)`);
}
