import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { ICON_PATHS, type IconName } from './iconPaths';

export type { IconName };

/** Material Symbols Outlined. `variant` falls back to the wght-300 outline. */
export function Icon({ name, size = 24, color = colors.text, variant = 'o' }: {
  name: IconName;
  size?: number;
  color?: string;
  variant?: 'o' | 'f' | 'b';
}) {
  const paths = ICON_PATHS[name] as Partial<Record<'o' | 'f' | 'b', string>>;
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={paths[variant] ?? paths.o} fill={color} />
    </Svg>
  );
}

export const SPORT_ICONS: Record<string, IconName> = {
  badminton: 'sports_tennis',
  tennis: 'sports_tennis',
  cricket: 'sports_cricket',
  table_tennis: 'table_restaurant',
  football: 'sports_soccer',
  kabaddi: 'sports_kabaddi',
};

export const sportIcon = (sport?: string): IconName => (sport && SPORT_ICONS[sport]) || 'sports';
