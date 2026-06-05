import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { createPaymentOrder, verifyPayment, OrderDetails } from '@/api/payment';
import { FeeBreakdown, formatINR } from '@/lib/checkoutView';
import { FeeBreakdownCard } from '@/components/checkout/FeeBreakdownCard';
import { RazorpayWebView } from '@/components/checkout/RazorpayWebView';

type CheckoutState = 'loading' | 'confirming' | 'error' | 'webview' | 'result';
type ResultKind = 'success' | 'failure';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#111111' }}>
      <View style={{ flex: 1 }} className="bg-ink">{children}</View>
    </SafeAreaView>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
      <Pressable onPress={onBack} className="rounded-full bg-white/10 px-3 py-1.5">
        <Text className="font-montserrat text-sm text-white">‹ Back</Text>
      </Pressable>
      <Text className="flex-1 font-oswald text-base font-bold uppercase text-white">Checkout</Text>
    </View>
  );
}

export default function CheckoutScreen() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const categories = useAppSelector((s) => s.registration.categories);
  const category = categories.find((c) => c._id === categoryId);

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [resultKind, setResultKind] = useState<ResultKind | null>(null);
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

  useEffect(() => { placeOrder(); }, [placeOrder]);

  const onPaymentSuccess = async (paymentId: string, signature: string) => {
    if (!orderDetails) return;
    setVerifying(true);
    try {
      await verifyPayment(orderDetails.orderId, paymentId, signature);
      setResultKind('success');
    } catch {
      setResultKind('failure');
    } finally {
      setVerifying(false);
      setCheckoutState('result');
    }
  };

  const onPaymentDismiss = () => {
    setCheckoutState('confirming');
  };

  const breakdown: FeeBreakdown | null = orderDetails
    ? {
        base: orderDetails.baseAmount,
        razorpayFee: orderDetails.feeBreakdown.razorpayFee,
        platformFee: orderDetails.feeBreakdown.platformFee,
        gst: orderDetails.feeBreakdown.gst,
        total: orderDetails.amount,
      }
    : null;

  const playerName = user ? `${user.firstName} ${user.lastName}` : '';
  const playerEmail = user?.email ?? '';
  const playerContact = user?.phone ?? undefined;

  if (checkoutState === 'webview' && orderDetails) {
    return (
      <Frame>
        <RazorpayWebView
          orderDetails={orderDetails}
          playerName={playerName}
          playerEmail={playerEmail}
          playerContact={playerContact}
          onSuccess={onPaymentSuccess}
          onDismiss={onPaymentDismiss}
        />
        {verifying && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <ActivityIndicator color="#F97316" size="large" />
          </View>
        )}
      </Frame>
    );
  }

  if (checkoutState === 'result') {
    const success = resultKind === 'success';
    return (
      <Frame>
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <Text className="text-6xl">{success ? '✅' : '❌'}</Text>
          <Text className="text-center font-oswald text-2xl font-bold text-white">
            {success ? 'Payment Successful' : 'Payment Failed'}
          </Text>
          <Text className="text-center font-montserrat text-gray-400">
            {success ? 'Your registration is confirmed.' : 'Please try again or contact support.'}
          </Text>
          <Pressable
            onPress={() => router.replace({ pathname: '/profile/registrations' })}
            className="mt-4 w-full items-center rounded-2xl bg-brand py-4"
          >
            <Text className="font-montserrat font-bold text-white">Continue</Text>
          </Pressable>
        </View>
      </Frame>
    );
  }

  return (
    <Frame>
      <BackBar onBack={() => router.back()} />
      {checkoutState === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      )}
      {checkoutState === 'error' && (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center font-montserrat text-gray-400">Couldn't create payment order. Check your connection and try again.</Text>
          <Pressable onPress={placeOrder} className="items-center rounded-xl bg-brand px-6 py-3">
            <Text className="font-montserrat font-bold text-white">Try Again</Text>
          </Pressable>
        </View>
      )}
      {checkoutState === 'confirming' && breakdown && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <Text className="font-montserrat text-sm text-gray-400">Review the fee breakdown before proceeding to payment.</Text>
          <FeeBreakdownCard breakdown={breakdown} categoryName={category?.name ?? 'Registration'} />
          <View className="mt-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3">
            <Text className="font-montserrat text-[11px] text-gray-500">
              You will be charged <Text className="font-bold text-white">{formatINR(breakdown.total)}</Text> via Razorpay. This covers the registration fee plus applicable convenience charges.
            </Text>
          </View>
          <Pressable
            onPress={() => setCheckoutState('webview')}
            className="items-center rounded-2xl bg-brand py-4"
          >
            <Text className="font-montserrat text-base font-bold text-white">Pay Now — {formatINR(breakdown.total)}</Text>
          </Pressable>
        </ScrollView>
      )}
    </Frame>
  );
}
