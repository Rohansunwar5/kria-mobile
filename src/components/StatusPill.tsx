import { View, Text } from 'react-native';
import { STATUS_LABEL } from '@/lib/tournamentConstants';

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_LABEL[status] ?? STATUS_LABEL.draft;
  return (
    <View className={`rounded-full border px-2.5 py-1 ${cfg.classes}`}>
      <Text className={`font-montserrat text-[10px] font-bold uppercase ${cfg.classes.split(' ').find((c) => c.startsWith('text-')) || 'text-white'}`}>
        {cfg.label}
      </Text>
    </View>
  );
}
