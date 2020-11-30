"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getFunctionScores(config) {
    var _a;
    if (!config.elasticsearch.hasOwnProperty('searchScoring')) {
        return false;
    }
    var filter = [];
    var esScoringAttributes = config.elasticsearch.searchScoring.attributes;
    var esScoringConfig = config.elasticsearch.searchScoring;
    if (!Object.keys(esScoringAttributes).length) {
        return false;
    }
    for (var _i = 0, _b = Object.keys(esScoringAttributes); _i < _b.length; _i++) {
        var attribute = _b[_i];
        for (var _c = 0, _d = Object.keys(esScoringAttributes[attribute].scoreValues); _c < _d.length; _c++) {
            var scoreValue = _d[_c];
            var data = {
                'filter': {
                    'match': (_a = {},
                        _a[attribute] = scoreValue,
                        _a)
                },
                'weight': esScoringAttributes[attribute].scoreValues[scoreValue].weight
            };
            filter.push(data);
        }
    }
    if (filter.length) {
        return { 'functions': filter,
            'score_mode': esScoringConfig.score_mode ? esScoringConfig.score_mode : 'multiply',
            'boost_mode': esScoringConfig.boost_mode ? esScoringConfig.boost_mode : 'multiply',
            'max_boost': esScoringConfig.max_boost ? esScoringConfig.max_boost : 100,
            'min_score': esScoringConfig.function_min_score ? esScoringConfig.function_min_score : 1
        };
    }
    return false;
}
exports.default = getFunctionScores;
//# sourceMappingURL=score.js.map