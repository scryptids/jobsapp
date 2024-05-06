# Job Application Tracker

[Documentation website](https://scryptids.github.io/jobsapp/)

## Running Hasura GraphQL Engine Locally

https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/

https://hasura.io/docs/latest/getting-started/docker-simple/

```bash
docker compose up -d
cd api

# Apply Hasura metadata, run migrations, then seed database
hasura metadata apply
hasura migrate apply --database-name default
hasura seed apply --database-name default
hasura metadata reload

# Open Hasura console in browser
open http://localhost:8080/console
```