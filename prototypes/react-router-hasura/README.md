# Job Application Tracker

## Notes

- More experimentation is necessary to properly integrate TanStack Form and React Router
- Need to figure out why `console.log` doesn't work as expected with client-side code. Also, having some React code run on the client and some on the server complicates the debugging story.
- Hasura is a convenient tool for creating a GraphQL API server with minimal configuration, but for small projects it might be more ergonomic to keep all the "ORM" code in the same language and codebase. This also enables simpler deployments, with potentially only a single container for application code.
- Recent releases of React Router seem to prioritize the non-SPA approach

## Running Hasura GraphQL Engine Locally

### Prerequisites

- [Hasura CLI](https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/)
- [OCI](https://opencontainers.org/) container client and runtime
  - [Docker Desktop](https://docs.docker.com/desktop/) - Tested on Mac and Windows.
  - [Docker Engine](https://docs.docker.com/engine/)
  - [Podman Desktop](https://github.com/containers/podman-desktop) + [Podman Compose](https://github.com/containers/podman-compose) (untested)

### Create .env file

Copy `./www/.env.example` to `./www/.env` and update the value for `HASURA_GRAPHQL_ADMIN_SECRET`. Hasura only reads this value once when it initializes - if you add or change this value after starting the container then you'll need to delete the volume and repeat the local development setup procedure.

### Create/run containers and initialize Hasura

#### Windows PowerShell
```powershell
# Create and run containers
docker compose up -d

# Apply Hasura metadata, run migrations, then seed database
$Env:HASURA_GRAPHQL_ADMIN_SECRET = <value from .env file>
Push-Location hasura
hasura metadata apply;
hasura migrate apply --database-name default;
hasura seed apply --database-name default;
hasura metadata reload;
Pop-Location

# Open Hasura console in browser
[System.Diagnostics.Process]::Start("http://localhost:8080/console")
```

#### bash/zsh

There is a convenience script at `./tools/init-hasura.sh` to automate this process.

It's recommended to run the script with the -y flag, otherwise it may fail in situations where the database has already been seeded and you try to insert data that violates uniqueness constraints.

## Querying local Hasura GraphQL instance with cURL

```bash
# the --json flag is a shortcut for using the POST method and setting the necessary headers for sending and receiving JSON
curl --header "x-hasura-admin-secret: $HASURA_GRAPHQL_ADMIN_SECRET" \
    --json '{"query": "{ __schema { queryType { fields { name description } } } }"}' \
    http://localhost:8080/v1/graphql \
    | jq
```
