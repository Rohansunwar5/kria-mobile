import { View, Text } from 'react-native';
import { AuctionTeam } from '@/api/auction';
import { purseHealth } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { SectionLabel } from '@/components/auction/SectionLabel';

const MICRO = { fontFamily: 'SpaceMono_400Regular' as const, fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

// One row per team: purse left, what they have spent, how many they hold.
// Rows rather than tiles — at phone width a tile cannot fit a real team name,
// and initials alone made this panel unreadable.
export function TeamsStrip({ teams }: { teams: AuctionTeam[] }) {
  if (teams.length === 0) return null;

  return (
    <View>
      <SectionLabel label="Purses left" count={teams.length} />
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {teams.map((team, i) => {
          const { ratio, color } = purseHealth(team.budget, team.initialBudget);
          return (
            <View key={team._id}>
              {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
              <View style={{ paddingHorizontal: 13, paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <InitialsAvatar name={team.name} logo={team.logo} size={26} color={team.primaryColor || '#F97316'} />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#fff' }}>
                    {team.name}
                  </Text>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, color }}>
                    ₹{team.budget.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: color }} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={MICRO}>
                    Spent <Text style={{ fontFamily: 'SpaceMono_700Bold', color: '#d4d4d4' }}>₹{team.totalSpent.toLocaleString('en-IN')}</Text>
                  </Text>
                  <Text style={MICRO}>
                    Squad <Text style={{ fontFamily: 'SpaceMono_700Bold', color: '#d4d4d4' }}>{team.playersCount}</Text>
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
