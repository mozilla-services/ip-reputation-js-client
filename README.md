### Tigerblood (IP Reputation Service) node.js client library

Client library to send IP reputations to [the tigerblood service](https://github.com/mozilla-services/tigerblood).

Usage:

Create a client:

```js
const IPReputationClient = require('ip-reputation-service-client-js')

const client = new IPReputationClient({
    serviceUrl: 'http://<tigerblood service host without trailing slash>',
    id: '<a hawk ID>',
    key: '<a hawk key>',
    timeout: <number in ms>
})
```

Get the reputation for an IP:

```js
client.get('127.0.0.1').then(function (response) {
    if (response && response.statusCode === 404) {
        console.log('No reputation found for 127.0.0.1');
    } else {
        console.log('127.0.0.1 has reputation: ', response.body.Reputation);
    }
});
```

Set the reputation for an IP:

```js
client.add('127.0.0.1', 20).then(function (response) {
    console.log('Added reputation of 20 for 127.0.0.1');
});
```

Update the reputation for an IP:

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
    console.log('Upserted reputation for 127.0.0.1.');
});
```

## Development

Tests run against [the tigerblood service](https://github.com/mozilla-services/tigerblood) with [docker-compose](https://docs.docker.com/compose/) from the ip-reputation-js-client repo root:

1. Install [docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/)
1. Run `docker-compose build` then `docker-compose run --rm test` (note: this may fail on the first run, but should work on subsequent runs due to the web and test containers not waiting long enough for the DB and web servers to start)
1. Open `coverage/lcov-report/index.html` to see the coverage report
