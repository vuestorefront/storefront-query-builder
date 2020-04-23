import SearchQuery from '../types/SearchQuery';
import AppliedFilter from '../types/AppliedFilter';
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig';
/**
 * These are option parameters passed to filters methods like `check` and `filter`
 *
 * @param {string} operator String representation of the first operator of the filter like `in` and `nor`
 * @param {string} attribute Name of the filters attribute
 * @param {any} value Set of values to filter in the filters `filter` method
 * @param {string} queryChain Representation of the current `bodybuilder` query-chain
 */
export interface FilterOptions {
    operator: string;
    attribute: string;
    value: any;
    queryChain?: any;
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
    check({ operator, value, attribute, queryChain }: FilterOptions): boolean;
    filter({ operator, value, attribute, queryChain }: FilterOptions): Object;
    mutator?(value: any): any;
    priority?: number;
}
/**
 * Set of filters to create a request body using `bodybuilder`
 */
export interface FiltersInterface {
    [key: string]: FilterInterface;
}
/**
 * Class to create elasticsearch request body in modular and reproductive way
 */
export default class RequestBody {
    /**
     * @var {string[]} rangeOperators Possible range operators
     */
    protected rangeOperators: string[];
    /**
     * @var {string[]} orRangeOperators Possible range operators with or clause prefix
     */
    protected orRangeOperators: string[];
    /**
     * @param {Object} value Get first option of filter values
     */
    protected extractFirstValueMutator: (value: any) => any[];
    /**
     * @var {FiltersInterface} baseFilters Operators for the default filters like: range, or, nor, in, nin
     */
    protected baseFilters: FiltersInterface;
    protected customFilters: FiltersInterface;
    /**
     * Bodybuilder object
     * – passed in from the outside so we don't need to include in this lib
     */
    protected queryChain: any;
    /**
     * This is an empty clone of the original, empty bodybuilder query chain to use it as plain bodybuilder instance
     */
    protected emptyQueryChain: any;
    protected config: ElasticsearchQueryConfig;
    protected searchQuery: SearchQuery;
    /**
     * Create a copy of `SearchQuery.getAppliedFilters()` to make them mutable in custom- and base-filters
     */
    protected appliedFilters: AppliedFilter[];
    protected optionsPrefix: string;
    protected _hasCatalogFilters: boolean;
    constructor({ config, queryChain, searchQuery, customFilters }: {
        config: ElasticsearchQueryConfig;
        queryChain: any;
        searchQuery: SearchQuery;
        customFilters?: FiltersInterface;
    });
    /**
     * @return {this}
     */
    buildQueryBodyFromSearchQuery(): this;
    /**
     * Apply all `default` scoped filters to `queryChain`
     * @return {this}
     */
    protected applyBaseFilters(): this;
    /**
     * Apply all `catalog` scoped filters to `queryChain`
     * @return {this}
     */
    protected applyCatalogFilters(): this;
    protected hasCatalogFilters(): boolean;
    protected catalogFilterBuilder: (filterQr: any, filter: AppliedFilter, attrPostfix?: string, type?: "query" | "filter" | "orFilter") => any;
    /**
     * Apply filter aggregations
     * @return {this}
     */
    protected applyAggregations(): this;
    /**
     * Apply query string
     * @return {this}
     */
    applyTextQuery(): this;
    /**
     * @return {this}
     */
    protected applySort(): this;
    /**
     * Combine and sort filters by priority
     */
    protected getSortedFilters(): FilterInterface[];
    protected checkIfObjectHasScope({ object, scope }: {
        object: {
            scope: string;
        };
        scope: string;
    }): boolean;
    protected getMapping(attribute: string, entityType?: string): string;
    protected getQueryBody(body: any): any;
    protected getSearchText(): string;
    /**
     * Get an empty representation of the bodybuilder query-chain without need to import bodybuilder itself
     * @return {any}
     */
    protected bodybuilder: () => any;
    getQueryChain(): any;
    /**
     * @returns Bodybuilder object
     */
    build(): Record<string, any>;
}
