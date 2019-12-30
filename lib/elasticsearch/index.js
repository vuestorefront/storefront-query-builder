var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import getFunctionScores from './score';
import getMultiMatchConfig from './multimatch';
import getBoosts from './boost';
import getMapping from './mapping';
import cloneDeep from 'clone-deep';
import SearchQuery from '../types/SearchQuery';
function processNestedFieldFilter(attribute, value) {
    let processedFilter = {
        'attribute': attribute,
        'value': value
    };
    let filterAttributeKeys = Object.keys(value);
    for (let filterAttributeKey of filterAttributeKeys) {
        if (value[filterAttributeKey] && !Array.isArray(value[filterAttributeKey]) && typeof value[filterAttributeKey] === 'object') {
            processedFilter = processNestedFieldFilter(attribute + '.' + filterAttributeKey, value[filterAttributeKey]);
        }
    }
    return processedFilter;
}
/**
 *
 * @param {Object} object
 * @param {String} scope
 * @returns {boolean}
 */
function checkIfObjectHasScope({ object, scope }) {
    return object.scope === scope || (Array.isArray(object.scope) && object.scope.find(scrope => scrope === scope));
}
export function applySearchQuery({ config, queryText, queryChain }) {
    let getQueryBody = function (b) {
        let searchableAttributes = config.elasticsearch.hasOwnProperty('searchableAttributes') ? config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
        let searchableFields = [];
        for (const attribute of Object.keys(searchableAttributes)) {
            searchableFields.push(attribute + '^' + getBoosts(config, attribute));
        }
        return b.orQuery('multi_match', 'fields', searchableFields, getMultiMatchConfig(config, queryText))
            .orQuery('bool', b => b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
            .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
            .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }));
    };
    if (queryText !== '') {
        let functionScore = getFunctionScores(config);
        // Build bool or function_scrre accordingly
        if (functionScore) {
            queryChain = queryChain.query('function_score', functionScore, getQueryBody);
        }
        else {
            queryChain = queryChain.query('bool', getQueryBody);
        }
    }
    return queryChain;
}
export function buildQueryBodyFromSearchQuery({ config, queryChain, searchQuery }) {
    return __awaiter(this, void 0, void 0, function* () {
        const optionsPrefix = '_options';
        const queryText = searchQuery.getSearchText();
        const rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to'];
        // process applied filters
        const appliedFilters = cloneDeep(searchQuery.getAppliedFilters()); // copy as function below modifies the object
        if (appliedFilters.length > 0) {
            let hasCatalogFilters = false;
            // apply default filters
            appliedFilters.forEach(filter => {
                if (checkIfObjectHasScope({ object: filter, scope: 'default' }) && Object.keys(filter.value).length) {
                    if (Object.keys(filter.value).every(v => (rangeOperators.indexOf(v) >= 0))) {
                        // process range filters
                        queryChain = queryChain.filter('range', filter.attribute, filter.value);
                    }
                    else {
                        // process terms filters
                        const operator = Object.keys(filter.value)[0];
                        filter.value = filter.value[Object.keys(filter.value)[0]];
                        if (!Array.isArray(filter.value) && filter.value !== null) {
                            filter.value = [filter.value];
                        }
                        if (operator === 'or') {
                            if (filter.value === null) {
                                queryChain = queryChain.orFilter('bool', (b) => {
                                    return b.notFilter('exists', getMapping(config, filter.attribute));
                                });
                            }
                            else {
                                queryChain = queryChain.orFilter('terms', getMapping(config, filter.attribute), filter.value);
                            }
                        }
                        else {
                            if (filter.value === null) {
                                queryChain = queryChain.filter('exists', getMapping(config, filter.attribute));
                            }
                            else {
                                queryChain = queryChain.filter('terms', getMapping(config, filter.attribute), filter.value);
                            }
                        }
                    }
                }
                else if (filter.scope === 'catalog') {
                    hasCatalogFilters = true;
                }
            });
            // apply catalog scope filters
            let attrFilterBuilder = (filterQr, attrPostfix = '') => {
                appliedFilters.forEach(catalogfilter => {
                    const valueKeys = Object.keys(catalogfilter.value);
                    if (checkIfObjectHasScope({ object: catalogfilter, scope: 'catalog' }) && valueKeys.length) {
                        const isRange = valueKeys.filter(value => rangeOperators.indexOf(value) !== -1);
                        if (isRange.length) {
                            let rangeAttribute = catalogfilter.attribute;
                            // filter by product fiunal price
                            if (rangeAttribute === 'price') {
                                rangeAttribute = config.products.priceFilterKey;
                            }
                            // process range filters
                            filterQr = filterQr.andFilter('range', rangeAttribute, catalogfilter.value);
                        }
                        else {
                            // process terms filters
                            let newValue = catalogfilter.value[Object.keys(catalogfilter.value)[0]];
                            if (!Array.isArray(newValue)) {
                                newValue = [newValue];
                            }
                            if (attrPostfix === '') {
                                filterQr = filterQr.andFilter('terms', getMapping(config, catalogfilter.attribute), newValue);
                            }
                            else {
                                filterQr = filterQr.andFilter('terms', catalogfilter.attribute + attrPostfix, newValue);
                            }
                        }
                    }
                });
                return filterQr;
            };
            if (hasCatalogFilters) {
                queryChain = queryChain.filterMinimumShouldMatch(1).orFilter('bool', attrFilterBuilder)
                    .orFilter('bool', (b) => attrFilterBuilder(b, optionsPrefix).filter('match', 'type_id', 'configurable')); // the queries can vary based on the product type
            }
        }
        // Add aggregations for catalog filters
        const allFilters = searchQuery.getAvailableFilters();
        if (allFilters.length > 0) {
            for (let attrToFilter of allFilters) {
                if (checkIfObjectHasScope({ object: attrToFilter, scope: 'catalog' })) {
                    if (attrToFilter.field !== 'price') {
                        let aggregationSize = { size: config.products.filterAggregationSize[attrToFilter.field] || config.products.filterAggregationSize.default };
                        queryChain = queryChain.aggregation('terms', getMapping(config, attrToFilter.field), aggregationSize);
                        queryChain = queryChain.aggregation('terms', attrToFilter.field + optionsPrefix, aggregationSize);
                    }
                    else {
                        queryChain = queryChain.aggregation('terms', attrToFilter.field);
                        queryChain.aggregation('range', 'price', config.products.priceFilters);
                    }
                }
            }
        }
        // Get searchable fields based on user-defined config.
        queryChain = applySearchQuery({ config, queryText, queryChain });
        return queryChain.build();
    });
}
export function applySort({ sort, queryChain }) {
    if (sort) {
        Object.keys(sort).forEach((key) => {
            queryChain.sort(key, sort[key]);
        });
    }
    return queryChain;
}
/**
 * Build a query from unified query object (as known from `storefront-api`) - eg:
 * {
 *   "type_id": { "eq": "configurable "}
 * }
 */
export function buildQueryBodyFromFilterObject({ config, queryChain, filter, search = '' }) {
    return __awaiter(this, void 0, void 0, function* () {
        const appliedFilters = [];
        if (filter) {
            for (var attribute in filter) {
                let processedFilter = processNestedFieldFilter(attribute, filter[attribute]);
                let appliedAttributeValue = processedFilter['value'];
                const scope = appliedAttributeValue.scope || 'default';
                delete appliedAttributeValue.scope;
                appliedFilters.push({
                    attribute: processedFilter['attribute'],
                    value: appliedAttributeValue,
                    scope: scope
                });
            }
        }
        return buildQueryBodyFromSearchQuery({
            config,
            queryChain,
            searchQuery: new SearchQuery({
                _appliedFilters: appliedFilters,
                _availableFilters: appliedFilters,
                _searchText: search
            })
        });
    });
}
//# sourceMappingURL=index.js.map