import { View, Text } from 'react-native';
import { Icon } from '@/components/icons';
import { colors, useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { RecentMatch } from '@/api/career';

// Extracted verbatim from `src/components/home/PlayPortal.tsx` (profile
// restyle Task 1) so the profile screen can render the same strip. `LBL`,
// `MONO` and `FORM_TOKEN` are local copies of the tokens PlayPortal still
// keeps for its own other uses — this is the one piece PlayPortal no longer
// owns.

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const MONO = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.12 * 10,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const FORM_TOKEN = (theme: Palette): Record<RecentMatch['result'], { token: string; bg: string; fg: string }> => ({
  won: { token: 'W', bg: colors.open, fg: theme.onOpen },
  lost: { token: 'L', bg: colors.fail, fg: theme.onFail },
  tied: { token: 'T', bg: theme.lineFaint, fg: theme.textBody },
  no_result: { token: 'NR', bg: theme.lineFaint, fg: theme.textFaint },
});

/**
 * The last `limit` results, newest on the right — letter as well as colour,
 * so it never depends on hue alone (DESIGN.md §7). `recent` arrives
 * newest-first (the feed order the career API returns); the strip reverses
 * it so the oldest of the shown results sits at the left and the newest at
 * the right, next to the "Newest ▸" cue.
 *
 * Renders nothing for an empty feed — callers that already guard on length
 * (`PlayPortal`) are unaffected; callers that do not (the profile screen)
 * get the same behaviour for free.
 */
export function FormStrip({ recent, limit = 6 }: { recent: RecentMatch[]; limit?: number }) {
  const theme = useTheme();
  const formToken = FORM_TOKEN(theme);
  const form = recent.slice(0, limit).reverse();

  if (form.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderTopWidth: 1.5,
        borderTopColor: theme.lineFaint,
      }}
    >
      <Text style={{ ...LBL(theme), letterSpacing: 0.12 * 9 }}>Form</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {form.map((m) => {
          const t = formToken[m.result];
          return (
            <View
              key={m._id}
              style={{
                minWidth: 19,
                height: 19,
                borderRadius: 3,
                paddingHorizontal: 3,
                backgroundColor: t.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: t.fg }}>{t.token}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <Text style={{ ...MONO(theme), letterSpacing: 0.1 * 10 }}>Newest</Text>
      <Icon name="chevron-right" size={10} color={theme.textFaint} strokeWidth={2.4} />
    </View>
  );
}
