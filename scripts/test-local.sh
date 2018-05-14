#!/bin/sh

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# default variables
: "${PORT:=8080}"
: "${SLEEP:=1}"
: "${TRIES:=60}"

wait_for() {
  tries=0
  echo "Waiting for $1 to listen on $2..."
  while true; do
    [[ $tries -lt $TRIES ]] || return
    (echo > /dev/tcp/$1/$2) >/dev/null 2>&1
    result=
    [[ $? -eq 0 ]] && return
    sleep $SLEEP
    tries=$((tries + 1))
  done
}

# Only wait for backend services in development
# http://stackoverflow.com/a/13864829
# For example, docker-compose.yml sets 'DEVELOPMENT' to 1
[ ! -z ${DEVELOPMENT+check} ] && wait_for web 8080 && sleep 3

node_modules/.bin/grunt lint copyright || exit 1
node_modules/.bin/nyc tap test/local/reputation_service_client_tests.js
node_modules/.bin/nyc report --reporter=lcov
