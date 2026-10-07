import { View, Text, Pressable } from 'react-native';
import { Tag, type TagVariant } from '@/components/StatusPill';
import { championName } from '@/lib/quickKnockoutView';
import { useTheme } from '@/lib/theme';
import type { QuickKnockout } from '@/api/quickKnockout';

const STATUS: Record<QuickKnockout['status'], { label: string; variant: TagVariant; dot?: boolean }> = {
  waiting: { label: 'Waiting', variant: 'up' },
  live: { label: 'Live', variant: 'live', dot: true },
  completed: { label: 'Ended', variant: 'end' },
  cancelled: { label: 'Cancelled', variant: 'fail' },
};

/** One knockout in the profile section and on the My knockouts screen. */
export function KnockoutRow({ knockout: k, viewerId, onPress }: { knockout: QuickKnockout; viewerId?: string; onPress: () => void }) {
  const theme = useTheme();
  const s = STATUS[k.status];
  const champion = k.status === 'completed' ? championName(k) : '';
  const host = Boolean(viewerId && k.hostId === viewerId);
  const label = [`Open knockout ${k.name}`, s.label, host ? 'Host' : '', champion ? `champion ${champion}` : ''].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, padding: 12, gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: theme.text }}>{k.name}</Text>
        {host ? <Tag label="Host" variant="outline" /> : null}
        <Tag label={s.label} variant={s.variant} dot={s.dot} />
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: theme.textFaint }}>
        {k.format}{champion ? ` · Champion ${champion}` : ''}
      </Text>
    </Pressable>
  );
}
