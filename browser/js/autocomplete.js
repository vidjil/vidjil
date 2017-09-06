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
    this.loadedGroup = -1;

    VidjilAutoComplete.instance = this;

    return this;
}

// static methods

VidjilAutoComplete.defaultLoadingData = ['loading'];

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
        this.cachedData[at] = {};
    },

    clearCache : function() {
        this.cachedData = {};
    },

    isLoaded : function(group_id) {
        return this.loadedGroup == group_id;
    },

    setupAtWho: function(input) {
        const $input = $(input);
        if ($input.data('needs-atwho')) {
            $input.off('focus.setupAtWho').on('focus.setupAtWho', this.setupTags.bind(this, $input));
            $input.on('change.atwho', () => input.dispatchEvent(new Event('input')));
            // This triggers at.js again
            // Needed for quick actions with suffixes (ex: /label ~)
            $input.on('inserted-commands.atwho', $input.trigger.bind($input, 'keyup'));
            $input.on('clear-commands-cache.atwho', () => this.clearCache());
            $input.data('needs-atwho', false);

            // hackiness to get the autocompletion ready right away
            $input.trigger('focus.setupAtWho');
        }
    },

    setupTags : function($input) {
        console.log("setup");
        var self = this;
        var at = '#';
        this.initCache(at);
        $input.atwho({
            at: at,
            alias: 'tags',
            data: VidjilAutoComplete.defaultLoadingData,
            callbacks: {
                ...self.getDefaultCallbacks()
            },
            searchKey: 'search',
        });
    },

    getDefaultCallbacks : function() {
        const fetchData = this.fetchData.bind(this);
        const isLoaded = this.isLoaded.bind(this);
        var callbacks = {
            filter : function(query, data, searchKey) {
                var group_id = this.$inputor.data('group-id');
                if (VidjilAutoComplete.isLoading(data) || !isLoaded(group_id)) {
                    this.$inputor.atwho('load', this.at, VidjilAutoComplete.defaultLoadingData);
                    fetchData(this.$inputor, this.at, group_id);
                    return data;
                }
                return $.fn.atwho.default.callbacks.filter(query, data, searchKey);
            },
            beforeSave(tags) {
                return $.map(tags, (i) => {
                    if (i.name == null) {
                        return i;
                    }
                    return {
                        id: i.id,
                        name: i.name,
                        search: `${i.id} ${i.name}`,
                    };
                });
            },
        }
        return callbacks;
    },

    fetchData : function($input, at, group_id) {
        var self = this;
        if (this.isLoadingData[at]) return;
        this.isLoadingData[at] = true;
        if (this.cachedData[at][group_id]) {
            this.loadData($input, at, this.cachedData[at][group_id], group_id);
        } else {
            $.ajax({
                type: "GET",
                data: {
                    group_id: group_id
                },
                timeout: 5000,
                crossDomain: true,
                url: self.datasource,
                success: function (data) {
                    var my_data = JSON.parse(data);
                    self.loadData($input, at, my_data, group_id);
                },
                error: function (request, status, error) {
                    self.isLoadingData[at] = false;
                }
            });
        }
    },

    loadData : function($input, at, data, group_id) {
        this.isLoadingData[at] = false;
        this.cachedData[at][group_id] = data;
        this.loadedGroup = group_id;
        $input.atwho('load', at, data);
        // This trigger at.js again
        // otherwise we would be stuck with loading until the user types
        return $input.trigger('keyup');
    },

}
