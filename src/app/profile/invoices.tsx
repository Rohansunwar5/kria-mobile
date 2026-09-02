import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { InvoiceCard } from '@/components/profile/InvoiceCard';
import { Chip, Hairlines, ScreenHeader } from '@/components/canvas';
import { EmptyState, ErrorBlock, Ghost, Skeleton } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getMyPayments, type Invoice } from '@/api/payment';

// Payments.dc.html. The artboard has an export button in the header; there is
// no export endpoint, so it is dropped rather than faked — the footer note
// says where receipts actually come from.

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'paid', label: 'Paid', match: (s) => s === 'paid' },
  { key: 'failed', label: 'Failed', match: (s) => s === 'failed' || s === 'created' },
  { key: 'refunded', label: 'Refunds', match: (s) => s === 'refunded' },
];

function rupees(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Invoices() {
  const router = useRouter();
  const email = useAppSelector((s) => s.auth.user?.email);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    setError('');
    getMyPayments()
      .then(setInvoices)
      .catch((e) => setError(e.message || 'Could not load your payments.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totals = useMemo(() => {
    const by = (s: string) => invoices.filter((i) => i.status === s).length;
    return {
      paid: rupees(invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)),
      counts: [
        `${by('paid')} PAID`,
        by('failed') ? `${by('failed')} FAILED` : null,
        by('refunded') ? `${by('refunded')} REFUNDED` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }, [invoices]);

  // Failed first — it is the only row with something to act on — then newest.
  const shown = useMemo(() => {
    const rule = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    return invoices
      .filter((i) => rule.match(i.status))
      .sort((a, b) => {
        const rank = (s: string) => (s === 'failed' ? 0 : s === 'created' ? 1 : 2);
        return rank(a.status) - rank(b.status) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [invoices, filter]);

  return (
    <Screen>
      <ScreenHeader title="Payments" onBack={() => router.back()} />

      {/* Total paid is a slab, not a footer. */}
      <View style={{ backgroundColor: '#F97316', overflow: 'hidden' }}>
        <Hairlines />
        <Ghost text="₹" size={120} color="rgba(11,11,11,0.10)" style={{ right: -8, top: -22 }} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, color: 'rgba(11,11,11,0.72)' }}>
            TOTAL PAID · ALL TIME
          </Text>
          {loading ? (
            <View style={{ marginTop: 8, marginBottom: 6 }}>
              <Skeleton h={30} w="62%" line />
            </View>
          ) : (
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 38, lineHeight: 40, color: '#0B0B0B', marginTop: 6 }}>
              {totals.paid}
            </Text>
          )}
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: 'rgba(11,11,11,0.72)', marginTop: 6 }}>
            {totals.counts || 'NOTHING PAID YET'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 }}>
        {loading ? (
          <View style={{ gap: 10 }}>
            <Skeleton h={128} />
            <Skeleton h={128} />
          </View>
        ) : error ? (
          <ErrorBlock label="Payments" message={error} onRetry={load} />
        ) : shown.length === 0 ? (
          <EmptyState
            ghost="0"
            icon="receipt"
            title={filter === 'all' ? 'No payments yet' : 'Nothing here'}
            message={
              filter === 'all'
                ? 'Entry fees you pay show up here with their status and fee breakdown.'
                : 'No payments match this filter.'
            }
            cta={filter === 'all' ? 'Browse events' : undefined}
            onCta={filter === 'all' ? () => router.push('/(tabs)/home') : undefined}
          />
        ) : (
          <>
            <View style={{ gap: 10 }}>
              {shown.map((inv) => (
                <InvoiceCard key={inv._id} inv={inv} />
              ))}
            </View>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.12 * 8, lineHeight: 15, color: '#7d7d7d', textAlign: 'center', paddingTop: 12 }}>
              {`RECEIPTS ARE GENERATED BY THE GATEWAY\nAND EMAILED TO ${(email || 'YOUR EMAIL').toUpperCase()}`}
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
