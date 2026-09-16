import { View, Text } from 'react-native';
import { AuctionUpcoming } from '@/api/auction';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { EmptyState } from '@/components/states';
import { SectionLabel } from '@/components/auction/SectionLabel';

/** Who goes under the hammer after the player on the block, in queue order. */
export function UpNextList({ upcoming, remaining }: { upcoming: AuctionUpcoming[]; remaining: number }) {
  if (upcoming.length === 0) {
    // An older server sends no queue at all. currentPlayerIndex/totalPlayers
    // still prove players remain, so report the count rather than claim this is
    // the last lot — the mobile build ships ahead of the backend deploy.
    const truly = remaining <= 0;
    return (
      <View>
        <SectionLabel label="Up next" count={remaining} />
        <EmptyState
          icon="gavel"
          title={truly ? 'Last player on the block' : `${remaining} more players to go`}
          message={
            truly
              ? 'Nobody left in the queue — this category wraps up after the current lot.'
              : 'The running order is not published for this auction. Lots still appear here as they are sold.'
          }
        />
      </View>
    );
  }

  const hidden = Math.max(0, remaining - upcoming.length);

  return (
    <View>
      <SectionLabel label="Up next" count={remaining} />
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {upcoming.map((p, i) => (
          <View key={p.registrationId}>
            {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9 }}>
              <Text style={{ width: 20, fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#7d7d7d' }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <InitialsAvatar name={p.playerName} logo={p.playerPhoto || undefined} size={26} neutral />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#fff' }}>
                  {p.playerName}
                </Text>
                {p.skillLevel ? (
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                    {p.skillLevel}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#a3a3a3' }}>
                ₹{p.basePrice.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        ))}
        {hidden > 0 ? (
          <>
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#7d7d7d', paddingHorizontal: 13, paddingVertical: 9 }}>
              + {hidden} more in the queue
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
