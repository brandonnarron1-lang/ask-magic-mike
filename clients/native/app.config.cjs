const { expo } = require("./app.json");
// Public build identity only. The real parser, build seal and server admission
// independently validate this descriptor. No credential or EAS/OTA binding.
module.exports = () => {
  if (!process.env.EXPO_PUBLIC_AMM_NATIVE_BETA_BINDING) return expo;
  if (process.env.EXPO_PUBLIC_AMM_NATIVE_QA_BINDING) throw Error("mixed_native_venues");
  const code = Number(process.env.AMM_NATIVE_BETA_VERSION_CODE || "1");
  if (!Number.isSafeInteger(code) || code < 1 || code > 100) throw Error("bounded_beta_version_required");
  return { ...expo, version: "0.1.0", ios: { ...expo.ios, bundleIdentifier: "com.askmagicmike.internalbeta", buildNumber: String(code) },
    android: { ...expo.android, package: "com.askmagicmike.internalbeta", versionCode: code } };
};
