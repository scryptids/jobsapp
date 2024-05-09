import { getSdk } from "~/graphql/_generated";
import { GraphQLClient } from "graphql-request";

const sdk = getSdk(new GraphQLClient(process.env.GRAPHQL_ENDPOINT!, {
  headers: {
    "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
  },
}));

export { sdk };
