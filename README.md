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

Tests run against [the tigerblood service](https://github.com/mozilla-services/tigerblood) to get that running:

1. `cd` to the tigerblood repo root
1. Run `make build-container` to a docker image named `tigerblood_db` and `make build` to build tigerblood locally
1. Run `docker run --rm -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 --name postgres-ip4r tigerblood_db` to start the tigerblood DB
1. Run `lsof -i :5432` to check that postgres is listening on 5432
1. Run `TIGERBLOOD_DSN='user=tigerblood dbname=tigerblood password=mysecretpassword sslmode=disable' ./tigerblood --config-file ~/ip-reputation-js-client/test/tigerblood.config.yml` to start tigerblood with the test config
1. Run `lsof -i :8080` to check that tigerblood is listening on 8080

Then from the ip-reputation-js-client repo root:

1. Run `npm install` to install this library
1. Run `npm test` to test the client against the tigerblood server
1. Open `coverage/lcov-report/index.html` to see the coverage report
