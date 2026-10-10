// Phase 10 · the build Vercel runs. Production deployments (the pilot) use build:pilot, which
// refuses to build while any placeholder, provisional scoring value, provisional check-in item,
// or provisional assent wording remains (00 Section 11.3). Preview deployments use the normal
// build so the team can test before those are final.
import { execSync } from 'node:child_process';

const production = process.env.VERCEL_ENV === 'production';
console.log(`vercel-build: ${production ? 'production -> build:pilot' : 'preview -> build'}`);
try {
  execSync(production ? 'npm run build:pilot' : 'npm run build', { stdio: 'inherit' });
} catch {
  console.error('vercel-build: build failed (see the messages above)');
  process.exit(1);
}
