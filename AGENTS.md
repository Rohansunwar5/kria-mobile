# Expo SDK 57

This app targets **Expo SDK 57** (React 19.2.3, React Native 0.86.3, Reanimated 4.5.1 +
react-native-worklets 0.10.1, expo-router 57, NativeWind v4, TypeScript 6.0.3).

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Why 57

It matches the Expo Go build published on the app stores, so the app can be opened on a physical
device. It was previously pinned to SDK 54 for the same reason; the stores moved on and SDK 54
could no longer be opened in Expo Go at all. **If store Expo Go moves again, this pin has to move
with it** — check the installed Expo Go version before assuming the current target still works.

## Installing dependencies

`npm install` needs `--legacy-peer-deps`. Without it npm fails with ERESOLVE:
`@react-native-community/datetimepicker` declares `react-native-windows` as a *peerOptional*, npm
resolves the `*` range anyway, picks `react-native-windows@0.84.0`, and that hard-pins
`react-native@0.84.1` against our 0.86.3. The package is genuinely used (`DobField`), and Expo
considers our version correct for SDK 57 — this is npm's resolver, not a real incompatibility.

```bash
npm install --legacy-peer-deps          # always this, never bare npm install
npx expo install <pkg> --  --legacy-peer-deps
```

Skipping peer resolution has a knock-on effect: **npm nests Expo's own scoped packages under
`node_modules/expo/node_modules/` instead of hoisting them**, and anything outside `expo/` that
resolves them then fails. Two are therefore listed as explicit top-level dependencies, and must
stay listed:

| Package | Who needs it hoisted |
|---|---|
| `expo-modules-core` | `jest-expo`'s preset setup |
| `@expo/config-plugins` | `datetimepicker`'s `app.plugin.js`, which `expo config` loads |

If a new package's plugin or preset dies with `Cannot find module '@expo/...'`, it is almost
certainly this: check whether the module exists nested under `expo/node_modules/`, and if so add it
as a top-level dependency rather than patching config.

## Testing

`jest.config.js` sets `resolver: require.resolve('react-native-worklets/jest/resolver')`. Reanimated
4.5 / worklets 0.10 otherwise resolve `NativeWorklets.native.ts` under jest and fail loading the
native module. Do not replace this with a `jest.mock('react-native-reanimated')` stub — the resolver
keeps real Reanimated behaviour in tests.

`react-test-renderer` must track `react` exactly (19.2.3); `@testing-library/react-native` checks
that peer and refuses to load on a mismatch.

## Gates

After any dependency change:

```bash
npx tsc --noEmit        # must be clean
npx jest                # 521 tests, 49 suites (baseline 2026-09-10)
npx expo config --json  # proves the plugin/config layer resolves
```

For Reanimated work, also build a bundle and confirm the worklet transform survived — a broken
babel/worklets setup leaves every animation dead while throwing no error:

```bash
npx expo start
curl -s -o /tmp/b.js "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&transform.routerRoot=src%2Fapp"
grep -c "__workletHash" /tmp/b.js        # expect ~568
```

## Conventions

Router root is `src/app/`; `@/` maps to `src/*`. Prefer `npx expo install` over bare `npm install`
for native/Expo packages so versions stay SDK-correct. **expo-router 57 vendors react-navigation** —
import `useIsFocused`, `useFocusEffect` and navigation types from `expo-router`, never from
`@react-navigation/*`; the standalone packages are a separate, incompatible copy and are not
installed. Motion tokens live in `src/lib/motion.ts` and are documented in `DESIGN.md` §6.
