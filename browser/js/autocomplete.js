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
    this.dataUrls = {};
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

    isLoaded : function(keys) {
        // this.loadedData is sorted on assignment
        if (this.loadedData.length !== keys.length) {
            return false;
        }
        var sorted_keys = keys.sort();
        for (var i = 0; i < this.loadedData.length; i++) {
            if (this.loadedData[i] !== sorted_keys[i]) {
                return false;
            }
        }
        return true;
    },

    setupTags: function(input) {
        this.setupAtWho(input, this.atWhoTags);
    },

    setupSamples: function(input) {
        this.setupAtWho(input, this.atWhoSamples);
    },

    setupAtWho: function(input, callback) {
        var $input = $(input);
        if ($input.data('needs-atwho')) {
            $input.off('focus.setupAtWho').on('focus.setupAtWho', callback.bind(this, $input));
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

    atWhoTags : function($input) {
        var self = this;
        var at = '#';
        this.initCache(at);
        this.dataUrls[at] = this.datasource.db_address + 'tag/auto_complete';
        $input.atwho({
            at: at,
            alias: 'tags',
            data: VidjilAutoComplete.defaultLoadingData,
            callbacks: self.getDefaultCallbacks(),
            searchKey: 'search',
            limit: 8
        });
    },

    atWhoSamples : function($input) {
        var self = this;
        var at = '';
        this.initCache(at);
        this.dataUrls[at] = this.datasource.db_address + 'sample_set/auto_complete'
        var callbacks = self.getDefaultCallbacks()
        callbacks.beforeSave = function(data) {
            if (data.length == 1 && data[0] == VidjilAutoComplete.defaultLoadingData[0]) {
                return data;
            }
            var res = $.map(data, function(i) {
                return {
                    name: i.name.substr(3),
                    search: i.name
                };
            });
            return res;
        };

        callbacks.matcher = function(flag, subtext) {
            var regex = new RegExp("[\\s\\S]+");
            var match = regex.exec(subtext);
            if (match) {
                return match[0];
            }
            return null;
        };

        // code taken directly from atwho source in order to allow use of brackets in inputs
        callbacks.highlighter = function(li, query) {
            var regexp;
            if (!query) {
                return li;
            }
            regexp = new RegExp(">\\s*(\\w*?)(" + query.replace(/[\+\[\]\(\)]/g, function(s) { return "\\" + s; }) + ")(\\w*)\\s*<", 'ig');
            return li.replace(regexp, function(str, $1, $2, $3) {
                return '> ' + $1 + '<strong>' + $2 + '</strong>' + $3 + ' <';
            });

        };

        callbacks.beforeInsert = function(value) {
            return value + ", "
        };

        $input.atwho({
            at: at,
            alias: 'samples',
            data: VidjilAutoComplete.defaultLoadingData,
            callbacks: callbacks,
            searchKey: 'search',
        });
    },

    getDefaultCallbacks : function() {
        var fetchData = this.fetchData.bind(this);
        var isLoaded = this.isLoaded.bind(this);
        var callbacks = {
            filter : function(query, data, searchKey) {
                var keys = this.$inputor.data('keys');
                if (VidjilAutoComplete.isLoading(data) || !isLoaded(keys)) {
                    this.$inputor.atwho('load', this.at, VidjilAutoComplete.defaultLoadingData);
                    fetchData(this.$inputor, this.at, keys);
                    return data;
                }
                return $.fn.atwho.default.callbacks.filter(query, data, searchKey);
            },
            beforeSave: function(data) {
                if (data.length == 1 && data[0] == VidjilAutoComplete.defaultLoadingData[0]) {
                    return data;
                }
                return $.map(data, function(i) {
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

    fetchData : function($input, at, keys) {
        var self = this;
        if (this.isLoadingData[at]) return;
        this.isLoadingData[at] = true;

        var uncached = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!this.cachedData[at][key]) {
                uncached.push(key);
                //this.loadData($input, at, this.cachedData[at][key], key);
            }
        }

        if (uncached.length > 0) {
            $.ajax({
                type: "GET",
                data: {
                    keys: JSON.stringify(uncached)
                },
                xhrFields: {
                    withCredentials: true
                },
                timeout: 5000,
                crossDomain: true,
                url: self.dataUrls[at],
                success: function (data) {
                    var my_data = JSON.parse(data);
                    self.cacheData(at, my_data, uncached);
                    self.loadData($input, at, keys);
                },
                error: function (request, status, error) {
                    self.isLoadingData[at] = false;
                }
            });
        } else {
            this.loadData($input, at, keys);
        }
    },

    cacheData : function(at, data, keys) {
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this.cachedData[at][key] = data[key] ? data[key] : [];
        }
    },

    loadData : function($input, at, keys) {
        this.isLoadingData[at] = false;
        this.loadedData = keys.sort();

        var loaded_data = [];
        for (var i = 0; i < this.loadedData.length; i++) {
            loaded_data = loaded_data.concat(this.cachedData[at][this.loadedData[i]]);
        }

        // remove duplicates
        var seen = [];
        loaded_data = loaded_data.filter(function(elem) {
            var res = seen.indexOf(elem.name);
            if (res < 0) {
                seen.push(elem.name);
            }
            return res < 0;
        })

        $input.atwho('load', at, loaded_data);
        // This trigger at.js again
        // otherwise we would be stuck with loading until the user types
        return $input.trigger('keyup');
    },

}
