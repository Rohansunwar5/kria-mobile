import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, display, font, radius } from '@/constants/theme';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tap } from '@/components/ui/Tap';
import { Crest } from '@/components/tournament/Crest';
import type { AuctionSoldLog, AuctionStatusResponse } from '@/api/auction';
import { bidRows, lastSale, onBlockLine, purseCards, tieBreakLine } from '@/lib/auctionWatch';
import { initials } from '@/lib/matchCard';
import { rupees } from '@/lib/format';

export type AuctionResult = { title: string; line?: string; teamId?: string } | null;

export function PurseGrid({ teams }: { teams: AuctionStatusResponse['teams'] }) {
  return (
    <View style={s.section}>
      <SectionHeader title="Purses" />
      <View style={s.grid}>
        {purseCards(teams).map((p) => (
          <View key={p.key} style={s.purse}>
            <View style={s.row}>
              <Crest uri={p.logo} name={p.name} size={28} />
              <Text style={s.purseName} numberOfLines={2}>{p.name}</Text>
            </View>
            <Text style={display(24)}>{p.left}</Text>
            <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, p.spentPct)}%` }]} /></View>
            <Text style={s.small}>{p.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function YourResult({ result, onPress }: { result: NonNullable<AuctionResult>; onPress: (teamId: string) => void }) {
  const { title, line, teamId } = result;
  return (
    <Tap onPress={teamId ? () => onPress(teamId) : undefined} disabled={!teamId} accessibilityLabel={title} style={s.result}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.resultTitle}>{title}</Text>
        {line ? <Text style={s.small}>{line}</Text> : null}
      </View>
      {teamId ? <Icon name="chevron_right" size={22} color={colors.text3} /> : null}
    </Tap>
  );
}

export function AuctionBoard({ data, soldLog, result, onResult }: {
  data: AuctionStatusResponse;
  soldLog: AuctionSoldLog[];
  result: AuctionResult;
  onResult: (teamId: string) => void;
}) {
  const { auction, currentPlayer: p, teams } = data;
  const sale = lastSale(data, soldLog);
  const bidder = teams.find((t) => t._id === auction.liveBid.highestBidderId);
  const hasBid = auction.liveBid.currentPrice > 0 && auction.liveBid.bidHistory.length > 0;
  const tie = tieBreakLine(auction, teams);
  const name = p ? `${p.profile.firstName} ${p.profile.lastName}`.trim() : '';
  return (
    <>
      {sale ? (
        <View style={s.strip}>
          <Text style={s.sold}>SOLD</Text>
          <Text style={s.stripText} numberOfLines={1}>{sale.player} → {sale.team}</Text>
          <Text style={s.stripPrice}>{sale.price}</Text>
        </View>
      ) : null}
      {p ? (
        <View style={s.block}>
          {p.profile.photo ? (
            <Image source={{ uri: p.profile.photo }} accessibilityIgnoresInvertColors style={s.photo} />
          ) : (
            <View style={[s.photo, s.photoEmpty]}><Text style={display(34)}>{initials(name)}</Text></View>
          )}
          <Text style={[display(34), { textAlign: 'center' }]}>{name}</Text>
          <Text style={s.blockLine}>{onBlockLine(p)}</Text>
        </View>
      ) : null}
      {p ? (
        <View style={s.bidCard}>
          <Text style={s.small}>Current bid</Text>
          {hasBid ? (
            <>
              <Text style={display(72)}>{rupees(auction.liveBid.currentPrice)}</Text>
              <View style={s.row}>
                <Crest uri={bidder?.logo} name={bidder?.name ?? auction.liveBid.highestBidderName} size={26} />
                <Text style={s.bidder}>{bidder?.name ?? auction.liveBid.highestBidderName}</Text>
              </View>
            </>
          ) : (
            <Text style={s.noBid}>No bids yet · base {rupees(p.auctionData.basePrice)}</Text>
          )}
          {tie ? <Text style={s.tie}>{tie}</Text> : null}
        </View>
      ) : null}
      {hasBid ? (
        <View style={s.section}>
          <SectionHeader title={`Bids · min raise ${rupees(auction.settings.minBidIncrement)}`} />
          <View>
            {bidRows(auction, teams).map((b) => (
              <View key={b.key} style={[s.bidRow, { opacity: b.newest ? 1 : 0.5 }]}>
                <Crest uri={b.logo} name={b.team} size={22} />
                <Text style={s.bidTeam}>{b.team}</Text>
                <Text style={s.bidAmt}>{b.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <PurseGrid teams={teams} />
      {result ? <YourResult result={result} onPress={onResult} /> : null}
    </>
  );
}

const s = StyleSheet.create({
  section: { paddingTop: 44, gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purse: { width: '48.5%', flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: colors.surface1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  purseName: { flex: 1, fontFamily: font.semibold, fontSize: 12, color: colors.text },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.lineStrong, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: colors.text },
  small: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 44, padding: 16, paddingHorizontal: 18, borderRadius: radius.card, borderWidth: 1, borderColor: colors.surface3 },
  resultTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface1 },
  sold: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.66, color: colors.bg, backgroundColor: colors.text, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden' },
  stripText: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.text },
  stripPrice: { fontFamily: font.bold, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  block: { paddingTop: 32, alignItems: 'center', gap: 14 },
  photo: { width: 104, height: 104, borderRadius: 52 },
  photoEmpty: { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  blockLine: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  bidCard: { marginTop: 28, padding: 22, borderRadius: radius.cardLg, backgroundColor: colors.surface1, alignItems: 'center', gap: 12 },
  bidder: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  noBid: { fontFamily: font.semibold, fontSize: 15, color: colors.text2, paddingVertical: 12 },
  tie: { fontFamily: font.regular, fontSize: 13, color: colors.text2, textAlign: 'center' },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  bidTeam: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.text },
  bidAmt: { fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
});
