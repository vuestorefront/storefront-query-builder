import AppliedFilter from './AppliedFilter';
import AvailableFilter from './AvailableFilter';
import AppliedSort from './AppliedSort';
import QueryArgument from './QueryArgument';
import SortArgument from './SortArgument';
export default class SearchQuery {
    private _searchText;
    private _availableFilters;
    private _appliedFilters;
    private _appliedSort;
    constructor(queryObj?: any);
    /**
      * @return {Array} array of all available filters objects
      */
    getAvailableFilters(): AvailableFilter[];
    /**
      * @return {Array} array of applied filters objects
      */
    getAppliedFilters(): AppliedFilter[];
    /**
      * @return {Array} array of applied sort objects
      */
    getAppliedSort(): AppliedSort[];
    /**
      * @return {Array} check if sort options are added
      */
    hasAppliedSort(): boolean;
    /**
      * @return {String}
      */
    getSearchText(): string;
    /**
      * @param {Object}
      * @return {Object}
      */
    applyFilter({ key, value, scope, options }: QueryArgument): this;
    /**
      * @param {Object}
      * @return {Object}
      */
    applySort({ field, options }: SortArgument): this;
    /**
      * @param {Object}
      * @return {Object}
      */
    addAvailableFilter({ field, scope, options }: AvailableFilter): this;
    /**
    * @param {Array} filters
    * @return {Object}
    */
    setAvailableFilters(filters: [AvailableFilter]): this;
    /**
    * @param {String} searchText
    * @return {Object}
    */
    setSearchText(searchText: string): this;
}
