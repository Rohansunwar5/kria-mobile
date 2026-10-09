import { getItem, setItem, deleteItem } from './secureStore';

const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';
/** Explore's recent searches, as a JSON array. Cleared with the session so the
 *  next account signed in on this phone never sees them. */
export const RECENT_SEARCHES_KEY = 'exploreRecent';

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

export async function clearAuth(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(ROLE_KEY);
  await deleteItem(RECENT_SEARCHES_KEY);
}
