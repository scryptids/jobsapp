---
sidebar_position: 1
---

# Hasura

GraphQL queries issued server-side from Remix use a JSON Web Token (JWT) for authorization. The JWT payload looks like the following:

```json
{
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": [ "user" ],
    "x-hasura-default-role": "user",
    "X-Hasura-User-Id": "1"
  }
}
```

For the three tables that are currently configured (positions, employers, users) this has the effect of returning only the rows which belong to the authenticated user, even though there isn't a filter explicitly provided in the query like `where: { user_id: { _eq: "1" } }`.