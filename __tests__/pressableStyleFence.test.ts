import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

// NativeWind v4 wraps Pressable on native (`cssInterop(Pressable, { className:
// "style" })`) and treats `style` as an object, so the function form
// `style={({ pressed }) => ...}` is silently dropped on a phone — no layout, no
// fill, and a button whose ink matches the page simply vanishes. Web passes it
// straight through, so it looks right in a browser and nowhere else. Press
// feedback goes through `usePress()` in src/lib/motion.ts instead.
const SRC = join(__dirname, '..', 'src');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

it('never passes a function as a style — NativeWind drops it on native', () => {
  const offenders = tsxFiles(SRC).flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (/style=\{\s*\(/.test(line) ? [`${relative(SRC, file)}:${i + 1}`] : [])),
  );
  expect(offenders).toEqual([]);
});
