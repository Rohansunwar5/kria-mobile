import { View, Text } from 'react-native';
import { AuctionPlayer, AuctionStatus, AuctionTeam } from '@/api/auction';
import { currentBid } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

// "On the block" — the artboard's headline block: magenta kicker, the player in
// Anton, and the current bid at 46px because it is the only number that matters.
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
  const leader = teams.find((t) => t._id === status.liveBid?.highestBidderId);

  const stats = player?.careerStats;
  const winRate = stats && stats.matchesPlayed > 0 ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100) : null;
  const meta = [
    base ? `Base ₹${base.toLocaleString('en-IN')}` : null,
    stats?.matchesPlayed ? `${stats.matchesPlayed} events` : null,
    winRate !== null ? `${winRate}% win rate` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ overflow: 'hidden', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Hairlines />
      <Ghost text="BID" size={190} style={{ left: -22, top: -6 }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#FA4C93' }}>
          On the block
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 13, marginTop: 9 }}>
          <InitialsAvatar name={name} size={58} color="#FA4C93" />
          <View style={{ flex: 1, paddingBottom: 2 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 26, color: '#fff' }}>
              {name}
            </Text>
          </View>
        </View>
        {meta ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 10 }}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
        <View>
          <Text style={LBL}>Current bid</Text>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 46, lineHeight: 42, color: '#F97316', marginTop: 4 }}>
            ₹{price.toLocaleString('en-IN')}
          </Text>
        </View>
        {leader ? (
          <View style={{ alignItems: 'flex-end', paddingBottom: 5 }}>
            <Text style={LBL}>Leading</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
              <InitialsAvatar name={leader.name} size={24} color={leader.primaryColor || '#F97316'} />
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#fff', maxWidth: 120 }}>
                {leader.name}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <Hazard />
    </View>
  );
}
