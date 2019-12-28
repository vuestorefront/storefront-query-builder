'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SearchQuery = function () {
  /**
    */
  function SearchQuery(queryObj) {
    _classCallCheck(this, SearchQuery);

    if (!queryObj) {
      queryObj = { _availableFilters: [], _appliedFilters: [], _searchText: '' };
    }
    this._availableFilters = queryObj._availableFilters;
    this._appliedFilters = queryObj._appliedFilters;
    this._searchText = queryObj._searchText;
  }
  /**
    * @return {Array} array of all available filters objects
    */


  _createClass(SearchQuery, [{
    key: 'getAvailableFilters',
    value: function getAvailableFilters() {
      return this._availableFilters;
    }

    /**
      * @return {Array} array of applied filters objects
      */

  }, {
    key: 'getAppliedFilters',
    value: function getAppliedFilters() {
      return this._appliedFilters;
    }

    /**
      * @return {String}
      */

  }, {
    key: 'getSearchText',
    value: function getSearchText() {
      return this._searchText;
    }

    /**
      * @param {Object}
      * @return {Object}
      */

  }, {
    key: 'applyFilter',
    value: function applyFilter(_ref) {
      var key = _ref.key,
          value = _ref.value,
          _ref$scope = _ref.scope,
          scope = _ref$scope === undefined ? 'default' : _ref$scope,
          _ref$options = _ref.options,
          options = _ref$options === undefined ? Object : _ref$options;

      this._appliedFilters.push({
        attribute: key,
        value: value,
        scope: scope,
        options: options
      });

      return this;
    }

    /**
      * @param {Object}
      * @return {Object}
      */

  }, {
    key: 'addAvailableFilter',
    value: function addAvailableFilter(_ref2) {
      var field = _ref2.field,
          _ref2$scope = _ref2.scope,
          scope = _ref2$scope === undefined ? 'default' : _ref2$scope,
          _ref2$options = _ref2.options,
          options = _ref2$options === undefined ? {} : _ref2$options;

      // value can has only String, Array or numeric type
      this._availableFilters.push({
        field: field,
        scope: scope,
        options: options
      });

      return this;
    }

    /**
    * @param {Array} filters
    * @return {Object}
    */

  }, {
    key: 'setAvailableFilters',
    value: function setAvailableFilters(filters) {
      this._availableFilters = filters;
      return this;
    }

    /**
    * @param {String} searchText
    * @return {Object}
    */

  }, {
    key: 'setSearchText',
    value: function setSearchText(searchText) {
      this._searchText = searchText;
      return this;
    }
  }]);

  return SearchQuery;
}();

exports.default = SearchQuery;