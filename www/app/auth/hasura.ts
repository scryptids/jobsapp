import * as jose from "jose";

const alg = "HS256"
const key = process.env.HASURA_JWT_SECRET_KEY ||
  "this-is-a-generic-HS256-secret-key-and-you-should-definitely-change-it"
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
