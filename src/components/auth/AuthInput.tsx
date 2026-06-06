import { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function AuthInput({ label, error, secureToggle, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? '#F87171' : focus.value ? '#F97316' : 'rgba(255,255,255,0.1)',
  }));

  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-montserrat text-xs uppercase tracking-wide text-gray-400">{label}</Text>
      <Animated.View
        style={borderStyle}
        className="flex-row items-center rounded-2xl border bg-white/5 px-4"
      >
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor="#888"
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            rest.onBlur?.(e);
          }}
          className="flex-1 py-3.5 font-montserrat text-base text-white"
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
          >
            <Text className="font-montserrat text-xs text-brand">{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? <Text className="mt-1 font-montserrat text-xs text-red-400">{error}</Text> : null}
    </View>
  );
}
