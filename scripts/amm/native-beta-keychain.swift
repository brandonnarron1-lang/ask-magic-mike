import Foundation
import Security

// Dedicated Android-beta keystore password only. No account, model or signing
// key export. Called with pipes by the local packaging tool, NEVER logged.
let service = "com.askmagicmike.internalbeta.android.keystore.v1"
let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: service, kSecAttrAccount as String: "owner-beta-20261019"]
guard CommandLine.arguments.count == 2 else { exit(2) }
switch CommandLine.arguments[1] {
case "create":
    let data = FileHandle.standardInput.readDataToEndOfFile()
    guard data.count == 64, String(data: data, encoding: .utf8)?.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { exit(3) }
    var item = query
    item[kSecValueData as String] = data
    item[kSecAttrLabel as String] = "Ask Magic Mike owner-controlled Android internal beta keystore"
    item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { exit(4) }
    print("saved") // Duplicate creation fails; never overwrites an existing item.
case "read":
    var item = query
    item[kSecReturnData as String] = true
    item[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    guard SecItemCopyMatching(item as CFDictionary, &result) == errSecSuccess, let data = result as? Data, data.count == 64 else { exit(5) }
    FileHandle.standardOutput.write(data)
default: exit(2)
}
