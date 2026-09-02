import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getPaymentStatus, type PaymentRecord } from '@/api/payment';
import { paymentVerdict, type VerdictKind } from '@/lib/paymentVerdict';
import { formatINR } from '@/lib/checkoutView';

const POLL_MS = 4000;
const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

const SKIN: Record<VerdictKind, { color: string; ink: string; icon: 'check' | 'close' | 'refresh' | 'clock'; ghost: string; tag: 'open' | 'fail' | 'up' | 'end' }> = {
  success: { color: '#16C46A', ink: '#06240F', icon: 'check', ghost: 'YES', tag: 'open' },
  failure: { color: '#FF4438', ink: '#2A0703', icon: 'close', ghost: 'NO', tag: 'fail' },
  refunded: { color: '#F97316', ink: '#0B0B0B', icon: 'refresh', ghost: 'BACK', tag: 'up' },
  pending: { color: '#F97316', ink: '#0B0B0B', icon: 'clock', ghost: 'WAIT', tag: 'end' },
};

function Row({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#7d7d7d' }}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 11, color }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function PaymentStatus() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const categories = useAppSelector((s) => s.registration.categories);

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (!orderId) return;
    const p = await getPaymentStatus(orderId);
    setLoading(false);
    if (!p) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setPayment(p);
    // A slow success resolves itself here without a second charge.
    if (!paymentVerdict(p.status).settled) {
      timer.current = setTimeout(poll, POLL_MS);
    }
  }, [orderId]);

  useEffect(() => {
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  const verdict = paymentVerdict(payment?.status ?? '');
  const skin = SKIN[verdict.kind];
  const category = categories.find((c) => c._id === payment?.categoryId);

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.replace('/profile/registrations')}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="close" size={18} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, color: '#fff' }}>Payment</Text>
      {payment ? <Tag label={verdict.tag} variant={skin.tag} /> : null}
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton h={64} w={64} />
          <Skeleton h={30} w={220} line />
          <Skeleton h={12} w={280} line />
          <Skeleton h={190} style={{ marginTop: 10 }} />
        </View>
      </Screen>
    );
  }

  if (missing || !payment) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16 }}>
          <ErrorBlock
            label="Order unavailable"
            message="We could not find this order. If you were charged, it will show up under Payments in your profile."
            onRetry={poll}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {Header}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 30, overflow: 'hidden' }}>
          <Ghost text={skin.ghost} size={210} style={{ left: -30, top: 90 }} />
          <View style={{ width: 64, height: 64, borderRadius: 5, backgroundColor: skin.color, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={skin.icon} size={34} color={skin.ink} strokeWidth={2.8} />
          </View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 36, lineHeight: 32, color: '#fff', marginTop: 16 }}>
            {verdict.title}
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 12, maxWidth: 300 }}>
            {verdict.message}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <Text style={{ ...LBL, marginBottom: 8 }}>Order record</Text>
          <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
            <Row label="Order" value={payment.razorpayOrderId} />
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Row label="Category" value={(category?.name || '—').toUpperCase()} />
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Row label="Amount" value={formatINR(payment.amount)} />
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Row
              label="Attempted"
              value={new Date(payment.createdAt)
                .toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                .toUpperCase()}
            />
          </View>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 16, color: '#737373', marginTop: 11 }}>
            Status is polled from the gateway, so a slow success resolves itself here without a second charge.
          </Text>
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 8 }}>
        {verdict.kind === 'failure' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() =>
              router.replace({
                pathname: '/checkout/[tournamentId]/[categoryId]',
                params: { tournamentId: payment.tournamentId, categoryId: payment.categoryId },
              })
            }
            style={{ height: 54, borderRadius: 5, backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <Icon name="refresh" size={17} color="#0B0B0B" strokeWidth={2.6} />
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, letterSpacing: 0.04 * 17, color: '#0B0B0B' }}>
              Try again
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View my entries"
            onPress={() => router.replace('/profile/registrations')}
            style={{ height: 54, borderRadius: 5, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, letterSpacing: 0.04 * 17, color: '#0B0B0B' }}>
              View my entries
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get help with this"
          onPress={() => Linking.openURL(`mailto:support@kria.club?subject=Payment ${payment.razorpayOrderId}`)}
          style={{ height: 46, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.04 * 13, color: '#fff' }}>
            Get help with this
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
