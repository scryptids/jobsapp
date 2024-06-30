#!/usr/bin/env bash

# Print to stderr
echoerr() { echo "$@" 1>&2; }

# Offers a confirmation prompt, unless we were passed `-y`.
#
# Args:
#  $1: Text to be displayed
confirm() {
  if [[ "${ASSUME_YES}" == "true" ]]; then
    response=y
  else
    read -r -p "$1 (y/n): " response
  fi
  case $response in
    [yY])
      true
      ;;
    *)
      false
      ;;
  esac
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
  echoerr "This file is not meant to be run directly."
fi
