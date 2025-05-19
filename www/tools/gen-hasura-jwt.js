import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { generateHasuraJWT } from "~/features/auth/hasura.ts";

const envFilePath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
if (!existsSync(envFilePath)) {
  console.error("Error: no .env file found at " + envFilePath);
  process.exit(1);
}

config({ path: envFilePath });

const keyEnvVar = "HASURA_GRAPHQL_JWT_SECRET_KEY";
if (typeof process.env[keyEnvVar] === "undefined") {
  console.error("Error: " + keyEnvVar + " is undefined");
  process.exit(1);
}

const token = await generateHasuraJWT({
  defaultRole: "user",
  allowedRoles: ["user"],
  otherClaims: {
    "X-Hasura-User-Id": "1",
  },
});

console.log("Bearer " + token);
// console.log(token)
