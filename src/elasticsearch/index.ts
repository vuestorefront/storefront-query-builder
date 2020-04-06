import getFunctionScores from './score'
import getMultiMatchConfig from './multimatch'
import getBoosts from './boost'
import getMapping from './mapping'
import cloneDeep from 'clone-deep'
import SearchQuery from '../types/SearchQuery'
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig'

function processNestedFieldFilter (attribute: string, value: any) {
  let processedFilter = {
    'attribute': attribute,
    'value': value
  };
  let filterAttributeKeys = Object.keys(value);
  for (let filterAttributeKey of filterAttributeKeys) {
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
function checkIfObjectHasScope ({ object, scope }: { object: { scope: string }, scope: string}) {
  return object.scope === scope || (Array.isArray(object.scope) && object.scope.indexOf(scope) >= 0);
}

export function applySearchQuery ({ config, queryText, queryChain }: { config: ElasticsearchQueryConfig, queryText: string, queryChain: any }) {
  let getQueryBody = function (b) {
    let searchableAttributes = config.elasticsearch.hasOwnProperty('searchableAttributes') ? config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
    let searchableFields = []
    for (const attribute of Object.keys(searchableAttributes)) {
      searchableFields.push(attribute + '^' + getBoosts(config, attribute));
    }
    return b.orQuery('multi_match', 'fields', searchableFields, getMultiMatchConfig(config, queryText))
      .orQuery('bool', b => b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
        .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
        .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }));
  };
  if (queryText !== '') {
    let functionScore = getFunctionScores(config);
    // Build bool or function_scrre accordingly
    if (functionScore) {
      queryChain = queryChain.query('function_score', functionScore, getQueryBody);
    } else {
      queryChain = queryChain.query('bool', getQueryBody);
    }
  }
  return queryChain;
}

export async function buildQueryBodyFromSearchQuery ({ config, queryChain, searchQuery }: { config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery }) {
  const optionsPrefix = '_options'
  const queryText = searchQuery.getSearchText()
  const rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to']

  // process applied filters
  const appliedFilters = cloneDeep(searchQuery.getAppliedFilters()) // copy as function below modifies the object
  if (appliedFilters.length > 0) {
    let hasCatalogFilters = false
    // apply default filters
    appliedFilters.forEach(filter => {
      let { value, attribute, scope } = filter
      if (checkIfObjectHasScope({ object: filter, scope: 'default' }) && Object.keys(filter.value).length) {
        if (Object.keys(filter.value).every(v => (rangeOperators.indexOf(v) >= 0))) {
          // process range filters
          queryChain = queryChain.filter('range', attribute, value)
        } else {
          // process terms filters
          const operator = Object.keys(value)[0]
          value = value[Object.keys(value)[0]]
          if (!Array.isArray(value) && value !== null) {
            value = [value]
          }
          if (['or', 'nor'].includes(operator) || operator.startsWith('or')) {
            const orRangeOperators = rangeOperators.map(o => 'or' + o.charAt(0).toUpperCase() + o.substr(1))
            if (value === null) {
              queryChain = operator === 'nor'
                ? queryChain.orFilter('exists', getMapping(config, attribute))
                : queryChain.orFilter('bool', b => {
                    return b.notFilter('exists', getMapping(config, attribute))
                  })
            } else if (orRangeOperators.includes(operator)) {
              const realOperator = operator.substr(2).toLowerCase()
              value = Array.isArray(value) ? value[0] : value
              queryChain = queryChain.orFilter('range', getMapping(config, attribute), { [realOperator]: value })
            } else {
              queryChain = operator === 'nor'
                ? queryChain.orFilter('bool', b => {
                    return b.notFilter('terms', getMapping(config, attribute), value)
                  })
                : queryChain.orFilter('terms', getMapping(config, attribute), value)
            }
          } else {
            if (value === null) {
              queryChain = operator === 'nin'
                ? queryChain.notFilter('exists', getMapping(config, attribute))
                : queryChain.filter('exists', getMapping(config, attribute))
            } else {
              queryChain = operator === 'nin'
                ? queryChain.notFilter('terms', getMapping(config, attribute), value)
                : queryChain.filter('terms', getMapping(config, attribute), value)
            }
          }
        }
      } else if (scope === 'catalog') {
        hasCatalogFilters = true
      }
    })

    // apply catalog scope filters
    let attrFilterBuilder = (filterQr, attrPostfix = '') => {
      appliedFilters.forEach(catalogfilter => {
        const valueKeys = Object.keys(catalogfilter.value)
        if (checkIfObjectHasScope({ object: catalogfilter, scope: 'catalog' }) && valueKeys.length) {
          const isRange = valueKeys.filter(value => rangeOperators.indexOf(value) !== -1)
          if (isRange.length) {
            let rangeAttribute = catalogfilter.attribute
            // filter by product fiunal price
            if (rangeAttribute === 'price') {
              rangeAttribute = config.products.priceFilterKey
            }
            // process range filters
            filterQr = filterQr.andFilter('range', rangeAttribute, catalogfilter.value)
          } else {
            // process terms filters
            let newValue = catalogfilter.value[Object.keys(catalogfilter.value)[0]]
            if (!Array.isArray(newValue)) {
              newValue = [newValue]
            }
            if (attrPostfix === '') {
              filterQr = filterQr.andFilter('terms', getMapping(config, catalogfilter.attribute), newValue)
            } else {
              filterQr = filterQr.andFilter('terms', catalogfilter.attribute + attrPostfix, newValue)
            }
          }
        }
      })
      return filterQr
    }

    if (hasCatalogFilters) {
      queryChain = queryChain.filterMinimumShouldMatch(1).orFilter('bool', attrFilterBuilder)
        .orFilter('bool', (b) => attrFilterBuilder(b, optionsPrefix).filter('match', 'type_id', 'configurable')) // the queries can vary based on the product type
    }
  }

  // Add aggregations for catalog filters
  const allFilters = searchQuery.getAvailableFilters()
  if (allFilters.length > 0) {
    for (let attrToFilter of allFilters) {
      if (checkIfObjectHasScope({ object: attrToFilter, scope: 'catalog' })) {
        if (attrToFilter.field !== 'price') {
          let aggregationSize = { size: config.products.filterAggregationSize[attrToFilter.field] || config.products.filterAggregationSize.default }
          queryChain = queryChain.aggregation('terms', getMapping(config, attrToFilter.field), aggregationSize)
          queryChain = queryChain.aggregation('terms', attrToFilter.field + optionsPrefix, aggregationSize)
        } else {
          queryChain = queryChain.aggregation('terms', attrToFilter.field)
          queryChain.aggregation('range', 'price', config.products.priceFilters)
        }
      }
    }
  }
  // Get searchable fields based on user-defined config.
  queryChain = applySearchQuery({ config, queryText, queryChain })
  return queryChain.build()
}
export function applySort ({ sort, queryChain }: { sort: any, queryChain:any }) {
  if (sort) {
    Object.keys(sort).forEach((key) => {
      queryChain.sort(key, sort[key]);
    })
  }
  return queryChain;
}

/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
export async function buildQueryBodyFromFilterObject ({ config, queryChain, filter, search = '' }: { config: ElasticsearchQueryConfig, queryChain: any, filter: any, search: string }) {
  const appliedFilters = [];
  if (filter) {
    for (var attribute in filter) {
      let processedFilter = processNestedFieldFilter(attribute, filter[attribute])
      let appliedAttributeValue = processedFilter['value']
      const scope = appliedAttributeValue.scope || 'default';
      delete appliedAttributeValue.scope;
      appliedFilters.push({
        attribute: processedFilter['attribute'],
        value: appliedAttributeValue,
        scope: scope
      });
    }
  }
  return buildQueryBodyFromSearchQuery({ 
    config,
    queryChain,
    searchQuery: new SearchQuery({
      _appliedFilters: appliedFilters,
      _availableFilters: appliedFilters,
      _searchText: search
    })
  })
}
