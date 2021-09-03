function Color(model) {
    this.m = model
    this.axis = new Axis("Tag").compute(100)
    this.init()
}
    
Color.prototype = {

    init: function(){
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
                if (this.axis.name == axisP.name) element.selected = true;

                this.select_color.appendChild(element);
            }
        }

        this.select_color.onchange = function() {
            var elem = self.select_color;
            self.set(elem.value, true, true);
        }
    },

    update: function(){
        this.axis.reload().compute(100);
    },

    set: function(axis_name, update, save) {
        update = (update==undefined) ? true : update;

        if (this.localStorage && save) localStorage.setItem('colorAxis', axis_name)

        if (typeof this.axis == "undefined" || this.axis.name != axis_name)
            this.axis = new Axis(axis_name).compute(100);

        if (!update) return 

        this.m.updateStyle()
    }
}