"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getBoosts(config, attribute) {
    if (attribute === void 0) { attribute = ''; }
    var searchableAttributes = [];
    if (config.elasticsearch.hasOwnProperty('searchableAttributes') && config.elasticsearch.searchableAttributes[attribute]) {
        searchableAttributes = config.elasticsearch.searchableAttributes[attribute];
    }
    if (searchableAttributes.hasOwnProperty('boost')) {
        return searchableAttributes['boost'];
    }
    return 1;
}
exports.default = getBoosts;
//# sourceMappingURL=boost.js.map