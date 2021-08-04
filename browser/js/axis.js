/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2020 by Bonsai bioinformatics
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


/**
 * Axis Object
 * can be initialized with the name of an already registered json Axis descriptor
 * alternatively it can be initialized by loading a json axis descriptor (see load())
 */
function Axis (axis_name) {
    if (axis_name)
        this.init(axis_name)
    return this
}

Axis.prototype = {

    /**
     * global functions
     * can be used directly from prototype without an axis object
     * usage : Axis.prototype.FUNCTION_NAME() 
     */

    //return name of all registered axis
    available: function(){
        available_axis = []
        var keys = Object.keys(AXIS_DEFAULT)
        for (var k in keys)
            available_axis.push(keys[k])

        return available_axis
    },
    
    //return json descriptor of a registered Axis
    getAxisProperties: function(name){
        return AXIS_DEFAULT[name]
    },

    //register an axis json descriptor 
    registerAxis: function(name , json, overwrite){
        if (typeof overwrite == "undefined") overwrite = false
        if(AXIS_DEFAULT[name] && !overwrite)
            console.error("an Axis descriptor named '" + name + "' already exist")

        AXIS_DEFAULT[name] = json
    },



    /**
     * 
     */
    init: function(axis_name){
        if (AXIS_DEFAULT[axis_name]){
            this.load(AXIS_DEFAULT[axis_name])
            return this
        }
        console.error("no axis descriptor named " + axis_name + " found")
    },

    //reload last json descriptor
    reload: function(){
        this.load(this.json)
        return this
    },

    //load a json Axis descriptor
    load: function(json){
        //check
        if (!('name' in json)){
            console.error("missing required field in unknow Axis descriptor 'name'")
            return
        }
        if (!('fct' in json)){
            console.error("missing required field in '" + this.name + "' Axis descriptor 'fct'")
            return
        }


        this.json = json
        this.name = json.name   
        this.doc = ('doc' in json) ? json.doc : json.name
        this.fct = json.fct    
        this.color = json.color
        this.sort = json.sort
        this.min_step = json.min_step

        this.germline = "multi" 
        if ('germline' in json)
            if (typeof json.germline === "function") 
                this.germline = json.germline()
            else 
                this.germline = json.germline

        this.labels = {}
        if ('labels' in json)
            if (typeof json.labels === "function") 
                this.labels = json.labels()
            else 
                this.labels = JSON.parse(JSON.stringify(json.labels))

        this.scale = undefined
        if ('scale' in json)
            this.scale = JSON.parse(JSON.stringify(json.scale))
            
        return this
    },

    compute: function(max){
        this.maxLabel = max
        if ('autofill' in this.json && this.json.autofill)
            this.autofill()

        this.compute_scale_labels()
            .compute_relative_positions()
            .compute_positions()
        
        return this
    },

    /* check the axis value of all clones and add the missing one to axis labels
     * find all discret values(string) the axis can return
     * find the min/max values(number) the axis can return
     * find the min_positive value() the axis can return (needed in case of log scale)
     **/
    autofill: function(){
        var s;
        for (var cloneID in m.clones){
            clone = m.clone(cloneID)

            if (clone.isInScatterplot() &&
                !clone.isFiltered && 
                clone.isClusterizable() &&
                (this.germline == "multi" || this.germline == clone.germline)){
                value = this.fct(clone)

                if (typeof value == "number" && !Number.isNaN(value)){
                    if (!(value in this.labels)){
                        this.initScale()
                        s = this.scale
                        if (s.max == "auto" || value > s.max)   s.max = value
                        if (s.min == "auto" || value < s.min)   s.min = value
                        if (value > 0 &&
                            (s.min_p == "auto" || 
                            value < s.min_p))                   s.min_p = value
                    }
                }

                if (typeof value == "string" )
                    if (!(value in this.labels))
                        this.labels[value] = {text: value, type:"default"}
            }

        }

        //scale exist but has not been initialized => no clones has returned a numeric value
        if (this.scale && !this.scale.isInitialized)
            this.initScale()

        if (this.scale){
            s = this.scale
            if (s.min == "auto" && s.max == "auto"){
                s.min = 0
                s.max = 1
                s.min_p = 0.1
            }else if (s.max == "auto"){
                s.max = s.min
            }else if (s.min == "auto"){
                s.min = s.max
            }
            if (s.min_p == "auto"){
                if (s.min > 0)      s.min_p = s.min
                else if (s.max > 0) s.min_p = s.max/10
                else                s.min_p = 0.1        //TODO: case of negative log scale
            }
        }

        return this
    },

    /*
     * Init scale without overwriting existing value
     **/
    initScale:function(){      
        if (this.scale && this.scale.isInitialized) return

        if (!this.scale)                    this.scale = { }
        if (this.scale.mode == undefined)   this.scale.mode = "linear"
        if (this.scale.min == undefined)    this.scale.min = "auto"
        if (this.scale.min_p == undefined)  this.scale.min_p = "auto"
        if (this.scale.max == undefined)    this.scale.max = "auto"

        this.scale.isInitialized = true
    },

    /* 
     * compute nice_min/nice_max value (used instead of min/max to produce a prettier scale)
     * add an optimized number of labels between nice_min/nice_max
     **/
    compute_scale_labels: function(){
        this.steps = [1,2,5]
        this.step = 1
        var max = this.maxLabel - Object.keys(this.labels).length
        if (max < 4) max = 5


        if (this.scale){
            var labelCount = 0

            //select min/max range before computing labels
            var smin = this.scale.min;
            var smax = this.scale.max;
            if (this.useCustomScale){
                smin = this.scale_custom_min;
                smax = this.scale_custom_max;
            }

            if (this.scale.mode == "linear"){
                
                var nice = nice_min_max_steps(smin, smax, max)
                if (typeof this.min_step == "undefined") this.min_step = nice.step
                this.step = Math.max(nice.step, this.min_step)
                this.precision = nice_number_digits(this.step, 1)

                this.scale.nice_min = nice.min
                var l = nice.min.toFixed(this.precision)
                if (l == 0) l = "0"
                this.scale.nice_min_label = l+"_l"

                this.scale.nice_max = nice.max
                l = nice.max.toFixed(this.precision)
                if (l == 0) l = "0"
                this.scale.nice_max_label = l+"_l"

                //add labels for each steps between min and max
                if (this.scale.reverse){
                    for (var i = this.scale.nice_max; 
                         this.scale.nice_min.toFixed(this.precision) <= (i+this.step/2).toFixed(this.precision); 
                         i=i-this.step){
                        this.addScaleLabel(i, "linearScale")
                        labelCount++
                    }
                }else{
                    for (var j = this.scale.nice_min; j < this.scale.nice_max+this.step; j+= this.step){
                        this.addScaleLabel(j, "linearScale")
                        labelCount++
                    }
                }
            }

            if (this.scale.mode == "log"){
                this.scale.nice_max = Math.pow(10, Math.ceil (Math.log10(Math.abs(smax))))
                this.scale.nice_min = Math.pow(10, Math.floor(Math.log10(Math.abs(this.scale.min_p))))
                this.scale.nice_min_label = (this.scale.nice_min).toFixed(nice_number_digits(this.scale.nice_min, 1)) + "_l"
                this.scale.nice_max_label = (this.scale.nice_max).toFixed(nice_number_digits(this.scale.nice_max, 1)) + "_l"

                //add labels
                if (this.scale.reverse){
                    if (smin == 0 && this.labels[0] == undefined)
                        this.labels[0] = {text: "0", type:"slim", side: "right"}
                    for (var k = this.scale.nice_max; k >= this.scale.nice_min; k=k/10){
                        this.addScaleLabel(k, "logScale")
                        labelCount++
                    } 
                }else{
                    for (var z = this.scale.nice_min; z <= this.scale.nice_max; z=z*10){
                        this.addScaleLabel(z, "logScale")
                        labelCount++
                    } 
                    if (smin == 0 && this.labels[0] == undefined)
                        this.labels[0] = {text: "0", type:"slim", side: "left"}
                }
            }
            this.scaledMargin = max/labelCount
        }

        return this
    },

    addScaleLabel: function(v, type){        
        var l = v
        var text = v.toFixed(this.precision) 

        if (type == "linearScale"){

            l = v.toFixed(this.precision) 
            if (l == 0){    
                l = "0"
                v = 0
            }
                
            if (this.scale.display == "percent"){
                var percent_precision = this.precision - 2
                if (percent_precision < 0) percent_precision = 0
                text = (v*100).toFixed(percent_precision) + "%"
            }

            if (typeof this.scale.display === "function")
                text = this.scale.display(v)
        }

        if (type == "logScale"){
            
            l = v.toFixed(nice_number_digits(v, 1))
            if (l == 0){    
                l = "0"
                v = 0
            }

            text = (v).toFixed(nice_number_digits(v, 1))

            if (this.scale.display == "percent")
                text = (v*100).toFixed(nice_number_digits(v*100, 1)) + "%"
            
            if (typeof this.scale.display === "function")
                text = this.scale.display(v)   
        }
        this.labels[l+"_l"] = {text: text, type: type}
    },

    sorted_keys: function(){
        var sorted_keys = []
        var keys = Object.keys(this.labels).slice()

        var tmp = []
        for (var k in keys)
            if (this.labels[keys[k]].side == "left")  
                tmp.push(keys[k])
        this.sort_keys(tmp)
        sorted_keys = sorted_keys.concat(tmp)

        tmp = []
        for (k in keys)
            if (!("side" in this.labels[keys[k]])   &&
            this.labels[keys[k]].type != "logScale" &&
            this.labels[keys[k]].type != "linearScale" ) 
                tmp.push(keys[k])
        this.sort_keys(tmp)
        sorted_keys = sorted_keys.concat(tmp)

        for (k in keys)
        if (!("side" in this.labels[keys[k]])   &&
        this.labels[keys[k]].type == "logScale" ||
        this.labels[keys[k]].type == "linearScale" ) 
            sorted_keys.push(keys[k])

        tmp = []
        for (k in keys)
            if (this.labels[keys[k]].side == "right")  
                tmp.push(keys[k])
        this.sort_keys(tmp)
        sorted_keys = sorted_keys.concat(tmp)

        return sorted_keys
    },

    sort_keys : function (array){
        if (typeof this.sort == "undefined"){
            array.sort()
            return
        }

        if (typeof this.sort == "function"){
            array.sort(this.sort)
            return
        }

        if (typeof this.sort == "string"){
            if (this.sort == "alphabetical")
                array.sort()
            else if (this.sort == "reverse_alphabetical")
                array.sort().reverse()
            
            return
        }

        if (this.sort)
            array.sort()

        return
    },

    compute_relative_positions: function(){
        var keys = Object.keys(this.labels).slice()

        //autocomplete labelType
        for (var k in keys)
            if (!("type" in this.labels[keys[k]])) 
                this.labels[keys[k]].type = "default"

        //sort keys
        keys = this.sorted_keys()

        var rpos = 0
        for (k in keys){
            var l = this.labels[keys[k]]

            //label relative positions
            l.relative_start_pos = rpos

            if (k==0 && this.scale && 
                (this.scale.nice_min_label == keys[k] ||
                 this.scale.nice_max_label == keys[k] ))
                rpos += 0
            else
                rpos += this.marginLeft(l.type)
            
            l.relative_position = rpos

            if (k==keys.length-1 && !("sub" in l) && this.scale && 
                (this.scale.nice_min_label == keys[k] ||
                 this.scale.nice_max_label == keys[k]))
                    rpos += 0
                else
                    rpos += this.marginRight(l.type)

            l.relative_stop_pos = rpos
        }

        this.compute_sublabel_relative_position()

        return this
    },

    compute_sublabel_relative_position: function(){
        var keys = Object.keys(this.labels).slice()

        for (var k in keys){
            var l = this.labels[keys[k]]

            if ("sub" in l){
                var rpos = 0
                var keys2 = Object.keys(l.sub)
                var l2

                for (var k2 in keys2){
                    l2 = this.labels[keys[k]].sub[keys2[k2]]
                    if (!("type" in l2)) l2.type = "subline"

                    //sublabel relative positions with other sublabels
                    l2.relative_start_pos = rpos
                    rpos += this.marginLeft(l.type)
                    l2.relative_position = rpos
                    rpos += this.marginRight(l.type)
                    l2.relative_stop_pos = rpos
                }

                for (k2 in keys2){
                    l2 = this.labels[keys[k]].sub[keys2[k2]]

                    //add sublabel to labellist
                    this.labels[keys2[k2]] = l2
                    
                    //sublabel relative positions with other labels
                    var width = l.relative_stop_pos - l.relative_start_pos
                    l2.relative_start_pos = l.relative_start_pos + (l2.relative_start_pos/rpos)*width
                    l2.relative_position  = l.relative_start_pos + (l2.relative_position /rpos)*width
                    l2.relative_stop_pos  = l.relative_start_pos + (l2.relative_stop_pos /rpos)*width
                } 
            }
        }
        return this
    },

    compute_positions: function(){
        keys = Object.keys(this.labels)

        var maxrpos = 0
        for (var k in keys)
            if (this.labels[keys[k]].relative_stop_pos > maxrpos)
                maxrpos = this.labels[keys[k]].relative_stop_pos

        for (k in keys){
            this.labels[keys[k]].position       = this.labels[keys[k]].relative_position /maxrpos
            this.labels[keys[k]].start_position = this.labels[keys[k]].relative_start_pos/maxrpos
            this.labels[keys[k]].stop_position  = this.labels[keys[k]].relative_stop_pos /maxrpos
        }

        if (this.scale){
            if (this.scale.mode == "linear"){
                this.scale.domain = [this.scale.nice_min, this.scale.nice_max]
                this.scale.range  = [Math.min(this.labels[this.scale.nice_min_label].position,
                                              this.labels[this.scale.nice_max_label].position),
                                     Math.max(this.labels[this.scale.nice_min_label].position,
                                              this.labels[this.scale.nice_max_label].position)]

                this.scale.fct = d3.scaleLinear()
                    .domain(this.scale.domain)
                    .range(this.scale.range);

            }else if (this.scale.mode == "log"){
                this.scale.domain = [this.scale.nice_min, this.scale.nice_max]
                this.scale.range  = [this.labels[this.scale.nice_min_label].position,
                                     this.labels[this.scale.nice_max_label].position]

                this.scale.fct = d3.scaleLog()
                    .domain(this.scale.domain)
                    .range(this.scale.range);
            }
        }

        for (k in keys)
            this.labels[keys[k]].id = keys[k]
        
        return this
    },

    marginLeft: function(labelType){
        if (!AXIS_LABEL[labelType])
            return 1

        if (AXIS_LABEL[labelType].margin_left == "auto")
            if (this.scaledMargin)
                return this.scaledMargin
            else
                return 1

        return AXIS_LABEL[labelType].margin_left
    },

    marginRight: function(labelType){
        if (!AXIS_LABEL[labelType])
            return 1

        if (AXIS_LABEL[labelType].margin_right == "auto")
            if (this.scaledMargin)
                return this.scaledMargin
            else
                return 1
        
        return AXIS_LABEL[labelType].margin_right
    },

    computeBar: function(clones, step){
        if (typeof step == "undefined")
            step = 1

        this.bar_width = 0
        if (this.scale)
            this.bar_width = 0.8 * Math.abs(this.getValuePos(this.scale.nice_min) - this.getValuePos(this.scale.nice_min+step))

        this.bar = { }

        for (var c in clones){
            var cloneID = clones[c]
            var clone = m.clone(cloneID)

            if (clone.isInScatterplot() &&
                (this.germline == "multi" || this.germline == clone.germline)){
                var v = this.fct(clone)
                
                if (!(v in this.labels) && isNaN(v)) continue

                var width = this.bar_width              
                if (typeof v == "number")
                    v = v - v%step
                else if (v in this.labels && this.bar_width == 0)
                    width = 0.8 * (this.labels[v].stop_position - this.labels[v].start_position)
                    
                
                if (!this.bar[v]) this.bar[v] = {clones:[], sum: 0, value: v, width: width}
                var s = clone.getSize()
                this.bar[v].clones.push({id: cloneID, size:s, top:clone.top}) 
                this.bar[v].sum += s               
            }
        }

        //compute barmax
        this.barMax = 0
        for (var l in this.bar)
        if (this.bar[l].sum > this.barMax) this.barMax = this.bar[l].sum 

        //sort clones
        for (var l2 in this.bar)
            this.bar[l2].clones.sort(function(a,b){
                if (a.top == 0) return 1
                if (b.top == 0) return -1
                return a.top - b.top
            })

        //compute height
        for (var l3 in this.bar){
            var bar = this.bar[l3]
            var h = 0
            for (var i=0; i<bar.clones.length; i++){
                bar.clones[i].start = h
                h += bar.clones[i].size
                bar.clones[i].stop = h
            }
        }
        return this
    },

    getBar: function(){
        if (typeof this.bar == "undefined")
            this.computeBar() 
        return this.bar
    },





    /**
     * 
     */

    //return position of a given clone
    getPos: function(clone) {
        var v = this.fct(clone)

        return this.getValuePos(v)
    },

    //return position of a given value
    getValuePos: function(v){
        //discret value
        if (v in this.labels) 
            return this.labels[v].position

        //continuous value
        if (this.scale && typeof v == "number" && !isNaN(v))
            return this.scale.fct(v) 

        return undefined
    },

    getColor: function(clone) {
        var v = this.fct(clone)

        if (v in this.labels && this.labels[v].color)
            if (this.labels[v].color === "") 
                return undefined
            else
                return this.labels[v].color

        var pos = this.getValuePos(v)
        if (pos === undefined) return undefined
        
        if (this.color){
            var offset = 0
            if (this.color.offset) offset = this.color.offset
            return this.color.fct((pos+offset)%1)
        }
        return oldColorGenerator(pos)
    },

    getLabelInfo: function(label) {
        var l = this.labels[label]
        if (l.info) return l.info 

        l.info = { 
            clones: [],
            sorted_clones : [],
        }

        for (var cloneID in m.clones){
            var clone = m.clone(cloneID)

            if (clone.isInScatterplot() && 
                (this.germline == "multi" || this.germline == clone.germline)){
                var v = this.fct(clone)
                var pos = this.getValuePos(v)

                if (pos > l.start_position && pos < l.stop_position){
                    l.info.clones.push(cloneID)
                    if (typeof v == "number"){
                        l.info.sorted_clones.push({id: cloneID, v: v})
                    }
                }
            }
        }

        l.info.sorted_clones.sort(function(a,b){return b.v - a.v})

        return l.info
    },

    getMax: function(){
        var max = 0
        for (var l in this.labels){
            var labelSum = this.getLabelInfo(l).sum
            if (labelSum > max) max = labelSum
        }
        return max
    },

};