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
var body_1 = __importDefault(require("./body"));
var SearchQuery_1 = __importDefault(require("../types/SearchQuery"));
/**
 * Create a query elasticsearch request body based on a `SearchQuery`
 * @return {Object} Elasticsearch request body
 */
function buildQueryBodyFromSearchQuery(_a) {
    var config = _a.config, queryChain = _a.queryChain, searchQuery = _a.searchQuery, customFilters = _a.customFilters;
    return __awaiter(this, void 0, void 0, function () {
        var filter;
        return __generator(this, function (_b) {
            filter = new body_1.default({ config: config, queryChain: queryChain, searchQuery: searchQuery, customFilters: customFilters });
            return [2 /*return*/, filter.buildQueryBodyFromSearchQuery().build()];
        });
    });
}
exports.buildQueryBodyFromSearchQuery = buildQueryBodyFromSearchQuery;
/**
 * Apply a search-text string to query (for string-based searches in, like in VSF search-box)-
 * This will create a set of filters based on your attributes set in API's search configs.
 * @return {Object} `bodybuilder` query chain
 */
function applySearchQuery(_a) {
    var config = _a.config, queryText = _a.queryText, queryChain = _a.queryChain;
    var searchQuery = new SearchQuery_1.default({ _searchText: queryText });
    return new body_1.default({ config: config, searchQuery: searchQuery, queryChain: queryChain }).buildQueryBodyFromSearchQuery().getQueryChain();
}
exports.applySearchQuery = applySearchQuery;
/**
 * Apply simple, single-lined sort arguments to query
 * @return {Object} `bodybuilder` query chain
 */
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
 * Build a elasticsearch request-body from unified query object (as known from `storefront-api`) - eg: `{ "type_id": { "eq": "configurable "} }`
 * @return {Object} Elasticsearch request body
 */
function buildQueryBodyFromFilterObject(_a) {
    var config = _a.config, queryChain = _a.queryChain, filter = _a.filter, _b = _a.search, search = _b === void 0 ? '' : _b;
    return __awaiter(this, void 0, void 0, function () {
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