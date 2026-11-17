/**
 * The photo the crop screen frames, handed over outside the router: expo-router
 * decodes route params twice, which corrupts Expo Go's percent-escaped cache
 * paths (…/%2540anonymous%252F…).
 */
export type PhotoDraft = { uri: string; width: number; height: number };

let draft: PhotoDraft | null = null;

export const setPhotoDraft = (d: PhotoDraft) => { draft = d; };
export const getPhotoDraft = () => draft;
