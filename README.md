## iprepd (IP Reputation Service) node.js client library

Client library to send object reputations to [the iprepd service](https://github.com/mozilla-services/iprepd).

[![npm version](https://badge.fury.io/js/ip-reputation-js-client.svg)](https://www.npmjs.com/package/ip-reputation-js-client) [![Coverage Status](https://coveralls.io/repos/github/mozilla-services/ip-reputation-js-client/badge.svg?branch=main)](https://coveralls.io/github/mozilla-services/ip-reputation-js-client?branch=main) [![Build Status](https://travis-ci.org/mozilla-services/ip-reputation-js-client.svg?branch=main)](https://travis-ci.org/mozilla-services/ip-reputation-js-client)

### Overview

iprepd is a service that supports storing and retrieving reputations associated with various object
types, the most common being IP addresses but including others such as account names and email
addresses. This library can be used by Node applications to integrate directly with this API.

### Usage

#### Functions

Create a client:

```js
const IPReputationClient = require('ip-reputation-service-client-js')

const client = new IPReputationClient({
    serviceUrl: 'http://<iprepd service host without trailing slash>',
    id: '<a hawk ID>',
    key: '<a hawk key>',
    timeout: <number in ms>
})
```

Get the reputation for an IP:

```js
client.getTyped('ip', '127.0.0.1').then(function (response) {
    if (response && response.statusCode === 404) {
        console.log('No reputation found for 127.0.0.1');
    } else {
        console.log('127.0.0.1 has reputation: ', response.body.reputation);
    }
});
```

Set the reputation for an IP:

```js
client.updateTyped('ip', '127.0.0.1', 79).then(function (response) {
    console.log('Set reputation for 127.0.0.1 to 79.');
});
```

Remove an IP:

```js
client.removeTyped('ip', '127.0.0.1').then(function (response) {
    console.log('Removed reputation for 127.0.0.1.');
});
```

Send a violation for an IP:

```js
client.sendViolationTyped('ip', '127.0.0.1', 'exceeded-password-reset-failure-rate-limit').then(function (response) {
    console.log('Applied violation to 127.0.0.1.');
});
```

#### Legacy functions

Previous versions of iprepd only supported IP addresses; these functions remain as a compatibility
layer for applications that still make use of them, and are essentially wrappers around the typed
function calls.

Get the reputation for an IP:

```js
client.get('127.0.0.1').then(function (response) {
    if (response && response.statusCode === 404) {
        console.log('No reputation found for 127.0.0.1');
    } else {
        console.log('127.0.0.1 has reputation: ', response.body.reputation);
    }
});
```

Set the reputation for an IP:

```js
client.update('127.0.0.1', 79).then(function (response) {
    console.log('Set reputation for 127.0.0.1 to 79.');
});
```

Remove an IP:

```js
client.remove('127.0.0.1').then(function (response) {
    console.log('Removed reputation for 127.0.0.1.');
});
```

Send a violation for an IP:

```js
client.sendViolation('127.0.0.1', 'exceeded-password-reset-failure-rate-limit').then(function (response) {
    console.log('Applied violation to 127.0.0.1.');
});
```

### Development

Tests run against [the iprepd service](https://github.com/mozilla-services/iprepd) with [docker-compose](https://docs.docker.com/compose/) from the ip-reputation-js-client repo root:

1. Install [docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/)
1. Run `docker-compose build`.
1. Run `docker-compose run --rm test npm install` to collect package dependencies.
1. Run `docker-compose run --rm test` to test.
1. Open `coverage/lcov-report/index.html` to see the coverage report
1. Run `docker-compose down` when you are finished running tests to remove cache and web containers.
