/**
 * JWT generation for Hasura
 * @module
 */

import * as jose from "jose";

const alg = "HS256"
const defaultKey =
  "this-is-a-generic-HS256-secret-key-and-you-should-definitely-change-it";
// Must match the key in Hasura's HASURA_GRAPHQL_JWT_SECRET (see .env.example).
const key =
  process.env.HASURA_GRAPHQL_JWT_SECRET_KEY ||
  // Older name, kept so existing .env files keep working.
  process.env.HASURA_JWT_SECRET_KEY ||
  defaultKey;
if (key === defaultKey) {
  console.warn(
    "🚨 No HASURA_GRAPHQL_JWT_SECRET_KEY set, using the default key. The app is insecure in production."
  );
}
const secret = new TextEncoder().encode(key)

interface GenerateHasuraJWTParams {
  defaultRole: string;
  allowedRoles: string[];
  otherClaims?: Record<string, string | string[]>;
}

export async function generateHasuraJWT(params: GenerateHasuraJWTParams): Promise<string> {
  const payload = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": params.allowedRoles,
      "x-hasura-default-role": params.defaultRole,
      ...params.otherClaims,
    },
  };

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("1week")
    .sign(secret);

  return jwt;
}
