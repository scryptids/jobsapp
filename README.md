# Job Application Tracker

[Documentation website](https://scryptids.github.io/jobsapp/)

## Running Hasura GraphQL Engine Locally

### Prerequisites

- [Hasura CLI](https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/)
- [OCI](https://opencontainers.org/) container client and runtime
  - [Docker Desktop](https://docs.docker.com/desktop/) - Tested on Mac and Windows.
  - [Docker Engine](https://docs.docker.com/engine/)
  - [Podman Desktop](https://github.com/containers/podman-desktop) + [Podman Compose](https://github.com/containers/podman-compose) (untested)

### Create .env file

Copy `./frontend/.env.example` to `./frontend/.env` and update the value for `HASURA_GRAPHQL_ADMIN_SECRET`. Hasura only reads this value once when it initializes - if you add or change this value after starting the container then you'll need to delete the volume and repeat the local development setup procedure.

### Create/run containers and initialize Hasura

#### Windows PowerShell
```powershell
# Create and run containers
docker compose up -d

# Apply Hasura metadata, run migrations, then seed database
$Env:HASURA_GRAPHQL_ADMIN_SECRET = <value from .env file>
cd api
hasura metadata apply;
hasura migrate apply --database-name default;
hasura seed apply --database-name default;
hasura metadata reload;

# Open Hasura console in browser
[System.Diagnostics.Process]::Start("http://localhost:8080/console")
```

#### POSIX shell
```bash
# Create and run containers
docker compose up -d

# Apply Hasura metadata, run migrations, then seed database
source frontend/.env
cd api
hasura metadata apply;
hasura migrate apply --database-name default;
hasura seed apply --database-name default;
hasura metadata reload;

# Open Hasura console in browser
open http://localhost:8080/console
```