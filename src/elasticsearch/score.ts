export default function getFunctionScores (config) {
  if (!config.elasticsearch.hasOwnProperty('searchScoring')) {
    return false
  }
  let filter = []
  let esScoringAttributes = config.elasticsearch.searchScoring.attributes
  let esScoringConfig = config.elasticsearch.searchScoring

  if (!Object.keys(esScoringAttributes).length) {
    return false
  }
  for (const attribute of Object.keys(esScoringAttributes)) {
    for (const scoreValue of Object.keys(esScoringAttributes[attribute].scoreValues)) {
      let data = {
        'filter': {
          'match': {
            [attribute]: scoreValue
          }
        },
        'weight': esScoringAttributes[attribute].scoreValues[scoreValue].weight
      }
      filter.push(data)
    }
  }
  if (filter.length) {
    return {'functions': filter,
      'score_mode': esScoringConfig.score_mode ? esScoringConfig.score_mode : 'multiply',
      'boost_mode': esScoringConfig.boost_mode ? esScoringConfig.boost_mode : 'multiply',
      'max_boost': esScoringConfig.max_boost ? esScoringConfig.max_boost : 100,
      'min_score': esScoringConfig.function_min_score ? esScoringConfig.function_min_score : 1
    }
  }
  return false
}
