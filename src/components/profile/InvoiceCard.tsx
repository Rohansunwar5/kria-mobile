import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { Invoice } from '@/api/payment';
import { Chip, Lbl } from '@/components/canvas';

// Payments.dc.html. Each status gets its own band, edge colour and action —
// a failed payment is the one row that has something to do about it.

type Look = { edge: string; fg: string; band: string; label: string };

const LOOKS: Record<string, Look> = {
  paid: { edge: '#16C46A', fg: '#16C46A', band: 'rgba(22,196,106,0.10)', label: 'Paid' },
  failed: { edge: '#FF4438', fg: '#FF4438', band: 'rgba(255,68,56,0.12)', label: 'Failed' },
  refunded: { edge: '#7d7d7d', fg: '#a3a3a3', band: 'rgba(255,255,255,0.05)', label: 'Refunded' },
  created: { edge: '#F97316', fg: '#F97316', band: 'rgba(249,115,22,0.10)', label: 'Pending' },
};

function rupees(n?: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}

export function InvoiceCard({ inv }: { inv: Invoice }) {
  const router = useRouter();
  const look = LOOKS[inv.status] || LOOKS.created;
  const fees = inv.feeBreakdown;
  const breakdown = fees
    ? `${inv.baseAmount ?? 0} + ${(fees.razorpayFee + fees.platformFee).toFixed(2)} FEE + ${fees.gst.toFixed(2)} GST`
    : null;
  const sub = [inv.category?.name, inv.tournament?.sport].filter(Boolean).join(' · ').toUpperCase();
  const dim = inv.status === 'refunded';

  const retry = () =>
    inv.tournamentId && inv.categoryId && router.push(`/checkout/${inv.tournamentId}/${inv.categoryId}`);

  return (
    <View
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.14)',
        borderLeftWidth: 4,
        borderLeftColor: look.edge,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 7, backgroundColor: look.band }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: look.fg }}>
          {look.label} · {shortDate(inv.createdAt)}
        </Text>
        {inv.razorpayOrderId ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: look.fg }}>
            {inv.razorpayOrderId.slice(-8).toUpperCase()}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 13, paddingVertical: 11 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: dim ? '#d4d4d4' : '#fff' }}>
          {inv.tournament?.name || 'Tournament'}
        </Text>
        {sub ? <Lbl style={{ letterSpacing: 0.08 * 9, marginTop: 5, color: dim ? '#7d7d7d' : '#a3a3a3' }}>{sub}</Lbl> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 15,
              color: dim ? '#a3a3a3' : '#fff',
              ...(dim ? { textDecorationLine: 'line-through' as const } : null),
            }}
          >
            {rupees(inv.amount)}
          </Text>
          {breakdown && !dim ? (
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.08 * 8, color: '#7d7d7d', marginTop: 3 }}>
              {breakdown}
            </Text>
          ) : null}
        </View>
        {inv.status === 'failed' && inv.tournamentId && inv.categoryId ? (
          <Chip label="Retry" tone="#FF4438" onPress={retry} />
        ) : inv.razorpayOrderId ? (
          <Chip label="Details" onPress={() => router.push(`/payment/${inv.razorpayOrderId}`)} />
        ) : null}
      </View>
    </View>
  );
}
