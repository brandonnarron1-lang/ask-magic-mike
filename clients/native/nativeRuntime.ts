import * as ExpoSecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import type { CandidateRuntime } from "./App";
import { createProtectedStore } from "./protectedStore";
import { createGuestSessionAdapter, type NativeFetch, type GuestQaDescriptor } from "./nativeHttp";

const nativeOptions: ExpoSecureStore.SecureStoreOptions = {
  keychainService: "amm-r3-native-guest-v1",
  keychainAccessible: ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: false, // No permission/biometric prompt or Expo Go FaceID dependency.
};
export function createNativeRuntime(verifiedQa?: GuestQaDescriptor, fetchOverride: NativeFetch = expoFetch): CandidateRuntime {
  const secureStore = createProtectedStore({
    get: key => ExpoSecureStore.getItemAsync(key, nativeOptions),
    set: (key, value) => ExpoSecureStore.setItemAsync(key, value, nativeOptions),
    remove: key => ExpoSecureStore.deleteItemAsync(key, nativeOptions),
  });
  return {
    secureStore,
    newRequestId: () => Crypto.randomUUID(),
    ...(verifiedQa ? { qa: { ...verifiedQa, session: createGuestSessionAdapter(verifiedQa, secureStore, fetchOverride) } } : {}),
  };
}
