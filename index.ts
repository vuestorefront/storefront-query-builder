import { applySearchQuery, applySort, buildQueryBodyFromFilterObject, buildQueryBodyFromSearchQuery } from './src/elasticsearch/index'
import SearchQuery from './src/types/SearchQuery'
import QueryArgument from './src/types/QueryArgument'
import AppliedFilter from './src/types/AppliedFilter'
import AvailableFilter from './src/types/AvailableFilter'
import ElasticsearchQueryConfig from './src/elasticsearch/types/ElasticsearchQueryConfig'

interface QueryAdapter {
    buildQueryBodyFromSearchQuery ({ config, queryChain, searchQuery }: { config: ElasticsearchQueryConfig, queryChain: any, searchQuery: SearchQuery })
    buildQueryBodyFromFilterObject ({ config, queryChain, filter, search }: { config: ElasticsearchQueryConfig, queryChain: any, filter: any, search: string })
    applySearchQuery ({ config, queryText, queryChain}: { config: ElasticsearchQueryConfig, queryText: string, queryChain: any })
    applySort ({ sort, queryChain }: { sort: string, queryChain:any })
}

const elasticsearch:QueryAdapter = { 
    buildQueryBodyFromFilterObject,
    buildQueryBodyFromSearchQuery,
    applySearchQuery,
    applySort
}

export { 
    SearchQuery,
    QueryArgument,
    AppliedFilter,
    AvailableFilter,

    elasticsearch,
    ElasticsearchQueryConfig
}