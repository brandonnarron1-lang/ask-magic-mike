// Local owner-controlled Android identity. No store registration or upload.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { join, resolve } from "node:path";
export function androidBetaSigning(directory, javaHome) {
  const expected = "/Users/brandonnarron/.codex/private/ask-magic-mike/android-beta";
  if (directory !== expected || !javaHome) throw Error("explicit_owned_beta_signing_directory_required");
  mkdirSync(directory, { recursive: true, mode: 0o700 }); chmodSync(directory, 0o700);
  const helper = join(directory, "keychain-helper"), source = resolve("scripts/amm/native-beta-keychain.swift");
  const sha = createHash("sha256").update(readFileSync(source)).digest("hex");
  const seal = helper + ".source-sha256";
  if (!existsSync(helper) || !existsSync(seal) || readFileSync(seal, "utf8") !== sha) {
    execFileSync("xcrun", ["swiftc", source, "-o", helper], { stdio: ["ignore", "pipe", "pipe"] });
    writeFileSync(seal, sha, { mode: 0o600 }); chmodSync(helper, 0o700);
  }
  const keystore = join(directory, "owner-beta-20261019.jks"), keytool = join(javaHome, "bin/keytool");
  if (!existsSync(keystore)) {
    // If a previous attempt saved a password but failed generation, reconcile
    // that SAME identity. Never mint a second key or replace a keystore.
    let password;
    try { password = execFileSync(helper, ["read"], { stdio: ["ignore", "pipe", "pipe"] }).toString(); }
    catch {
      password = randomBytes(32).toString("hex");
      execFileSync(helper, ["create"], { input: password, stdio: ["pipe", "pipe", "pipe"] });
    }
    execFileSync(keytool, ["-genkeypair", "-keystore", keystore, "-storetype", "JKS", "-alias", "amm-owner-beta",
      "-storepass:env", "AMM_BETA_SIGNING_PASSWORD", "-keypass:env", "AMM_BETA_SIGNING_PASSWORD", "-keyalg", "RSA", "-keysize", "3072",
      "-validity", "3650", "-dname", "CN=Ask Magic Mike Internal Beta, O=Our Town Properties Inc, C=US"], {
      env: { PATH: process.env.PATH, JAVA_HOME: javaHome, AMM_BETA_SIGNING_PASSWORD: password }, stdio: ["ignore", "pipe", "pipe"] });
    chmodSync(keystore, 0o600);
  }
  const password = execFileSync(helper, ["read"], { stdio: ["ignore", "pipe", "pipe"] }).toString();
  const certificate = execFileSync(keytool, ["-exportcert", "-keystore", keystore, "-alias", "amm-owner-beta", "-storepass:env", "AMM_BETA_SIGNING_PASSWORD"], {
    env: { PATH: process.env.PATH, JAVA_HOME: javaHome, AMM_BETA_SIGNING_PASSWORD: password }, stdio: ["ignore", "pipe", "pipe"] });
  return { keystore, password, certificateSHA256: createHash("sha256").update(certificate).digest("hex"), alias: "amm-owner-beta" };
}
