import type { ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Badge } from '@/components/profile/Badge';
import { Skeleton, ErrorBlock } from '@/components/states';
import { badgeFor, type Honor, type Tier } from '@/lib/badges';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { Achievement } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.16 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

// The tier word in its tier's colour, through the ink tokens so it stays
// legible on light surfaces too (DESIGN.md §7). Steel has no accent.
const TIER_INK: Record<Tier, keyof Palette> = {
  legendary: 'auctionInk',
  elite: 'auctionInk',
  gold: 'brandInk',
  rare: 'openInk',
  steel: 'textMeta',
};

/**
 * Glyph per milestone id — the ids `deriveAchievements` (server
 * `careerStats.service.ts`) emits. A future id this build has never seen falls
 * back to `medal`: the list is server-driven, and a generic glyph beats a
 * broken screen. `sports-2` has no multi-sport glyph, so `chart` stands in.
 */
const GLYPH: Partial<Record<string, IconName>> = {
  'matches-50': 'medal',
  'matches-100': 'flame',
  'wins-25': 'trophy',
  'sports-2': 'chart',
};

function Tile({ art, word, wordColor, title, a11y }: { art: ReactNode; word: string; wordColor: string; title: string; a11y: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{
        width: 124,
        alignItems: 'center',
        gap: 5,
        paddingTop: 14,
        paddingHorizontal: 10,
        paddingBottom: 12,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderRadius: 6,
        backgroundColor: theme.surface,
      }}
    >
      {art}
      <Text style={{ ...LBL(theme), color: wordColor, marginTop: 4 }}>{word}</Text>
      <Text
        numberOfLines={2}
        style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text, textAlign: 'center' }}
      >
        {title}
      </Text>
    </View>
  );
}

/** Locked milestones, closest to unlocking first — by progress fraction, not
 *  the server's fixed order, which would sometimes lead with one nowhere close
 *  while a later one sits at 90%. */
function NextMilestones({ locked }: { locked: Achievement[] }) {
  const theme = useTheme();
  const ordered = [...locked].sort((a, b) => b.progress / b.target - a.progress / a.target);
  return (
    <View style={{ marginTop: 10, padding: 12, gap: 11, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, backgroundColor: theme.surface }}>
      <Text style={LBL(theme)}>Next milestones</Text>
      {ordered.map((a, i) => {
        const width = `${Math.min(1, a.progress / a.target) * 100}%` as const;
        return (
          <View key={a.id} accessible accessibilityLabel={`${a.label}, ${a.progress} of ${a.target} — locked`} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontFamily: i === 0 ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_400Regular', fontSize: 13, color: i === 0 ? theme.text : theme.textBody }}
              >
                {a.label}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: theme.text }}>{`${a.progress}/${a.target}`}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.fillSoft, overflow: 'hidden' }}>
              <View style={{ width, height: 5, backgroundColor: theme.brand }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Everything a player has won, on one shelf: organiser-granted honours newest
 * first, then legacy titles (the auto "Winner of …" strings, drawn with the
 * champion art), then earned milestones. Under it, the milestones still to
 * come.
 *
 * Renders NOTHING when there is nothing at all to show and nothing loading.
 * The career's achievement list always holds every milestone, earned or not,
 * so an empty one means it was never loaded, not that there is nothing to earn.
 */
export function TrophyCabinet({
  honors,
  titles,
  achievements,
  loading,
  error,
  onRetry,
}: {
  honors?: Honor[];
  titles?: string[];
  achievements: Achievement[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const shelf: Honor[] = [...(honors ?? [])].reverse().concat((titles ?? []).map((title) => ({ title, badge: '' })));
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (!shelf.length && !achievements.length && !loading && !error) return null;

  const meta = [
    shelf.length ? `${shelf.length} ${shelf.length === 1 ? 'honour' : 'honours'}` : null,
    earned.length ? `${earned.length} ${earned.length === 1 ? 'milestone' : 'milestones'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const progress = () => {
    if (error) {
      return <ErrorBlock label="Achievements" title="Couldn’t load achievements" message="Pull to refresh, or try again in a moment." onRetry={onRetry} />;
    }
    if (loading && !achievements.length) return <Skeleton h={96} style={{ marginTop: 10 }} />;
    return locked.length ? <NextMilestones locked={locked} /> : null;
  };

  return (
    <View style={{ paddingTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10, paddingHorizontal: 16 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 24, color: theme.text }}>Trophy cabinet</Text>
        {meta ? <Text style={{ ...LBL(theme), fontSize: 10, paddingBottom: 3 }}>{meta}</Text> : null}
      </View>

      {shelf.length || earned.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {shelf.map((h, i) => {
            const { tier } = badgeFor(h.badge);
            return (
              <Tile
                key={`honour-${i}`}
                art={<Badge badge={h.badge} size={48} />}
                word={tier}
                wordColor={theme[TIER_INK[tier]]}
                title={h.title}
                a11y={`${h.title}, ${tier} honour`}
              />
            );
          })}
          {earned.map((a) => (
            <Tile
              key={a.id}
              art={
                <View style={{ width: 48, height: 48, borderRadius: 4, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={GLYPH[a.id] ?? 'medal'} size={24} color={theme.brandInk} />
                </View>
              }
              word="Milestone"
              wordColor={theme.brandInk}
              title={a.label}
              a11y={`${a.label} — earned`}
            />
          ))}
        </ScrollView>
      ) : !loading && !error ? (
        <View style={{ marginHorizontal: 16, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.keyline, borderRadius: 6 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta }}>
            Honours from organisers, knockout titles and earned milestones are kept here.
          </Text>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16 }}>{progress()}</View>
    </View>
  );
}
