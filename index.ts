import { applySearchQuery, applySort, buildQueryBodyFromFilterObject, buildQueryBodyFromSearchQuery } from './src/elasticsearch/index'
import SearchQuery from './src/types/SearchQuery'
import QueryArgument from './src/types/QueryArgument'
import AppliedFilter from './src/types/AppliedFilter'
import AvailableFilter from './src/types/AvailableFilter'

interface QueryAdapter {
    buildQueryBodyFromSearchQuery (config: any, bodybuilder: any, searchQuery: SearchQuery)
    buildQueryBodyFromFilterObject (config: any, bodybuilder: any, filter: any, search: any)
    applySearchQuery (config: any, queryText: string, query: any) 
    applySort (sort: string, quer:any)
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

    elasticsearch
}