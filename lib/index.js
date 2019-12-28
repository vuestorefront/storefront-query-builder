'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.applySearchQuery = applySearchQuery;
exports.buildQueryBodyFromSearchQuery = buildQueryBodyFromSearchQuery;
exports.applySort = applySort;
exports.buildQueryBodyFromFilterObject = buildQueryBodyFromFilterObject;

var _score = require('./elasticsearch/score');

var _score2 = _interopRequireDefault(_score);

var _multimatch = require('./elasticsearch/multimatch');

var _multimatch2 = _interopRequireDefault(_multimatch);

var _boost = require('./elasticsearch/boost');

var _boost2 = _interopRequireDefault(_boost);

var _mapping = require('./elasticsearch/mapping');

var _mapping2 = _interopRequireDefault(_mapping);

var _cloneDeep = require('clone-deep');

var _cloneDeep2 = _interopRequireDefault(_cloneDeep);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function processNestedFieldFilter(attribute, value) {
  var processedFilter = {
    'attribute': attribute,
    'value': value
  };
  var filterAttributeKeys = Object.keys(value);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = filterAttributeKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var filterAttributeKey = _step.value;

      if (value[filterAttributeKey] && !Array.isArray(value[filterAttributeKey]) && _typeof(value[filterAttributeKey]) === 'object') {
        processedFilter = processNestedFieldFilter(attribute + '.' + filterAttributeKey, value[filterAttributeKey]);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
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
function checkIfObjectHasScope(_ref) {
  var object = _ref.object,
      scope = _ref.scope;

  return object.scope === scope || Array.isArray(object.scope) && object.scope.find(function (scrope) {
    return scrope === scope;
  });
}

function applySearchQuery(config, queryText, query) {
  var getQueryBody = function getQueryBody(b) {
    var searchableAttributes = config.elasticsearch.hasOwnProperty('searchableAttributes') ? config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
    var searchableFields = [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = Object.keys(searchableAttributes)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var attribute = _step2.value;

        searchableFields.push(attribute + '^' + (0, _boost2.default)(config, attribute));
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return b.orQuery('multi_match', 'fields', searchableFields, (0, _multimatch2.default)(config, queryText)).orQuery('bool', function (b) {
      return b.orQuery('terms', 'configurable_children.sku', queryText.split('-')).orQuery('match_phrase', 'sku', { query: queryText, boost: 1 }).orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 });
    });
  };
  if (queryText !== '') {
    var functionScore = (0, _score2.default)(config);
    // Build bool or function_scrre accordingly
    if (functionScore) {
      query = query.query('function_score', functionScore, getQueryBody);
    } else {
      query = query.query('bool', getQueryBody);
    }
  }
  return query;
}

async function buildQueryBodyFromSearchQuery(config, bodybuilder, searchQuery) {
  var optionsPrefix = '_options';
  var queryText = searchQuery.getSearchText();
  var rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to'];
  var query = bodybuilder.default();

  // process applied filters
  var appliedFilters = (0, _cloneDeep2.default)(searchQuery.getAppliedFilters()); // copy as function below modifies the object
  if (appliedFilters.length > 0) {
    var hasCatalogFilters = false;
    // apply default filters
    appliedFilters.forEach(function (filter) {
      if (checkIfObjectHasScope({ object: filter, scope: 'default' }) && Object.keys(filter.value).length) {
        if (Object.keys(filter.value).every(function (v) {
          return rangeOperators.includes(v);
        })) {
          // process range filters
          query = query.filter('range', filter.attribute, filter.value);
        } else {
          // process terms filters
          var operator = Object.keys(filter.value)[0];
          filter.value = filter.value[Object.keys(filter.value)[0]];
          if (!Array.isArray(filter.value) && filter.value !== null) {
            filter.value = [filter.value];
          }
          if (operator === 'or') {
            if (filter.value === null) {
              query = query.orFilter('bool', function (b) {
                return b.notFilter('exists', (0, _mapping2.default)(config, filter.attribute));
              });
            } else {
              query = query.orFilter('terms', (0, _mapping2.default)(config, filter.attribute), filter.value);
            }
          } else {
            if (filter.value === null) {
              query = query.filter('exists', (0, _mapping2.default)(config, filter.attribute));
            } else {
              query = query.filter('terms', (0, _mapping2.default)(config, filter.attribute), filter.value);
            }
          }
        }
      } else if (filter.scope === 'catalog') {
        hasCatalogFilters = true;
      }
    });

    // apply catalog scope filters
    var attrFilterBuilder = function attrFilterBuilder(filterQr) {
      var attrPostfix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      appliedFilters.forEach(function (catalogfilter) {
        var valueKeys = Object.keys(catalogfilter.value);
        if (checkIfObjectHasScope({ object: catalogfilter, scope: 'catalog' }) && valueKeys.length) {
          var isRange = valueKeys.filter(function (value) {
            return rangeOperators.indexOf(value) !== -1;
          });
          if (isRange.length) {
            var rangeAttribute = catalogfilter.attribute;
            // filter by product fiunal price
            if (rangeAttribute === 'price') {
              rangeAttribute = config.products.priceFilterKey;
            }
            // process range filters
            filterQr = filterQr.andFilter('range', rangeAttribute, catalogfilter.value);
          } else {
            // process terms filters
            var newValue = catalogfilter.value[Object.keys(catalogfilter.value)[0]];
            if (!Array.isArray(newValue)) {
              newValue = [newValue];
            }
            if (attrPostfix === '') {
              filterQr = filterQr.andFilter('terms', (0, _mapping2.default)(config, catalogfilter.attribute), newValue);
            } else {
              filterQr = filterQr.andFilter('terms', catalogfilter.attribute + attrPostfix, newValue);
            }
          }
        }
      });
      return filterQr;
    };

    if (hasCatalogFilters) {
      query = query.filterMinimumShouldMatch(1).orFilter('bool', attrFilterBuilder).orFilter('bool', function (b) {
        return attrFilterBuilder(b, optionsPrefix).filter('match', 'type_id', 'configurable');
      }); // the queries can vary based on the product type
    }
  }

  // Add aggregations for catalog filters
  var allFilters = searchQuery.getAvailableFilters();
  if (allFilters.length > 0) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = allFilters[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var attrToFilter = _step3.value;

        if (checkIfObjectHasScope({ object: attrToFilter, scope: 'catalog' })) {
          if (attrToFilter.field !== 'price') {
            var aggregationSize = { size: config.products.filterAggregationSize[attrToFilter.field] || config.products.filterAggregationSize.default };
            query = query.aggregation('terms', (0, _mapping2.default)(config, attrToFilter.field), aggregationSize);
            query = query.aggregation('terms', attrToFilter.field + optionsPrefix, aggregationSize);
          } else {
            query = query.aggregation('terms', attrToFilter.field);
            query.aggregation('range', 'price', config.products.priceFilters);
          }
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  }
  // Get searchable fields based on user-defined config.
  query = applySearchQuery(config, queryText, query);
  var queryBody = query.build();
  if (searchQuery.suggest) {
    queryBody.suggest = searchQuery.suggest;
  }

  return queryBody;
}
function applySort(sort, query) {
  if (sort) {
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = Object.entries(sort)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var _step4$value = _slicedToArray(_step4.value, 2),
            key = _step4$value[0],
            value = _step4$value[1];

        query.sort(key, value);
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }
  }

  return query;
}

/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
async function buildQueryBodyFromFilterObject(type, config, bodybuilder, filter) {
  var search = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '';

  var appliedFilters = [];
  if (filter) {
    for (var attribute in filter) {
      var processedFilter = processNestedFieldFilter(attribute, filter[attribute]);
      var appliedAttributeValue = processedFilter['value'];
      var scope = appliedAttributeValue.scope || 'default';
      delete appliedAttributeValue.scope;
      appliedFilters.push({
        attribute: processedFilter['attribute'],
        value: appliedAttributeValue,
        scope: scope
      });
    }
  }
  return buildQueryBodyFromSearchQuery({
    _appliedFilters: appliedFilters,
    _availableFilters: appliedFilters,
    _searchText: search
  }, config, bodybuilder);
}