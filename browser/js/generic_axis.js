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
 * */
function GenericAxis (reverse, can_undefined) {
    this.labels = [];
    this.label_mapping = {};
    this.values = []
    this.value_mapping = {};
    this.can_undefined = true;
    this.MAX_NB_STEPS_IN_AXIS = 14; // Number (max) of labels per numerical axis
    this.MAX_NB_BARS_IN_AXIS = 200
    this.NB_STEPS_BAR = 18; // Number (max) of labels per numerical axis in histograms
    if(typeof can_undefined !== "undefined")
        this.can_undefined = can_undefined;
    this.reverse = false;
    if(typeof reverse !== "undefined")
        this.reverse = reverse
}

GenericAxis.prototype = {

    init : function (values, key, labels, sort) {
        this.reset();
        this.values = values;
        if (typeof sort === 'undefined') {sort = false;}

        if (typeof key === 'function') {
            this.converter = key;
        } else {
            this.converter = function(elem) {
                return elem[key];
            }
        }

        this.populateLabels(labels, sort);
        this.populateValueMapping();

        return this;
    },

    compareLabels: function(a, b) {
        if (typeof a === 'undefined') return (typeof b === 'undefined')  ? 0 :  -1;
        if (typeof b === 'undefined') return (typeof a === 'undefined')  ? 0 :  1;
  
        if (a.constructor === String) {
            if (b.constructor === String) return a.localeCompare(b);
            if (b.constructor === Number ) return 1
        }
 
        if (a.constructor === Number) return (b.constructor === Number ) ? (a-b) : -1;
    },

    populateLabels: function(labels, sort) {
        var values = this.values;
        var label_mapping = this.label_mapping;

        if (typeof labels === 'undefined')
            this.computeLabels(values, sort);
        else {
            for (var i=0; i < values.length; i++) {
                var value = values[i];
                var convert = this.applyConverter(value);
                var pos;
                if (labels.indexOf(convert) != -1) {
                    if (typeof label_mapping[convert] === 'undefined') {
                        pos = labels.indexOf(convert)/labels.length;
                        if (this.reverse)
                            pas = 1 - pos;
                        this.addLabel("line", convert, pos, convert);
                    }
                } else {
                    if (this.can_undefined) {
                        pos = 1;
                        if (this.reverse)
                            pos = 0;
                        this.addLabel("line", "?", pos, "?");
                    }

                }
            }
        }

        var step = 1/(this.labels.length+1);
        offset = step/2;
        for (var idx in this.labels){
            this.labels[idx].pos += offset;
        }
    },

    populateValueMapping: function(round) {

        for (var idx in this.values) {
            var value = this.values[idx];

            // if (value.isVirtual())
            //    continue ;  // ? pas toujours ?

            var convert = this.applyConverter(value);

            if (typeof round !== 'undefined')
                convert = nice_ceil(convert - round/2, round)

            if (typeof convert == "undefined" || convert == undefined || convert == "undefined" || Number.isNaN(convert)) {
                if (this.can_undefined) {
                    if (typeof this.value_mapping["?"] === 'undefined')
                        this.value_mapping["?"] = [];
                    this.value_mapping["?"].push(value);
                }
            }
            else
            {
                this.value_mapping[convert] = this.value_mapping[convert] || []
                this.value_mapping[convert].push(value);
            }
        }
    },

    sortValueMapping: function() {
        var keys = Object.keys(this.value_mapping).sort()
        var temp = {}
        for (var key_pos in keys){
            key = keys[key_pos]
            temp[key] = this.value_mapping[key]
        }
        this.value_mapping = temp
    },

    applyConverter: function(value) {
        var val;
        try {
            val = this.converter(value);
            if (typeof val === 'undefined' || val == "undefined")
                val = "?";
        } catch(e) {
            val = "?";
        }
        return val;
    },

    label: function (type, pos, text) {
        result = {};
        result.type = type;
        result.pos = pos;
        result.text = text;

        return result;
    },

    addLabel: function(type, value, pos, text) {
        var label = this.label(type, pos, text);
        this.label_mapping[value] = label;
        this.labels.push(label);
    },

    reset: function() {
        this.labels = [];
        this.label_mapping = {};
        this.values = [];
        this.value_mapping = {};
    },
    
    pos: function(element) {
        value = this.applyConverter(element);

        return this.pos_from_value(value)
    },

    pos_from_value: function(value) {

        var pos = this.label_mapping[value]

        if (typeof pos === 'undefined')
            pos = this.label_mapping["?"];

        return pos ;
    },

    computeLabels: function(values, sort) {
        var label_list = [];
        var has_undefined;
        for (var i = 0; i < values.length; i++) {
            var value = values[i];
            var key = this.applyConverter(value);
            if (typeof key == 'undefined') {
                has_undefined = true;
            } else if (label_list.indexOf(key) == -1) {
                label_list.push(key);
            }
        }

        if (sort)
            label_list.sort(this.compareLabels);

        for (var idx = 0; idx < label_list.length; idx++) {
            var label = label_list[idx];
            this.addLabel("line", label, idx/label_list.length, label);
        }
        if (has_undefined) {
            if (typeof this.label_mapping["?"] === 'undefined')
                this.addLabel("line", "?", label_list.length + 1, "?");
        }
    },


    getLabelText: function(value) {
        return value;
    },

    posBarLabel : function (i) {
        var length = Object.keys(this.value_mapping).length;
        return (i-0.5)/length ;
    }
}
