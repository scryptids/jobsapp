import { getSdk } from "src/graphql/_generated";
import { GraphQLClient } from "graphql-request";

/**
 * Client for requests made on behalf of a logged-in user. Callers pass the
 * user's Hasura JWT per request, so Hasura's `user` role permissions apply.
 */
const sdk = getSdk(new GraphQLClient(process.env.GRAPHQL_API_URL!));

/**
 * Client authenticated with the Hasura admin secret, which bypasses all
 * permissions. Only for server-side flows that run before a user session
 * exists (sign-up, credential login). Never expose its results unfiltered.
 */
const adminSdk = getSdk(
  new GraphQLClient(process.env.GRAPHQL_API_URL!, {
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
    },
  })
);

export { sdk, adminSdk };
