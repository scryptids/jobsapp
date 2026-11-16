/**
 * Password hashing with Node's built-in scrypt.
 *
 * Stored format: `scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>`, so cost
 * parameters can be raised later without breaking existing hashes.
 * @module
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 2 ** 15;
const r = 8;
const p = 1;
const keyLength = 64;
const saltLength = 16;
// scrypt needs 128 * N * r bytes; leave headroom over Node's 32 MiB default.
const maxmem = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
  length: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, { ...params, maxmem }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const hash = await deriveKey(password, salt, { N, r, p }, keyLength);
  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, rr, pp, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await deriveKey(
    password,
    Buffer.from(saltB64, "base64"),
    { N: Number(n), r: Number(rr), p: Number(pp) },
    expected.length
  );
  return timingSafeEqual(actual, expected);
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("password hashing", () => {
    it("verifies the original password", async () => {
      const stored = await hashPassword("correct horse battery staple");
      expect(stored.startsWith("scrypt$")).toBe(true);
      expect(await verifyPassword("correct horse battery staple", stored)).toBe(
        true
      );
    });

    it("rejects a wrong password", async () => {
      const stored = await hashPassword("hunter22");
      expect(await verifyPassword("hunter23", stored)).toBe(false);
    });

    it("salts each hash", async () => {
      expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
    });

    it("rejects malformed hashes", async () => {
      expect(await verifyPassword("x", "")).toBe(false);
      expect(await verifyPassword("x", "bcrypt$a$b$c$d$e")).toBe(false);
    });
  });
}
