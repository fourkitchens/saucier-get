var Q = require('q'),
    urlTemplate = require('url-template'),
    request = require('requestretry'),
    _ = require('underscore'),
    debug = require('debug')('saucier:get');

    /**
     * Makes a request to the API provider with the given URL; handles error responses if they occur
     * @private
     * @param {object} options The route options.
     * @param {opbject} httpAgent The http agent used for this request.
     * @param {object} envConfig The environment config.
     * @param {string} requestUrl The URL we're requesting.
     * @return {object} The promise for this function that resolves with the data from the response
     */
    sendRequest     = function (options, httpAgent, envConfig, requestUrl) {
      var deferred      = Q.defer(),
        errorString     = 'An error with the API has occurred.',
        statusCode      = 500,
        // prepend API path to resource calls
        fullUrl = envConfig.api + '/' + requestUrl,
        requestOptions = {
          agent: httpAgent,
          url: fullUrl,
          headers: options.headers || {},
          json: true,
          maxAttempts: envConfig.maxAttempts || 2,
          retryDelay: envConfig.retryDelay || 100,
          retryStrategy: request.RetryStrategies.HTTPOrNetworkError
        },
        handleResponse = function (error, response, body) {
          if (error || response.statusCode === 404 || 500 <= response.statusCode && response.statusCode < 600 || body === '') {
            errorString = error || errorString;
            statusCode = response ? response.statusCode : statusCode;

            debug(statusCode, errorString);

            return deferred.reject({statusCode: statusCode, errors: [errorString]});
          }
          else {
            debug(requestUrl + ':' + response.statusCode);
            deferred.resolve(body);
          }
        };

      debug(requestOptions);

      request(requestOptions, handleResponse);

      return deferred.promise;
    },
    /**
     * Gets all data from the API Provider.
     * @private
     * @alias  get
     * @param  {object} options Contains config.
     * @return {object} The promise for this function
     */
    processResources = function (request) {
      var options = request.saucier.routeOptions,
          urlParams = request.params,
          query = '';

      // attach nid if applicable
      if (request.saucier.cache && request.saucier.cache.nid) {
        urlParams.nid = request.saucier.cache.nid;
      }

      // Pass along the query parameters to the API resource.
      if (options.passQuery && request._parsedUrl.query) {
        query = request._parsedUrl.query;
      }

      // parse through each API resource endpoint, replacing expressions with params
      return options.resource.map(function (item) {
        // Prepend query string with ? or &.
        if (query) {
          query = item.indexOf('?') === -1 ? '?' + query : '&' + query;
        }
        return urlTemplate.parse(item).expand(urlParams) + query;
      });
    };

module.exports = function saucierGet (agent) {
  return {
    httpAgent: agent,
    get: function (agent) {
      var httpAgent = agent,
          f = function (req, res, next) {
            if (!req.saucier.cache.apiGet) {
              return next();
            }
            else {
              var resources = processResources(req);
              Q
                .allSettled(resources.map(function (item) {
                  return sendRequest(
                          req.saucier.routeOptions,
                          httpAgent,
                          req.saucier.applicationConfig.envConfig[req.saucier.environment],
                          item
                        );
                }))
                .then(function (results) {

                  req.saucier.cache.body = [];

                  // Ensure that all results have a 'state' property of 'fulfilled'
                  var allRequestsFulfilled = _.every(results, {'state': 'fulfilled'});
                  if (!_.every(results, {'state': 'fulfilled'})) {
                    return next(new Error('Some requests could not be completed.'));
                  }

                  // add all the values to the the body of the response
                  results.forEach(function (element) {
                    req.saucier.cache.body.push(element.value);
                  });

                  if (req.saucier.cache.body.length === 1) {
                    req.saucier.cache.body = req.saucier.cache.body[0];
                  }
                  next();
                })
                .fail(function (err) {
                  return next(new Error(err));
                });
            }
          };
      return f;
    }
  }
}
