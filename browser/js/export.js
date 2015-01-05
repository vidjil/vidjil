

function startReport() {
    
    var w = window.open("report.html", "_blank", "selected=no");
    
    w.onload = function(){
        $('<hr/>').appendTo(w.document.body);
        
        //resize 791px ~> 21cm
        graph.resize(791,300)
        
        //add graph container now
        var w_graph = $('<div/>', {
            id: 'graph',
            class: 'container'
        }).appendTo(w.document.body);
        
        //but complete it asynchronously
        setTimeout(function(){
            svg_graph = document.getElementById(graph.id).cloneNode(true);
            
            for (var i = 0; i < this.m.clones.length; i++) {
                var polyline = svg_graph.querySelectorAll('[id="polyline'+i+'"]')[0]
                var color = tagColor[this.m.clone(i).getTag()]
                
                //stack
                if (polyline.getAttribute("d").indexOf("Z") != -1){
                    polyline.setAttribute("style", "stroke-width:0px");
                    polyline.setAttribute("fill", color);
                }else{//line
                    polyline.setAttribute("style", "stroke-width:1px");
                    polyline.setAttribute("stroke", color);
                }
                
                //remove "other" and disabled clones
                if (m.clone(i).id == "other" || !m.clone(i).isActive()) {
                    polyline.parentNode.removeChild(polyline);
                }
            }
            
            w_graph.html(svg_graph.innerHTML)
            graph.resize();
        },500)
        
    }
}
