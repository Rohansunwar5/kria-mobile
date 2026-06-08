import { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue, interpolateColor } from 'react-native-reanimated';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function AuthInput({ label, error, secureToggle, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);

  // Drive the full box style inline (borderWidth + color + fill) so it renders
  // reliably on web/native instead of depending on NativeWind class merging.
  const boxStyle = useAnimatedStyle(() => ({
    borderWidth: 1.5,
    borderRadius: 16,
    borderColor: error
      ? '#F87171'
      : interpolateColor(focus.value, [0, 1], ['rgba(255,255,255,0.18)', '#F97316']),
    backgroundColor: 'rgba(255,255,255,0.06)',
  }));

  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-montserrat text-xs uppercase tracking-wide text-gray-400">{label}</Text>
      <Animated.View style={boxStyle} className="flex-row items-center px-4">
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor="#7a7a7a"
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            rest.onBlur?.(e);
          }}
          className="flex-1 font-montserrat text-white"
          style={{
            height: 52,
            fontSize: 16,
            lineHeight: 20,
            paddingVertical: 0,
            textAlignVertical: 'center',
            includeFontPadding: false,
          }}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
          >
            <Text className="font-montserrat text-xs font-semibold uppercase text-brand">{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? <Text className="mt-1 font-montserrat text-xs text-red-400">{error}</Text> : null}
    </View>
  );
}
