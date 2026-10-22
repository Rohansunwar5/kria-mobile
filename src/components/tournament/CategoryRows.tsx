import { StyleSheet, Text, View } from 'react-native';
import type { TournamentCategory } from '@/api/tournaments';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { colors, font } from '@/constants/theme';
import { categoryStatus, feeLabel, formatLine, type AuctionState } from '@/lib/tournamentView';

/** One row per category: name, format, status, fee, chevron to the entry screen (mock 2a). */
export function CategoryRows({ categories, auctions, liveRounds, pastDeadline, onOpen }: {
  categories: TournamentCategory[];
  auctions: Record<string, AuctionState | undefined>;
  liveRounds: Record<string, string | undefined>;
  pastDeadline: boolean;
  onOpen: (c: TournamentCategory) => void;
}) {
  return (
    <View>
      {categories.map((c) => {
        const st = categoryStatus(c, auctions[c._id], liveRounds[c._id], pastDeadline);
        return (
          <Tap key={c._id} onPress={() => onOpen(c)} scale={0.99} accessibilityLabel={c.name} style={s.row}>
            <View style={s.text}>
              <Text style={s.name}>{c.name}</Text>
              <Text style={s.format}>{formatLine(c)}</Text>
              <Text style={[s.status, { color: colors[st.tone] }]}>{st.text}</Text>
            </View>
            <View style={s.right}>
              <Text style={s.fee}>{feeLabel(c)}</Text>
              <Icon name="chevron_right" size={20} color={colors.disabled} />
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  format: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  status: { fontFamily: font.semibold, fontSize: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fee: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
});
