import getFunctionScores from './score'
import getMultiMatchConfig from './multimatch'
import getBoosts from './boost'
import cloneDeep from 'clone-deep'
import SearchQuery from '../types/SearchQuery'
import AppliedFilter from '../types/AppliedFilter'
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig'

/**
 * These are option parameters passed to filters methods like `check` and `filter`
 *
 * @param {string} operator String representation of the first operator of the filter like `in` and `nor`
 * @param {string} attribute Name of the filters attribute
 * @param {any} value Set of values to filter in the filters `filter` method
 * @param {string} queryChain Representation of the current `bodybuilder` query-chain
 */
export interface FilterOptions {
  operator: string
  attribute: string
  value: any,
  queryChain?: any
}

/**
 * Option parameters of a single filter
 *
 * @param {Function} check Method to verfiy if the current `SearchQuery` filter matches this filter
 * @param {Function} filter Method to mutate the `bodybuilder` query-chain
 * @param {Function} mutator Method to mutate value before it is applied to `filter` method to make it easier to handle it in filter-method
 * @param {number} priority Define priority of filters – Filters follow a lower to higher sort, means: lower items are called first
 */
export interface FilterInterface {
  check ({ operator, value, attribute, queryChain }: FilterOptions): boolean,
  filter ({ operator, value, attribute, queryChain }: FilterOptions): Object
  mutator? (value: any): any,
  priority?: number
}

/**
 * Set of filters to create a request body using `bodybuilder`
 */
export interface FiltersInterface {
  [key: string]: FilterInterface
}

/**
 * Class to create elasticsearch request body in modular and reproductive way
 */
export default class RequestBody {

  /**
   * @var {string[]} rangeOperators Possible range operators
   */
  protected rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to']

  /**
   * @var {string[]} orRangeOperators Possible range operators with or clause prefix
   */
  protected orRangeOperators = this.rangeOperators.map(o => 'or' + o.charAt(0).toUpperCase() + o.substr(1))

  /**
   * @param {Object} value Get first option of filter values
   */
  protected extractFirstValueMutator = (value): any[] => {
    value = value[Object.keys(value)[0]]
    if (!Array.isArray(value) && value !== null) {
      value = [value]
    }
    return value
  }

  /**
   * @var {FiltersInterface} baseFilters Operators for the default filters like: range, or, nor, in, nin
   */
  protected baseFilters: FiltersInterface = {
    range: {
      check: ({ value }) => Object.keys(value).every(v => this.rangeOperators.includes(v)),
      filter: ({ attribute, value, queryChain }: FilterOptions) => queryChain.filter('range', attribute, value)
    },
    orRange: {
      check: ({ value }) => Object.keys(value).every(o => this.orRangeOperators.includes(o)),
      filter: ({ attribute, value, queryChain }: FilterOptions) => {
        queryChain.filterMinimumShouldMatch(1, true)
        for (let o in value) {
          const realOperator = o.substr(2).toLowerCase()
          value[realOperator] = value[o]
          delete value[o]
        }
        return queryChain.orFilter('range', attribute, value)
      }
    },
    or: {
      check: ({ operator }) => operator === 'or',
      filter: ({ value, attribute, queryChain }) => {
        queryChain.filterMinimumShouldMatch(1, true)
        if (value === null) {
          return queryChain.orFilter('bool', b => {
            return b.notFilter('exists', attribute)
          })
        } else {
          return queryChain.orFilter('terms', attribute, value)
        }
      },
      mutator: this.extractFirstValueMutator
    },
    nor: {
      check: ({ operator }) => operator === 'nor',
      filter: ({ value, attribute, queryChain }) => {
        queryChain.filterMinimumShouldMatch(1, true)
        if (value === null) {
          return queryChain.orFilter('exists', attribute)
        } else {
          return queryChain.orFilter('bool', b => {
            return b.notFilter('terms', attribute, value)
          })
        }
      },
      mutator: this.extractFirstValueMutator
    },
    nin: {
      check: ({ operator }) => ['neq', 'nin'].includes(operator),
      filter: ({ value, attribute, queryChain }) => {
        if (value === null) {
          return queryChain.notFilter('exists', attribute)
        } else {
          return queryChain.notFilter('terms', attribute, value)
        }
      },
      mutator: this.extractFirstValueMutator
    },
    in: {
      check: ({ operator }) => ['eq', 'in'].includes(operator),
      filter: ({ value, attribute, queryChain }) => {
        if (value === null) {
          return queryChain.filter('exists', attribute)
        } else {
          return queryChain.filter('terms', attribute, value)
        }
      },
      mutator: this.extractFirstValueMutator
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

  /**
   * Create a copy of `SearchQuery.getAppliedFilters()` to make them mutable in custom- and base-filters
   */
  protected appliedFilters: AppliedFilter[]

  protected optionsPrefix: string = '_options'

  protected _hasCatalogFilters: boolean

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
      this.appliedFilters = cloneDeep(this.searchQuery.getAppliedFilters())

      this
          .applyBaseFilters()
          .applyCatalogFilters()
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
  protected applyBaseFilters (): this {
    this.appliedFilters.forEach(filter => {
      let { value, attribute } = filter

      if (!this.checkIfObjectHasScope({ object: filter, scope: 'default' })) {
        return
      }

      value = typeof value === 'object' ? value : { 'in': [ value ] }
      if (Object.keys(value).length > 0) {
        attribute = this.getMapping(attribute)
        const operator = Object.keys(value)[0]

        const sortedFilters = this.getSortedFilters()
        for (let filterHandler of sortedFilters) {
          const { queryChain } = this
          // Add `queryChain` variable for custom filters
          if (filterHandler.check({ operator, attribute, value, queryChain })) {
            value = filterHandler.hasOwnProperty('mutator') ? filterHandler.mutator(value) : value
            this.queryChain = filterHandler.filter.call(this, { operator, attribute, value, queryChain })
            return
          }
        }

        // add filter attribute that is not handled by sortedFilters list
        this.queryChain = this.queryChain.filter('terms', attribute, this.extractFirstValueMutator(value))
      }
    })

    return this
  }

  /**
   * Apply all `catalog` scoped filters to `queryChain`
   * @return {this}
   */
  protected applyCatalogFilters (): this {
    if (this.hasCatalogFilters()) {
      this.queryChain.filterMinimumShouldMatch(1)

      const catalogFilters = this.appliedFilters.filter(object => this.checkIfObjectHasScope({ object, scope: 'catalog' }))
      catalogFilters.forEach(filter => {
        this.queryChain.filter('bool', catalogFilterQuery => {
          return this.catalogFilterBuilder(catalogFilterQuery, filter, undefined, 'orFilter')
              .orFilter('bool', b => this.catalogFilterBuilder(b, filter, this.optionsPrefix).filter('match', 'type_id', 'configurable'))
        })
      })
    }

    return this
  }

  protected hasCatalogFilters(): boolean {
    if (!this._hasCatalogFilters) {
      this._hasCatalogFilters = this.searchQuery.getAppliedFilters()
          .some(object => this.checkIfObjectHasScope({ object, scope: 'catalog' }))
    }

    return this._hasCatalogFilters
  }

  protected catalogFilterBuilder = (filterQr: any, filter: AppliedFilter, attrPostfix: string = '', type: 'query' | 'filter' | 'orFilter' = 'filter'): any => {
    let { value, attribute } = filter
    const valueKeys = value !== null ? Object.keys(value) : []
    if (this.checkIfObjectHasScope({ object: filter, scope: 'catalog' }) && valueKeys.length > 0) {
      const isRange = valueKeys.filter(value => this.rangeOperators.indexOf(value) !== -1)
      if (isRange.length) {
        let rangeAttribute = attribute
        // filter by product fiunal price
        if (rangeAttribute === 'price') {
          rangeAttribute = this.config.products.priceFilterKey
        }
        // process range filters
        filterQr = filterQr[type]('range', rangeAttribute, value)
      } else {
        // process terms filters
        let newValue = value[Object.keys(value)[0]]
        if (!Array.isArray(newValue)) {
          newValue = [newValue]
        }
        if (attrPostfix === '') {
          filterQr = filterQr[type]('terms', this.getMapping(attribute), newValue)
        } else {
          filterQr = filterQr[type]('terms', attribute + attrPostfix, newValue)
        }
      }
    }

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
          const options = attribute.options || {}
          if (field !== 'price') {
            let aggregationSize = { size: options.size || config.filterAggregationSize[field] || config.filterAggregationSize.default }
            this.queryChain
                .aggregation('terms', this.getMapping(field), aggregationSize)
                .aggregation('terms', field + this.optionsPrefix, aggregationSize)
          } else {
            const appliedPriceFilter = this.appliedFilters.find(filter => filter.attribute === 'price')
            const additionalPriceAggregations = [];

            if (appliedPriceFilter && appliedPriceFilter.value && (appliedPriceFilter.value.gte || appliedPriceFilter.value.lte)) {
              additionalPriceAggregations.push({
                ...(appliedPriceFilter.value.gte ? { from: appliedPriceFilter.value.gte } : {}),
                ...(appliedPriceFilter.value.lte ? { to: appliedPriceFilter.value.lte } : {})
              });


            }
            this.queryChain
                .aggregation('terms', field)
                .aggregation('range', 'price', {
                  ranges: [
                    ...config.priceFilters.ranges,
                    ...additionalPriceAggregations
                  ]
                })

            if (this.config.products && this.config.products.aggregate) {
              if (this.config.products.aggregate.maxPrice) {
                this.queryChain.aggregation('max', 'price')
              }
              if (this.config.products.aggregate.minPrice) {
                this.queryChain.aggregation('min', 'price')
              }
            }
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
        this.queryChain.query('function_score', functionScore, this.getQueryBody.bind(this))
      } else {
        this.queryChain.query('bool', this.getQueryBody.bind(this))
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
    return filters
        .map((filter, index) => {
          if (!filter.priority) {
            filter.priority = (index + 1) * 10
          }
          return filter
        })
        .sort(function(a, b) {
          const priorityA = a.priority || 10
          const priorityB = b.priority || 10
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

  protected getSearchText (): string {
    return this.searchQuery.getSearchText()
  }

  /**
   * Get an empty representation of the bodybuilder query-chain without need to import bodybuilder itself
   * @return {any}
   */
  protected bodybuilder = (): any => this.emptyQueryChain.clone()

  public getQueryChain (): any {
    return this.queryChain
  }

  /**
   * @returns Bodybuilder object
   */
  public build (): Record<string, any> {
    return this.queryChain.build()
  }
}
