import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { createPaymentOrder, verifyPayment, OrderDetails } from '@/api/payment';
import { formatINR } from '@/lib/checkoutView';
import { RazorpayWebView } from '@/components/checkout/RazorpayWebView';

type CheckoutState = 'loading' | 'confirming' | 'error' | 'webview';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };
const CELL_LBL = { ...LBL, letterSpacing: 0.12 * 9 };

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 14, paddingVertical: 11 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#d4d4d4' }}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 14, color: '#fff' }}>{value}</Text>
    </View>
  );
}

const Hair = () => <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />;

export default function CheckoutScreen() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const categories = useAppSelector((s) => s.registration.categories);
  const tournament = useAppSelector((s) => s.tournament.currentTournament);
  const category = categories.find((c) => c._id === categoryId);

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [verifying, setVerifying] = useState(false);

  const placeOrder = useCallback(async () => {
    setCheckoutState('loading');
    try {
      const order = await createPaymentOrder(tournamentId, categoryId);
      setOrderDetails(order);
      setCheckoutState('confirming');
    } catch {
      setCheckoutState('error');
    }
  }, [tournamentId, categoryId]);

  useEffect(() => {
    placeOrder();
  }, [placeOrder]);

  // Both outcomes land on /payment/[orderId], which polls the gateway — so a
  // slow success is never reported here as a failure.
  const settle = async (paymentId?: string, signature?: string) => {
    if (!orderDetails) return;
    if (paymentId && signature) {
      setVerifying(true);
      try {
        await verifyPayment(orderDetails.orderId, paymentId, signature);
      } catch {
        // The status screen is the source of truth, not this call.
      } finally {
        setVerifying(false);
      }
    }
    router.replace({ pathname: '/payment/[orderId]', params: { orderId: orderDetails.orderId } });
  };

  const playerName = user ? `${user.firstName} ${user.lastName}` : '';

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, color: '#fff' }}>Checkout</Text>
      <Tag label="Secure" variant="open" />
    </View>
  );

  if (checkoutState === 'webview' && orderDetails) {
    return (
      <Screen>
        <RazorpayWebView
          orderDetails={orderDetails}
          playerName={playerName}
          playerEmail={user?.email ?? ''}
          playerContact={user?.phone ?? undefined}
          onSuccess={(paymentId, signature) => settle(paymentId, signature)}
          onDismiss={() => setCheckoutState('confirming')}
        />
        {verifying ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <ActivityIndicator color="#F97316" size="large" />
          </View>
        ) : null}
      </Screen>
    );
  }

  if (checkoutState === 'loading') {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton h={128} />
          <Skeleton h={10} w={60} line />
          <Skeleton h={180} />
        </View>
      </Screen>
    );
  }

  if (checkoutState === 'error' || !orderDetails) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16 }}>
          <ErrorBlock
            label="Order not created"
            message="We could not start this payment. Nothing was charged — check your connection and try again."
            onRetry={placeOrder}
          />
        </View>
      </Screen>
    );
  }

  const { feeBreakdown: fees } = orderDetails;
  const platform = fees.platformFee + fees.razorpayFee;

  return (
    <Screen>
      {Header}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
        <Ghost text="PAY" size={120} style={{ right: -24, top: 190 }} />

        {/* What you're buying */}
        <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#F97316' }}>
              {tournament?.name || 'Tournament'}
            </Text>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 24, lineHeight: 22, color: '#fff', marginTop: 6 }}>
              {category?.name || 'Registration'}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 7 }}>
              {[category?.bracketType?.replace('_', ' '), tournament?.venue?.city].filter(Boolean).join(' · ') || ' '}
            </Text>
          </View>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={CELL_LBL}>Playing as</Text>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff', marginTop: 3 }}>
                {playerName.toUpperCase() || '—'}
              </Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={CELL_LBL}>Entry fee</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#FA4C93', marginTop: 3 }}>
                {formatINR(orderDetails.baseAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ledger */}
        <Text style={{ ...LBL, marginBottom: 8 }}>Order</Text>
        <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
          <LedgerRow label="Entry fee" value={formatINR(orderDetails.baseAmount)} />
          <Hair />
          <LedgerRow label="Platform fee" value={formatINR(platform)} />
          <Hair />
          <LedgerRow label="GST 18%" value={formatINR(fees.gst)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F97316', paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#0B0B0B' }}>Total</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, color: '#0B0B0B' }}>{formatINR(orderDetails.amount)}</Text>
          </View>
        </View>

        {/* Method */}
        <Text style={{ ...LBL, marginBottom: 8 }}>Method</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 13,
            paddingVertical: 12,
            backgroundColor: 'rgba(249,115,22,0.09)',
            borderWidth: 1.5,
            borderColor: '#F97316',
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="card" size={18} color="#fff" strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 15, color: '#fff' }}>
              UPI · Card · Netbanking
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
              Razorpay checkout
            </Text>
          </View>
          <View style={{ width: 20, height: 20, borderRadius: 3, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} color="#0B0B0B" strokeWidth={3.4} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="info" size={13} color="#7d7d7d" strokeWidth={2} />
          <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 16, color: '#737373' }}>
            Your slot is held the moment payment clears, then the organiser approves it.
          </Text>
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pay ${formatINR(orderDetails.amount)}`}
          onPress={() => setCheckoutState('webview')}
          style={{ height: 54, borderRadius: 5, backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          <Icon name="lock" size={17} color="#0B0B0B" strokeWidth={2.4} />
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, letterSpacing: 0.04 * 17, color: '#0B0B0B' }}>
            Pay {formatINR(orderDetails.amount)}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
