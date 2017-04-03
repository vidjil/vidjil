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
 * Axis object contain labels and their position on an axis (from 0 to 1) <br>
 * can provide the position of a clone on it
 * @constructor
 * @param {Model} model 
 * @reverse {boolean} reverse - by default axis go from low to high but can be revsersed
 * */
function CustomAxis (model, reverse) {
    this.m = model;
    this.labels = [];
    this.clones = [];
    this.value_mapping = {};
    this.reverse = reverse;
    GenericAxis.call(this);
}

const NB_STEPS_IN_AXIS = 6; // Number (max) of labels per numerical axis
const NB_STEPS_BAR = 30; // Number (max) of labels per numerical axis in histograms

CustomAxis.prototype = Object.create(GenericAxis.prototype);

Object.assign(CustomAxis.prototype, {
    /**
     * compute axis using a given function <br>
     * find min/max value possible with the given function and use them as range <br>
     * TODO make it works with non numerical value
     * @param {function} fct - must take a clone index in arg and return a numerical value
     * @param {number|function} default_min - the minimal boundary can't be over default_min 
     * @param {number|function} default_min - the maximal boundary can't be under default_max
     * @param {boolean} percent - display label as percent ( value 1 => 100%)
     * @param {boolean} use_log - use a logarithmic scale instead of a linear
     * */
    init: function(clones, fct, labels, sort, default_min, default_max, use_log, display_label){
        this.clones = clones;
        use_log = typeof use_log !== 'undefined' ? use_log : false;
        display_label = typeof display_label !== 'undefined' ? display_label : true;
        var self = this;
        var has_undefined = false
        
        this.fct = fct;
        
        var min = default_min;
        var max = default_max;
        if (typeof min === 'function') min = min();
        if (typeof max === 'function') max = max();

        if (typeof labels == "undefined") {
            for (var i in this.clones){
                if (! this.clones[i].isVirtual()) {
                    var tmp;
                    try{
                        tmp = this.fct(this.clones[i]);
                    }catch(e){
                        tmp = undefined;
                    }

                    if ( typeof tmp != "undefined" && !isNaN(tmp)){
                        if ( tmp > max || typeof max == "undefined") max = tmp;
                        if ( tmp < min || typeof min == "undefined") min = tmp;
                    } else {
                        has_undefined = true;
                    }
                }
            }
            for (var i=min; i<=max; i++){
                this.value_mapping[i]=[];
            }
        } else {
            for (var i in labels) {
                var val = labels[i];
                this.value_mapping[val] = [];
            }
        }
        this.value_mapping["?"] = [];

        for(var i in this.clones) {
            var clone = clones[i];
            if(!clone.isVirtual()) {
                var value;
                try{
                    value = this.fct(clone);
                }catch(e){
                    value = undefined;
                }
                if (typeof value == "undefined" || typeof this.value_mapping[value] == "undefined" ) {
                    this.value_mapping["?"].push(clone);
                }else{
                    this.value_mapping[value].push(clone);
                }
            }
        }

        if (typeof min == "undefined"){
            min = 0;
            max = 1;
        }
        else {
            min = nice_floor(min)
            max = nice_ceil(max)
        }

        if (has_undefined && ! use_log) {
            min = min - (max - min)/NB_STEPS_IN_AXIS
        }

        var range = [0,1]
        if (self.reverse) range = [1,0]
        if (use_log){
            this.sizeScale = d3.scale.log()
            .domain([min, max])
            .range(range);
        }else{
            this.sizeScale = d3.scale.linear()
                .domain([min, max])
                .range(range);
        }
            
        this.min = min;
        this.max = max;

        this.computeLabels(use_log, display_label, has_undefined)
    },

    pos: function(clone) {
        var value, pos;
        try{
            value = this.fct(clone);
        }catch(e){}

        if (typeof value != "undefined" && value != 'undefined'){
            pos = this.sizeScale(value);
        }else{
            pos = this.sizeScale(this.min);
        }
        
        return {'pos': pos};
    },
    
    /**
     * reset and build labels <br>
     * TODO make it works with non numerical value
     * @param {number} min - minimal label value
     * @param {number} max - maximal label value
     * @param {boolean} percent - display label as percent ( value 1 => 100%)
     * @param {boolean} use_log - use a logarithmic scale instead of a linear
     * @param {boolean} has_undefined - Should we include an undefined value ?
     * */
    computeLabels: function(use_log, display_label, has_undefined){
        this.labels = [];
        var min = this.min;
        var max = this.max;
        if (typeof has_undefined == 'undefined')
            has_undefined = false

        if (use_log){
            var h=1
            for (var i = 0; i < 10; i++) {
                var pos = this.sizeScale(h); // pos is possibly already reversed
                var text = this.m.formatSize(h, false)
                if (!display_label) text = "";
                if (pos >= 0 && pos <= 1)
                    this.labels.push(this.label("line", pos, text));
                h = h / 10;
            }
        }else{
            var nb_steps = NB_STEPS_IN_AXIS-1
            undefined_min = min
            // Recover the initial min value
            if (has_undefined) {
                min = (min*NB_STEPS_IN_AXIS + max)/(NB_STEPS_IN_AXIS + 1)
            }

            if (Math.abs(max - min) < nb_steps) {
                nb_steps = Math.abs(max - min)
            }

            var h = (max-min)/nb_steps
            // Computed so that pos <= 1 (in the loop below)
            var delta = (min - max)/((min - undefined_min)/(max-undefined_min) - 1)
            if (has_undefined)
                this.labels.push(this.label("line", (this.reverse) ? 1 : 0, "?"))
            // Shift the start when there is an undefined value
            var start_shift = (min - undefined_min)/(max-undefined_min)
            for (var i = 0; i <= nb_steps; i++) {
                pos = start_shift + (h*i)*(1/delta);

                var text = this.getLabelText(min, h, i);
                if (this.reverse) pos = 1 - pos;
                if (!display_label) text = "";
                this.labels.push(this.label("line", pos, text));
            }
        }
    },

    getLabelText(min_value, value, index) {
        return Math.round(min_value+(value*index));
    }
});

function PercentCustomAxis (model, reverse) {
    this.m = model;
    this.labels = [];
    this.reverse = reverse;
    CustomAxis.call(this, model, reverse);
}

PercentCustomAxis.prototype = Object.create(CustomAxis.prototype);

Object.assign(PercentCustomAxis.prototype, {
    getLabelText: function(min_value, value, index) {
        return ((min_value+(value*index))*100).toFixed(1) + "%";
    }
});

/**
 * Axis object contain labels and their position on an axis (from 0 to 1) <br>
 * can provide the position of a clone on it
 * @constructor
 * @param {Model} model
 * @reverse {boolean} reverse - by default axis go from low to high but can be revsersed
 * */
function FloatCustomAxis (model, reverse) {
    this.m = model;
    this.labels = [];
    this.reverse = reverse;
    CustomAxis.call(this);
}

FloatCustomAxis.prototype = Object.create(CustomAxis.prototype);

Object.assign(FloatCustomAxis.prototype, {

    getLabel: function(min_value, value, index) {
        return (min_value+(value*index)).toFixed(2)
    }
})
