import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/icons';
import { Skeleton } from '@/components/states';

/** A checklist row for the two transition screens. Pending is a skeleton bar,
 *  not a spinner — the canvas has no spinners anywhere. */
export function ProgressStep({ label, done }: { label: string; done: boolean }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? '#F97316' : 'rgba(255,255,255,0.05)',
          ...(done ? null : { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)' }),
        }}
      >
        {done ? <Icon name="check" size={14} color="#0B0B0B" strokeWidth={3.2} /> : null}
      </View>
      {done ? (
        <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>{label}</Text>
      ) : (
        <View style={{ flex: 1 }}>
          <Skeleton h={11} w="72%" line />
        </View>
      )}
    </Animated.View>
  );
}
