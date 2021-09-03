function Filter(model) {
    this.m = model
    this.init()
}
    
Filter.prototype = {

    init: function(){
        if (!this.filters) this.filters = []
        if (!this.stamp) this.stamp=0; 
    },


 // generic method to filter out specific clone
    // axis_name : see axis_conf for available axis
    // operator "=" / ">" / "<"
    add: function(axis_name, operator ,value){

        // new "search" filter always replace previous one
        if (operator == "search"){
            filterID = this.check(axis_name, operator ,value)
            if (filterID != -1){
                this.removeById(filterID)
                this.add(axis_name, operator ,value);
                return
            }
        }

        // "focus" and "hide" filter are combined with existing one
        if (operator == "focus" || operator == "hide" ){
            filterID = this.check(axis_name, operator ,value)
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
        if (index > -1 & index < this.filters.length) 
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

    //return index of filter id if exist, return -1 otherwise
    check: function(axis_name, operator ,value){
        for(var i=0; i<this.filters.length; i++)
            if (this.filters[i].axis == axis_name && 
                this.filters[i].operator == operator &&
                (   this.filters[i].operator == "focus" ||
                    this.filters[i].operator == "hide"  ||
                    this.filters[i].operator == "search"  ||
                    this.filters[i].value == value))
                return i
        
        return -1
    },

    reset: function(){
        this.filters = []
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
                            if (f.value.indexOf(a.fct(c)) == -1) c.disable()
                            break;
                        case "hide":
                            if (!c.active) break;
                            if (f.value.indexOf(a.fct(c)) != -1) c.disable()
                            break;
                        case "search":
                            if (!c.active) break;
                            if (!c.search(f.value)) c.disable()
                            break;
                        default:
                            break;
                    }
                } catch (e) {}
            }
        }
    }
}
