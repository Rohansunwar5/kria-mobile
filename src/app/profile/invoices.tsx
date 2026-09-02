import { useEffect, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { InvoiceCard } from '@/components/profile/InvoiceCard';
import { EmptyState } from '@/components/states';
import { getMyPayments, type Invoice } from '@/api/payment';

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPayments().then(setInvoices).catch(() => setInvoices([])).finally(() => setLoading(false));
  }, []);

  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Invoices' }} />
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" /></View>
      ) : invoices.length === 0 ? (
        <View className="p-5"><EmptyState ghost="0" icon="receipt" title="No payments yet" message="Entry fees you pay show up here with their receipt and status." cta="Browse events" onCta={() => router.push('/(tabs)/home')} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {invoices.map((inv) => <InvoiceCard key={inv._id} inv={inv} />)}
          <View className="flex-row justify-end border-t border-white/10 pt-4">
            <View className="flex-row items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-5 py-3">
              <Text className="font-oswald text-sm uppercase tracking-wider text-gray-300">Total Paid</Text>
              <Text className="font-oswald text-xl font-bold text-brand">₹{total.toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
