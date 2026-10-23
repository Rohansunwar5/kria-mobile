import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAppDispatch } from '@/store/hooks';
import { uploadPlayerProfileImage } from '@/store/slices/authSlice';

/** Pick a photo, shrink it to what the server takes, upload it. Shared by every place a player changes their photo. */
export function usePhotoUpload() {
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
  return { pick, busy };
}
