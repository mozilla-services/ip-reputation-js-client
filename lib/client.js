/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var url = require('url');
var Promise = require('bluebird');
var Joi = require('joi');
var _request = require('request');

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

var emailSchema = Joi.string().email();

var validate = function(type, obj) {
  if (type === 'ip') {
    if (Joi.validate(obj, ipSchema).error !== null) {
      return new Error('Invalid IP.');
    }
  } else if (type === 'email') {
    if (Joi.validate(obj, emailSchema).error !== null) {
      return new Error('Invalid Email.');
    }
  } else {
    return new Error('Invalid type: '+type);
  }
  return null;
};


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
  this.timeout = config.timeout || 30 * 1000;

  // workaround https://github.com/jrgm/newrelic-bluebird-request-node8-bug
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
    timeout: this.timeout,
    followRedirect: false,
    strictSSL: useStrictSSL,
    forever: true,
    time: true
  });
  this.baseRequest = Promise.promisify(this.baseRequest, {context: this});
  return this;
};

/**
 * @method getTyped
 * @param {String} type Object type to get reputation for (ip or email)
 * @param {String} obj Object to get reputation for
 * @return {Promise}
 */
client.prototype.getTyped = function (type, obj) {
  if (validate(type, obj) !== null) {
    return Promise.reject(validate(type, obj));
  }
  return this.baseRequest({
    method: 'GET',
    uri: '/type/' + type + '/' + obj,
    hawk: {
      contentType: null
    }
  }).timeout(this.timeout).then(function (response) {
    if (response && response.body && response.statusCode) {
      if (type === 'ip') {
        response.body.ip = obj;
      }
    }
    return response;
  });
};

/**
 * @method updateTyped
 * @param {String} type Object type to update the reputation for (ip or email)
 * @param {String} obj Object to update the reputation for
 * @param {Number} reputation a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.updateTyped = function (type, obj, reputation) {
  if (validate(type, obj) !== null) {
    return Promise.reject(validate(type, obj));
  }
  return this.baseRequest({
    method: 'PUT',
    uri: '/type/' + type + '/' + obj,
    hawk: {
      payload: JSON.stringify({
        'reputation': reputation,
        'object': obj,
        'type': type
      })
    },
    json: {
      'reputation': reputation,
      'object': obj,
      'type': type
    }
  }).timeout(this.timeout);
};

/**
 * @method removeTyped
 * @param {String} type Object type to remove an associated reputation for (ip or email)
 * @param {String} obj Object to remove an associated reputation for
 * @return {Promise}
 */
client.prototype.removeTyped = function (type, obj) {
  if (validate(type, obj) !== null) {
    return Promise.reject(validate(type, obj));
  }
  return this.baseRequest({
    method: 'DELETE',
    uri: '/type/' + type + '/' + obj,
    hawk: {
      payload: '', // force sending a hawk hash that reputation service requires
      contentType: null
    }
  }).timeout(this.timeout);
};

/**
 * @method sendViolationTyped
 * @param {String} type Object type to record a violation for
 * @param {String} obj Object to record a violation for
 * @param {String} violationType an violation type to save lookup the reputation penalty for
 * @return {Promise}
 */
client.prototype.sendViolationTyped = function (type, obj, violationType) {
  if (validate(type, obj) !== null) {
    return Promise.reject(validate(type, obj));
  }
  return this.baseRequest({
    method: 'PUT',
    uri: '/violations/type/' + type + '/' + obj,
    hawk: {
      payload: JSON.stringify({
        'violation': violationType,
        'type': type,
        'object': obj
      })
    },
    json: {
      'violation': violationType,
      'type': type,
      'object': obj,
    }
  }).timeout(this.timeout);
};


/**
 * @method get
 * @param {String} ip a Joi strip.ip IP address to fetch reputation for
 * @return {Promise}
 */
client.prototype.get = function (ip) {
  return this.getTyped('ip', ip);
};

/**
 * @method update
 * @param {String} ip an IP address to change a reputation for
 * @param {Number} reputation a reputation/trust value from 0 to 100 inclusive (higher is more trustworthy)
 * @return {Promise}
 */
client.prototype.update = function (ip, reputation) {
  return this.updateTyped('ip', ip, reputation);
};

/**
 * @method remove
 * @param {String} ip an IP address to remove an associated reputation for
 * @return {Promise}
 */
client.prototype.remove = function (ip) {
  return this.removeTyped('ip', ip);
};

/**
 * @method sendViolation
 * @param {String} ip an IP address to record a violation for
 * @param {String} violationType an violation type to save lookup the reputation penalty for
 * @return {Promise}
 */
client.prototype.sendViolation = function (ip, violationType) {
  return this.sendViolationTyped('ip', ip, violationType);
};

module.exports = client;
