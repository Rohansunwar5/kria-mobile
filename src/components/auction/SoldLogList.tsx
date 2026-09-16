import { View, Text } from 'react-native';
import { AuctionSoldLog, AuctionPreAssigned } from '@/api/auction';
import { latestFirst } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { EmptyState } from '@/components/states';
import { SectionLabel } from '@/components/auction/SectionLabel';

function Row({ children, first }: { children: React.ReactNode; first: boolean }) {
  return (
    <View>
      {first ? null : <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9 }}>
        {children}
      </View>
    </View>
  );
}

// "Sold so far", newest first, with the captains and icons that were handed to
// a team before bidding opened — they never go under the hammer, but they are
// on a roster and the purse maths only makes sense with them visible.
export function SoldLogList({
  logs,
  preAssigned,
  totalRevenue,
  youName,
}: {
  logs: AuctionSoldLog[];
  preAssigned: AuctionPreAssigned[];
  totalRevenue: number;
  youName?: string;
}) {
  const rows = latestFirst(logs, 50);
  const isYou = (n: string) => !!youName && n.trim().toLowerCase() === youName.trim().toLowerCase();

  if (rows.length === 0 && preAssigned.length === 0) {
    return (
      <View>
        <SectionLabel label="Sold so far" count={0} />
        <EmptyState
          icon="gavel"
          title="Nobody sold yet"
          message="Players land here the moment the hammer falls, newest at the top."
        />
      </View>
    );
  }

  return (
    <View>
      <SectionLabel label="Sold so far" count={logs.length} />

      {totalRevenue > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginBottom: 8 }}>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
            Total spend
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: '#16C46A' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </Text>
        </View>
      ) : null}

      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {rows.map((log, i) => {
          const unsold = !log.teamId || log.finalPrice <= 0;
          return (
            <Row key={log._id || `${log.registrationId}-${i}`} first={i === 0}>
              <Text style={{ width: 20, fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#7d7d7d' }}>
                {String(rows.length - i).padStart(2, '0')}
              </Text>
              <InitialsAvatar name={log.playerName} logo={log.playerPhoto || undefined} size={26} neutral />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: unsold ? '#d4d4d4' : '#fff' }}>
                    {log.playerName}
                  </Text>
                  {isYou(log.playerName) ? (
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#FA4C93' }}>YOU</Text>
                  ) : null}
                </View>
                {unsold ? null : (
                  <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                    {log.teamName}
                  </Text>
                )}
              </View>
              {unsold ? <Tag label="Unsold" variant="end" /> : null}
              <Text style={{ fontFamily: unsold ? 'SpaceMono_400Regular' : 'SpaceMono_700Bold', fontSize: 12, color: unsold ? '#7d7d7d' : '#16C46A', minWidth: 58, textAlign: 'right' }}>
                {unsold ? '—' : `₹${log.finalPrice.toLocaleString('en-IN')}`}
              </Text>
            </Row>
          );
        })}

        {preAssigned.map((p, i) => (
          <Row key={p.registrationId} first={rows.length === 0 && i === 0}>
            <Text style={{ width: 20, fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#7d7d7d' }}>—</Text>
            <InitialsAvatar name={p.playerName} logo={p.playerPhoto || undefined} size={26} neutral />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#fff' }}>
                  {p.playerName}
                </Text>
                {isYou(p.playerName) ? (
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#FA4C93' }}>YOU</Text>
                ) : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                {p.teamName}
              </Text>
            </View>
            <Tag label={p.role === 'captain' ? 'Captain' : 'Icon'} variant={p.role === 'captain' ? 'live' : 'auction'} />
          </Row>
        ))}
      </View>
    </View>
  );
}
