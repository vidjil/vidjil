
function Report() {
}

Report.prototype = {
    
    reportHTML : function() {
        var self = this
        
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
        var list = m.getSelected()
        if (list.length==0) list = this.defaultList()
            
        this.w.onload = function(){
            self.addGraph(list)
                .addScatterplot()

        }
    },
    
    reportHTMLdiag : function() {
        var self = this
        
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
        var list = m.getSelected()
        if (list.length==0) list = this.defaultList()
            
        this.w.onload = function(){
            for (var i=0; i<m.system_selected.length; i++){
                var system = m.system_selected[i]
                self.addScatterplot(system, m.t)
            }
        }
    },
    
    defaultList: function() {
        var list = []
        
        var tag=0
        while (tag < 8 && list.length < 5) {
            for (var i = 0; i < m.clones.length; i++) {
                var clone_tag = m.clone(i).getTag()
                if (clone_tag == tag && m.clone(i).isActive) list.push(i)
            }
            tag++
        }
        return list
    },
    
    addGraph : function(list) {
        
        $('<hr/>').appendTo(this.w.document.body);
        $('<h3/>', {
            text: "Monitoring"
        }).appendTo(this.w.document.body);
        
        //resize 791px ~> 21cm
        graph.resize(791,300)
        graph.draw(0)
        
        //add graph container now
        var w_graph = $('<div/>', {
            id: 'graph',
            class: 'container'
        }).appendTo(this.w.document.body);
        
        svg_graph = document.getElementById(graph.id).cloneNode(true);
        
        for (var i = 0; i < m.clones.length; i++) {
            var polyline = svg_graph.querySelectorAll('[id="polyline'+i+'"]')[0]
            var tag = m.clone(i).getTag()
            var color = tagColor[tag]
            
            //stack
            if (polyline.getAttribute("d").indexOf("Z") != -1){
                polyline.setAttribute("style", "stroke-width:0px");
                polyline.setAttribute("fill", color);
            }else{//line
                if (list.indexOf(i) != -1){
                    polyline.setAttribute("style", "stroke-width:3px");
                }else if (tag != 8){
                    polyline.setAttribute("style", "stroke-width:1.5px");
                }else{
                    polyline.setAttribute("style", "stroke-width:0.5px; opacity:0.5");
                }
                polyline.setAttribute("stroke", color);
            }
            
            //remove "other" and disabled clones
            if (m.clone(i).id == "other" || !m.clone(i).isActive()) {
                polyline.parentNode.removeChild(polyline);
            }
        }
        
        w_graph.html(svg_graph.innerHTML)
        graph.resize();

        
        return this;
    },
    
    addScatterplot : function(system, time) {
        if (typeof system == "undefined") system = m.germlineV.system
        m.changeGermline(system)
        if (typeof time != "undefined") m.changeTime(time)
        
            
        $('<hr/>').appendTo(this.w.document.body);
        $('<h3/>', {
            text: system + ' system for timepoint ' + m.getStrTime(m.t)
        }).appendTo(this.w.document.body);
    
        //resize 791px ~> 21cm
        sp.resize(791,250)
        sp.fastForward()
        
        var w_sp = $('<div/>', {
            id: 'scatterplot',
            class: 'container'
        }).appendTo(this.w.document.body);
        
        svg_sp = document.getElementById(sp.id).cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.querySelectorAll('[id="'+sp.id+'_svg"]')[0].setAttribute("viewbox","0 0 791 250");
        
        
        for (var i = 0; i < m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="circle'+i+'"]')[0]
            var color = tagColor[m.clone(i).getTag()]
            circle.setAttribute("stroke", color);
            
            //remove "other" and disabled clones
            if (m.clone(i).germline != system || m.clone(i).id == "other" || !m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        w_sp.html(svg_sp.innerHTML)
        sp.resize();

    }
    
}

