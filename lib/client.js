/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var url = require('url');
var Promise = require('bluebird');
var Joi = require('joi');
var _request = require('request');
var request = Promise.promisify(_request);

var clientConfigSchema = Joi.object().keys({
  serviceUrl: Joi.string().uri({
    scheme: ['http', 'https']
  }).required(),
  id: Joi.string().required(),
  key: Joi.string().required(),
  timeout: Joi.number().integer().positive()
});

// The backend only accepts non-CIDR IPv4
// https://github.com/hapijs/joi/blob/v12.0.0/API.md#stringipoptions
var ipSchema = Joi.string().ip({
  version: [
    'ipv4',
  ],
  cidr: false
});

/**
 * @class IPReputationServiceClient
 * @constructor
 * @param {Object} config
 *   @param {String} config.serviceUrl base URL to the IP reputation service (e.g. http://127.0.0.1:8080/)
 *   @param {String} config.id id for the HAWK header
 *   @param {String} config.key key for the HAWK header
 *   @param {Number} config.timeout positive integer of the number of milliseconds to wait for a server to send response headers (passed as parameter of the same name to https://github.com/request/request)
 * @return {IPReputationServiceClient}
 */
var client = function(config) {
  Joi.assert(config, clientConfigSchema);

  var useStrictSSL = (url.parse(config.serviceUrl).protocol === 'https:');

  // use _request to workaround https://github.com/jrgm/newrelic-bluebird-request-node8-bug
  this.baseRequest = _request.defaults({
    baseUrl: config.serviceUrl,
    hawk: {
      credentials: {
        id: config.id,
        key: config.key,
        algorithm: 'sha256'
      },
      contentType: 'application/json'
    },
    json: true,
    timeout: config.timeout || 30 * 1000,
    followRedirect: false,
    strictSSL: useStrictSSL,
    forever: true
  });

  return this;
};

/**
 * @method get
 * @param {String} a Joi strip.ip IP address to fetch reputation for
 * @return {Promise}
 */
client.prototype.get = function (ip) {
  if (Joi.validate(ip, ipSchema).error !== null) {
    return Promise.reject(new Error("Invalid IP."));
  }
  return this.baseRequest({
    method: 'GET',
    uri: '/' + ip,
    hawk: {
      payload: '', // force sending a hawk hash that reputation service requires
      contentType: null
    }
  });
};


/**
 * @method add
 * @param {String} an IP address to assign a reputation
 * @param {Number} a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.add = function (ip, reputation) {
  if (Joi.validate(ip, ipSchema).error !== null) {
    return Promise.reject(new Error("Invalid IP."));
  }
  return this.baseRequest({
    method: 'POST',
    uri: '/',
    hawk: {
      payload: JSON.stringify({'ip': ip, 'reputation': reputation})
    },
    json: {'ip': ip, 'reputation': reputation}
  });
};

/**
 * @method update
 * @param {String} an IP address to change a reputation for
 * @param {Number} a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.update = function (ip, reputation) {
  if (Joi.validate(ip, ipSchema).error !== null) {
    return Promise.reject(new Error("Invalid IP."));
  }
  return this.baseRequest({
    method: 'PUT',
    uri: '/' + ip,
    hawk: {
      payload: JSON.stringify({'reputation': reputation})
    },
    json: {'reputation': reputation}
  });
};

/**
 * @method remove
 * @param {String} an IP address to remove an associated reputation for
 * @return {Promise}
 */
client.prototype.remove = function (ip) {
  if (Joi.validate(ip, ipSchema).error !== null) {
    return Promise.reject(new Error("Invalid IP."));
  }
  return this.baseRequest({
    method: 'DELETE',
    uri: '/' + ip,
    hawk: {
      payload: '', // force sending a hawk hash that reputation service requires
      contentType: null
    }
  });
};

/**
 * @method sendViolation
 * @param {String} an IP address to record a violation for
 * @param {String} an violation type to save lookup the reputation penalty for
 * @return {Promise}
 */
client.prototype.sendViolation = function (ip, violationType) {
  if (Joi.validate(ip, ipSchema).error !== null) {
    return Promise.reject(new Error("Invalid IP."));
  }
  return this.baseRequest({
    method: 'PUT',
    uri: '/violations/' + ip,
    hawk: {
      payload: JSON.stringify({'ip': ip, 'Violation': violationType})
    },
    json: {'ip': ip, 'Violation': violationType}
  });
};

module.exports = client;
