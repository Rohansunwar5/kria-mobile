import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';

export type Role = 'player';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRole(): Promise<Role | null> {
  return (await SecureStore.getItemAsync(ROLE_KEY)) as Role | null;
}

export async function setAuth(token: string, role: Role): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(ROLE_KEY, role);
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
}
