import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { analyseSource, describeFinding, ANTON_MIN_LEADING } from '../test-utils/fontLeading';

// The fence. Anton clips its capitals on iOS below ANTON_MIN_LEADING — the
// reasoning and the metrics are on the analyser, which is unit-tested in
// __tests__/fontLeadingFence.test.ts because a fence cannot prove it would
// catch a shape it never meets.
//
// NEVER weaken this to make a screen pass. Raise the lineHeight; the sizes are
// the design and the leading is not.
//
// A style the analyser cannot measure is NOT a pass. It is reported, and the
// only way past it is an explicit `anton-leading-exempt: <reason>` comment.
// Silent skipping is exactly how three violations shipped and two more sat in
// the tree undetected.

test('every Anton style clears the iOS clipping floor, or says why it cannot', () => {
  const files: string[] = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  const findings = files.flatMap((file) => analyseSource(file, readFileSync(file, 'utf8')));

  expect(findings.map(describeFinding)).toEqual([]);
  expect(ANTON_MIN_LEADING).toBe(1.188);
});
