'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SearchQuery = function () {
  /**
    */
  function SearchQuery(_ref) {
    var _ref$_availableFilter = _ref._availableFilters,
        _availableFilters = _ref$_availableFilter === undefined ? [] : _ref$_availableFilter,
        _ref$_appliedFilters = _ref._appliedFilters,
        _appliedFilters = _ref$_appliedFilters === undefined ? [] : _ref$_appliedFilters,
        _ref$_searchText = _ref._searchText,
        _searchText = _ref$_searchText === undefined ? '' : _ref$_searchText;

    _classCallCheck(this, SearchQuery);

    this._availableFilters = _availableFilters;
    this._appliedFilters = _appliedFilters;
    this._searchText = _searchText;
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
    value: function applyFilter(_ref2) {
      var key = _ref2.key,
          value = _ref2.value,
          _ref2$scope = _ref2.scope,
          scope = _ref2$scope === undefined ? 'default' : _ref2$scope,
          _ref2$options = _ref2.options,
          options = _ref2$options === undefined ? Object : _ref2$options;

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
    value: function addAvailableFilter(_ref3) {
      var field = _ref3.field,
          _ref3$scope = _ref3.scope,
          scope = _ref3$scope === undefined ? 'default' : _ref3$scope,
          _ref3$options = _ref3.options,
          options = _ref3$options === undefined ? {} : _ref3$options;

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