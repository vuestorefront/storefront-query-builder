export default interface ElasticsearchQueryConfig {
    elasticsearch?: {
        searchScoring?: {
            attributes: {
            attribute_code: {
                scoreValues: { attribute_value: { weight: number } }
            }
            },
            fuzziness: number,
            cutoff_frequency:  number,
            max_expansions: number,
            minimum_should_match: string,
            prefix_length: number,
            boost_mode: string,
            score_mode: string,
            max_boost: number,
            function_min_score: number
        },
      searchableAttributes?: any
    },
    products?: {
      filterFieldMapping?: any,
      filterAggregationSize?: {
        default: number,
      },
      priceFilterKey: string,
      priceFilters: {
        ranges: [{ from: number, to: number }]
      },
      aggregate?: {
          maxPrice: boolean,
          minPrice: boolean,
          maxCostPrice: boolean,
          minCostPrice: boolean
      }
    }
}
