import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Hairlines, Hazard, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';

// The payoff of the whole onboarding flow, designed twice: CardPreview (locked,
// no photo, number pending) and WelcomeDone (photo, real number, brand border).
// Same component, two variants — neither is watered down.

export type CardVariant = 'preview' | 'issued';

interface Props {
  name: string;
  sport: string;
  city?: string;
  photoUri?: string | null;
  variant: CardVariant;
  /** Issued only. Falls back to the pending placeholder when absent. */
  playerNo?: string;
  issuedOn?: string;
}

const W = 250;

function initialsOf(name: string) {
  return (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function PlayerIDCard({ name, sport, city, photoUri, variant, playerNo, issuedOn }: Props) {
  const issued = variant === 'issued';
  return (
    <View
      style={{
        width: W,
        alignSelf: 'center',
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: issued ? '#F97316' : 'rgba(255,255,255,0.16)',
        borderRadius: 6,
        overflow: 'hidden',
        // box-shadow → RN elevation/shadow. The orange bloom on WelcomeDone is
        // not reproducible cross-platform, so only the drop shadow survives.
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 18 },
        elevation: 12,
      }}
    >
      <View style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#0B0B0B' }}>Kria</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.16 * 8, color: 'rgba(11,11,11,0.72)' }}>PLAYER ID</Text>
      </View>

      <View style={{ height: 184, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <LinearGradient
          colors={issued ? ['#2f1d11', '#161616'] : ['#2a1a10', '#161616']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Hairlines />
        {issued ? (
          <>
            <Ghost text={initialsOf(name)} size={150} style={{ right: -16, bottom: -30 }} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 88, height: 88, borderRadius: 4 }} />
              ) : (
                <InitialsAvatar name={name} size={88} />
              )}
            </View>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 88, height: 88, borderRadius: 4 }} />
            ) : (
              <>
                <Icon name="person" size={34} color="#5c5c5c" strokeWidth={1.9} />
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.14 * 8, color: '#5c5c5c' }}>ADD A PHOTO</Text>
              </>
            )}
            <View style={{ position: 'absolute', top: 10, right: 10 }}>
              <Tag label="Preview" variant="auction" />
            </View>
          </View>
        )}
      </View>

      <View style={{ padding: 12 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 23, color: '#fff' }}>{name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 11 }}>
          <Tag label={sport} variant="live" />
          {city ? <Tag label={city} variant="up" /> : null}
        </View>
      </View>

      <Hazard height={4} />

      <View style={{ flexDirection: 'row', backgroundColor: '#0B0B0B', paddingHorizontal: 12, paddingVertical: 9 }}>
        <View style={{ flex: 1 }}>
          <Lbl style={{ fontSize: 8, letterSpacing: 0.14 * 8 }}>Player no.</Lbl>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: issued ? '#F97316' : '#fff', marginTop: 3 }}>
            {issued && playerNo ? playerNo : 'KRIA·0000'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Lbl style={{ fontSize: 8, letterSpacing: 0.14 * 8 }}>Issued</Lbl>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: issued ? '#fff' : '#7d7d7d', marginTop: 3 }}>
            {issued ? issuedOn || 'TODAY' : 'PENDING'}
          </Text>
        </View>
      </View>
    </View>
  );
}
