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

echo "Stopping and removing containers"
docker compose down

# Optionally remove postgres volume so we can run migration and seed without issue
docker volume inspect "$PG_VOL_NAME" > /dev/null 2> /dev/null && confirm "Delete existing database volume: ${PG_VOL_NAME}?" && {
  docker volume rm "$PG_VOL_NAME"
}

echo "Creating and running containers"
docker compose up -d

echo -n "Sleeping a bit to give Hasura time to become ready"
for _ in {1..6}; do
  sleep 1; echo -n "."
done
echo

echo "Applying Hasura metadata, running migrations, and seeding database"
pushd hasura > /dev/null
hasura metadata apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT"
hasura migrate apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT" --database-name default
hasura seed apply --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT" --database-name default
hasura metadata reload --envfile "$ENV_FILE_PATH" --endpoint "$GQL_ENDPOINT"
popd > /dev/null

confirm "Open Hasura web console in browser?" && open http://localhost:8080/console
