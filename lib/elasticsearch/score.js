'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getFunctionScores;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function getFunctionScores(config) {
  if (!config.elasticsearch.hasOwnProperty('searchScoring')) {
    return false;
  }
  var filter = [];
  var esScoringAttributes = config.elasticsearch.searchScoring.attributes;

  if (!Object.keys(esScoringAttributes).length) {
    return false;
  }
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.keys(esScoringAttributes)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var attribute = _step.value;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(esScoringAttributes[attribute].scoreValues)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var scoreValue = _step2.value;

          var data = {
            'filter': {
              'match': _defineProperty({}, attribute, scoreValue)
            },
            'weight': esScoringAttributes[attribute].scoreValues[scoreValue].weight
          };
          filter.push(data);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (filter.length) {
    return { 'functions': filter,
      'score_mode': config.score_mode ? config.score_mode : 'multiply',
      'boost_mode': config.boost_mode ? config.boost_mode : 'multiply',
      'max_boost': config.max_boost ? config.max_boost : 100,
      'min_score': config.function_min_score ? config.function_min_score : 1
    };
  }
  return false;
}