import React from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import App from "./App";
import { createNativeRuntime } from "./nativeRuntime";
import { localQaBinding } from "./qaBinding";

// Local storage and UUID only: no request, auth, cookie, permission or QA origin.
declare const process: { env: { EXPO_PUBLIC_AMM_NATIVE_QA_BINDING?: string } };
const descriptor = localQaBinding(process.env.EXPO_PUBLIC_AMM_NATIVE_QA_BINDING, Platform.OS);
const runtime = createNativeRuntime(descriptor);
function NativeCandidate() {
  return <SafeAreaProvider><App runtime={runtime} /></SafeAreaProvider>;
}
registerRootComponent(NativeCandidate);
