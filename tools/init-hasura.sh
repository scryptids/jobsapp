#!/usr/bin/env bash
# shellcheck disable=SC1090,SC1091
set -euo pipefail

TOOLS_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "${TOOLS_DIR}/.."

# shellcheck disable=SC2155
declare -r SOURCE_DIR="$(pwd)"
declare -r WEB_DIR="${SOURCE_DIR}/www"
declare -r ENV_FILE_PATH="${WEB_DIR}/.env"
declare -r PG_VOL_NAME="jobsapp_db_data"
declare -r GQL_ENDPOINT="http://localhost:8080"

set -a
source "${ENV_FILE_PATH}"
source "${TOOLS_DIR}/utils.sh"
set +a

usage() {
  echo "Usage: $0 <OPTIONS>"
  echo "  Options: "
  echo "   -y: Skip confirmation prompts and assume 'yes'"
  exit 1
}

ASSUME_YES="false"
while getopts y flag
do
  case "${flag}" in
    y) ASSUME_YES="true" ;;
    *) usage
  esac
done

# Stop and remove containers so that we can remove volumes without issue
docker compose down

# Optionally remove postgres volume so we can run migration and seed without issue
docker volume inspect "$PG_VOL_NAME" 2> /dev/null && confirm "Delete existing database volume: $PG_VOL_NAME" && {
  docker volume rm "$PG_VOL_NAME"
}

# Create and run containers
docker compose up -d

# Wait a bit for Hasura GraphQL engine to become ready
sleep 5

# Apply Hasura metadata, run migrations, then seed database
pushd hasura
hasura metadata apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT"
hasura migrate apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT" --database-name default
hasura seed apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT" --database-name default
hasura metadata reload --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT"
popd

# Open Hasura console in browser
confirm "Open Hasura web console?" && open http://localhost:8080/console
