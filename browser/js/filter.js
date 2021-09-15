function Filter(model) {
    this.m = model
    this.init()
}
    
Filter.prototype = {

    init: function(){
        if (!this.filters) this.filters = [{ axis:      "Top",
                                            operator:   ">",
                                            value:      50}]
        if (!this.stamp) this.stamp=0; 

    },

    // build or rebuild html component found in dom related to filter
    update: function(){
        var self = this
         
        // compute min/max slider values
        var max_top = 0;
        for (var j = 0; j < this.m.clones.length; j++) 
            if (this.m.clone(j).top > max_top)
                max_top = this.m.clone(j).top
        max_top = (Math.ceil(max_top / 5)) * 5
        
        // init slider
        var top_slider = document.getElementById("top_slider")
        if (top_slider) 
            top_slider.max = ""+max_top;
        
        // update slider
        var topFilterId = this.check("Top", ">", undefined)
        if (topFilterId >= 0){
    
            var top = this.filters[topFilterId].value
            if (top_slider) 
                top_slider.value = top;

            var html_label = document.getElementById('top_label');
            if (html_label !== null) {
                var count = 0;
                for (var c=0; c<this.m.clones.length; c++)
                    if (this.m.clone(c).top <= top && this.m.clone(c).hasSizeConstant()) 
                        count++;
                html_label.innerHTML = count + ' clones (top ' + top + ')' ;
            }
        }

        //filter list
        var filter_list = document.getElementById("filter_list")
        if (filter_list){
            filter_list.innerHTML="";

            for (var i=0; i<this.filters.length; i++){
                if (i == this.check("Size", "=", 0)) continue
                if (i == this.check("Top", ">")) continue
                var f = this.filters[i]
                var div =this.build_filter_div(f)
                filter_list.appendChild(div)
            }

        }
            
        // update switch onlyOneSample
        var onlyOneSample = document.getElementById("filter_switch_sample_check")
        if (onlyOneSample)
            onlyOneSample.checked = (this.check("Size", "=", 0) != -1)
    },

    build_filter_div: function(f){
        var text = ""
        var title = ""
        switch (f.operator) {
            case "=":
            case ">":
            case "<":
                text += f.axis + " " + f.operator + " "+ f.value
                title += "pouet!"
                break;
            case "focus":
                text += "Focus on "+f.value.length+" Clones"
                title += "Remove all Clones not in this list of user's selected clones (" +f.value.join() + ")"
                break;
            case "hide":
                text += "Hide "+f.value.length+" Clones"
                title += "Clones have been selected by user to be hidden (" +f.value.join() + ")"
                break;
            case "search":
                text += "Search for '"+f.value+"'"
                title += "This filter will search for clones containing '"+f.value+"'in it's sequence, reverse sequence or common properties ()"
                break;
            default:
                break;
        }


        var div = document.createElement('div')
        var spanText = document.createElement('span')
        var spanButton = document.createElement('span')
        spanText.appendChild(document.createTextNode(text))
        spanText.title = title
        spanButton.appendChild(icon('icon-cancel', ''));
        spanButton.className = "button"
        spanButton.onclick = function () {
            m.filter.remove(f.axis, f.operator)
        };
        div.appendChild(spanText)
        div.appendChild(spanButton)

        return div
    },



    // generic method to filter out specific clone
    // axis_name : see axis_conf for available axis
    // operator "=" / ">" / "<" / "focus" / "hide" / "search"
    add: function(axis_name, operator ,value){

        // new "search" / "<" / ">" filter always replace previous one
        if (operator == "search" || operator == ">"  || operator == "<" ){
            filterID = this.check(axis_name, operator ,undefined)
            if (filterID != -1){
                this.removeById(filterID)
                this.add(axis_name, operator ,value);
                return
            }
        }

        // new "focus" and "hide" filter are combined with existing one
        if (operator == "focus" || operator == "hide" ){
            filterID = this.check(axis_name, operator ,undefined)
            if (filterID != -1){
                var v2 = this.filters[filterID].value.concat(value)
                this.removeById(filterID)
                this.add(axis_name, operator ,v2);
                return
            }
        }

        this.filters.push({ axis:       axis_name,
                            operator:   operator,
                            value:      value});
        this.stamp++
        this.m.update()
    },

    remove: function (axis_name, operator ,value){
        var index = this.check(axis_name, operator ,value)
        if (index > -1) 
            this.removeById(index)
    },

    removeById: function (index){
        if (index > -1) 
            this.filters.splice(index, 1)
        this.stamp++
        this.m.update()
    },

    toggle: function(axis_name, operator ,value){
        var index = this.check(axis_name, operator ,value)
        if (index >= 0)
            this.removeById(index)
        else
            this.add(axis_name, operator ,value)
    },

    increase: function(axis_name, operator ,inc){
        var index = this.check(axis_name, operator , undefined)
        if (index < 0) return
        this.filters[index].value += inc
        this.stamp++
        this.m.update()
    },

    decrease: function(axis_name, operator ,dec){
        var index = this.check(axis_name, operator ,undefined)
        if (index < 0) return
        this.filters[index].value -= dec
        this.stamp++
        this.m.update()
    },

    //return index of filter id if exist, return -1 otherwise
    check: function(axis_name, operator ,value){
        for(var i=0; i<this.filters.length; i++)
            if (this.filters[i].axis == axis_name && 
                this.filters[i].operator == operator &&
                (   typeof value == "undefined" ||
                    this.filters[i].value == value ))
                return i
        
        return -1
    },

    reset: function(){
        this.filters = [{   axis:      "Top",
                            operator:   ">",
                            value:      50}]
        this.stamp++
        this.m.update()
    },

    apply : function(){
        for (var i=0; i<this.filters.length; i++){
            for (var j=0; j<this.m.clones.length; j++){
                try {
                    var c = this.m.clone(j);
                    var f = this.filters[i]
                    var a = Axis.prototype.getAxisProperties(f.axis)
                    switch (f.operator) {
                        case "=":
                            if (!c.active) break;
                            if (a.fct(c) == f.value) c.disable()
                            break;
                        case ">":
                            if (!c.active) break;
                            if (a.fct(c) > f.value) c.disable()
                            break;
                        case "<":
                            if (!c.active) break;
                            if (a.fct(c) < f.value) c.disable()
                            break;
                        case "focus":
                            if (!c.active) break;
                            if (f.value.indexOf(a.fct(c)) == -1){ 
                                c.disable()
                                c.hide()
                            }
                            break;
                        case "hide":
                            if (!c.active) break;
                            if (f.value.indexOf(a.fct(c)) != -1) {
                                c.disable()
                                c.hide()
                            }
                            break;
                        case "search":
                            if (!c.active) break;
                            if (!c.search(f.value))  {
                                c.disable()
                                c.hide()
                            }
                            break;
                        default:
                            break;
                    }
                } catch (e) {}
            }
        }
    },

    // return the list of clones currently filtered
    filtered: function (){
        var list = [];
        for (var j=0; j<this.m.clones.length; j++)
            if (!this.m.clone(j).isActive()) list.push(this.m.clone(j).index) 
        
        return list
    },

    // return the list of clones currently visible
    visible: function (){
        var list = [];
        for (var j=0; j<this.m.clones.length; j++)
            if (this.m.clone(j).isActive()) list.push(this.m.clone(j).index) 
        
        return list
    },

    // return the list of clones that will be impacted by a given filter
    filteredBy: function (axis_name, operator ,value){
        var a = Axis.prototype.getAxisProperties(axis_name)
        var list = [];
        for (var j=0; j<this.m.clones.length; j++){
            try {
                var c = this.m.clone(j);
                switch (operator) {
                    case "=":
                        if (a.fct(c) == value) list.push(c.index)
                        break;
                    case ">":
                        if (a.fct(c) > value) list.push(c.index)
                        break;
                    case "<":
                        if (a.fct(c) < value) list.push(c.index)
                        break;
                    case "focus":
                        if (value.indexOf(a.fct(c)) == -1) list.push(c.index)
                        break;
                    case "hide":
                        if (value.indexOf(a.fct(c)) != -1) list.push(c.index)
                        break;
                    case "search":
                        if (!c.search(value)) list.push(c.index)
                        break;
                    default:
                        break;
                }
            } catch (e) {}
        }
        return list
    }
    
}
