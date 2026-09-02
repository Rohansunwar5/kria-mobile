import { View, Text } from 'react-native';
import { STATUS_TAG } from '@/lib/tournamentConstants';

// .tag from _head.html: solid fill, mono caps at 9px, 3px radius. Never a
// tinted outline — it has to read at 9px on a phone in daylight.
export type TagVariant = 'live' | 'open' | 'auction' | 'up' | 'end' | 'fail' | 'outline';

const VARIANTS: Record<TagVariant, { bg: string; fg: string; border?: string }> = {
  live: { bg: '#F97316', fg: '#0B0B0B' },
  open: { bg: '#16C46A', fg: '#06240F' },
  auction: { bg: '#FA4C93', fg: '#240614' },
  up: { bg: 'rgba(255,255,255,0.10)', fg: '#d4d4d4' },
  end: { bg: 'rgba(255,255,255,0.06)', fg: '#8a8a8a' },
  fail: { bg: '#FF4438', fg: '#2A0703' },
  outline: { bg: 'transparent', fg: '#F97316', border: '#F97316' },
};

export function Tag({ label, variant = 'up', dot }: { label: string; variant?: TagVariant; dot?: boolean }) {
  const v = VARIANTS[variant];
  return (
    <View
      style={{
        backgroundColor: v.bg,
        borderRadius: 3,
        paddingHorizontal: 7,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        ...(v.border ? { borderWidth: 1.5, borderColor: v.border } : null),
      }}
    >
      {dot ? <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: v.fg }} /> : null}
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 9,
          letterSpacing: 0.16 * 9,
          textTransform: 'uppercase',
          color: v.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_TAG[status] ?? STATUS_TAG.draft;
  return <Tag label={cfg.label} variant={cfg.variant} dot={cfg.dot} />;
}
