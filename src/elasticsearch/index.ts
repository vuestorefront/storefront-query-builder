import getFunctionScores from './score'
import getMultiMatchConfig from './multimatch'
import getBoosts from './boost'
import cloneDeep from 'clone-deep'
import SearchQuery from '../types/SearchQuery'
import AppliedFilter from '../types/AppliedFilter'
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig'

export interface FilterOptions {
  operator: string
  attribute: string
  value: any,
  queryChain?: any
}

export interface FilterInterface {
  check ({ operator, value, attribute, queryChain }: FilterOptions): boolean,
  filter ({ operator, value, attribute, queryChain }: FilterOptions): Object
  priority?: number
}

export interface FiltersInterface {
  [key: string]: FilterInterface
}

/**
 * Class to create filter in modular and reproductive way
 */
export default class Filters {

  /**
   * @var {string[]} rangeOperators Possible range operators
   */
  protected rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to']

  /**
   * @var {string[]} orRangeOperators Possible range operators with or clause prefix
   */
  protected orRangeOperators = this.rangeOperators.map(o => 'or' + o.charAt(0).toUpperCase() + o.substr(1))

  /**
   * @var {FiltersInterface} baseFilters Operators for the default filters like: range, or, nor, in, nin
   */
  protected baseFilters: FiltersInterface = {
    range: {
      check: ({ value }) => Object.keys(value).every(v => this.rangeOperators.includes(v)),
      filter: ({ attribute, value }: FilterOptions) => this.queryChain.filter('range', attribute, value)
    },
    orRange: {
      check: ({ operator }) => this.orRangeOperators.includes(operator),
      filter: ({ operator, attribute, value }: FilterOptions) => {
        const realOperator = operator.substr(2).toLowerCase()
        value = Array.isArray(value) ? value[0] : value
        return this.queryChain.orFilter('range', attribute, { [realOperator]: value })
      }
    },
    or: {
      check: ({ operator }) => operator === 'or',
      filter: ({ value, attribute }) => {
        if (value === null) {
          return this.queryChain.orFilter('bool', b => {
            return b.notFilter('exists', attribute)
          })
        } else {
          return this.queryChain.orFilter('terms', attribute, value)
        }
      }
    },
    nor: {
      check: ({ operator }) => operator === 'nor',
      filter: ({ value, attribute }) => {
        if (value === null) {
          return this.queryChain.orFilter('exists', attribute)
        } else {
          return this.queryChain.orFilter('bool', b => {
            return b.notFilter('terms', attribute, value)
          })
        }
      }
    },
    nin: {
      check: ({ operator }) => operator === 'nin',
      filter: ({ value, attribute }) => {
        if (value === null) {
          return this.queryChain.notFilter('exists', attribute)
        } else {
          return this.queryChain.notFilter('terms', attribute, value)
        }
      }
    },
    in: {
      check: ({ operator }) => operator === 'in',
      filter: ({ value, attribute }) => {
        if (value === null) {
          return this.queryChain.filter('exists', attribute)
        } else {
          return this.queryChain.filter('terms', attribute, value)
        }
      }
    }
  }

  protected customFilters: FiltersInterface = {}

  /**
   * Bodybuilder object
   * – passed in from the outside so we don't need to include in this lib
   */
  protected queryChain: any

  /**
   * This is an empty clone of the original, empty bodybuilder query chain to use it as plain bodybuilder instance
   */
  protected emptyQueryChain: any

  protected config: ElasticsearchQueryConfig

  protected searchQuery: SearchQuery

  protected optionsPrefix: string = '_options'

  protected hasCatalogFilters: boolean = false

  /**
   * @param {{ config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery, customFilters?: FiltersInterface }} 
   */
  constructor ({ config, queryChain, searchQuery, customFilters }: { config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery, customFilters?: FiltersInterface }) {
    this.config = config
    this.queryChain = queryChain
    this.searchQuery = searchQuery

    this.customFilters = Object.assign({}, this.customFilters, customFilters)

    this.emptyQueryChain = queryChain.clone()
  }
  
  /**
   * @return {this}
   */
  public buildQueryBodyFromSearchQuery (): this {
    if (this.searchQuery.getAppliedFilters().length > 0) {
      /**
       * @param {any} appliedFilters This is a copy of `searchQuery.getAppliedFilters()` because we going to modify the object
       */
      const appliedFilters = cloneDeep(this.searchQuery.getAppliedFilters())

      this
        .applyBaseFilters(appliedFilters)
        .applyCatalogFilters(appliedFilters)
        .applyAggregations()
        .applyTextQuery()
        .applySort()
    }

    return this
  }

  /**
   * Apply all `default` scoped filters to `queryChain`
   * @return {this}
   */
  protected applyBaseFilters (appliedFilters: AppliedFilter[]): this {
    appliedFilters.forEach(filter => {
      let { value, attribute } = filter
      const operator = Object.keys(value)[0]

      attribute = this.getMapping(attribute)

      value = value[Object.keys(value)[0]]
      if (!Array.isArray(value) && value !== null) {
        value = [value]
      }

      if (this.checkIfObjectHasScope({ object: filter, scope: 'default' }) && Object.keys(value).length) {
        this.getSortedFilters().forEach(filterHandler => {
          // Add query-chain for custom filters
          if (filterHandler.check({ operator, attribute, value, queryChain: this.queryChain })) {
            filterHandler.filter({ operator, attribute, value, queryChain: this.queryChain })
          }
        })
      }
    })

    return this
  }

  /**
   * Apply all `catalog` scoped filters to `queryChain`
   * @return {this}
   */
  protected applyCatalogFilters (appliedFilters: AppliedFilter[]): this {
    if (this.hasCatalogFilters) {
      this.queryChain
        .filterMinimumShouldMatch(1)
        .orFilter('bool', b => this.catalogFilterBuilder(b, appliedFilters))
        .orFilter('bool', b => this.catalogFilterBuilder(b, appliedFilters, this.optionsPrefix).filter('match', 'type_id', 'configurable'))
    }

    return this
  }

  protected catalogFilterBuilder = (filterQr: any, appliedFilters: AppliedFilter[], attrPostfix: string = ''): any => {
    appliedFilters.forEach(filter => {
      let { value, attribute } = filter
      const valueKeys = Object.keys(value)
      if (this.checkIfObjectHasScope({ object: filter, scope: 'catalog' }) && valueKeys.length) {
        const isRange = valueKeys.filter(value => this.rangeOperators.indexOf(value) !== -1)
        if (isRange.length) {
          let rangeAttribute = attribute
          // filter by product fiunal price
          if (rangeAttribute === 'price') {
            rangeAttribute = this.config.products.priceFilterKey
          }
          // process range filters
          filterQr = filterQr.andFilter('range', rangeAttribute, value)
        } else {
          // process terms filters
          let newValue = value[Object.keys(value)[0]]
          if (!Array.isArray(newValue)) {
            newValue = [newValue]
          }
          if (attrPostfix === '') {
            filterQr = filterQr.andFilter('terms', this.getMapping(attribute), newValue)
          } else {
            filterQr = filterQr.andFilter('terms', attribute + attrPostfix, newValue)
          }
        }
      }
    })

    return filterQr
  }

  /**
   * Apply filter aggregations
   * @return {this}
   */
  protected applyAggregations (): this {
    const filters = this.searchQuery.getAvailableFilters()
    const config = this.config.products
    if (filters.length > 0) {
      for (let attribute of filters) {
        if (this.checkIfObjectHasScope({ object: attribute, scope: 'catalog' })) {
          const { field } = attribute
          if (field !== 'price') {
            let aggregationSize = { size: config.filterAggregationSize[field] || config.filterAggregationSize.default }
            this.queryChain.aggregation('terms', this.getMapping(field), aggregationSize)
            this.queryChain.aggregation('terms', field + this.optionsPrefix, aggregationSize)
          } else {
            this.queryChain.aggregation('terms', field)
            this.queryChain.aggregation('range', 'price', config.priceFilters)
          }
        }
      }
    }

    return this
  }

  /**
   * Apply query string
   * @return {this}
   */
  public applyTextQuery (): this {
    if (this.getSearchText() !== '') {
      let functionScore = getFunctionScores(this.config)
      // Build bool or function_score accordingly
      if (functionScore) {
        this.queryChain.query('function_score', functionScore, this.getQueryBody)
      } else {
        this.queryChain.query('bool', this.getQueryBody)
      }
    }

    return this
  }

  /**
   * @return {this}
   */
  protected applySort (): this {
    if (this.searchQuery.hasAppliedSort()) {
      const appliedSort = this.searchQuery.getAppliedSort()
      const isRandomSort = appliedSort.some(f => f.field === 'random')

      if (isRandomSort) {
        // This is kind of a hack to get random sorting using `bodybuilder`
        const functions = [ { 'weight': 2, 'random_score': {}, ...this.queryChain.build()['query']['bool'] } ]
        this.queryChain = this.bodybuilder().query('function_score', { functions, 'min_score': 1.1 })
      } else {
        let sorting = []
        for (let sort of appliedSort) {
          const { field, options } = sort
          sorting.push({ [field]: options })
        }

        this.queryChain.sort(sorting)
      }
    }

    return this
  }

  /**
   * Combine and sort filters by priority
   */
  protected getSortedFilters (): FilterInterface[] {
    let filters: FilterInterface[] = Object.values(Object.assign(this.baseFilters, this.customFilters))
    return filters.sort(function(a, b) {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      if (priorityA === priorityB) {
        return 0
      } else {
        return (priorityA < priorityB) ? -1 : 1
      }
    })
  }

  protected checkIfObjectHasScope ({ object, scope }: { object: { scope: string }, scope: string}): boolean {
    return object.scope === scope || (Array.isArray(object.scope) && object.scope.indexOf(scope) >= 0)
  }

  protected getMapping (attribute: string, entityType = 'products'): string {
    let mapping = []
    if (this.config.hasOwnProperty(entityType) && this.config[entityType].hasOwnProperty('filterFieldMapping')) {
      mapping = this.config[entityType].filterFieldMapping
    }

    if (mapping.hasOwnProperty(attribute)) {
      return mapping[attribute]
    }

    return attribute
  }

  protected getQueryBody (body): any {
    const queryText = this.getSearchText()

    let searchableFields = []
    let searchableAttributes = this.config.elasticsearch.hasOwnProperty('searchableAttributes')
      ? this.config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } }
    for (const attribute of Object.keys(searchableAttributes)) {
      searchableFields.push(attribute + '^' + getBoosts(this.config, attribute))
    }

    return body
      .orQuery('multi_match', 'fields', searchableFields, getMultiMatchConfig(this.config, queryText))
      .orQuery('bool', b => b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
      .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
      .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }))
  }

  public getQueryChain (): any {
    return this.queryChain
  }

  protected getSearchText (): string {
    return this.searchQuery.getSearchText()
  }

  /**
   * Get an empty representation of the bodybuilder query-chain without need to import bodybuilder itself
   * @return {any}
   */
  protected bodybuilder = (): any => this.emptyQueryChain.clone()

  /**
   * @returns Bodybuilder object
   */
  public build (): Record<string, any> {
    return this.queryChain.build()
  }
}

export async function buildQueryBodyFromSearchQuery ({ config, queryChain, searchQuery, customFilters }: { config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery, customFilters?: FiltersInterface }) {
  const filter = new Filters({ config, queryChain, searchQuery, customFilters })
  return filter.buildQueryBodyFromSearchQuery().build()
}

export function applySearchQuery ({ config, queryText, queryChain }: { config: ElasticsearchQueryConfig, queryText: string, queryChain: any }) {
  const searchQuery = new SearchQuery({ _searchText: queryText })
  return new Filters({ config, searchQuery, queryChain }).buildQueryBodyFromSearchQuery().getQueryChain()
}

export function applySort ({ sort, queryChain }: { sort: any, queryChain:any }) {
  if (sort) {
    Object.keys(sort).forEach((key) => {
      queryChain.sort(key, sort[key])
    })
  }
  return queryChain
}

/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
export async function buildQueryBodyFromFilterObject ({ config, queryChain, filter, search = '' }: { config: ElasticsearchQueryConfig, queryChain: any, filter: any, search: string }) {
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
      _searchText: search
    })
  })
}
