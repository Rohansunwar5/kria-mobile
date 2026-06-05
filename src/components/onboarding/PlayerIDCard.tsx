import { View, Text, Image } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';

type LockedMode = 'preview' | 'unranked';

interface Props {
  name: string;
  sport: string;
  level?: string;
  photoUri?: string | null;
  locked: LockedMode;
}

function LockedRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-white/10 py-2.5">
      <Text className="font-montserrat text-xs text-gray-500">🔒 {label}</Text>
      <Text className="font-montserrat text-xs text-gray-600">Locked</Text>
    </View>
  );
}

export function PlayerIDCard({ name, sport, level, photoUri, locked }: Props) {
  return (
    <View
      className="self-center overflow-hidden rounded-3xl border border-white/10"
      style={{ width: 280, backgroundColor: '#0d0d0d' }}
    >
      <View className="items-center px-5 pb-4 pt-6" style={{ backgroundColor: '#1a120b' }}>
        <Text className="font-oswald text-xs uppercase tracking-widest text-brand">Kria</Text>
        <View className="my-3 h-24 w-24 items-center justify-center rounded-full border-2 border-brand bg-black">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="h-full w-full rounded-full" />
          ) : (
            <InitialsAvatar name={name} size={88} />
          )}
        </View>
        <Text className="font-oswald text-2xl uppercase text-white">{name}</Text>
        <Text className="mt-1 font-montserrat text-xs text-gray-400">
          {sport}
          {level ? ` · ${level}` : ''}
        </Text>
      </View>

      <View className="px-5 py-4">
        {locked === 'preview' ? (
          <>
            <LockedRow label="Titles" />
            <LockedRow label="Awards" />
            <LockedRow label="Rankings" />
          </>
        ) : (
          <View className="flex-row items-center justify-between">
            <Text className="font-oswald text-base uppercase text-gray-300">Unranked</Text>
            <Text className="font-montserrat text-xs text-gray-400">0 Titles</Text>
            <Text className="font-montserrat text-xs text-gray-400">0 Awards</Text>
          </View>
        )}
      </View>
    </View>
  );
}
