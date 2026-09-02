import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Registration } from '@/store/slices/registrationSlice';
import { Tag, type TagVariant } from '@/components/StatusPill';
import { Icon } from '@/components/icons';

const REG_TAG: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: 'Pending', variant: 'up' },
  approved: { label: 'Approved', variant: 'open' },
  auctioned: { label: 'Drafted', variant: 'auction' },
  assigned: { label: 'Drafted', variant: 'auction' },
  rejected: { label: 'Rejected', variant: 'fail' },
  withdrawn: { label: 'Withdrawn', variant: 'end' },
};

const PAY_TAG: Record<string, { label: string; variant: TagVariant }> = {
  paid: { label: 'Paid', variant: 'open' },
  pending: { label: 'Unpaid', variant: 'up' },
  failed: { label: 'Payment failed', variant: 'fail' },
  refunded: { label: 'Refunded', variant: 'end' },
};

export function RegistrationCard({ reg, onWithdraw }: { reg: Registration; onWithdraw: (id: string) => void }) {
  const router = useRouter();
  const canWithdraw = reg.status === 'pending' || reg.status === 'approved';
  const owes = reg.paymentStatus === 'pending' || reg.paymentStatus === 'failed';
  const status = REG_TAG[reg.status] ?? { label: reg.status, variant: 'up' as TagVariant };
  const pay = PAY_TAG[reg.paymentStatus];
  const fee = reg.categoryDetails?.registrationFee ?? 0;

  return (
    <View
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: owes ? 'rgba(255,68,56,0.4)' : 'rgba(255,255,255,0.14)',
        borderLeftWidth: 4,
        borderLeftColor: owes ? '#FF4438' : reg.status === 'auctioned' || reg.status === 'assigned' ? '#FA4C93' : '#16C46A',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reg.tournamentDetails?.name || 'Tournament'}
        onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: reg.tournamentId } })}
        style={{ paddingHorizontal: 13, paddingTop: 12, paddingBottom: 11 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Tag label={status.label} variant={status.variant} />
          {pay ? <Tag label={pay.label} variant={pay.variant} /> : null}
        </View>
        <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 19, lineHeight: 18, color: '#fff' }}>
          {reg.tournamentDetails?.name || 'Tournament'}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 6 }}>
          {[reg.categoryDetails?.name, fee ? `₹${fee.toLocaleString('en-IN')}` : 'Free'].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        {owes ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pay now"
            onPress={() =>
              router.push({
                pathname: '/checkout/[tournamentId]/[categoryId]',
                params: { tournamentId: reg.tournamentId, categoryId: reg.categoryId },
              })
            }
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, backgroundColor: '#F97316' }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: '#0B0B0B' }}>Pay now</Text>
            <Icon name="arrow-right" size={15} color="#0B0B0B" strokeWidth={2.6} />
          </Pressable>
        ) : null}
        {canWithdraw ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Withdraw"
            onPress={() => onWithdraw(reg._id)}
            style={{
              flex: owes ? 0 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              paddingHorizontal: 16,
              ...(owes ? { borderLeftWidth: 1.5, borderLeftColor: 'rgba(255,255,255,0.10)' } : null),
            }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
              Withdraw
            </Text>
          </Pressable>
        ) : null}
        {!owes && !canWithdraw ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View tournament"
            onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: reg.tournamentId } })}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 13 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
              Open tournament
            </Text>
            <Icon name="chevron-right" size={13} color="#7d7d7d" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
