import { View, Text } from 'react-native';
import { AuctionTeam } from '@/api/auction';
import { purseHealth, shortMoney } from '@/lib/auctionView';

// "Purses left" — one tile per team, the bar coloured by how much is gone.
export function TeamsStrip({ teams }: { teams: AuctionTeam[] }) {
  if (teams.length === 0) return null;

  return (
    <View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginBottom: 8 }}>
        Purses left
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {teams.map((team) => {
          const { ratio, color } = purseHealth(team.budget, team.initialBudget);
          const initials = team.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          return (
            <View
              key={team._id}
              style={{
                flexGrow: 1,
                flexBasis: '30%',
                minWidth: 96,
                paddingHorizontal: 10,
                paddingVertical: 9,
                backgroundColor: '#1E1E1E',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.10)',
                borderRadius: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: team.primaryColor || '#F97316' }} />
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, color: '#a3a3a3' }}>
                  {initials}
                </Text>
              </View>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#fff' }}>{shortMoney(team.budget)}</Text>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 6, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: color }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
