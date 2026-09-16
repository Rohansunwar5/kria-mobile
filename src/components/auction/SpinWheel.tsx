import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { AuctionStatus, AuctionTeam } from '@/api/auction';
import { spinTargetAngle, spinPhase, SPIN_DURATION_MS } from '@/lib/auctionSpin';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

const SEGMENT_COLORS = ['#F97316', '#FA4C93', '#16C46A', '#3B82F6', '#A855F7', '#FFC53D', '#FF4438', '#14B8A6'];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const a = polar(cx, cy, r, end);
  const b = polar(cx, cy, r, start);
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 0 ${b.x} ${b.y} Z`;
}

/**
 * The tie-breaker wheel. The organizer's console decides the winner; this only
 * animates to it, using the server's `spinStartedAt` so the phone and the
 * projector land on the same team at roughly the same moment.
 */
export function SpinWheel({ status, teams }: { status: AuctionStatus; teams: AuctionTeam[] }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 72, 300);
  const cx = size / 2;
  const radius = cx - 6;

  const tiedTeams = status.liveBid?.tiedTeams;
  const tied = useMemo(
    () =>
      (tiedTeams || []).map((id, i) => {
        const t = teams.find((tm) => tm._id === id);
        return { id, name: t?.name || 'Unknown', color: t?.primaryColor || SEGMENT_COLORS[i % SEGMENT_COLORS.length] };
      }),
    [tiedTeams, teams],
  );

  const winnerId = status.liveBid?.spinWinnerId ?? null;
  const startedAt = status.liveBid?.spinStartedAt ?? null;

  const rotation = useRef(new Animated.Value(0)).current;
  // Starts unsettled even for a spin that finished before this screen opened —
  // the effect below reads the clock and settles it immediately. Keeping
  // Date.now() out of render is what makes this component idempotent.
  const [settled, setSettled] = useState<string | null>(null);
  const animatedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!winnerId) {
      // Tie-breaker reset — park the wheel and wait for the next spin.
      animatedFor.current = null;
      setSettled(null);
      rotation.setValue(0);
      return;
    }
    if (animatedFor.current === winnerId) return;
    animatedFor.current = winnerId;

    const index = tied.findIndex((t) => t.id === winnerId);
    if (index === -1) return;

    const target = spinTargetAngle(index, tied.length, 5 + Math.floor(Math.random() * 4));

    if (spinPhase(startedAt, winnerId, Date.now()) === 'done') {
      // Joined after it stopped: show the result, skip the theatre.
      rotation.setValue(target);
      setSettled(winnerId);
      return;
    }

    setSettled(null);
    rotation.setValue(0);
    const anim = Animated.timing(rotation, {
      toValue: target,
      duration: SPIN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => finished && setSettled(winnerId));
    return () => anim.stop();
  }, [winnerId, startedAt, tied, rotation]);

  if (tied.length < 2) return null;

  const segment = 360 / tied.length;
  const winner = settled ? tied.find((t) => t.id === settled) : null;
  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Icon name="flame" size={13} color="#FA4C93" strokeWidth={2.6} />
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, color: '#FA4C93' }}>
          Tie-breaker
        </Text>
      </View>
      <Lbl style={{ letterSpacing: 0.12 * 9 }}>
        {tied.length} teams matched at ₹{(status.settings?.hardLimit || 0).toLocaleString('en-IN')}
      </Lbl>

      <View style={{ width: size, height: size + 16, marginTop: 18, alignItems: 'center' }}>
        {/* Pointer, fixed at top dead centre — the wheel turns under it. */}
        <Svg width={22} height={16} style={{ marginBottom: -6, zIndex: 2 }}>
          <Polygon points="11,16 0,0 22,0" fill="#fff" />
        </Svg>
        {/* The whole canvas turns, so the rotation runs on the native driver
            — animating an SVG <G> prop would hop the bridge every frame. */}
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Svg width={size} height={size}>
            {tied.map((team, i) => (
              <Path
                key={team.id}
                d={arc(cx, cx, radius, i * segment, (i + 1) * segment)}
                fill={team.color}
                stroke="#0B0B0B"
                strokeWidth={2}
              />
            ))}
            <Circle cx={cx} cy={cx} r={20} fill="#0B0B0B" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
          </Svg>
        </Animated.View>
      </View>

      {/* Legend: colours on the wheel are too small to label at phone width. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        {tied.map((team) => {
          const won = settled === team.id;
          return (
            <View
              key={team.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4,
                backgroundColor: won ? '#16C46A' : 'rgba(255,255,255,0.06)',
                borderWidth: 1.5,
                borderColor: won ? '#16C46A' : 'rgba(255,255,255,0.12)',
              }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: team.color }} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: won ? 'Anton_400Regular' : 'SpaceGrotesk_400Regular',
                  textTransform: won ? 'uppercase' : 'none',
                  fontSize: 12, color: won ? '#06240F' : '#d4d4d4', maxWidth: 110,
                }}
              >
                {team.name}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 16, alignItems: 'center' }}>
        {winner ? (
          <>
            <Lbl style={{ letterSpacing: 0.22 * 9 }}>Wheel picked</Lbl>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: '#16C46A', marginTop: 6, textAlign: 'center' }}>
              {winner.name}
            </Text>
          </>
        ) : (
          <Lbl style={{ letterSpacing: 0.16 * 9 }}>
            {winnerId ? 'Spinning…' : "Awaiting the organizer's spin"}
          </Lbl>
        )}
      </View>
    </View>
  );
}
