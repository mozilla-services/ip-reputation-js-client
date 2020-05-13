#!/bin/sh

set -e

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

npm run-script lint:deps
node_modules/.bin/grunt lint copyright
node_modules/.bin/nyc tap test/local/reputation_service_client_tests.js
node_modules/.bin/nyc report --reporter=lcov
