// AES-GCM encryption for delivered codes. Key derived from CODES_ENCRYPTION_KEY.
async function getKey() {
  const secret = process.env["CODES_ENCRYPTION_KEY"];
  if (!secret) throw new Error("CODES_ENCRYPTION_KEY missing");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString("base64");

export async function encryptCode(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getKey(), new TextEncoder().encode(plain));
  return `${b64(iv)}.${b64(ct)}`;
}

export async function decryptCode(enc: string) {
  const [iv, ct] = enc.split(".");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") }, await getKey(), Buffer.from(ct, "base64"),
  );
  return new TextDecoder().decode(pt);
}
