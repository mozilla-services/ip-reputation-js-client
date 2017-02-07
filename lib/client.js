/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Promise = require('bluebird');
var Joi = require('joi');
var request = Promise.promisify(require('request'));

var clientConfigSchema = Joi.object().keys({
  host: Joi.string().hostname().required(),
  port: Joi.number().integer().min(1).max(1 << 16).required(),
  id: Joi.string().required(),
  key: Joi.string().required(),
  timeout: Joi.number().integer().positive(),
  https: Joi.boolean().default(true, 'use tls and require valid certs')
});

/**
 * @class IPReputationServiceClient
 * @constructor
 * @param {Object} config
 *   @param {String} config.host
 *   @param {Number} config.port
 *   @param {String} config.id id for the HAWK header
 *   @param {String} config.key key for the HAWK header
 *   @param {Number} config.timeout positive integer of the number of milliseconds to wait for a server to send response headers (passed as parameter of the same name to https://github.com/request/request)
 *   @param {Boolean} config.https 'true' to use tls and require valid certs or 'false' to not.
 * @return {IPReputationServiceClient}
 */
var client = function(config) {
  Joi.assert(config, clientConfigSchema);

  var scheme = config.https ? 'https' : 'http';
  this.baseUrl = scheme + '://' + config.host + ':' + config.port + '/';

  this.defaultRequestOptions = {
    uri: this.baseUrl,
    method: 'GET',
    hawk: {
      credentials: {
	id: config.id,
	key: config.key,
	algorithm: 'sha256'
      }
    },
    json: true,
    timeout: config.timeout || 30 * 1000,
    followRedirect: false,
    strictSSL: config.https
  };

  return this;
};

/**
 * @method get
 * @param {String} an IP address to fetch reputation for
 * @return {Promise}
 */
client.prototype.get = function (ip) {
  var requestOptions = Object.assign({}, this.defaultRequestOptions);
  requestOptions.uri += ip;

  return request(requestOptions);
};


/**
 * @method add
 * @param {String} an IP address to assign a reputation
 * @param {Number} a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.add = function (ip, reputation) {
  var requestOptions = Object.assign({}, this.defaultRequestOptions);
  requestOptions.method = 'POST';
  requestOptions.json = {'ip': ip, 'reputation': reputation};

  return request(requestOptions);
};

/**
 * @method update
 * @param {String} an IP address to change a reputation for
 * @param {Number} a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.update = function (ip, reputation) {
  var requestOptions = Object.assign({}, this.defaultRequestOptions);
  requestOptions.method = 'PUT';
  requestOptions.uri += ip;
  requestOptions.json = {'reputation': reputation};

  return request(requestOptions);
};

/**
 * @method remove
 * @param {String} an IP address to remove an associated reputation for
 * @return {Promise}
 */
client.prototype.remove = function (ip) {
  var requestOptions = Object.assign({}, this.defaultRequestOptions);
  requestOptions.method = 'DELETE';
  requestOptions.uri += ip;

  return request(requestOptions);
};

/**
 * @method sendViolation
 * @param {String} an IP address to record a violation for
 * @param {String} an violation type to save lookup the reputation penalty for
 * @return {Promise}
 */
client.prototype.sendViolation = function (ip, violationType) {
  var requestOptions = Object.assign({}, this.defaultRequestOptions);
  requestOptions.method = 'PUT';
  requestOptions.uri += 'violations/' + ip;
  requestOptions.json = {'ip': ip, 'Violation': violationType};

  return request(requestOptions);
};

module.exports = client;
