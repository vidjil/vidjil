/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     Antonin Carette <antonin.carette@etudiant.univ-lille1.fr>
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


/**
 * GenericAxis object contain labels and their position on an axis (from 0 to 1)
 * can provide the position of an element on it
 * @constructor
 * @param {Model} model 
 * */
function GenericAxis () {
    this.labels = {};
    this.sorting_key; // Object attribute to sort elements by
}

GenericAxis.prototype = {

    init : function (values, key, labels, sorter) {
        var self = this;
        var vals = {};
        var my_labels;
        if (labels == undefined)
            my_labels = self.computeLabels(values);
        else
            my_labels = labels;

        var tmp;
        for (var i=0; i < values.length; i++) {
            tmp = values[i];
            if (vals[tmp[key]] == undefined)
                val[tmp[key]] = [];
            vals[tmp[key]].push(tmp);
        }
        if (sorter != undefined)
            my_labels = sorter.sort(my_labels);

        self.labels = my_labels;
        self.values = vals;
        return self;
    },

    label: function (type, pos, text) {
        result = {};
        result.type = type;
        result.pos = pos;
        result.text = text;

        return result;
    },

    reset: function() {
        this.labels = {};
        this.sorting_key = null;
    },
    
    pos : function(element) {
        return this.labels[element[key]];
    },

    computeLabels(values, key) {
        var labels = {}
        for (var i = 0; i < values.length; i++) {
            labels[value[i]] = this.label("line", i, values[key]);
        }
        return labels;
    },
}
