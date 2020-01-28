import SearchQuery from '../types/SearchQuery';
import ElasticsearchQueryConfig from './types/ElasticsearchQueryConfig';
export declare function applySearchQuery({ config, queryText, queryChain }: {
    config: ElasticsearchQueryConfig;
    queryText: string;
    queryChain: any;
}): any;
export declare function buildQueryBodyFromSearchQuery({ config, queryChain, searchQuery, customFilters }: {
    config: ElasticsearchQueryConfig;
    queryChain: any;
    searchQuery: SearchQuery;
    customFilters?: {
        [key: string]: Function;
    };
}): Promise<any>;
export declare function applySort({ sort, queryChain }: {
    sort: any;
    queryChain: any;
}): any;
/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
export declare function buildQueryBodyFromFilterObject({ config, queryChain, filter, search }: {
    config: ElasticsearchQueryConfig;
    queryChain: any;
    filter: any;
    search: string;
}): Promise<any>;
