import { FiltersInterface, FilterInterface, FilterOptions } from './elasticsearch/body';
import SearchQuery from './types/SearchQuery';
import QueryArgument from './types/QueryArgument';
import AppliedFilter from './types/AppliedFilter';
import AvailableFilter from './types/AvailableFilter';
import ElasticsearchQueryConfig from './elasticsearch/types/ElasticsearchQueryConfig';
interface QueryAdapter {
    buildQueryBodyFromSearchQuery({ config, queryChain, searchQuery }: {
        config: ElasticsearchQueryConfig;
        queryChain: any;
        searchQuery: SearchQuery;
        customFilters?: FiltersInterface;
    }): any;
    buildQueryBodyFromFilterObject({ config, queryChain, filter, search }: {
        config: ElasticsearchQueryConfig;
        queryChain: any;
        filter: any;
        search: string;
    }): any;
    applySearchQuery({ config, queryText, queryChain }: {
        config: ElasticsearchQueryConfig;
        queryText: string;
        queryChain: any;
    }): any;
    applySort({ sort, queryChain }: {
        sort: string;
        queryChain: any;
    }): any;
}
declare const elasticsearch: QueryAdapter;
export { SearchQuery, QueryArgument, AppliedFilter, AvailableFilter, FiltersInterface, FilterInterface, FilterOptions, elasticsearch, ElasticsearchQueryConfig };
