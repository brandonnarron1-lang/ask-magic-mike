/** Edge-runtime-safe secret comparison for middleware.
 * Both values are hashed before comparison so the loop always handles the
 * same number of bytes. Server-only API routes use node:crypto instead. */
export async function edgeSecretsMatch(
  expected: string | undefined,
  supplied: string | null,
): Promise<boolean> {
  if (!expected || !supplied) return false;
  const encoder = new TextEncoder();
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(suppliedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function decodeBasicPassword(authorization: string): string | null {
  const [scheme, encoded] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;
  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    return separator >= 0 ? decoded.slice(separator + 1) : null;
  } catch {
    return null;
  }
}
