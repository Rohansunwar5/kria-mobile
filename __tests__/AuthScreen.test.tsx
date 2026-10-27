import { StyleSheet, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { AuthScreen } from '../src/components/signin/AuthScreen';
import { FooterBar } from '../src/components/ui/Bars';
import { Button } from '../src/components/ui/Button';

describe('AuthScreen', () => {
  it('stretches the footer across the FooterBar row', () => {
    render(<AuthScreen footer={<View style={{ gap: 12 }}><Button label="Go" onPress={() => {}} /></View>}><View /></AuthScreen>);
    // FooterBar's host row, then whatever sits directly in it.
    const row = screen.UNSAFE_getByType(FooterBar).findAll((n) => typeof n.type === 'string')[0];
    const child = row.children[0] as ReactTestInstance;
    expect(StyleSheet.flatten(child.props.style)).toMatchObject({ flex: 1 });
  });
});
