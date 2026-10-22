import { StyleSheet, Text, View } from 'react-native';
import { colors, display, font } from '@/constants/theme';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { AuctionPreAssigned, AuctionSoldLog, AuctionStatusResponse } from '@/api/auction';
import { rupees } from '@/lib/format';
import { PurseGrid, YourResult, type AuctionResult } from './AuctionBoard';

export function AuctionFinished({ data, soldLog, preAssigned, totalRevenue, result, onResult }: {
  data: AuctionStatusResponse;
  soldLog: AuctionSoldLog[];
  preAssigned: AuctionPreAssigned[];
  totalRevenue: number;
  result: AuctionResult;
  onResult: (teamId: string) => void;
}) {
  const sold = [...soldLog].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const rows = [
    ...sold.map((l) => ({ key: l._id, name: l.playerName, team: l.teamName, price: rupees(l.finalPrice), role: null as null | 'C' | 'ICON' })),
    ...preAssigned.map((l) => ({
      key: `pre-${l.registrationId}`, name: l.playerName, team: l.teamName,
      price: l.role === 'captain' ? 'Captain' : 'Icon', role: l.role === 'captain' ? ('C' as const) : ('ICON' as const),
    })),
  ];
  const n = data.teams.length;
  return (
    <>
      <View style={s.head}>
        <Text style={display(40)}>Auction finished</Text>
        <Text style={s.line}>{sold.length} sold · {rupees(totalRevenue)} across {n} {n === 1 ? 'team' : 'teams'}</Text>
      </View>
      {result ? <YourResult result={result} onPress={onResult} /> : null}
      <PurseGrid teams={data.teams} />
      <View style={s.list}>
        <SectionHeader title="Sold" meta="Newest first" />
        {rows.map((r) => (
          <View key={r.key} style={s.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={s.nameRow}>
                <Text style={s.name}>{r.name}</Text>
                {r.role ? <Text style={[s.tag, { backgroundColor: r.role === 'C' ? colors.text : colors.gold }]}>{r.role}</Text> : null}
              </View>
              <Text style={s.team}>→ {r.team}</Text>
            </View>
            <Text style={s.price}>{r.price}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  head: { paddingTop: 20, gap: 8 },
  line: { fontFamily: font.regular, fontSize: 14, color: colors.text2 },
  list: { paddingTop: 36, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  tag: { fontFamily: font.bold, fontSize: 10, color: colors.bg, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 5, overflow: 'hidden' },
  team: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  price: { fontFamily: font.semibold, fontSize: 14, color: colors.text2, fontVariant: ['tabular-nums'] },
});
