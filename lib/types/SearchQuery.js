"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SearchQuery = /** @class */ (function () {
    function SearchQuery(queryObj) {
        if (!queryObj) {
            queryObj = { _availableFilters: [], _appliedFilters: [], _appliedSort: [], _searchText: '' };
        }
        this._availableFilters = queryObj._availableFilters;
        this._appliedFilters = queryObj._appliedFilters;
        this._appliedSort = queryObj._appliedSort;
        this._searchText = queryObj._searchText;
    }
    /**
      * @return {Array} array of all available filters objects
      */
    SearchQuery.prototype.getAvailableFilters = function () {
        return this._availableFilters;
    };
    /**
      * @return {Array} array of applied filters objects
      */
    SearchQuery.prototype.getAppliedFilters = function () {
        return this._appliedFilters;
    };
    /**
      * @return {Array} array of applied sort objects
      */
    SearchQuery.prototype.getAppliedSort = function () {
        return this._appliedSort;
    };
    /**
      * @return {Array} check if sort options are added
      */
    SearchQuery.prototype.hasAppliedSort = function () {
        return this._appliedSort.length > 0;
    };
    /**
      * @return {String}
      */
    SearchQuery.prototype.getSearchText = function () {
        return this._searchText;
    };
    /**
      * @param {Object}
      * @return {Object}
      */
    SearchQuery.prototype.applyFilter = function (_a) {
        var key = _a.key, value = _a.value, _b = _a.scope, scope = _b === void 0 ? 'default' : _b, _c = _a.options, options = _c === void 0 ? Object : _c;
        this._appliedFilters.push({
            attribute: key,
            value: value,
            scope: scope,
            options: options
        });
        return this;
    };
    /**
      * @param {Object}
      * @return {Object}
      */
    SearchQuery.prototype.applySort = function (_a) {
        var field = _a.field, _b = _a.options, options = _b === void 0 ? 'asc' : _b;
        this._appliedSort.push({ field: field, options: options });
        return this;
    };
    /**
      * @param {Object}
      * @return {Object}
      */
    SearchQuery.prototype.addAvailableFilter = function (_a) {
        var field = _a.field, _b = _a.scope, scope = _b === void 0 ? 'default' : _b, _c = _a.options, options = _c === void 0 ? {} : _c;
        // value can has only String, Array or numeric type
        this._availableFilters.push({
            field: field,
            scope: scope,
            options: options
        });
        return this;
    };
    /**
    * @param {Array} filters
    * @return {Object}
    */
    SearchQuery.prototype.setAvailableFilters = function (filters) {
        this._availableFilters = filters;
        return this;
    };
    /**
    * @param {String} searchText
    * @return {Object}
    */
    SearchQuery.prototype.setSearchText = function (searchText) {
        this._searchText = searchText;
        return this;
    };
    return SearchQuery;
}());
exports.default = SearchQuery;
//# sourceMappingURL=SearchQuery.js.map