import { View, Text } from 'react-native';
import { AuctionSoldLog } from '@/api/auction';
import { latestFirst } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { EmptyState } from '@/components/states';

// "Sold so far", newest first. `youId` marks the signed-in player's own row in
// magenta — the auction colour also means "you" across the design.
export function SoldLogList({ logs, youName }: { logs: AuctionSoldLog[]; youName?: string }) {
  const rows = latestFirst(logs, 50);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Sold so far
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#F97316' }}>
          {String(logs.length).padStart(2, '0')}
        </Text>
      </View>

      {rows.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="Nobody sold yet"
          message="Players land here the moment the hammer falls, newest at the top."
        />
      ) : (
        <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
          {rows.map((log, i) => {
            const unsold = !log.teamId || log.finalPrice <= 0;
            const isYou = !!youName && log.playerName.trim().toLowerCase() === youName.trim().toLowerCase();
            return (
              <View key={log._id || `${log.registrationId}-${i}`}>
                {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9 }}>
                  <Text style={{ width: 20, fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#7d7d7d' }}>
                    {String(rows.length - i).padStart(2, '0')}
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: unsold ? '#d4d4d4' : '#fff' }}>
                      {log.playerName}
                    </Text>
                    {isYou ? (
                      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#FA4C93' }}>YOU</Text>
                    ) : null}
                  </View>
                  {unsold ? (
                    <Tag label="Unsold" variant="end" />
                  ) : (
                    <InitialsAvatar name={log.teamName} size={20} />
                  )}
                  <Text style={{ fontFamily: unsold ? 'SpaceMono_400Regular' : 'SpaceMono_700Bold', fontSize: 12, color: unsold ? '#7d7d7d' : '#16C46A', minWidth: 58, textAlign: 'right' }}>
                    {unsold ? '—' : `₹${log.finalPrice.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
