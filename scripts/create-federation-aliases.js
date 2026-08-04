const fs = require('fs');
const path = require('path');

// Canonical output path — must match angular.json outputPath (dist/browser).
// A single source of truth here prevents silent deployment to a wrong directory
// if the builder ever changes its nesting behaviour.
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'browser');

function findOutputDir() {
  const manifestPath = path.join(OUTPUT_DIR, 'remoteEntry.json');
  if (fs.existsSync(manifestPath)) {
    return { dir: OUTPUT_DIR, manifestPath };
  }
  return null;
}

function toAliasFileName(exposeKey) {
  const normalized = String(exposeKey || '')
    .replace(/^\.\//, '')
    .replace(/[^A-Za-z0-9_.-]/g, '-');

  if (!normalized) {
    return null;
  }

  return normalized.endsWith('.js') ? normalized : `${normalized}.js`;
}

function createAliases() {
  const resolved = findOutputDir();

  if (!resolved) {
    console.error('Could not find remoteEntry.json. Run the production build first.');
    process.exit(1);
  }

  const { dir, manifestPath } = resolved;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exposes = Array.isArray(manifest.exposes) ? manifest.exposes : [];

  if (exposes.length === 0) {
    console.error('No exposes found in remoteEntry.json; nothing to alias.');
    process.exit(1);
  }

  console.log(`Using output directory: ${dir}`);

  let created = 0;
  for (const expose of exposes) {
    const key = expose?.key;
    const outFileName = expose?.outFileName;

    const aliasFileName = toAliasFileName(key);
    if (!aliasFileName || !outFileName) {
      console.warn(`Skipping invalid expose entry: ${JSON.stringify(expose)}`);
      continue;
    }

    const targetPath = path.join(dir, outFileName);
    if (!fs.existsSync(targetPath)) {
      console.warn(`Skipping ${key}: target file not found: ${outFileName}`);
      continue;
    }

    if (aliasFileName === outFileName) {
      console.log(`Alias already stable for ${key}: ${aliasFileName}`);
      continue;
    }

    const aliasPath = path.join(dir, aliasFileName);
    const aliasContent = [
      '// Auto-generated stable alias for Native Federation expose.',
      `// Source: ${outFileName}`,
      `export * from './${outFileName}';`,
      `import './${outFileName}';`,
      ''
    ].join('\n');

    fs.writeFileSync(aliasPath, aliasContent, 'utf8');
    created += 1;
    console.log(`Created alias: ${aliasFileName} -> ${outFileName}`);
  }

  if (created === 0) {
    console.log('No new alias files were created.');
  } else {
    console.log(`Created ${created} alias file(s).`);
  }
}

createAliases();
