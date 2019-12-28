'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getMapping;
function getMapping(config, attribute) {
  var entityType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'products';

  var mapping = [];

  if (config.hasOwnProperty(entityType) && config[entityType].hasOwnProperty('filterFieldMapping')) {
    mapping = config[entityType].filterFieldMapping;
  }

  if (mapping.hasOwnProperty(attribute)) {
    return mapping[attribute];
  }

  return attribute;
}