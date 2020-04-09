import { FiltersInterface } from './body';
import SearchQuery from '../types/SearchQuery';
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig';
/**
 * Create a query elasticsearch request body based on a `SearchQuery`
 * @return {Object} Elasticsearch request body
 */
export declare function buildQueryBodyFromSearchQuery({ config, queryChain, searchQuery, customFilters }: {
    config: ElasticsearchQueryConfig;
    queryChain: any;
    searchQuery: SearchQuery;
    customFilters?: FiltersInterface;
}): Promise<any>;
/**
 * Apply a search-text string to query (for string-based searches in, like in VSF search-box)-
 * This will create a set of filters based on your attributes set in API's search configs.
 * @return {Object} `bodybuilder` query chain
 */
export declare function applySearchQuery({ config, queryText, queryChain }: {
    config: ElasticsearchQueryConfig;
    queryText: string;
    queryChain: any;
}): any;
/**
 * Apply simple, single-lined sort arguments to query
 * @return {Object} `bodybuilder` query chain
 */
export declare function applySort({ sort, queryChain }: {
    sort: any;
    queryChain: any;
}): any;
/**
 * Build a elasticsearch request-body from unified query object (as known from `storefront-api`) - eg: `{ "type_id": { "eq": "configurable "} }`
 * @return {Object} Elasticsearch request body
 */
export declare function buildQueryBodyFromFilterObject({ config, queryChain, filter, search }: {
    config: ElasticsearchQueryConfig;
    queryChain: any;
    filter: any;
    search: string;
}): Promise<any>;
