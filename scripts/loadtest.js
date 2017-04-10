/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Promise = require('bluebird');
const hawk = require('hawk');
const Histogram = require('native-hdr-histogram');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
var getRandomInt = function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};

var randomIPv4 = function randomIPv4() {
    return [getRandomInt(0, 256),
	    getRandomInt(0, 256),
	    getRandomInt(0, 256),
	    getRandomInt(0, 256)].join('.');
};

var randomChoice = function (arr) {
    return arr[getRandomInt(0, arr.length-1)];
};

var generateTestIPs = function (numIps) {
    var test_ips = [];
    for (let i = 0; i < numIps; i++) {
	test_ips.push(randomIPv4());
    }
    return test_ips;
};

var IPReputationClient = require('../lib/client');

const creds = {
  id: process.env.HAWK_ID,
  key: process.env.HAWK_KEY,
  algorithm: 'sha256'
};

var client = new IPReputationClient({
  serviceUrl: process.env.SERVICE_URL,
  id: creds.id,
  key: creds.key,
  timeout: parseInt(process.env.CLIENT_TIMEOUT)
});

var test_ips = generateTestIPs(process.env.NUM_TEST_IPS);

// TODO: use process.env.RW_RATIO
// TODO: compute stats
// TODO: use request timing info?

var test_violations = [
  'fxa:request.blockIp',
  'fxa:request.checkAuthenticated.block.devicesNotify',
  'fxa:request.checkAuthenticated.block.avatarUpload',
  'fxa:request.failedLoginAttempt.isOverBadLogins',
  'fxa:request.check.block.accountCreate',
  'fxa:request.check.block.accountLogin',
  'fxa:request.check.block.accountStatusCheck',
  'fxa:request.check.block.recoveryEmailResendCode',
  'fxa:request.check.block.recoveryEmailVerifyCode',
  'fxa:request.check.block.sendUnblockCode',
  'fxa:request.check.block.accountDestroy',
  'fxa:request.check.block.passwordChange',
  'test_violation'
];

var makeRequest = function (options, ip) {
    let violation = randomChoice(test_violations);
    // console.log(options.apiMethod)
    if (options.apiMethod === 'get') {
	return client.get(ip);
    } else if (options.apiMethod === 'sendViolation') {
	return client.sendViolation(ip, violation);
    } else if (options.apiMethod === 'add') {
	return client.add(ip, getRandomInt(1, 99));
    } else {
        throw new Error("Invalid Client API method.");
    }
};

var stats = function (arr) {
    if (!arr.length) {
	return 0;
    }

    const hist = new Histogram(1, 1000); // 1ms to 5s
    arr.forEach((v) => hist.record(v));

    return {
    	min: hist.min(),
    	// mean: hist.mean().toFixed(2),
    	// stddev: hist.stddev().toFixed(2),
	p999: hist.percentile(99.9),
    	max: hist.max()
    };

    // let toSrt = arr.slice();
    // toSrt.sort((a, b) => a - b);
    // let median = null;
    // if (toSrt.length % 2 === 0) { // even
    // 	median = (toSrt[(toSrt.length / 2) - 1] + toSrt[toSrt.length / 2]) / 2;
    // } else {
    // 	median = toSrt[Math.floor(toSrt.length / 2)];
    // }

    // return {
    // 	// a: toSrt,
    // 	min: toSrt[0].toFixed(2),
    // 	median: median.toFixed(2),
    // 	max: toSrt[toSrt.length-1].toFixed(2)
    // 	// avg: totals.reduce((a, b) => a +b, 0) / totals.length,
    // };
};


if (process.env.INSERT_TEST_IPS) {
    var promises = [];
    for (let i = 0; i < test_ips.length; i++) {
	let ip = test_ips[i];
	promises.push(makeRequest({
	    apiMethod: 'add'
	}, ip).catch(function (err) {
	    console.error('problem inserting:', ip, err);
	}));
    }
    Promise.all(promises).then(function (resps) {
	console.log('inserted test IPs');
    });
};


setInterval(function (client, RPS, test_ips) {
    console.log('Using method:', (Math.random() < parseFloat(process.env.RW_RATIO)) ? 'get' : 'sendViolation');
    var promises = [];
    for (let i = 0; i < RPS; i++) {
	promises.push(makeRequest({
	    apiMethod: (Math.random() < parseFloat(process.env.RW_RATIO)) ? 'get' : 'sendViolation'
	}, randomChoice(test_ips)).catch(function (err) {
	    return {ok: false, err: err};
	}));
    }
    Promise.all(promises).then(function (resps) {

	let okReqs = resps.filter(r => r.err === undefined);
	let phases = okReqs.map(r => r.timingPhases);

	let failedReqs = resps.filter(r => r.err !== undefined);
	let connectionErrors = failedReqs.filter(r => r.err.connect && r.err.connect === true);
	let errCodes = failedReqs.map(r => r.err.code);

	console.log();
	console.log('wait:', stats(phases.map(p => p.wait)));
	console.log('dns:', stats(phases.map(p => p.dns)));
	console.log('tcp:', stats(phases.map(p => p.tcp)));
	console.log('firstByte:', stats(phases.map(p => p.firstByte)));
	// console.log('download:', stats(phases.map(p => p.download)));
	console.log('total:', stats(phases.map(p => p.total)));

	if (failedReqs.length) {
	    console.log('% failed:', 100 * (failedReqs.length / RPS),
			'% connection error:', 100 * (connectionErrors.length / RPS),
			'distinct errCodes:', new Set(errCodes));
	}
    });
}, 1000, client, process.env.RPS, test_ips);

// console.log(test_ips, test_ips.length, randomChoice(test_ips))

// example usage:
// REQS=5 SERVICE_URL=http://127.0.0.1:8080/ HAWK_ID=root HAWK_KEY=toor NUM_TEST_IPS=10 node scripts/loadtest.js
