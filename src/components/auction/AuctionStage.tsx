import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { AuctionPlayer, AuctionStatus, AuctionTeam } from '@/api/auction';
import { currentBid, bidProgress } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

const SKILL_TONE: Record<string, string> = {
  beginner: '#3B82F6',
  intermediate: '#FFC53D',
  advanced: '#F97316',
  expert: '#A855F7',
};

function Facts({ player }: { player: AuctionPlayer }) {
  const stats = player.careerStats;
  const items = [
    player.profile.age ? { label: 'Age', value: String(player.profile.age) } : null,
    player.profile.gender ? { label: 'Gender', value: player.profile.gender } : null,
    stats?.matchesPlayed ? { label: 'Played', value: String(stats.matchesPlayed) } : null,
    stats?.matchesPlayed ? { label: 'Won', value: String(stats.matchesWon) } : null,
    stats?.pointsContributed ? { label: 'Points', value: String(stats.pointsContributed) } : null,
    stats?.tournamentsPlayed ? { label: 'Events', value: String(stats.tournamentsPlayed) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
      {items.map((it) => (
        <View
          key={it.label}
          style={{
            flexDirection: 'row', alignItems: 'baseline', gap: 5,
            paddingHorizontal: 8, paddingVertical: 4,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 4,
          }}
        >
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.1 * 8, textTransform: 'uppercase', color: '#7d7d7d' }}>
            {it.label}
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#fff', textTransform: 'capitalize' }}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// "On the block" — the pinned headline. Everything a bidder needs without
// scrolling: who, what they cost now, who is winning, and how close the bid is
// to the hard limit.
export function AuctionStage({
  player,
  status,
  teams,
}: {
  player: AuctionPlayer | null;
  status: AuctionStatus;
  teams: AuctionTeam[];
}) {
  const name = player ? `${player.profile.firstName} ${player.profile.lastName}`.trim() : 'Waiting';
  const base = player?.auctionData?.basePrice ?? 0;
  const price = currentBid(status.liveBid?.currentPrice, base);
  const hardLimit = status.settings?.hardLimit ?? 0;
  const leader = teams.find((t) => t._id === status.liveBid?.highestBidderId);
  const skill = player?.profile?.skillLevel;
  const tone = skill ? SKILL_TONE[skill.toLowerCase()] || '#7d7d7d' : null;

  // A raise has to be felt, not just read — the number pulses once per increase.
  const flash = useRef(new Animated.Value(0)).current;
  const prevPrice = useRef(price);
  useEffect(() => {
    if (price <= prevPrice.current) {
      prevPrice.current = price;
      return;
    }
    prevPrice.current = price;
    flash.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(flash, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [price, flash]);

  const pct = bidProgress(price, base, hardLimit);

  return (
    <View style={{ overflow: 'hidden', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Hairlines />
      <Ghost text="BID" size={190} style={{ left: -22, top: -6 }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#FA4C93' }}>
            On the block
          </Text>
          {skill && tone ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, backgroundColor: tone }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.12 * 8, textTransform: 'uppercase', color: '#0B0B0B' }}>
                {skill}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 9 }}>
          <InitialsAvatar name={name} logo={player?.profile?.photo || undefined} size={58} color="#FA4C93" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, lineHeight: 34, color: '#fff' }}>
              {name}
            </Text>
          </View>
        </View>

        {player ? <Facts player={player} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 10, gap: 12 }}>
        <View style={{ minWidth: 0 }}>
          <Text style={LBL}>Current bid</Text>
          <Animated.Text
            style={{
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 42,
              lineHeight: 46,
              color: '#F97316',
              marginTop: 2,
              transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) }],
            }}
          >
            ₹{price.toLocaleString('en-IN')}
          </Animated.Text>
        </View>
        {leader ? (
          <View style={{ alignItems: 'flex-end', paddingBottom: 6, flexShrink: 1 }}>
            <Text style={LBL}>Leading</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
              <InitialsAvatar name={leader.name} logo={leader.logo} size={24} color={leader.primaryColor || '#F97316'} />
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#fff', maxWidth: 110 }}>
                {leader.name}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* How close this lot is to the hard limit — the number that decides
          whether a tie-breaker is coming. */}
      {hardLimit > base ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? '#FF4438' : '#F97316' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: '#7d7d7d' }}>
              BASE ₹{base.toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: pct >= 100 ? '#FF4438' : '#7d7d7d' }}>
              CAP ₹{hardLimit.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      ) : base ? (
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, color: '#7d7d7d', paddingHorizontal: 16, paddingBottom: 12 }}>
          BASE ₹{base.toLocaleString('en-IN')}
        </Text>
      ) : null}

      <Hazard />
    </View>
  );
}
