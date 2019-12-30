"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getMapping(config, attribute, entityType) {
    if (entityType === void 0) { entityType = 'products'; }
    var mapping = [];
    if (config.hasOwnProperty(entityType) && config[entityType].hasOwnProperty('filterFieldMapping')) {
        mapping = config[entityType].filterFieldMapping;
    }
    if (mapping.hasOwnProperty(attribute)) {
        return mapping[attribute];
    }
    return attribute;
}
exports.default = getMapping;
//# sourceMappingURL=mapping.js.map