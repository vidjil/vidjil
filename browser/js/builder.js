

function Builder(model){
    this.m=model;           //Model utilisé
    this.m.view.push(this); //synchronisation au Model
    
    var drag_separator = false
}

Builder.prototype = {
  
    init : function(){
        var self = this;
        
        d3.select("#visu-separator").on("mousedown", function(){self.dragSeparator();})
        d3.select("#visu-container").on("mouseup", function(){self.dropSeparator()})
        d3.select("#visu-container").on("mousemove", function(){self.updateSeparator()})
        
    },

    update : function(){
    },

    updateElem : function(){
    },
    
    resize : function(){
    },
    
    dragSeparator : function(){
        this.drag_separator = true;
        console.log("drag");
    },
    
    updateSeparator : function(){
        if (this.drag_separator){
            var coordinates = [0, 0];
            coordinates = d3.mouse(d3.select("#visu-container").node());
            
            var position = coordinates[1]
            var total_height = document.getElementById("visu-container").offsetHeight;
            
            var height2 = position/total_height * 100 

            if (height2 > 95) height2=99;
            if (height2 < 5) height2=0;
                
            var height1 = 100 - height2
            
            document.getElementById("visu").style.height = height1 + "%"
            document.getElementById("visu2").style.height = height2 + "%"
            
            console.log("update");
        }
    },
    
    dropSeparator : function(){
        if (this.drag_separator){
            this.m.resize();
            this.drag_separator = false;
            console.log("drop");
        }
    }
  
}