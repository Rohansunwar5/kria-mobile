import { ANTON_MIN_LEADING, analyseSource } from '../test-utils/antonLeading';

// Unit tests for the fence's analyser. The fence itself
// (__tests__/antonLeading.test.ts) walks the real source tree and can only ever
// say "clean" or "these lines are wrong" — it cannot prove it would CATCH a
// given shape. These tests do that, against synthetic source.
//
// The hole they exist to close: the analyser used to read `fontSize:` with
// /(\d+)/, so any non-literal value — a ternary, a computed size — produced no
// match and the site was skipped IN SILENCE. Three real violations shipped
// through it, and two more were sitting in the tree undetected.

const style = (body: string) => `<Text style={{ fontFamily: 'Anton_400Regular', ${body} }}>x</Text>`;

describe('anton leading analyser', () => {
  it('passes a literal style that clears the floor', () => {
    expect(analyseSource('a.tsx', style('fontSize: 18, lineHeight: 22'))).toEqual([]);
  });

  it('flags a literal style under the floor, with the ratio', () => {
    const [finding] = analyseSource('a.tsx', style('fontSize: 18, lineHeight: 20'));
    expect(finding).toMatchObject({ kind: 'violation', size: 18, lineHeight: 20 });
    expect(finding.kind === 'violation' && finding.ratio).toBeCloseTo(1.111, 3);
  });

  it('passes a style with no lineHeight at all', () => {
    // No lineHeight means the font's natural 1.505em applies, which is safe.
    expect(analyseSource('a.tsx', style('fontSize: 18'))).toEqual([]);
  });

  it('reads a style spread over several lines', () => {
    const src = [
      '<Text style={{',
      "  fontFamily: 'Anton_400Regular',",
      '  fontSize: 30,',
      '  lineHeight: 34,',
      '}}>x</Text>',
    ].join('\n');
    expect(analyseSource('a.tsx', src)).toHaveLength(1);
  });

  it('never pairs a fontSize with a lineHeight from a nested style', () => {
    // Cross-pairing would report a violation that is not there, and a fence
    // that cries wolf gets muted by the next person who trips it.
    const src = `<Text style={{ fontFamily: 'Anton_400Regular', fontSize: 18, lineHeight: 22, shadow: { fontSize: 40, lineHeight: 10 } }}>x</Text>`;
    expect(analyseSource('a.tsx', src)).toEqual([]);
  });

  // ---- the new capability ----

  it('verifies a ternary fontSize against a literal lineHeight', () => {
    // 22 / max(17, 18) = 1.222 — safe on BOTH branches, so it must not be
    // flagged. This is the case that proves the widening does not cry wolf.
    expect(analyseSource('a.tsx', style('fontSize: subtitle ? 17 : 18, lineHeight: 22'))).toEqual([]);
  });

  it('flags a ternary fontSize whose worst branch breaches the floor', () => {
    // The real canvas.tsx bug: 16/17 = 0.941 and 20/18 = 1.111, both under.
    const [finding] = analyseSource(
      'a.tsx',
      style('fontSize: subtitle ? 17 : 18, lineHeight: subtitle ? 16 : 20')
    );
    expect(finding.kind).toBe('violation');
    expect(finding.kind === 'violation' && finding.ratio).toBeLessThan(ANTON_MIN_LEADING);
  });

  it('reports a computed style as unverifiable instead of skipping it', () => {
    // `size * 0.78` has no integer the analyser can trust — and 0.78's digits
    // must NOT be mistaken for a lineHeight of 0 or 78.
    const [finding] = analyseSource('a.tsx', style('fontSize: size, lineHeight: size * 0.78'));
    expect(finding.kind).toBe('unverifiable');
  });

  it('honours an explicit exemption on an unverifiable style', () => {
    const src = [
      '// anton-leading-exempt: decorative oversized art type, clipping is the look',
      style('fontSize: size, lineHeight: size * 0.78'),
    ].join('\n');
    expect(analyseSource('a.tsx', src)).toEqual([]);
  });

  it('requires the exemption to sit next to the style it exempts', () => {
    // The window is deliberately tight. A marker that carries across hundreds
    // of characters would let one comment silently exempt an unrelated style
    // further down the file — which is the hole, wearing a different hat.
    // This is why the real exemption in states.tsx puts the marker on the LAST
    // comment line, immediately above `style={[`, and the prose above it.
    const src = [
      '// anton-leading-exempt: about something else entirely',
      ...Array(8).fill('// ................................................................'),
      style('fontSize: size, lineHeight: size * 0.78'),
    ].join('\n');
    expect(analyseSource('a.tsx', src)).toHaveLength(1);
  });

  it('does not let an exemption hide a style it can actually measure', () => {
    // An exemption is for what the analyser CANNOT check. Letting it suppress a
    // measured breach would turn one comment into a way to mute the fence.
    const src = ['// anton-leading-exempt: not a real reason', style('fontSize: 18, lineHeight: 20')].join('\n');
    expect(analyseSource('a.tsx', src)).toHaveLength(1);
  });

  it('ignores styles that are not Anton', () => {
    expect(
      analyseSource('a.tsx', `<Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 18, lineHeight: 9 }}>x</Text>`)
    ).toEqual([]);
  });

  it('reports the line the style sits on', () => {
    const src = ['', '', style('fontSize: 18, lineHeight: 20')].join('\n');
    expect(analyseSource('a.tsx', src)[0].line).toBe(3);
  });
});
