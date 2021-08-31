/** Model_loader constructor <br>
 * extend the object "model" with color related functions
 * */
function Model_color() {

}
    
Model_color.prototype = {

    initColorSelector: function(){
        var self = this;

        //reset color menu content
        $("#color_menu_select").empty();

        //store color_menu location
        this.select_color = $("#color_menu_select")[0];

        //abort init if color_menu does not exist on this page (test page / segmenter page)
        if (typeof this.select_color == "undefined") return;

        var available_axis = AXIS_COLOR
        for (var key in available_axis) {
            var axisP = Axis.prototype.getAxisProperties(available_axis[key])
            if (typeof axisP.hide == "undefined" || !axisP.hide){

                var element;
                element = document.createElement("option");
                element.setAttribute('value', axisP.name);
                element.appendChild(document.createTextNode( axisP.name));
                if (m.axisColor.name == axisP.name) element.selected = true;

                this.select_color.appendChild(element);
            }
        }

        this.select_color.onchange = function() {
            var elem = self.select_color;
            self.changeColorAxis(elem.value, true, true);
        }
    },

    changeColorAxis: function(axis_name, update, save) {
        update = (update==undefined) ? true : update;

        if (this.localStorage && save) localStorage.setItem('colorAxis', axis_name)
        
        if (this.selectAxis) this.selectAxis.value = axis_name

        if (typeof this.axisColor == "undefined" || this.axisColor.name != axis_name)
            this.axisColor = new Axis(axis_name).compute(100);

        if (!update) return 

        var list = []
        for (var i = 0; i<this.clones.length; i++) list.push(i)
        this.updateElemStyle(list)

        console.log("!!!! changeColorAxis !!!!!")

    },

    // generic method to filter out specific clone
    // axis_name : see axis_conf for available axis
    // operator "=" / ">" / "<"
    addFilter: function(axis_name, operator ,value){
        this.initFilter()
        this.filters.push({ axis:       axis_name,
                            operator:   operator,
                            value:      value});
        this.filterStamp++
        this.updateStyle()
    },

    initFilter: function(){
        if (!this.filters) this.filters = []
        if (!this.filterStamp) this.filterStamp=0; 
    },

    removeFilter: function (index){
        this.initFilter()
        if (index > -1 & index < this.filters.length) 
            this.filters.splice(index, 1)
        this.filterStamp++
        this.updateStyle()
    },

    toggleFilter: function(axis_name, operator ,value){
        var index = this.checkFilter(axis_name, operator ,value)
        if (index >=0)
            this.removeFilter(index)
        else
            this.addFilter(axis_name, operator ,value)
    },

    //return index of filter id if exist, return 
    checkFilter: function(axis_name, operator ,value){
        this.initFilter()
        for(var i=0; i<this.filters.length; i++)
            if (this.filters[i].axis == axis_name && 
                this.filters[i].operator == operator && 
                this.filters[i].value == value)
                return i
        
        return -1
    },

    resetFilter: function(){
        this.filters = []
        this.filterStamp++
        this.updateStyle()
    },

    applyFilter : function(){
        if (!this.filters) return;

        for (var i=0; i<this.filters.length; i++){
            for (var j=0; j<this.clones.length; j++){
                try {
                    var c = this.clone(j);
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
                        case "=":
                            if (!c.active) break;
                            if (a.fct(c) < f.value) c.disable()
                            break;
                        default:
                            break;
                    }
                } catch (e) {}
            }
        }
    }
}