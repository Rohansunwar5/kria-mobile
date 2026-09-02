import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { InningsScorecard } from '@/api/cricketMatch';
import { recentBalls, BallKind } from '@/lib/cricketView';
import { Icon } from '@/components/icons';

// Same square vocabulary as the ball-by-ball screen, so the two read as one
// system rather than two takes on the same data.
const SQUARE: Record<BallKind, { bg: string; fg: string; border?: string }> = {
  six: { bg: '#FA4C93', fg: '#240614' },
  four: { bg: '#16C46A', fg: '#06240F' },
  wicket: { bg: '#FF4438', fg: '#2A0703' },
  extra: { bg: 'rgba(255,255,255,0.07)', fg: '#F97316', border: 'rgba(255,255,255,0.12)' },
  dot: { bg: 'rgba(255,255,255,0.07)', fg: '#7d7d7d', border: 'rgba(255,255,255,0.12)' },
  run: { bg: 'rgba(255,255,255,0.07)', fg: '#d4d4d4', border: 'rgba(255,255,255,0.12)' },
};

export function RecentOvers({ innings, matchId }: { innings: InningsScorecard | null; matchId?: string }) {
  const router = useRouter();
  const balls = recentBalls(innings, 3);
  if (balls.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Recent
        </Text>
        {matchId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ball by ball"
            onPress={() => router.push({ pathname: '/cricket/[matchId]/balls', params: { matchId } })}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#F97316' }}>
              Ball by ball
            </Text>
            <Icon name="chevron-right" size={12} color="#F97316" strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 11 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {balls.map((b, i) => {
            const skin = SQUARE[b.kind];
            return (
              <View
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  backgroundColor: skin.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(skin.border ? { borderWidth: 1.5, borderColor: skin.border } : null),
                }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: b.label.length > 1 ? 10 : 12, color: skin.fg }}>
                  {b.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
