import { useState } from 'react';
import { Pressable, View, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Icon } from '@/components/icons';
import { useAppDispatch } from '@/store/hooks';
import { uploadPlayerProfileImage } from '@/store/slices/authSlice';

/** Square now, 4px radius, with the camera affordance as a corner badge —
 *  this is the only place a player can change their photo. */
export function AvatarPicker({ name, imageUrl, size = 76 }: { name?: string; imageUrl?: string; size?: number }) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    setBusy(true);
    try {
      // iOS often hands back HEIC and/or multi-MB originals. The server only
      // accepts jpg/png/jpeg/gif by filename extension and caps at 5MB, so
      // downscale to a 512px avatar and re-encode as JPEG before uploading.
      const processed = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      await dispatch(
        uploadPlayerProfileImage({ uri: processed.uri, name: 'avatar.jpg', type: 'image/jpeg' })
      ).unwrap();
    } catch {
      Alert.alert('Upload failed', 'Could not update your photo. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      onPress={pick}
      disabled={busy}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: 4 }} />
      ) : (
        <InitialsAvatar name={name} size={size} />
      )}
      <View
        style={{
          position: 'absolute',
          right: -5,
          bottom: -5,
          width: 26,
          height: 26,
          borderRadius: 4,
          backgroundColor: '#0B0B0B',
          borderWidth: 1.5,
          borderColor: '#F97316',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {busy ? <ActivityIndicator size="small" color="#F97316" /> : <Icon name="edit" size={13} color="#F97316" strokeWidth={2.2} />}
      </View>
    </Pressable>
  );
}
