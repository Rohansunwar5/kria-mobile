import { useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { normalizeActions } from '@/lib/photoCrop';
import { setPhotoDraft } from '@/lib/photoDraft';

/** Pick a photo and open the crop screen, which uploads it. Shared by every place a player changes their photo. */
export function usePhotoUpload() {
  const router = useRouter();
  // Preparing a big photo takes a second with nothing on screen; ignore taps meanwhile.
  const inFlight = useRef(false);

  const pick = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try { await run(); } finally { inFlight.current = false; }
  };
  const run = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    try {
      // Re-encode once: bakes in EXIF rotation (and HEIC) and caps the long side,
      // so the crop screen and the crop itself work in the same pixels.
      const asset = result.assets[0];
      const out = await manipulateAsync(asset.uri, normalizeActions(asset), { compress: 0.9, format: SaveFormat.JPEG });
      setPhotoDraft({ uri: out.uri, width: out.width, height: out.height });
      router.push('/photo-crop');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not update your photo. Try again.');
    }
  };
  return { pick };
}
