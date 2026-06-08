import { useState } from 'react';
import { Pressable, View, Image, Text, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useAppDispatch } from '@/store/hooks';
import { uploadPlayerProfileImage } from '@/store/slices/authSlice';

export function AvatarPicker({ name, imageUrl }: { name?: string; imageUrl?: string }) {
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
    <Pressable onPress={pick} disabled={busy} className="self-center">
      <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-brand bg-black">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full rounded-full" />
        ) : (
          <InitialsAvatar name={name} size={104} />
        )}
        <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
          {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-2xl">📷</Text>}
        </View>
      </View>
    </Pressable>
  );
}
