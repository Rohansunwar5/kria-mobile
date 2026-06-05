import { Pressable, Text, ActivityIndicator } from 'react-native';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingButton({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const isPrimary = variant === 'primary';
  const base = 'items-center justify-center rounded-3xl py-4 px-6';
  const look = isPrimary ? 'bg-brand' : 'border border-white/20 bg-transparent';
  const dim = disabled ? 'opacity-40' : '';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`${base} ${look} ${dim}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="font-montserrat text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
