"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var score_1 = __importDefault(require("./score"));
var multimatch_1 = __importDefault(require("./multimatch"));
var boost_1 = __importDefault(require("./boost"));
var mapping_1 = __importDefault(require("./mapping"));
var clone_deep_1 = __importDefault(require("clone-deep"));
var SearchQuery_1 = __importDefault(require("../types/SearchQuery"));
function processNestedFieldFilter(attribute, value) {
    var processedFilter = {
        'attribute': attribute,
        'value': value
    };
    var filterAttributeKeys = Object.keys(value);
    for (var _i = 0, filterAttributeKeys_1 = filterAttributeKeys; _i < filterAttributeKeys_1.length; _i++) {
        var filterAttributeKey = filterAttributeKeys_1[_i];
        if (value[filterAttributeKey] && !Array.isArray(value[filterAttributeKey]) && typeof value[filterAttributeKey] === 'object') {
            processedFilter = processNestedFieldFilter(attribute + '.' + filterAttributeKey, value[filterAttributeKey]);
        }
    }
    return processedFilter;
}
/**
 *
 * @param {Object} object
 * @param {String} scope
 * @returns {boolean}
 */
function checkIfObjectHasScope(_a) {
    var object = _a.object, scope = _a.scope;
    return object.scope === scope || (Array.isArray(object.scope) && object.scope.indexOf(scope) >= 0);
}
function applySearchQuery(_a) {
    var config = _a.config, queryText = _a.queryText, queryChain = _a.queryChain;
    var getQueryBody = function (b) {
        var searchableAttributes = config.elasticsearch.hasOwnProperty('searchableAttributes') ? config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
        var searchableFields = [];
        for (var _i = 0, _a = Object.keys(searchableAttributes); _i < _a.length; _i++) {
            var attribute = _a[_i];
            searchableFields.push(attribute + '^' + boost_1.default(config, attribute));
        }
        return b.orQuery('multi_match', 'fields', searchableFields, multimatch_1.default(config, queryText))
            .orQuery('bool', function (b) { return b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
            .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
            .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }); });
    };
    if (queryText !== '') {
        var functionScore = score_1.default(config);
        // Build bool or function_scrre accordingly
        if (functionScore) {
            queryChain = queryChain.query('function_score', functionScore, getQueryBody);
        }
        else {
            queryChain = queryChain.query('bool', getQueryBody);
        }
    }
    return queryChain;
}
exports.applySearchQuery = applySearchQuery;
function buildQueryBodyFromSearchQuery(_a) {
    var config = _a.config, queryChain = _a.queryChain, searchQuery = _a.searchQuery;
    return __awaiter(this, void 0, void 0, function () {
        var optionsPrefix, queryText, rangeOperators, appliedFilters, hasCatalogFilters_1, attrFilterBuilder_1, allFilters, _i, allFilters_1, attrToFilter, aggregationSize;
        return __generator(this, function (_b) {
            optionsPrefix = '_options';
            queryText = searchQuery.getSearchText();
            rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to'];
            appliedFilters = clone_deep_1.default(searchQuery.getAppliedFilters()) // copy as function below modifies the object
            ;
            if (appliedFilters.length > 0) {
                hasCatalogFilters_1 = false;
                // apply default filters
                appliedFilters.forEach(function (filter) {
                    var _a;
                    var value = filter.value, attribute = filter.attribute, scope = filter.scope;
                    if (checkIfObjectHasScope({ object: filter, scope: 'default' }) && Object.keys(filter.value).length) {
                        if (Object.keys(filter.value).every(function (v) { return (rangeOperators.indexOf(v) >= 0); })) {
                            // process range filters
                            queryChain = queryChain.filter('range', attribute, value);
                        }
                        else {
                            // process terms filters
                            var operator = Object.keys(value)[0];
                            value = value[Object.keys(value)[0]];
                            if (!Array.isArray(value) && value !== null) {
                                value = [value];
                            }
                            if (['or', 'nor'].includes(operator) || operator.startsWith('or')) {
                                var orRangeOperators = rangeOperators.map(function (o) { return 'or' + o.charAt(0).toUpperCase() + o.substr(1); });
                                if (value === null) {
                                    queryChain = operator === 'nor'
                                        ? queryChain.orFilter('exists', mapping_1.default(config, attribute))
                                        : queryChain.orFilter('bool', function (b) {
                                            return b.notFilter('exists', mapping_1.default(config, attribute));
                                        });
                                }
                                else if (orRangeOperators.includes(operator)) {
                                    var realOperator = operator.substr(2).toLowerCase();
                                    value = Array.isArray(value) ? value[0] : value;
                                    queryChain = queryChain.orFilter('range', mapping_1.default(config, attribute), (_a = {}, _a[realOperator] = value, _a));
                                }
                                else {
                                    queryChain = operator === 'nor'
                                        ? queryChain.orFilter('bool', function (b) {
                                            return b.notFilter('terms', mapping_1.default(config, attribute), value);
                                        })
                                        : queryChain.orFilter('terms', mapping_1.default(config, attribute), value);
                                }
                            }
                            else {
                                if (value === null) {
                                    queryChain = operator === 'nin'
                                        ? queryChain.notFilter('exists', mapping_1.default(config, attribute))
                                        : queryChain.filter('exists', mapping_1.default(config, attribute));
                                }
                                else {
                                    queryChain = operator === 'nin'
                                        ? queryChain.notFilter('terms', mapping_1.default(config, attribute), value)
                                        : queryChain.filter('terms', mapping_1.default(config, attribute), value);
                                }
                            }
                        }
                    }
                    else if (scope === 'catalog') {
                        hasCatalogFilters_1 = true;
                    }
                });
                attrFilterBuilder_1 = function (filterQr, attrPostfix) {
                    if (attrPostfix === void 0) { attrPostfix = ''; }
                    appliedFilters.forEach(function (catalogfilter) {
                        var valueKeys = Object.keys(catalogfilter.value);
                        if (checkIfObjectHasScope({ object: catalogfilter, scope: 'catalog' }) && valueKeys.length) {
                            var isRange = valueKeys.filter(function (value) { return rangeOperators.indexOf(value) !== -1; });
                            if (isRange.length) {
                                var rangeAttribute = catalogfilter.attribute;
                                // filter by product fiunal price
                                if (rangeAttribute === 'price') {
                                    rangeAttribute = config.products.priceFilterKey;
                                }
                                // process range filters
                                filterQr = filterQr.andFilter('range', rangeAttribute, catalogfilter.value);
                            }
                            else {
                                // process terms filters
                                var newValue = catalogfilter.value[Object.keys(catalogfilter.value)[0]];
                                if (!Array.isArray(newValue)) {
                                    newValue = [newValue];
                                }
                                if (attrPostfix === '') {
                                    filterQr = filterQr.andFilter('terms', mapping_1.default(config, catalogfilter.attribute), newValue);
                                }
                                else {
                                    filterQr = filterQr.andFilter('terms', catalogfilter.attribute + attrPostfix, newValue);
                                }
                            }
                        }
                    });
                    return filterQr;
                };
                if (hasCatalogFilters_1) {
                    queryChain = queryChain.filterMinimumShouldMatch(1).orFilter('bool', attrFilterBuilder_1)
                        .orFilter('bool', function (b) { return attrFilterBuilder_1(b, optionsPrefix).filter('match', 'type_id', 'configurable'); }); // the queries can vary based on the product type
                }
            }
            allFilters = searchQuery.getAvailableFilters();
            if (allFilters.length > 0) {
                for (_i = 0, allFilters_1 = allFilters; _i < allFilters_1.length; _i++) {
                    attrToFilter = allFilters_1[_i];
                    if (checkIfObjectHasScope({ object: attrToFilter, scope: 'catalog' })) {
                        if (attrToFilter.field !== 'price') {
                            aggregationSize = { size: config.products.filterAggregationSize[attrToFilter.field] || config.products.filterAggregationSize.default };
                            queryChain = queryChain.aggregation('terms', mapping_1.default(config, attrToFilter.field), aggregationSize);
                            queryChain = queryChain.aggregation('terms', attrToFilter.field + optionsPrefix, aggregationSize);
                        }
                        else {
                            queryChain = queryChain.aggregation('terms', attrToFilter.field);
                            queryChain.aggregation('range', 'price', config.products.priceFilters);
                        }
                    }
                }
            }
            // Get searchable fields based on user-defined config.
            queryChain = applySearchQuery({ config: config, queryText: queryText, queryChain: queryChain });
            return [2 /*return*/, queryChain.build()];
        });
    });
}
exports.buildQueryBodyFromSearchQuery = buildQueryBodyFromSearchQuery;
function applySort(_a) {
    var sort = _a.sort, queryChain = _a.queryChain;
    if (sort) {
        Object.keys(sort).forEach(function (key) {
            queryChain.sort(key, sort[key]);
        });
    }
    return queryChain;
}
exports.applySort = applySort;
/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
function buildQueryBodyFromFilterObject(_a) {
    var config = _a.config, queryChain = _a.queryChain, filter = _a.filter, _b = _a.search, search = _b === void 0 ? '' : _b;
    return __awaiter(this, void 0, void 0, function () {
        var appliedFilters, attribute, processedFilter, appliedAttributeValue, scope;
        return __generator(this, function (_c) {
            appliedFilters = [];
            if (filter) {
                for (attribute in filter) {
                    processedFilter = processNestedFieldFilter(attribute, filter[attribute]);
                    appliedAttributeValue = processedFilter['value'];
                    scope = appliedAttributeValue.scope || 'default';
                    delete appliedAttributeValue.scope;
                    appliedFilters.push({
                        attribute: processedFilter['attribute'],
                        value: appliedAttributeValue,
                        scope: scope
                    });
                }
            }
            return [2 /*return*/, buildQueryBodyFromSearchQuery({
                    config: config,
                    queryChain: queryChain,
                    searchQuery: new SearchQuery_1.default({
                        _appliedFilters: appliedFilters,
                        _availableFilters: appliedFilters,
                        _searchText: search
                    })
                })];
        });
    });
}
exports.buildQueryBodyFromFilterObject = buildQueryBodyFromFilterObject;
//# sourceMappingURL=index.js.map