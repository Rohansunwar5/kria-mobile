import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

// A circular ✕ that returns the user to the onboarding welcome screen, so they
// can revisit the intro/story from login or register. Drawn with two rotated
// bars to avoid pulling in an icon dependency.
export function CloseButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close and return to start"
      hitSlop={12}
      onPress={() => router.replace('/(onboarding)/welcome')}
      style={{
        height: 36,
        width: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
      }}
    >
      <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 14, height: 1.6, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', width: 14, height: 1.6, backgroundColor: '#FFFFFF', transform: [{ rotate: '-45deg' }] }} />
      </View>
    </Pressable>
  );
}
