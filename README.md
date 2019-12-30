# storefront-query-builder
ElasticSearch Query builder from the abstract "SearchQuery" object used by `storefront-api`, `vue-storefront-api` and `vue-storefront` projects.

The idea is, that the user can create the query in a pretty abstract way and get the `ElasticSearch` or potentially different query in return. Some nice extension ideas could be to add `mongodb` support or `SQL` support as well.


Example usage:

```js
import { SearchQuery, elasticsearch } from 'storefront-query-builder'
import bodybuilder from 'bodybuilder'
const searchQuery = new SearchQuery()
searchQuery = searchQuery.applyFilter({key: 'parent_id', value: {'eq': 125 }})
const elasticSearchQuery = await elasticsearch.buildQueryBodyFromSearchQuery({ config, queryChain: bodybuilder(), searchQuery })
// send the `elasticSearchQuery` to ElasticSearch instance
```

More on [`storefront-api`](https://github.com/DivanteLtd/storefront-api)
More on [`vue-storefront`](https://github.com/DivanteLtd/vue-storefront)