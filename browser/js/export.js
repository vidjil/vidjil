
function Report() {
}

Report.prototype = {
    
    reportHTML : function() {
        var self = this
        
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
        var list = m.getSelected()
        if (list.length==0) list = this.defaultList()
            
        this.w.onload = function(){
            self.info()
                .normalizeInfo(list)
                .addGraph(list)
                .readsStat()
                .addScatterplot()
        }
    },
    
    reportHTMLdiag : function() {
        var self = this
        
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
        var list = m.getSelected()
        if (list.length==0) list = this.defaultList()
            
        this.w.onload = function(){
            self.info()
                .sampleInfo(m.t)
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
    
    //add a new container to the html report 
    container : function(title) {
        var container = $('<div/>', {
            class: 'container'
        }).appendTo(this.w.document.body);
        
        $('<h3/>', {
            text: title
        }).appendTo(container);
        
        return container
    },
    
    info : function() {
        var info = this.container("Report info")
        
        var left = $('<div/>', {class: 'flex'}).appendTo(info);
        
        var date = new Date;
        var timestamp = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() 
        
        var label = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case label', text : "Filename:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Report date:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Soft version:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Run date:" }).appendTo(label);
        
        var value = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case', text : m.dataFileName }).appendTo(value);
        $('<div/>', {class: 'case', text : timestamp}).appendTo(value);
        $('<div/>', {class: 'case', text : "vidjil version" }).appendTo(value);
        $('<div/>', {class: 'case', text : m.timestamp[0].split(" ")[0] }).appendTo(value);
        
        var note = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case label', text : "User note" }).appendTo(note);
        $('<div/>', {class: 'note', text : m.info }).appendTo(note);
        
        return this
    },
    
    sampleInfo : function(time) {
        var sinfo = this.container("Sample info ("+m.getStrTime(time)+")")
        
        var left = $('<div/>', {class: 'flex'}).appendTo(sinfo);
        
        var label = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case label', text : "Filename:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Sample date:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Soft version:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Command:" }).appendTo(label);
        $('<div/>', {class: 'case label', text : "Run date:" }).appendTo(label);
        
        var value = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case', text : m.samples.original_names[time]}).appendTo(value);
        $('<div/>', {class: 'case', text : m.samples.timestamp[time]}).appendTo(value);
        $('<div/>', {class: 'case', text : ""}).appendTo(value);
        $('<div/>', {class: 'case', text : ""}).appendTo(value);
        $('<div/>', {class: 'case', text : ""}).appendTo(value);
        
        var note = $('<div/>', {class: 'float-left'}).appendTo(left);
        $('<div/>', {class: 'case label', text : "User note" }).appendTo(note);
        $('<div/>', {class: 'note', text : m.samples.info[time] }).appendTo(note);
        
        return this
        
    },
    
    svg_graph : function(list, norm) {
        if (typeof norm == "undefined") norm = -1
        var svg_graph = document.getElementById(graph.id+"_svg").cloneNode(true);
        svg_graph.setAttribute("viewBox","0 0 "+svg_graph.getAttribute("width")+" "+svg_graph.getAttribute("height"));
        
        for (var i = 0; i < m.clones.length; i++) {
            var polyline = svg_graph.querySelectorAll('[id="polyline'+i+'"]')[0]
            var tag = m.clone(i).getTag()
            var color = tagColor[tag]
            
            if (i == norm) {
                polyline.setAttribute("style", "stroke-width:12px");
            }else if (list.indexOf(i) != -1){
                polyline.setAttribute("style", "stroke-width:3px");
            }else if (tag != 8){
                polyline.setAttribute("style", "stroke-width:1.5px");
            }else{
                polyline.setAttribute("style", "stroke-width:0.5px; opacity:0.5");
            }
            polyline.setAttribute("stroke", color);
            
            //remove "other" and disabled clones
            if (i != norm && (m.clone(i).id == "other" || !m.clone(i).isActive())) {
                polyline.parentNode.removeChild(polyline);
            }
        }
            
        return svg_graph
    },
    
    addGraph : function(list) {
        
        //resize 791px ~> 21cm
        graph.resize(791,300)
        graph.draw(0)
        
        var w_graph = this.container("Monitoring")
        w_graph.addClass("graph");
        
        var svg_graph = this.svg_graph(list)
        
        w_graph.append(svg_graph)
        graph.resize();
        
        return this;
    },
    
    normalizeInfo: function (list) {
        if (m.norm){
            var container = this.container("Normalization")
            var norm_id = m.normalization.id
            var norm_value = m.normalization.B
            
            m.compute_normalization(-1)
            graph.resize(791,300)
            graph.draw(0)
            var svg_graph = this.svg_graph(list, norm_id)
            svg_graph.setAttribute("width", "395px")
            svg_graph.setAttribute("height", "150px")
            container.append(svg_graph)
            
            m.compute_normalization(norm_id, norm_value)
            graph.resize(791,300)
            graph.draw(0)
            var svg_graph = this.svg_graph(list, norm_id)
            svg_graph.setAttribute("width", "395px")
            svg_graph.setAttribute("height", "150px")
            container.append(svg_graph)
            
            graph.resize();
        }
        
        return this
    },
    
    addScatterplot : function(system, time) {
        if (typeof system == "undefined") system = m.germlineV.system
        if (typeof time != "undefined") m.changeTime(time)
            
        m.changeGermline(system)
        sp.changeSplitMethod('gene_v', 'gene_j')
        
        //resize 791px ~> 21cm
        sp.resize(791,250)
        sp.fastForward()
        
        var w_sp = this.container(system + ' System for timepoint ' + m.getStrTime(m.t))
        w_sp.addClass("scatterplot");
        
        var svg_sp = document.getElementById(sp.id+"_svg").cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.setAttribute("viewBox","0 0 791 250");
        
        for (var i = 0; i < m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="circle'+i+'"]')[0]
            var color = tagColor[m.clone(i).getTag()]
            circle.setAttribute("stroke", color);
            
            //remove "other" and disabled clones
            if (m.clone(i).germline != system || m.clone(i).id == "other" || !m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        w_sp.append(svg_sp)
        sp.resize();

    },
    
    readsStat: function() {
        var container = this.container('Reads statistics')
        
        var reads_stats = $('<div/>', {class: 'flex'}).appendTo(container);
        
        var head = $('<div/>', {class: 'float-left'}).appendTo(reads_stats);
        $('<div/>', {class: 'case', text : ' '}).appendTo(head);
        $('<div/>', {class: 'case', text : 'total'}).appendTo(head);
        $('<div/>', {class: 'case', text : 'segmented'}).appendTo(head);
        
        if (m.system_available.length>1){
            for (var i=0; i<m.system_selected.length; i++){
                var system = m.system_selected[i]
                var system_label = $('<div/>', {class: 'case', text : system}).appendTo(head);
                $('<span/>', {class: 'system_colorbox', style:'background-color:'+m.germlineList.getColor(system)}).appendTo(system_label);
            }
        }
        
        for (var i=0; i<m.samples.order.length; i++){
            var time = m.samples.order[i]
            
            var box = $('<div/>', {class: 'float-left'})
            $('<div/>', {class: 'case centered', text : m.getStrTime(time)}).appendTo(box);
            $('<div/>', {class: 'case centered', text : m.toStringThousands(m.reads.total[time])}).appendTo(box);
            
            var segmented = ((m.reads.segmented[time]/m.reads.total[time])*100).toFixed(0) + "%"
            var seg_box = $('<div/>', {class: 'case centered', text : segmented}).appendTo(box);
            $('<div/>', {class: 'background1'}).appendTo(seg_box);
            $('<div/>', {class: 'background2', style: 'width:'+segmented}).appendTo(seg_box);
            
            if (m.system_available.length>1){
                var pie = $('<div/>').appendTo(box);
                
                var pie_label = $('<div/>', {class: 'left'}).appendTo(pie);
                for (var j=0; j<m.system_selected.length; j++){
                    var system = m.system_selected[j]
                    var value = ((m.systemSize(system,time))*100).toFixed(0) + "%"
                    $('<div/>', {class: 'case', text : value}).appendTo(pie_label);
                }
                
                var pie_chart = $('<div/>', {class: 'left'}).appendTo(pie)
                var p = this.systemPie(time)
                p.setAttribute('style','margin:5px')
                pie_chart.append(p)
            }
            
            box.appendTo(reads_stats);
        }
        
        return this;
    },
    
    systemPie: function(time) {
        if (typeof time == "undefined") time = m.t
        var radius = 40
        var pie = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        pie.setAttribute("viewbox","0 0 100 100");
        pie.setAttribute("width",(radius*2)+"px");
        pie.setAttribute("height",(radius*2)+"px");
        
        var start = 0
        for (var i=0; i<m.system_selected.length; i++){
            var system = m.system_selected[i]
            var value = m.systemSize(system,time)
            var angle = Math.PI*2*(value)
            var stop = start+angle
            
            if (value <1){
                var slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    
                var x1 = radius * Math.sin(start);
                var y1 = -radius * Math.cos(start);
                var x2 = radius * Math.sin(stop);
                var y2 = -radius * Math.cos(stop);
                
                var longArc = (stop-start <= Math.PI) ? 0 : 1;
                
                //d is a string that describes the path of the slice.
                var d = " M " + radius + " " + radius + " L " + (radius + x1) + " " + (radius + y1) + 
                        " A " + radius + " " + radius + " 0 "+longArc+" 1 " + (radius + x2) + " " + (radius + y2) + 
                        " z ";       
                slice.setAttribute('d', d);
                slice.setAttribute('fill', m.germlineList.getColor(system));
                pie.appendChild(slice)
            }else{
                var slice = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    
                slice.setAttribute('r', radius)
                slice.setAttribute('cx', radius)
                slice.setAttribute('cy', radius)
                slice.setAttribute('fill', m.germlineList.getColor(system));
                pie.appendChild(slice)
            }
            
            var start = stop;
        }

        return pie
    }
    
}

