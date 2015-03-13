
function Report(model) {
    this.m = model
}

Report.prototype = {
    
    reportHTML : function() {
        this.m.wait("generating report : this operation can take a few seconds")
        
        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        this.list = this.m.getSelected()
        if (this.list.length==0) this.list = this.defaultList()
        
        var text = ""
        date_min = this.m.dateMin()
        date_max = this.m.dateMax()
        
        if (typeof this.m.patient_name != 'undefined')
            text += this.m.patient_name
        else
            text += this.m.dataFileName
        if (date_max != "0" && date_min != "0")
            text += " – " + date_min + " → " + date_max 
            
        this.w.onload = function(){
            self.w.document.title = text
            self.w.document.getElementById("header-title").innerHTML = text
            
            self.info()
                .normalizeInfo()
                .addGraph()
                .readsStat()
                .cloneList()
                
            self.m.resize()
            self.m.resume()
        }
    },
    
    reportHTMLdiag : function() {
        this.m.wait("generating report : this operation can take a few seconds")
        
        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        var text = ""
        if (typeof this.m.patient_name != 'undefined')
            text += this.m.patient_name
        else
            text += this.m.dataFileName
        text += " – "+ this.m.getStrTime(this.m.t, "name")
        if (typeof this.m.samples.timestamp != 'undefined') 
            text += " – "+this.m.samples.timestamp[this.m.t].split(" ")[0]
        
        this.list = this.m.getSelected()
        if (this.list.length==0) this.list = this.defaultList()
            
        this.w.onload = function(){
            self.w.document.title = text
            self.w.document.getElementById("header-title").innerHTML = text
            
            self.info()
                .sampleInfo(self.m.t)
                .readsStat(self.m.t)
            for (var i=0; i<self.m.system_selected.length; i++){
                var system = self.m.system_selected[i]
                self.addScatterplot(system, self.m.t)
            }
            
            self.m.resize()
            self.m.resume()
        }
    },
    
    defaultList: function() {
        var list = []
        
        //use taged clones 
        var tag=0
        while (tag < 8 && list.length < 5) {
            for (var i = 0; i < this.m.clones.length; i++) {
                var clone_tag = this.m.clone(i).getTag()
                if (clone_tag == tag && this.m.clone(i).isActive) list.push(i)
            }
            tag++
        }
        
        //add best two clones from each system
        if (list.length <5){
            for (var k=0; k<2; k++){
                for (var i=0; i<this.m.system_available.length; i++){
                    var system = this.m.system_available[i]
                    
                    var clone = -1
                    for (var j=0; j<this.m.clones.length; j++) {
                        if (list.indexOf(j)==-1 && this.m.clone(j).germline==system && 
                            (clone==-1 || this.m.clone(j).top < this.m.clone(clone).top ) ) clone=j
                    }
                    if (clone!=-1) list.push(clone)
                }
            }
        }
        return list
    },
    
    //add a new container to the html report 
    container : function(title) {
        var container = $('<div/>', {
            'class': 'container'
        }).appendTo(this.w.document.body);
        
        $('<h3/>', {
            'text': title
        }).appendTo(container);
        
        return container
    },
    
    info : function() {
        var info = this.container("Report info")
        var left = $('<div/>', {'class': 'flex'}).appendTo(info);
        
        var date = new Date;
        var report_timestamp = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() 
        
        var analysis_timestamp = "–"
        if (typeof this.m.analysis.timestamp != "undefined")
            analysis_timestamp = this.m.analysis.timestamp.split(" ")[0]
        if (this.m.analysisHasChanged) 
            analysis_timestamp = report_timestamp + " (not saved)"
        
        var content = [
            {'label': "Filename:" , 'value' : this.m.dataFileName },
            {'label': "Report date:"  , 'value' : report_timestamp},
            {'label': "Updated on:" , 'value' : analysis_timestamp},
            {'label': "Software used:" , 'value' : this.m.getSoftVersion()},
            {'label': "Analysis date:" , 'value' : "" }
        ]
        
        var table = $('<table/>', {'class': 'info-table float-left'}).appendTo(left);
        for ( var key in content ){
            var v = content[key]
            var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': v.label}).appendTo(row);
            $('<td/>', {'text': v.value}).appendTo(row);
        }
        
        var note = $('<div/>', {'class': 'float-left'}).appendTo(left);
        $('<div/>', {'class': 'case label', 'text' : "User note" }).appendTo(note);
        $('<div/>', {'class': 'note', 'text' : this.m.info }).appendTo(note);
        
        return this
    },
    
    sampleInfo : function(time) {
        var sinfo = this.container("Sample info ("+this.m.getStrTime(time)+")")
        var left = $('<div/>', {'class': 'flex'}).appendTo(sinfo);
        
        var content = [
            {'label': "Filename:" , value : this.m.samples.original_names[time]},
            {'label': "Sample date:" , value : this.m.getSampleTime(time)},
            {'label': "Software used:" , value : this.m.getSoftVersionTime(time)},
            {'label': "Parameters:" , value : this.m.getCommandTime(time)},
            {'label': "Analysis date:" , value : this.m.getTimestampTime(time)}
        ]
        
        var table = $('<table/>', {'class': 'info-table float-left'}).appendTo(left);
        for ( var key in content ){
            var v = content[key]
            var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': v.label}).appendTo(row);
            $('<td/>', {'text': v.value}).appendTo(row);
        }
        
        var note = $('<div/>', {'class': 'float-left'}).appendTo(left);
        $('<div/>', {'class': 'case label', 'text': "User note" }).appendTo(note);
        
        var info = "..."
        if (typeof this.m.samples.info != "undefined") info = this.m.samples.info[time]
        $('<div/>', {'class': 'note', 'text': info }).appendTo(note);
        
        return this
        
    },
    
    svg_graph : function(norm) {
        if (typeof norm == "undefined") norm = -1
        var svg_graph = document.getElementById(graph.id+"_svg").cloneNode(true);
        svg_graph.setAttribute("viewBox","0 0 "+svg_graph.getAttribute("width")+" "+svg_graph.getAttribute("height"));
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var polyline = svg_graph.querySelectorAll('[id="polyline'+i+'"]')[0]
            var tag = this.m.clone(i).getTag()
            var color = this.m.tag[tag].color
            
            if (i == norm) {
                polyline.setAttribute("style", "stroke-width:12px");
            }else if (this.list.indexOf(i) != -1){
                polyline.setAttribute("style", "stroke-width:3px");
            }else if (tag != 8){
                polyline.setAttribute("style", "stroke-width:1.5px");
            }else{
                polyline.setAttribute("style", "stroke-width:0.5px; opacity:0.5");
            }
            polyline.setAttribute("stroke", color);
            
            //remove "other" and disabled clones
            if (i != norm && (this.m.clone(i).id == "other" || !this.m.clone(i).isActive())) {
                polyline.parentNode.removeChild(polyline);
            }
        }
            
        return svg_graph
    },
    
    addGraph : function() {
        
        //resize 791px ~> 21cm
        graph.resize(791,300)
        graph.draw(0)
        
        var w_graph = this.container("Monitoring")
        w_graph.addClass("graph");
        
        var svg_graph = this.svg_graph()
        
        w_graph.append(svg_graph)
        graph.resize();
        
        return this;
    },
    
    normalizeInfo: function () {
        if (this.m.norm){
            var container = this.container("Normalization")
            var norm_id = this.m.normalization.id
            var norm_value = this.m.normalization.B
            
            this.m.compute_normalization(-1)
            graph.resize(791,300)
            graph.draw(0)
            var svg_graph = this.svg_graph(norm_id)
            svg_graph.setAttribute("width", "395px")
            svg_graph.setAttribute("height", "150px")
            container.append(svg_graph)
            
            this.m.compute_normalization(norm_id, norm_value)
            graph.resize(791,300)
            graph.draw(0)
            var svg_graph = this.svg_graph(norm_id)
            svg_graph.setAttribute("width", "395px")
            svg_graph.setAttribute("height", "150px")
            container.append(svg_graph)
            
            graph.resize();
        }
        
        return this
    },
    
    addScatterplot : function(system, time) {
        if (typeof system == "undefined") system = this.m.germlineV.system
        if (typeof time != "undefined") this.m.changeTime(time)
            
        this.m.changeGermline(system, false)
        sp.changeSplitMethod('gene_v', 'gene_j', 'plot')
        
        //resize 791px ~> 21cm
        sp.resize(791,250)
        sp.fastForward()
        
        var w_sp = this.container(this.m.getStrTime(this.m.t) + ' – ' + system)
        w_sp.addClass("scatterplot");
        
        var svg_sp = document.getElementById(sp.id+"_svg").cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.setAttribute("viewBox","0 0 791 250");
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="circle'+i+'"]')[0]
            var color = this.m.tag[this.m.clone(i).getTag()].color
            circle.setAttribute("stroke", color);
            
            //remove "other" and disabled clones
            if (this.m.clone(i).germline != system || this.m.clone(i).id == "other" || !this.m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        
        var bar_container = svg_sp.querySelectorAll('[id="'+sp.id+'_bar_container"]')[0]
        bar_container.parentNode.removeChild(bar_container);
        
        w_sp.append(svg_sp)
        sp.resize();

        for (var i=0; i<this.list.length; i++){
            var cloneID = this.list[i]
            if (this.m.clone(cloneID).germline == system) this.clone(cloneID, time).appendTo(this.w.document.body);
        }
        
        return this
    },
    
    readsStat: function(time) {
        if (typeof time == "undefined") time = -1
        var container = this.container('Reads distribution')
                
        var reads_stats = $('<div/>', {'class': 'flex'}).appendTo(container);
        
        var head = $('<div/>', {'class': 'float-left'}).appendTo(reads_stats);
        $('<div/>', {'class': 'case', 'text': ' '}).appendTo(head);
        $('<div/>', {'class': 'case', 'text': 'total'}).appendTo(head);
        $('<div/>', {'class': 'case', 'text': 'segmented'}).appendTo(head);

        if (this.m.system_selected.length < this.m.system_available.length) {
            $('<div/>', {'class': 'case', 'text': 'segmented (selected systems)'}).appendTo(head); 
        }
        
        if (this.m.system_available.length>1){
            for (var i=0; i<this.m.system_selected.length; i++){
                var system = this.m.system_selected[i]
                var system_label = $('<div/>', {'class': 'case', 'text': system}).appendTo(head);
                $('<span/>', {'class': 'system_colorbox', style:'background-color:'+this.m.germlineList.getColor(system)}).appendTo(system_label);
            }
        }
        
        if (time == -1){
            for (var i=0; i<this.m.samples.order.length; i++){
                var t = this.m.samples.order[i]
                var box=this.readsStat2(t)
                box.appendTo(reads_stats);
            }
        }else{
            var box=this.readsStat2(time)
            box.appendTo(reads_stats);
        }
        
        return this;
    },
    
    readsStat2: function (time){
        var box = $('<div/>', {'class': 'float-left'})
        $('<div/>', {'class': 'case centered', 'text': this.m.getStrTime(time)}).appendTo(box);
        $('<div/>', {'class': 'case centered', 'text': this.m.toStringThousands(this.m.reads.total[time])}).appendTo(box);
        
        var segmented = ((this.m.reads.segmented_all[time]/this.m.reads.total[time])*100).toFixed(0) + "%"
        var seg_box = $('<div/>', {'class': 'case centered', 'text': segmented}).appendTo(box);
        $('<div/>', {'class': 'background1'}).appendTo(seg_box);
        $('<div/>', {'class': 'background2', style: 'width:'+segmented}).appendTo(seg_box);
        
        if (this.m.system_selected.length < this.m.system_available.length) {

            var segmented = ((this.m.reads.segmented[time]/this.m.reads.total[time])*100).toFixed(0) + "%"
            var seg_box = $('<div/>', {'class': 'case centered', 'text': segmented}).appendTo(box);
            $('<div/>', {'class': 'background1'}).appendTo(seg_box);
            $('<div/>', {'class': 'background2', style: 'width:'+segmented}).appendTo(seg_box);
        }

        if (this.m.system_available.length>1){
            var pie = $('<div/>').appendTo(box);
            
            var pie_label = $('<div/>', {'class': 'left'}).appendTo(pie);
            for (var j=0; j<this.m.system_selected.length; j++){
                var system = this.m.system_selected[j]
                var value = ((this.m.systemSize(system,time))*100).toFixed(0) + "%"
                $('<div/>', {'class': 'case', 'text': value}).appendTo(pie_label);
            }
            
            var pie_chart = $('<div/>', {'class': 'left'}).appendTo(pie)
            var p = this.systemPie(time)
            p.setAttribute('style','margin:5px')
            pie_chart.append(p)
        }
        
        return box
    },
    
    systemPie: function(time) {
        if (typeof time == "undefined") time = this.m.t
        var radius = 40
        var pie = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        pie.setAttribute("viewBox","0 0 100 100");
        pie.setAttribute("width",(radius*2)+"px");
        pie.setAttribute("height",(radius*2)+"px");
        
        var start = 0
        for (var i=0; i<this.m.system_selected.length; i++){
            var system = this.m.system_selected[i]
            var value = this.m.systemSize(system,time)
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
                slice.setAttribute('fill', this.m.germlineList.getColor(system));
                pie.appendChild(slice)
            }else{
                var slice = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    
                slice.setAttribute('r', radius)
                slice.setAttribute('cx', radius)
                slice.setAttribute('cy', radius)
                slice.setAttribute('fill', this.m.germlineList.getColor(system));
                pie.appendChild(slice)
            }
            
            var start = stop;
        }

        return pie
    },
    
    cloneList : function(time) {
        if (typeof time == "undefined") time = -1
        var container = this.container('Selected clones')
        
        for (var i=0; i<this.list.length; i++){
            var cloneID = this.list[i]
            
            this.clone(cloneID, time).appendTo(this.w.document.body);
        }
        
        return this
    },
    
    clone : function(cloneID, time) {
        if (typeof time == "undefined") time = -1
        var color = this.m.tag[this.m.clone(cloneID).getTag()].color
        var system = this.m.clone(cloneID).germline
        var clone = $('<div/>', {'class': 'clone'})
        
        graph.resize(791,300)
        graph.draw(0)
        
        var head = $('<span/>', {'class': 'clone_head'}).appendTo(clone);
        //clone svg path icon
        if (time == -1){
            var icon = $('<span/>', {'class': 'icon'}).appendTo(head);
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            var polyline = document.getElementById("polyline" + cloneID).cloneNode(true)
            polyline.setAttribute("stroke", color);
            polyline.setAttribute("style", "stroke-width:30px");
            svg.appendChild(polyline)
            svg.setAttribute("viewBox","0 0 791 300");
            svg.setAttribute("width","80px");
            svg.setAttribute("height","30px");
            icon.append(svg)
        }
        
        //clone label
        $('<span/>', {'text': ">"+this.m.clone(cloneID).getCode()+'\u00a0', 'class': 'clone_name', style : 'color:'+color}).appendTo(head);
        if (typeof this.m.clone(cloneID).c_name != "undefined"){
            $('<span/>', {'text': this.m.clone(cloneID).c_name+'\u00a0', 'class': 'clone_name', style : 'color:'+color}).appendTo(head);
        }
        
        //clone reads stats
        if (time == -1){
            var reads_stats = $('<span/>', {'class': 'clone_table'}).appendTo(clone);
            for (var i=0; i<this.m.samples.order.length; i++){
                var t = this.m.samples.order[i]
                $('<span/>', {'text': this.m.clone(cloneID).getPrintableSize(t)+'\u00a0', 'class': 'clone_value'}).appendTo(reads_stats);
            }
        }else{
            $('<span/>', {'text': this.m.clone(cloneID).getPrintableSize(time)+'\u00a0', 'class': 'float-right'}).appendTo(head);
        }
        
        //colorized clone sequence
        var sequence = $('<div/>', {'class': 'sequence'}).appendTo(clone);
        if (typeof this.m.clone(cloneID).seg != 'undefined'){
            var seg = this.m.clone(cloneID).seg
            var seq = this.m.clone(cloneID).getSequence()
            var seqV = seq.substring(0, seg['5end'] + 1)
            var seqN = seq.substring(seg['5end'] + 1, seg['3start'])
            var seqJ = seq.substring(seg['3start'])

            $('<span/>', {'class': 'v_gene', 'text': seqV}).appendTo(sequence);
            if (this.m.clone(cloneID).getD() != "undefined D"){
                var seqN1 = seq.substring(seg['5end'] + 1, seg['4start'])
                var seqD = seq.substring(seg['4start'] , seg['4end'] + 1)
                var seqN2 = seq.substring(seg['4end'] + 1, seg['3start'])
                $('<span/>', {'class': 'n_gene', 'text': seqN1}).appendTo(sequence);
                $('<span/>', {'class': 'd_gene', 'text': seqD}).appendTo(sequence);
                $('<span/>', {'class': 'n_gene', 'text': seqN2}).appendTo(sequence);
            }else{
                $('<span/>', {'class': 'n_gene', 'text': seqN}).appendTo(sequence);
            }
            $('<span/>', {'class': 'j_gene', 'text': seqJ}).appendTo(sequence);
        }
        else if (this.m.clone(cloneID).getSequence() != "0") {
            $('<span/>', {'class': 'unseg_gene', 'text': this.m.clone(cloneID).getSequence()}).appendTo(sequence);
        } else {
            $('<span/>', {'text': 'segment fail'}).appendTo(sequence);
        }
        
        return clone
    }
    
}

