import { getItem, setItem, deleteItem } from './secureStore';

const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';
/** The last profile the server sent, so a cold start offline still opens signed in (LAUNCH-AUDIT H20). */
const PROFILE_KEY = 'profile';

export type Role = 'player';

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getRole(): Promise<Role | null> {
  return (await getItem(ROLE_KEY)) as Role | null;
}

export async function setAuth(token: string, role: Role): Promise<void> {
  await setItem(TOKEN_KEY, token);
  await setItem(ROLE_KEY, role);
}

export async function getProfile(): Promise<any | null> {
  try {
    const saved = await getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function setProfile(profile: unknown): Promise<void> {
  // ponytail: whole profile in SecureStore; iOS warns past 2 KB. Trim to the fields the UI reads if iOS ships.
  await setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
}

export async function clearAuth(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(ROLE_KEY);
  await deleteItem(PROFILE_KEY);
}
