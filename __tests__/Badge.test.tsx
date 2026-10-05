import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Badge } from '@/components/profile/Badge';

// Badge pauses its loops off-screen through expo-router's useIsFocused; a bare
// render has no navigator around it.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

type Node = { props?: Record<string, unknown>; children?: unknown[] } | null;

/** testIDs of the badge's layers, in paint order (document order = back to front). */
function layers(node: unknown, out: Node[] = []): Node[] {
  const n = node as Node;
  if (!n || typeof n !== 'object') return out;
  if (typeof n.props?.testID === 'string' && n.props.testID.startsWith('badge-')) out.push(n);
  (n.children ?? []).forEach((c) => layers(c, out));
  return out;
}
const ids = (badge: string) => layers(render(<Badge badge={badge} />).toJSON()).map((n) => n!.props!.testID);

describe('Badge', () => {
  it('paints a legendary badge back to front: aura, orbit ring, sparks, frame, sweep, twinkles', () => {
    expect(ids('season-mvp')).toEqual([
      'badge-aura', 'badge-ring', 'badge-sparks', 'badge-frame', 'badge-sweep',
      'badge-twinkle', 'badge-twinkle', 'badge-twinkle',
    ]);
  });

  it.each([
    ['elite', 'hat-trick', ['badge-aura', 'badge-ring', 'badge-frame', 'badge-sweep']],
    ['gold', 'centurion', ['badge-aura', 'badge-frame', 'badge-sweep']],
    ['rare', 'ace-serve', ['badge-aura', 'badge-frame']],
    ['steel', 'first-cap', ['badge-frame']],
  ])('scales the motion down for %s', (_tier, badge, expected) => {
    expect(ids(badge)).toEqual(expected);
  });

  // The bug: the halo sat exactly under the hexagon, so the opaque plate hid it
  // on native. The aura has to reach past the badge's own box to be seen.
  it('spills the aura past the badge so the plate cannot hide it', () => {
    const [aura] = layers(render(<Badge badge="centurion" size={44} />).toJSON());
    const style = StyleSheet.flatten(aura!.props!.style as object) as { width: number; left: number };
    expect(style.width).toBeGreaterThan(44);
    expect(style.left).toBeLessThan(0);
  });

  // Web paints positioned elements above unpositioned ones whatever the source
  // order — which is why the glow showed on web but not native. Every layer
  // positioned means both platforms paint in source order.
  it('positions every layer, so web stacks them in source order like native', () => {
    const all = layers(render(<Badge badge="season-mvp" />).toJSON());
    expect(all.length).toBeGreaterThan(1);
    for (const layer of all) {
      expect(StyleSheet.flatten(layer!.props!.style as object)).toMatchObject({ position: 'absolute' });
    }
  });
});
