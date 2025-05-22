import { getSdk } from "src/graphql/_generated";
import { GraphQLClient } from "graphql-request";

const sdk = getSdk(
  new GraphQLClient(process.env.GRAPHQL_API_URL!, {
    headers: {
      // "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
    },
  })
);

export { sdk };
