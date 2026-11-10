import { randomBytes, type ScryptOptions, scrypt, timingSafeEqual } from "node:crypto";

// scrypt is built into node and memory-hard. N=2^15, r=8 is ~32MB per hash
const KEY_LENGTH = 64;
const COST = { N: 2 ** 15, r: 8, p: 1 };
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// scrypt$N$r$p$salt$key
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, { ...COST, maxmem: MAX_MEMORY });
  return [
    "scrypt",
    COST.N,
    COST.r,
    COST.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, key] = stored.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !key) return false;

  const expected = Buffer.from(key, "base64url");
  const actual = await deriveKey(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

// used for unknown emails so the response time doesn't reveal which emails exist
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
