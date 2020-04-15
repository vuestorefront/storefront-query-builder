import Body, { FiltersInterface } from './body'
import SearchQuery from '../types/SearchQuery'
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig'

/**
 * Create a query elasticsearch request body based on a `SearchQuery`
 * @return {Object} Elasticsearch request body
 */
export async function buildQueryBodyFromSearchQuery ({ config, queryChain, searchQuery, customFilters }: { config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery, customFilters?: FiltersInterface }): Promise<any>  {
  const filter = new Body({ config, queryChain, searchQuery, customFilters })
  return filter.buildQueryBodyFromSearchQuery().build()
}

/**
 * Apply a search-text string to query (for string-based searches in, like in VSF search-box)-
 * This will create a set of filters based on your attributes set in API's search configs.
 * @return {Object} `bodybuilder` query chain
 */
export function applySearchQuery ({ config, queryText, queryChain }: { config: ElasticsearchQueryConfig, queryText: string, queryChain: any }) {
  const searchQuery = new SearchQuery({ _searchText: queryText })
  return new Body({ config, searchQuery, queryChain }).buildQueryBodyFromSearchQuery().getQueryChain()
}

/**
 * Apply simple, single-lined sort arguments to query
 * @return {Object} `bodybuilder` query chain
 */
export function applySort ({ sort, queryChain }: { sort: any, queryChain:any }): any {
  if (sort) {
    Object.keys(sort).forEach((key) => {
      queryChain.sort(key, sort[key])
    })
  }
  return queryChain
}

/**
 * Build a elasticsearch request-body from unified query object (as known from `storefront-api`) - eg: `{ "type_id": { "eq": "configurable "} }`
 * @return {Object} Elasticsearch request body
 */
export async function buildQueryBodyFromFilterObject ({ config, queryChain, filter, sort, search = '' }: { config: ElasticsearchQueryConfig, queryChain: any, filter: any, sort: any, search: string }): Promise<any> {
  function processNestedFieldFilter (attribute: string, value: any) {
    let processedFilter = {
      'attribute': attribute,
      'value': value
    }
    let filterAttributeKeys = Object.keys(value)
    for (let filterAttributeKey of filterAttributeKeys) {
      if (value[filterAttributeKey] && !Array.isArray(value[filterAttributeKey]) && typeof value[filterAttributeKey] === 'object') {
        processedFilter = processNestedFieldFilter(attribute + '.' + filterAttributeKey, value[filterAttributeKey])
      }
    }
    return processedFilter
  }

  const appliedFilters = []
  if (filter) {
    for (var attribute in filter) {
      let processedFilter = processNestedFieldFilter(attribute, filter[attribute])
      let appliedAttributeValue = processedFilter['value']
      const scope = appliedAttributeValue.scope || 'default'
      delete appliedAttributeValue.scope
      appliedFilters.push({
        attribute: processedFilter['attribute'],
        value: appliedAttributeValue,
        scope: scope
      })
    }
  }

  return buildQueryBodyFromSearchQuery({ 
    config,
    queryChain,
    searchQuery: new SearchQuery({
      _appliedFilters: appliedFilters,
      _availableFilters: appliedFilters,
      _appliedSort: sort,
      _searchText: search
    })
  })
}
