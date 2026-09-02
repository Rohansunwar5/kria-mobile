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
    borderRadius: 5,
    borderColor: error
      ? '#FF4438'
      : interpolateColor(focus.value, [0, 1], ['rgba(255,255,255,0.14)', '#F97316']),
    backgroundColor: 'rgba(255,255,255,0.06)',
  }));

  return (
    <View className="mb-4">
      {/* .lbl — mono 9px, 0.18em tracking */}
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 9,
          letterSpacing: 0.18 * 9,
          textTransform: 'uppercase',
          color: '#7d7d7d',
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Animated.View style={boxStyle} className="flex-row items-center px-3.5">
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor="#7d7d7d"
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            rest.onBlur?.(e);
          }}
          className="flex-1 text-white"
          style={{
            height: 52,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontSize: 15,
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
            <Text
              style={{
                fontFamily: 'SpaceMono_700Bold',
                fontSize: 10,
                letterSpacing: 0.1 * 10,
                textTransform: 'uppercase',
                color: '#F97316',
              }}
            >
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#FF4438', marginTop: 5 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
