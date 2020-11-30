"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var score_1 = __importDefault(require("./score"));
var multimatch_1 = __importDefault(require("./multimatch"));
var boost_1 = __importDefault(require("./boost"));
var clone_deep_1 = __importDefault(require("clone-deep"));
/**
 * Class to create elasticsearch request body in modular and reproductive way
 */
var RequestBody = /** @class */ (function () {
    function RequestBody(_a) {
        var _this = this;
        var config = _a.config, queryChain = _a.queryChain, searchQuery = _a.searchQuery, customFilters = _a.customFilters;
        /**
         * @var {string[]} rangeOperators Possible range operators
         */
        this.rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to'];
        /**
         * @var {string[]} orRangeOperators Possible range operators with or clause prefix
         */
        this.orRangeOperators = this.rangeOperators.map(function (o) { return 'or' + o.charAt(0).toUpperCase() + o.substr(1); });
        /**
         * @param {Object} value Get first option of filter values
         */
        this.extractFirstValueMutator = function (value) {
            value = value[Object.keys(value)[0]];
            if (!Array.isArray(value) && value !== null) {
                value = [value];
            }
            return value;
        };
        /**
         * @var {FiltersInterface} baseFilters Operators for the default filters like: range, or, nor, in, nin
         */
        this.baseFilters = {
            range: {
                check: function (_a) {
                    var value = _a.value;
                    return Object.keys(value).every(function (v) { return _this.rangeOperators.includes(v); });
                },
                filter: function (_a) {
                    var attribute = _a.attribute, value = _a.value, queryChain = _a.queryChain;
                    return queryChain.filter('range', attribute, value);
                }
            },
            orRange: {
                check: function (_a) {
                    var value = _a.value;
                    return Object.keys(value).every(function (o) { return _this.orRangeOperators.includes(o); });
                },
                filter: function (_a) {
                    var attribute = _a.attribute, value = _a.value, queryChain = _a.queryChain;
                    queryChain.filterMinimumShouldMatch(1, true);
                    for (var o in value) {
                        var realOperator = o.substr(2).toLowerCase();
                        value[realOperator] = value[o];
                        delete value[o];
                    }
                    return queryChain.orFilter('range', attribute, value);
                }
            },
            or: {
                check: function (_a) {
                    var operator = _a.operator;
                    return operator === 'or';
                },
                filter: function (_a) {
                    var value = _a.value, attribute = _a.attribute, queryChain = _a.queryChain;
                    queryChain.filterMinimumShouldMatch(1, true);
                    if (value === null) {
                        return queryChain.orFilter('bool', function (b) {
                            return b.notFilter('exists', attribute);
                        });
                    }
                    else {
                        return queryChain.orFilter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            nor: {
                check: function (_a) {
                    var operator = _a.operator;
                    return operator === 'nor';
                },
                filter: function (_a) {
                    var value = _a.value, attribute = _a.attribute, queryChain = _a.queryChain;
                    queryChain.filterMinimumShouldMatch(1, true);
                    if (value === null) {
                        return queryChain.orFilter('exists', attribute);
                    }
                    else {
                        return queryChain.orFilter('bool', function (b) {
                            return b.notFilter('terms', attribute, value);
                        });
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            nin: {
                check: function (_a) {
                    var operator = _a.operator;
                    return ['neq', 'nin'].includes(operator);
                },
                filter: function (_a) {
                    var value = _a.value, attribute = _a.attribute, queryChain = _a.queryChain;
                    if (value === null) {
                        return queryChain.notFilter('exists', attribute);
                    }
                    else {
                        return queryChain.notFilter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            in: {
                check: function (_a) {
                    var operator = _a.operator;
                    return ['eq', 'in'].includes(operator);
                },
                filter: function (_a) {
                    var value = _a.value, attribute = _a.attribute, queryChain = _a.queryChain;
                    if (value === null) {
                        return queryChain.filter('exists', attribute);
                    }
                    else {
                        return queryChain.filter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            }
        };
        this.customFilters = {};
        this.optionsPrefix = '_options';
        this.catalogFilterBuilder = function (filterQr, filter, attrPostfix, type) {
            if (attrPostfix === void 0) { attrPostfix = ''; }
            if (type === void 0) { type = 'filter'; }
            var value = filter.value, attribute = filter.attribute;
            var valueKeys = value !== null ? Object.keys(value) : [];
            if (_this.checkIfObjectHasScope({ object: filter, scope: 'catalog' }) && valueKeys.length > 0) {
                var isRange = valueKeys.filter(function (value) { return _this.rangeOperators.indexOf(value) !== -1; });
                if (isRange.length) {
                    var rangeAttribute = attribute;
                    // filter by product fiunal price
                    if (rangeAttribute === 'price') {
                        rangeAttribute = _this.config.products.priceFilterKey;
                    }
                    // process range filters
                    filterQr = filterQr[type]('range', rangeAttribute, value);
                }
                else {
                    // process terms filters
                    var newValue = value[Object.keys(value)[0]];
                    if (!Array.isArray(newValue)) {
                        newValue = [newValue];
                    }
                    if (attrPostfix === '') {
                        filterQr = filterQr[type]('terms', _this.getMapping(attribute), newValue);
                    }
                    else {
                        filterQr = filterQr[type]('terms', attribute + attrPostfix, newValue);
                    }
                }
            }
            return filterQr;
        };
        /**
         * Get an empty representation of the bodybuilder query-chain without need to import bodybuilder itself
         * @return {any}
         */
        this.bodybuilder = function () { return _this.emptyQueryChain.clone(); };
        this.config = config;
        this.queryChain = queryChain;
        this.searchQuery = searchQuery;
        this.customFilters = Object.assign({}, this.customFilters, customFilters);
        this.emptyQueryChain = queryChain.clone();
    }
    /**
     * @return {this}
     */
    RequestBody.prototype.buildQueryBodyFromSearchQuery = function () {
        if (this.searchQuery.getAppliedFilters().length > 0) {
            this.appliedFilters = clone_deep_1.default(this.searchQuery.getAppliedFilters());
            this
                .applyBaseFilters()
                .applyCatalogFilters()
                .applyAggregations()
                .applyTextQuery()
                .applySort();
        }
        return this;
    };
    /**
     * Apply all `default` scoped filters to `queryChain`
     * @return {this}
     */
    RequestBody.prototype.applyBaseFilters = function () {
        var _this = this;
        this.appliedFilters.forEach(function (filter) {
            var value = filter.value, attribute = filter.attribute;
            if (!_this.checkIfObjectHasScope({ object: filter, scope: 'default' })) {
                return;
            }
            value = typeof value === 'object' ? value : { 'in': [value] };
            if (Object.keys(value).length > 0) {
                attribute = _this.getMapping(attribute);
                var operator = Object.keys(value)[0];
                var sortedFilters = _this.getSortedFilters();
                for (var _i = 0, sortedFilters_1 = sortedFilters; _i < sortedFilters_1.length; _i++) {
                    var filterHandler = sortedFilters_1[_i];
                    var queryChain = _this.queryChain;
                    // Add `queryChain` variable for custom filters
                    if (filterHandler.check({ operator: operator, attribute: attribute, value: value, queryChain: queryChain })) {
                        value = filterHandler.hasOwnProperty('mutator') ? filterHandler.mutator(value) : value;
                        _this.queryChain = filterHandler.filter.call(_this, { operator: operator, attribute: attribute, value: value, queryChain: queryChain });
                        return;
                    }
                }
                // add filter attribute that is not handled by sortedFilters list
                _this.queryChain = _this.queryChain.filter('terms', attribute, _this.extractFirstValueMutator(value));
            }
        });
        return this;
    };
    /**
     * Apply all `catalog` scoped filters to `queryChain`
     * @return {this}
     */
    RequestBody.prototype.applyCatalogFilters = function () {
        var _this = this;
        if (this.hasCatalogFilters()) {
            this.queryChain.filterMinimumShouldMatch(1);
            var catalogFilters = this.appliedFilters.filter(function (object) { return _this.checkIfObjectHasScope({ object: object, scope: 'catalog' }); });
            catalogFilters.forEach(function (filter) {
                _this.queryChain.filter('bool', function (catalogFilterQuery) {
                    return _this.catalogFilterBuilder(catalogFilterQuery, filter, undefined, 'orFilter')
                        .orFilter('bool', function (b) { return _this.catalogFilterBuilder(b, filter, _this.optionsPrefix).filter('match', 'type_id', 'configurable'); });
                });
            });
        }
        return this;
    };
    RequestBody.prototype.hasCatalogFilters = function () {
        var _this = this;
        if (!this._hasCatalogFilters) {
            this._hasCatalogFilters = this.searchQuery.getAppliedFilters()
                .some(function (object) { return _this.checkIfObjectHasScope({ object: object, scope: 'catalog' }); });
        }
        return this._hasCatalogFilters;
    };
    /**
     * Apply filter aggregations
     * @return {this}
     */
    RequestBody.prototype.applyAggregations = function () {
        var filters = this.searchQuery.getAvailableFilters();
        var config = this.config.products;
        if (filters.length > 0) {
            for (var _i = 0, filters_1 = filters; _i < filters_1.length; _i++) {
                var attribute = filters_1[_i];
                if (this.checkIfObjectHasScope({ object: attribute, scope: 'catalog' })) {
                    var field = attribute.field;
                    var options = attribute.options || {};
                    if (field !== 'price') {
                        var aggregationSize = { size: options.size || config.filterAggregationSize[field] || config.filterAggregationSize.default };
                        this.queryChain
                            .aggregation('terms', this.getMapping(field), aggregationSize)
                            .aggregation('terms', field + this.optionsPrefix, aggregationSize);
                    }
                    else {
                        var appliedPriceFilter = this.appliedFilters.find(function (filter) { return filter.attribute === 'price'; });
                        var additionalPriceAggregations = [];
                        if (appliedPriceFilter && appliedPriceFilter.value && (appliedPriceFilter.value.gte || appliedPriceFilter.value.lte)) {
                            additionalPriceAggregations.push(__assign(__assign({}, (appliedPriceFilter.value.gte ? { from: appliedPriceFilter.value.gte } : {})), (appliedPriceFilter.value.lte ? { to: appliedPriceFilter.value.lte } : {})));
                        }
                        this.queryChain
                            .aggregation('terms', field)
                            .aggregation('range', 'price', {
                            ranges: __spreadArrays(config.priceFilters.ranges, additionalPriceAggregations)
                        });
                        if (this.config.products && this.config.products.aggregate) {
                            if (this.config.products.aggregate.maxPrice) {
                                this.queryChain.aggregation('max', 'price');
                            }
                            if (this.config.products.aggregate.minPrice) {
                                this.queryChain.aggregation('min', 'price');
                            }
                        }
                    }
                }
            }
        }
        return this;
    };
    /**
     * Apply query string
     * @return {this}
     */
    RequestBody.prototype.applyTextQuery = function () {
        if (this.getSearchText() !== '') {
            var functionScore = score_1.default(this.config);
            // Build bool or function_score accordingly
            if (functionScore) {
                this.queryChain.query('function_score', functionScore, this.getQueryBody.bind(this));
            }
            else {
                this.queryChain.query('bool', this.getQueryBody.bind(this));
            }
        }
        return this;
    };
    /**
     * @return {this}
     */
    RequestBody.prototype.applySort = function () {
        var _a;
        if (this.searchQuery.hasAppliedSort()) {
            var appliedSort = this.searchQuery.getAppliedSort();
            var isRandomSort = appliedSort.some(function (f) { return f.field === 'random'; });
            if (isRandomSort) {
                // This is kind of a hack to get random sorting using `bodybuilder`
                var functions = [__assign({ 'weight': 2, 'random_score': {} }, this.queryChain.build()['query']['bool'])];
                this.queryChain = this.bodybuilder().query('function_score', { functions: functions, 'min_score': 1.1 });
            }
            else {
                var sorting = [];
                for (var _i = 0, appliedSort_1 = appliedSort; _i < appliedSort_1.length; _i++) {
                    var sort = appliedSort_1[_i];
                    var field = sort.field, options = sort.options;
                    sorting.push((_a = {}, _a[field] = options, _a));
                }
                this.queryChain.sort(sorting);
            }
        }
        return this;
    };
    /**
     * Combine and sort filters by priority
     */
    RequestBody.prototype.getSortedFilters = function () {
        var filters = Object.values(Object.assign(this.baseFilters, this.customFilters));
        return filters
            .map(function (filter, index) {
            if (!filter.priority) {
                filter.priority = (index + 1) * 10;
            }
            return filter;
        })
            .sort(function (a, b) {
            var priorityA = a.priority || 10;
            var priorityB = b.priority || 10;
            if (priorityA === priorityB) {
                return 0;
            }
            else {
                return (priorityA < priorityB) ? -1 : 1;
            }
        });
    };
    RequestBody.prototype.checkIfObjectHasScope = function (_a) {
        var object = _a.object, scope = _a.scope;
        return object.scope === scope || (Array.isArray(object.scope) && object.scope.indexOf(scope) >= 0);
    };
    RequestBody.prototype.getMapping = function (attribute, entityType) {
        if (entityType === void 0) { entityType = 'products'; }
        var mapping = [];
        if (this.config.hasOwnProperty(entityType) && this.config[entityType].hasOwnProperty('filterFieldMapping')) {
            mapping = this.config[entityType].filterFieldMapping;
        }
        if (mapping.hasOwnProperty(attribute)) {
            return mapping[attribute];
        }
        return attribute;
    };
    RequestBody.prototype.getQueryBody = function (body) {
        var queryText = this.getSearchText();
        var searchableFields = [];
        var searchableAttributes = this.config.elasticsearch.hasOwnProperty('searchableAttributes')
            ? this.config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
        for (var _i = 0, _a = Object.keys(searchableAttributes); _i < _a.length; _i++) {
            var attribute = _a[_i];
            searchableFields.push(attribute + '^' + boost_1.default(this.config, attribute));
        }
        return body
            .orQuery('multi_match', 'fields', searchableFields, multimatch_1.default(this.config, queryText))
            .orQuery('bool', function (b) { return b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
            .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
            .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }); });
    };
    RequestBody.prototype.getSearchText = function () {
        return this.searchQuery.getSearchText();
    };
    RequestBody.prototype.getQueryChain = function () {
        return this.queryChain;
    };
    /**
     * @returns Bodybuilder object
     */
    RequestBody.prototype.build = function () {
        return this.queryChain.build();
    };
    return RequestBody;
}());
exports.default = RequestBody;
//# sourceMappingURL=body.js.map