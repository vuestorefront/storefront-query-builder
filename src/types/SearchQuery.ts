import AppliedFilter from './AppliedFilter'
import AvailableFilter from './AvailableFilter'
import QueryArgument from './QueryArgument'
export default class SearchQuery {

  private _searchText: string
  private _availableFilters: [AvailableFilter]
  private _appliedFilters: [AppliedFilter]

  public constructor (queryObj?: any) {
    if (!queryObj) {
      queryObj = { _availableFilters: [], _appliedFilters: [], _searchText: ''} 
    }
    this._availableFilters = queryObj._availableFilters
    this._appliedFilters = queryObj._appliedFilters
    this._searchText = queryObj._searchText
  }
  /**
    * @return {Array} array of all available filters objects
    */
  getAvailableFilters () {
    return this._availableFilters
  }

  /**
    * @return {Array} array of applied filters objects
    */
  getAppliedFilters () {
    return this._appliedFilters
  }

  /**
    * @return {String}
    */
  getSearchText () {
    return this._searchText
  }

  /**
    * @param {Object}
    * @return {Object}
    */
  applyFilter ({key, value, scope = 'default', options = Object}: QueryArgument) {
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
  addAvailableFilter ({ field, scope = 'default', options = {} }:AvailableFilter) {
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
  setAvailableFilters (filters: [AvailableFilter]) {
    this._availableFilters = filters
    return this
  }

  /**
  * @param {String} searchText
  * @return {Object}
  */
  setSearchText (searchText: string) {
    this._searchText = searchText
    return this
  }
}
