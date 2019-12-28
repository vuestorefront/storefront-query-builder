'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getBoosts;
function getBoosts(config) {
  var attribute = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var searchableAttributes = [];

  if (config.elasticsearch.hasOwnProperty('searchableAttributes') && config.elasticsearch.searchableAttributes[attribute]) {
    searchableAttributes = config.elasticsearch.searchableAttributes[attribute];
  }

  if (searchableAttributes.hasOwnProperty('boost')) {
    return searchableAttributes['boost'];
  }

  return 1;
}