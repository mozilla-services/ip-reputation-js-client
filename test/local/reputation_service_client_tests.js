/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test;
var IPReputationClient = require('../../lib/client');
var IPREPD_ADDR = process.env.IPREPD_ADDR;

var client = new IPReputationClient({
  serviceUrl: 'http://' + IPREPD_ADDR,
  id: 'root',
  key: 'toor',
  timeout: 50
});
var invalidIPError = new Error('Invalid IP.');

// Tests in this file are specifically ordered

test(
  'throws exception when missing one or more required config param',
  function (t) {
    [
      {},
      {id: 'root', key: 'toor'},
      {serviceUrl: 'https://127.0.0.1:8080', id: 'root'},
      {serviceUrl: 'https://127.0.0.1:8080', key: 'toor'},
    ].forEach(function (badConfig) {
      t.throws(function () {
        return new IPReputationClient(badConfig);
      });
    });
    t.end();
  }
);

test(
  'throws exception for invalid serviceUrl scheme',
  function (t) {
    [
      {serviceUrl: 'gopher://127.0.0.1:8080', id: 'root', key: 'toor'}
    ].forEach(function (badConfig) {
      t.throws(function () {
        return new IPReputationClient(badConfig);
      });
    });
    t.end();
  }
);

test(
  'verify remove reputation for test IP',
  function (t) {
    client.remove('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 200);
      t.equal(response.body, undefined);
      t.end();
    });
  }
);

test(
  'does not get reputation for a nonexistent IP',
  function (t) {
    client.get('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 404);
      t.end();
    });
  }
);

test(
  'does not get reputation for a invalid IP',
  function (t) {
    t.rejects(client.get('not-an-ip'), invalidIPError);
    t.end();
  }
);

test(
  'does not update reputation for invalid IP',
  function (t) {
    t.rejects(client.update('not-an-ip', 5), invalidIPError);
    t.end();
  }
);

test(
  'does not remove reputation for a invalid IP',
  function (t) {
    t.rejects(client.remove('not-an-ip'), invalidIPError);
    t.end();
  }
);

test(
  'does not sendViolation for a invalid IP',
  function (t) {
    t.rejects(client.sendViolation('not-an-ip', 'test_violation'), invalidIPError);
    t.end();
  }
);

test(
  'update reputation for new IP',
  function (t) {
    client.update('127.0.0.1', 50).then(function (response) {
      t.equal(response.statusCode, 200);
      t.end();
    });
  }
);

test(
  'update reputation for existing IP',
  function (t) {
    client.update('127.0.0.1', 75).then(function (response) {
      t.equal(response.statusCode, 200);
      t.end();
    });
  }
);

test(
  'gets reputation for a existing IP',
  function (t) {
    client.get('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 200);
      t.equal(response.body.reputation, 75);
      t.equal(response.body.ip, '127.0.0.1');
      t.equal(response.body.reviewed, false);
      // also response.body.lastupdated, which is dynamic (time of previous test request)
      t.end();
    });
  }
);

test(
  'removes reputation for existing IP',
  function (t) {
    client.remove('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 200);
      t.equal(response.body, undefined);
      return client.get('127.0.0.1'); // verify removed IP is actually gone
    }).then(function (response) {
      t.equal(response.statusCode, 404);
      t.equal(response.body, undefined); // JSON.stringify() -> undefined
      t.end();
    });
  }
);

test(
  'sends a violation',
  function (t) {
    client.get('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 404);
      return client.sendViolation('127.0.0.1', 'test_violation');
    }).then(function (response) {
      t.equal(response.statusCode, 200);
      return client.get('127.0.0.1');
    }).then(function (response) {
      t.equal(response.statusCode, 200);
      t.equal(response.body.reputation, 70);
      t.equal(response.body.ip, '127.0.0.1');
      t.equal(response.body.reviewed, false);
      t.end();
    });
  }
);

test(
  'cleans up inserted test reputation entry',
  function (t) {
    client.remove('127.0.0.1').then(function (response) {
      t.equal(response.statusCode, 200);
      t.equal(response.body, undefined);
      t.end();
    });
  }
);

test(
  'times out a GET request',
  function (t) {
    var timeoutClient = new IPReputationClient({
      serviceUrl: 'http://10.0.0.0:8080/', // a non-routable host
      id: 'root',
      key: 'toor',
      timeout: 1 // ms
    });

    timeoutClient.get('127.0.0.1').then(function () {}, function (error) {
      t.notEqual(error.code, null);
      t.end();
    });
  }
);

test(
  'errors on invalid SSL cert',
  function (t) {
    var timeoutClient = new IPReputationClient({
      serviceUrl: 'https://expired.badssl.com/',
      id: 'root',
      key: 'toor',
      timeout: 1500 // ms
    });

    timeoutClient.get('127.0.0.1').then(function () {}, function (error) {
      t.equal(error.code, 'CERT_HAS_EXPIRED');
      t.end();
    });
  }
);
