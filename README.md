# Job Application Tracker

[Documentation website](https://scryptids.github.io/jobsapp/)

## Running Hasura GraphQL Engine Locally

### Prerequisites

https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/

https://hasura.io/docs/latest/getting-started/docker-simple/

### (Optional) Create an admin secret

Copy `./frontend/.env.example` to `./frontend/.env` and update the value for `HASURA_GRAPHQL_ADMIN_SECRET`. Hasura only reads this value once when it initializes - if you add or change this value after starting the container then you'll need to delete the volume and repeat the local development setup procedure.

### Run containers and initialize Hasura

```bash
docker compose up -d
cd api

# Apply Hasura metadata, run migrations, then seed database
hasura metadata apply;
hasura migrate apply --database-name default;
hasura seed apply --database-name default;
hasura metadata reload;

# Open Hasura console in browser
open http://localhost:8080/console
```