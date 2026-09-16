import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';

const COLORS = ['#F97316', '#FA4C93', '#16C46A', '#FFFFFF', '#FFC53D'];
const PIECES = 60;

// ponytail: plain Animated, no confetti dependency. Native-driven transforms
// only, so it stays smooth on a mid-range phone. Swap for a particle library
// if it ever needs physics.
function Piece({ index, width, height }: { index: number; width: number; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;

  // Fixed per piece, so a re-render never reshuffles a strip mid-flight.
  const shape = useMemo(() => {
    const rand = (seed: number) => {
      const x = Math.sin(index * 97.31 + seed) * 10000;
      return x - Math.floor(x);
    };
    return {
      left: rand(1) * width,
      drift: (rand(2) - 0.5) * 120,
      size: 6 + rand(3) * 7,
      color: COLORS[Math.floor(rand(4) * COLORS.length)],
      delay: rand(5) * 900,
      duration: 2200 + rand(6) * 1600,
      spins: 2 + Math.floor(rand(7) * 4),
    };
  }, [index, width]);

  useEffect(() => {
    const anim = Animated.timing(fall, {
      toValue: 1,
      duration: shape.duration,
      delay: shape.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fall, shape.duration, shape.delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -20,
        left: shape.left,
        width: shape.size,
        height: shape.size * 1.6,
        backgroundColor: shape.color,
        borderRadius: 1,
        opacity: fall.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
          { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, shape.drift] }) },
          {
            rotate: fall.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${shape.spins * 360}deg`],
            }),
          },
        ],
      }}
    />
  );
}

/** Falls over whatever is behind it; mount it to fire, unmount to stop. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}
