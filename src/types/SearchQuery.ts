import AppliedFilter from './AppliedFilter'
import AvailableFilter from './AvailableFilter'
import AppliedSort from './AppliedSort'
import QueryArgument from './QueryArgument'
import SortArgument from './SortArgument'

export default class SearchQuery {

  private _searchText: string
  private _availableFilters: AvailableFilter[]
  private _appliedFilters: AppliedFilter[]
  private _appliedSort: AppliedSort[]

  public constructor (queryObj?: any) {
    if (!queryObj) {
      queryObj = { _availableFilters: [], _appliedFilters: [], _appliedSort: [], _searchText: '' } 
    }
    this._availableFilters = queryObj._availableFilters || []
    this._appliedFilters = queryObj._appliedFilters || []
    this._appliedSort = queryObj._appliedSort || []
    this._searchText = queryObj._searchText || ''
  }
  /**
    * @return {Array} array of all available filters objects
    */
  getAvailableFilters (): AvailableFilter[] {
    return this._availableFilters
  }

  /**
    * @return {Array} array of applied filters objects
    */
  getAppliedFilters (): AppliedFilter[] {
    return this._appliedFilters
  }

  /**
    * @return {Array} array of applied sort objects
    */
   getAppliedSort (): AppliedSort[] {
    return this._appliedSort
  }

  /**
    * @return {Array} check if sort options are added
    */
   hasAppliedSort (): boolean {
    return this._appliedSort.length > 0
  }

  /**
    * @return {String}
    */
  getSearchText (): string {
    return this._searchText
  }

  /**
    * @param {Object}
    * @return {Object}
    */
  applyFilter ({key, value, scope = 'default', options = Object}: QueryArgument): this {
    this._appliedFilters.push({
      attribute: key,
      value: value,
      scope: scope,
      options: options
    })

    return this
  }

  /**
    * @param {Object}
    * @return {Object}
    */
   applySort ({field, options = 'asc'}: SortArgument): this {
    this._appliedSort.push({ field, options })
    return this
  }

  /**
    * @param {Object}
    * @return {Object}
    */
  addAvailableFilter ({ field, scope = 'default', options = {} }:AvailableFilter): this {
    // value can has only String, Array or numeric type
    this._availableFilters.push({
      field: field,
      scope: scope,
      options: options
    })

    return this
  }

  /**
  * @param {Array} filters
  * @return {Object}
  */
  setAvailableFilters (filters: [AvailableFilter]): this {
    this._availableFilters = filters
    return this
  }

  /**
  * @param {String} searchText
  * @return {Object}
  */
  setSearchText (searchText: string): this {
    this._searchText = searchText
    return this
  }
}
