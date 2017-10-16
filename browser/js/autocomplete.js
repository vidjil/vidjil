 /* This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors:
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */

// This code is heavily inspired by the code produced for Gitlab's GfmAutoComplete

function VidjilAutoComplete(datasource) {
    if (typeof VidjilAutoComplete.instance === 'object') {
        return VidjilAutoComplete.instance;
    }

    this.datasource = datasource;
    this.isLoadingData = {};
    this.cachedData = {};
    this.loadedGroups = [];

    VidjilAutoComplete.instance = this;

    return this;
}

// static methods

VidjilAutoComplete.defaultLoadingData = ['<i>loading...</i>'];

VidjilAutoComplete.isLoading = function(data) {
    dataToInspect = data;
    if (data && data.length > 0) {
        dataToInspect = data[0];
    }

    var loadingState = VidjilAutoComplete.defaultLoadingData[0];
    return dataToInspect && (dataToInspect === loadingState || dataToInspect.name === loadingState);
}

// instance methods
VidjilAutoComplete.prototype = {

    initCache : function(at) {
        if (!this.cachedData[at]) {
            this.cachedData[at] = {};
        }
    },

    clearCache : function() {
        this.cachedData = {};
    },

    isLoaded : function(group_ids) {
        // this.loadedGroups is sorted on assignment
        if (this.loadedGroups.length !== group_ids.length) {
            return false;
        }
        var sorted_groups = group_ids.sort();
        for (var i = 0; i < this.loadedGroups.length; i++) {
            if (this.loadedGroups[i] !== sorted_groups[i]) {
                return false;
            }
        }
        return true;
    },

    setupAtWho: function(input) {
        var $input = $(input);
        if ($input.data('needs-atwho')) {
            $input.off('focus.setupAtWho').on('focus.setupAtWho', this.setupTags.bind(this, $input));
            $input.on('change.atwho', function() { input.dispatchEvent(new Event('input'))});
            // This triggers at.js again
            // Needed for quick actions with suffixes (ex: /label ~)
            $input.on('inserted-commands.atwho', $input.trigger.bind($input, 'keyup'));
            $input.on('clear-commands-cache.atwho', function() { this.clearCache()});
            $input.data('needs-atwho', false);

            // hackiness to get the autocompletion ready right away
            $input.trigger('focus.setupAtWho');
        }
    },

    setupTags : function($input) {
        var self = this;
        var at = '#';
        this.initCache(at);
        $input.atwho({
            at: at,
            alias: 'tags',
            data: VidjilAutoComplete.defaultLoadingData,
            callbacks: self.getDefaultCallbacks(),
            searchKey: 'search',
            limit: 8
        });
    },

    getDefaultCallbacks : function() {
        var fetchData = this.fetchData.bind(this);
        var isLoaded = this.isLoaded.bind(this);
        var callbacks = {
            filter : function(query, data, searchKey) {
                var group_ids = this.$inputor.data('group-ids');
                if (VidjilAutoComplete.isLoading(data) || !isLoaded(group_ids)) {
                    this.$inputor.atwho('load', this.at, VidjilAutoComplete.defaultLoadingData);
                    fetchData(this.$inputor, this.at, group_ids);
                    return data;
                }
                return $.fn.atwho.default.callbacks.filter(query, data, searchKey);
            },
            beforeSave: function(tags) {
                if (tags.length == 1 && tags[0] == VidjilAutoComplete.defaultLoadingData[0]) {
                    return tags;
                }
                return $.map(tags, function(i) {
                    if (i.name === null) {
                        return i;
                    }
                    return {
                        id: i.id,
                        name: i.name,
                        search: i.name + " " + i.id,
                    };
                });
            },
            sorter: function(query, items, searchKey) {
                return items.sort(function(a, b){
                    if(a[searchKey] < b[searchKey]) {
                        return -1;
                    } else if (a[searchKey] == b[searchKey]) {
                        return 0;
                    }
                    return 1;
                });
            }
        }
        return callbacks;
    },

    fetchData : function($input, at, group_ids) {
        var self = this;
        if (this.isLoadingData[at]) return;
        this.isLoadingData[at] = true;

        var uncached = [];
        for (var i = 0; i < group_ids.length; i++) {
            var group_id = group_ids[i];
            if (!this.cachedData[at][group_id]) {
                uncached.push(group_id);
                //this.loadData($input, at, this.cachedData[at][group_id], group_id);
            }
        }

        if (uncached.length > 0) {
            $.ajax({
                type: "GET",
                data: {
                    group_ids: JSON.stringify(uncached)
                },
                timeout: 5000,
                crossDomain: true,
                url: self.datasource,
                success: function (data) {
                    var my_data = JSON.parse(data);
                    self.cacheData(at, my_data, uncached);
                    self.loadData($input, at, group_ids);
                },
                error: function (request, status, error) {
                    self.isLoadingData[at] = false;
                }
            });
        } else {
            this.loadData($input, at, group_ids);
        }
    },

    cacheData : function(at, data, group_ids) {
        for (var i = 0; i < group_ids.length; i++) {
            var group_id = group_ids[i];
            this.cachedData[at][group_id] = data[group_id] ? data[group_id] : [];
        }
    },

    loadData : function($input, at, group_ids) {
        this.isLoadingData[at] = false;
        this.loadedGroups = group_ids.sort();

        var loaded_data = [];
        for (var i = 0; i < this.loadedGroups.length; i++) {
            loaded_data = loaded_data.concat(this.cachedData[at][this.loadedGroups[i]]);
        }

        // remove duplicates
        var seen = [];
        loaded_data = loaded_data.filter(function(elem) {
            var res = seen.indexOf(elem.name);
            if (res < 0) {
                seen.push(elem.name);
            }
            return res;
        })

        $input.atwho('load', at, loaded_data);
        // This trigger at.js again
        // otherwise we would be stuck with loading until the user types
        return $input.trigger('keyup');
    },

}
