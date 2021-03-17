
function Report(model) {
    this.m = model;
    this.colorMode = "colorBy";     // "colorBy" / "tag" / TODO...
}

Report.prototype = {
    
    formValidate:function(f, report_type){
        f = document.forms.form_report;
        
        var system_list = [];
        var inputs= f.querySelectorAll('input[name=system]:checked');
        for (var i=0; i<inputs.length; i++) system_list.push(inputs[i].value);
        
        var sample_list = [];
        inputs= f.querySelectorAll('input[name=sample]:checked');
        var max_sample = f.getElementsByClassName("report_sample_select")[0].getAttribute("max_sample");
        for (var j=0; j<inputs.length; j++) sample_list.push(inputs[j].value);
        if (sample_list.length>max_sample){
            console.log({"type": "flash", "msg": "too many samples selected (max "+max_sample+")", "priority": 2 })
            return false;
        }
        
        switch(report_type) {
            case "monitor":
                this.reportHTML(system_list, sample_list);
                break;
            case "diag":
                this.reportHTMLdiag(system_list, sample_list);
                break;
            default:
                console.log("what ?")
        }
        
    },
    
    report : function(report_type){
        var self=this;
        
        var r = document.createElement("div");
        
        var f = document.createElement("form");
        f.setAttribute('name',"form_report");
        f.onsubmit = function() {self.formValidate(this, report_type); return false};
        
        switch(report_type) {
            case "monitor":
                this.selectSample(f, 6)
                .selectSystem(f);
                break;
            case "diag":
                this.selectSample(f, 1)
                .selectSystem(f);
                break;
            default:
                console.log("what ?")
        }
        
        var s = document.createElement("input");
        s.setAttribute('type',"submit");
        s.setAttribute('value',"make report");
        f.appendChild(s);
        
        var h = document.createElement("h1");
        h.appendChild(document.createTextNode("Report settings ("+report_type+")"));
        r.appendChild(h);
        r.appendChild(f);
        
        console.popupHTML(r);
    },
    
    selectSample : function(f, max){
        var d = document.createElement("div");
        d.className = "report_sample_select";
        d.setAttribute('max_sample', max);
        
        var sp = document.createElement("div");
        sp.appendChild(document.createTextNode("Samples to include in report ("+max+" max)"));
        d.appendChild(sp);
        
        for (var i in this.m.samples.order){ 
            var t = this.m.samples.order[i];
            var s = document.createElement("input");
            s.setAttribute('type',"checkbox");
            if (max==1) s.setAttribute('type',"radio");
            s.setAttribute('name',"sample");
            s.setAttribute('value',t);
            if (i<max) s.checked = true;
            
            d.appendChild(s);
            d.appendChild(document.createTextNode(m.getStrTime(t, "names")));
            d.appendChild(document.createElement("br"));
            f.appendChild(d);
        }
        
        return this;
    },
    
    selectSystem : function(f){
        var d = document.createElement("div");
        var sp = document.createElement("div");
        sp.appendChild(document.createTextNode("Germlines selected"));
        d.appendChild(sp);
        
        for (var i in this.m.system_available){ 
            var system = this.m.system_available[i];
            var s = document.createElement("input");
            s.setAttribute('type',"checkbox");
            s.setAttribute('name',"system");
            s.setAttribute('value',system);
            if (this.m.system_selected.indexOf(system) != -1) s.checked = true;
            
            d.appendChild(s);
            d.appendChild(this.m.systemBox(system));
            d.appendChild(document.createTextNode(system));    
        }
        
        f.appendChild(d);
        
        return this;
    },
    
    savestate: function(){
        this.save_system = [];
        for (var i in this.m.system_selected) this.save_system.push(this.m.system_selected[i]);
        
        this.save_sample = [];
        for (var j in this.m.samples.order) this.save_sample.push(this.m.samples.order[j]);
        
        return this;
    },
    
    switchstate: function(system_list, sample_list){
        this.savestate();
        this.m.system_selected = system_list;
        this.m.changeTimeOrder( sample_list );
        return this;
    },
    
    restorestate: function(){
        this.m.system_selected = this.save_system;
        this.m.changeTimeOrder( this.save_sample );
        return this;
    },
    
    reportcontamination : function() {
        this.m.wait("Generating report...")
        
        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
        var text = "contamination report: "
        if (typeof this.m.sample_name != 'undefined')
            text += this.m.sample_name
            
        this.w.onload = function(){
            self.w.document.title = text
            self.w.document.getElementById("header-title").innerHTML = text
            
            self.info()
                .contamination()
                .comments()
                
            self.m.resize()
            self.m.resume()
        }
    },
    
    reportHTML : function(system_list, sample_list) {
        sample_list = typeof sample_list !== 'undefined' ? sample_list : this.m.samples.order;
        system_list = typeof system_list !== 'undefined' ? system_list : this.m.system_selected;
        
        this.m.wait("Generating report...")
        this.switchstate(system_list, sample_list);
        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        this.list = this.m.getSelected()
        if (this.list.length===0) this.list = this.defaultList()
        
        var text = ""
        date_min = this.m.dateMin()
        date_max = this.m.dateMax()
        
        if (typeof this.m.sample_name != 'undefined')
            text += this.m.sample_name
        else
            text += this.m.dataFileName
        if (date_max != "0" && date_min != "0")
            text += " – " + date_min + " → " + date_max 
            
        this.w.onload = function(){
            self.w.document.title = text
            self.w.document.getElementById("header-title").innerHTML = text
            
            self.info()
                .normalizeInfo()
                .readsStat()
                .addGraph()
                .cloneList()
                .contamination()
                .sampleLog()
                .comments()
                .restorestate()
                
            self.m.resize()
            self.m.resume()
        }
    },
    
    reportHTMLdiag : function(system_list, sample_list) {
        sample_list = typeof sample_list !== 'undefined' ? sample_list : this.m.samples.order;
        system_list = typeof system_list !== 'undefined' ? system_list : this.m.system_selected;
        console.log(sample_list);
        console.log(system_list);
        this.m.wait("Generating report...")
        this.switchstate(system_list, sample_list);
        var current_system = this.m.sp.system;
        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        var text = ""
        if (typeof this.m.sample_name != 'undefined')
            text += this.m.sample_name
        else
            text += this.m.dataFileName
        text += " – "+ this.m.getStrTime(this.m.t, "name")
        if (typeof this.m.samples.timestamp != 'undefined') 
            text += " – "+this.m.samples.timestamp[this.m.t].split(" ")[0]
        
        this.list = this.m.getSelected()
        if (this.list.length===0) this.list = this.defaultList()
            
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

            self.sampleLog()
                .softwareInfo(self.m.t)
                .comments()
                .restorestate()

            self.m.changeGermline(current_system)
            self.m.resize()
            self.m.resume()
        }
    },
    
    defaultList: function() {
        var list = []
        
        //use taged clones 
        var tag=0
        while (tag < 8 && list.length < 10) {
            for (var i = 0; i < this.m.clones.length; i++) {
                var clone_tag = this.m.clone(i).getTag()
                if (clone_tag == tag && this.m.clone(i).isActive && !this.m.clone(i).virtual) list.push(i)
            }
            tag++
        }
        
        //add best two clones from each system
        if (list.length <5){
            for (var k=0; k<2; k++){
                for (var l=0; l<this.m.system_available.length; l++){
                    var system = this.m.system_available[l]
                    
                    var clone = -1
                    for (var j=0; j<this.m.clones.length; j++) {
                        if (list.indexOf(j)==-1 && this.m.clone(j).germline==system && 
                            (clone==-1 || this.m.clone(j).top < this.m.clone(clone).top ) && !this.m.clone(j).virtual) clone=j
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

    contamination : function(){
        var self = this;
        if (typeof this.m.contamination == "undefined") return this;
        
        var contamination = this.container("Report run contamination")
        var left = $('<div/>', {'class': 'flex'}).appendTo(contamination);
        
        var sample_names = [];
        var reads = [];
        var percent = [];
        
        for (var i=0; i<this.m.samples.order.length; i++) {
            var time = this.m.samples.order[i];
            sample_names.push(this.m.getStrTime(time, "short_name"));
            reads.push(""+this.m.contamination[time].total_reads);
            percent.push( ""+(self.m.contamination[time].total_reads/self.m.reads.segmented[time]*100).toFixed(3)+"%)");
        }
        
        var content = [
            {'label': "sample name" , 'value' : sample_names},
            {'label': "reads" , 'value' : reads},
            {'label': "(%)" , 'value' : percent}
        ]
        
        var table = $('<table/>', {'class': 'info-table2 float-left'}).appendTo(left);
        for ( var key in content ){
            var v = content[key]
            var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': v.label}).appendTo(row);
            for (var idx in v.value) $('<td/>', {'text': v.value[idx].replace("_L001__001", "")}).appendTo(row);
        }
        
        return this
    },

    comments: function() {
        var comments = this.container("Comments")
        $('<textarea/>', {'title': "These comments won't be saved.", 'rows': 5, 'style': "width: 100%; display: block; overflow: hidden; resize: vertical;"}).appendTo(comments)
    
        return this
    },
    
    info : function() {
        var info = this.container("Report information")
        var left = $('<div/>', {'class': 'flex'}).appendTo(info);
        
        var date = new Date();
        var report_timestamp = date.toISOString().split('T')[0]
        
        var analysis_timestamp = "–"
        if (typeof this.m.analysis.timestamp != "undefined")
            analysis_timestamp = this.m.analysis.timestamp.split(" ")[0]
        if (this.m.analysisHasChanged) 
            analysis_timestamp = report_timestamp + " (not saved)"
        
        var content = [
            {'label': "Report date:"  , 'value' : report_timestamp},
            {'label': "Filename:" , 'value' : this.m.dataFileName },
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
        
        var note = $('<div/>', {'class': 'info-note float-left'}).appendTo(left);
        // $('<div/>', {'class': 'case label', 'text' : "User note" }).appendTo(note);
        $('<div/>', {'class': 'note', 'text' : this.m.info }).appendTo(note);
        
        return this
    },
    
    sampleInfo : function(time) {
        var sinfo = this.container("Sample information ("+this.m.getStrTime(time, "short_name")+")")
        var left = $('<div/>', {'class': 'flex'}).appendTo(sinfo);
        
        var content = [
            {'label': "Filename:" , value : this.m.samples.names[time]},
            {'label': "Sample date:" , value : this.m.getSampleTime(time)},
            {'label': "Analysis date:" , value : this.m.getTimestampTime(time)}
        ]
        
        var table = $('<table/>', {'class': 'info-table float-left'}).appendTo(left);
        for ( var key in content ){
            var v = content[key]
            var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': v.label}).appendTo(row);
            $('<td/>', {'text': v.value}).appendTo(row);
        }
        
        var note = $('<div/>', {'class': 'info-note float-left'}).appendTo(left);
        $('<div/>', {'class': 'case label', 'text': "User note" }).appendTo(note);
        
        var info = "..."
        if (typeof this.m.samples.info != "undefined") info = this.m.samples.info[time]
        $('<div/>', {'class': 'note', 'text': info }).appendTo(note);
        
        return this
        
    },

    softwareInfo : function(time) {
        var sinfo = this.container("Software information ("+this.m.getStrTime(time, "short_name")+")");
         var div = $('<div/>', {'class': 'flex'}).appendTo(sinfo);
         var content = [
            {'label': "Analysis software:" , value : this.m.getSoftVersionTime(time)},
            {'label': "Parameters:" , value : this.m.getCommandTime(time)}
         ];

         var table = $('<table/>', {'class': 'info-table'}).appendTo(div);
         for ( var key in content ) {
             var v = content[key];
             var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': v.label}).appendTo(row);
            $('<td/>', {'text': v.value}).appendTo(row);
         }

         return this;
    },
    
    svg_graph : function(norm) {
        if (typeof norm == "undefined") norm = -1
        var svg_graph = document.getElementById(graph.id+"_svg").cloneNode(true);
        svg_graph.setAttribute("viewBox","0 0 "+svg_graph.getAttribute("width")+" "+svg_graph.getAttribute("height"));
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var polyline = svg_graph.querySelectorAll('[id="polyline'+i+'"]')[0]
            var tag = this.m.clone(i).getTag()
            var color = this.getCloneExportColor(i);

            if (typeof polyline == 'undefined')
                continue;
            
            if (i == norm) {
                polyline.setAttribute("style", "stroke-width:12px; stroke:"+color);
            }else if (this.list.indexOf(i) != -1){
                polyline.setAttribute("style", "stroke-width:3px; stroke:"+color);
            }else if (tag != 8){
                polyline.setAttribute("style", "stroke-width:1.5px; stroke:"+color);
            }else{
                polyline.setAttribute("style", "stroke-width:0.5px; opacity:0.5; stroke:"+color);
            }
            
            //remove virtual and disabled clones
            if (i != norm && (!this.m.clone(i).isInScatterplot() || !this.m.clone(i).isActive())) {
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
        if (this.m.normalization_mode != this.NORM_FALSE){
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
            svg_graph = this.svg_graph(norm_id)
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
        this.m.sp.changeSplitMethod(sp.AXIS_GENE_V, sp.AXIS_GENE_J, 'plot')
        
        //resize 791px ~> 21cm
        this.m.sp.resize(791,250)
        this.m.sp.fastForward()
        
        var w_sp = this.container(this.m.getStrTime(this.m.t, "short_name") + ' – ' + system)
        w_sp.addClass("scatterplot");
        
        var svg_sp = document.getElementById(this.m.sp.id+"_svg").cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.setAttribute("viewBox","0 0 791 250");
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="'+this.m.sp.id+'_circle'+i+'"]')[0]
            var color = this.getCloneExportColor(i);
            circle.setAttribute("stroke", color);
            
            //remove virtual and disabled clones
            if (this.m.clone(i).germline != system || !this.m.clone(i).isInScatterplot() || !this.m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        
        var bar_container = svg_sp.querySelectorAll('[id="'+this.m.sp.id+'_bar_container"]')[0]
        bar_container.parentNode.removeChild(bar_container);
        
        w_sp.append(svg_sp)
        this.m.sp.resize();

        for (var j=0; j<this.list.length; j++){
            var cloneID = this.list[j]
            if (this.m.clone(cloneID).germline == system && this.m.clone(cloneID).hasSizeConstant())
                this.clone(cloneID, time).appendTo(this.w.document.body);
        }
        
        return this
    },
    
    readsStat: function(time) {
        if (typeof time == "undefined") time = -1
        var container = this.container('Reads distribution')
                
        var reads_stats = $('<div/>', {'class': 'flex'}).appendTo(container);
        
        var head = $('<div/>', {'class': 'float-left', 'id': 'segmentation-report'}).appendTo(reads_stats);
        $('<div/>', {'class': 'case', 'text': ' '}).appendTo(head);
        $('<div/>', {'class': 'case', 'text': 'total'}).appendTo(head);
        $('<div/>', {'class': 'case', 'text': 'analyzed'}).appendTo(head);

        if (this.m.system_selected.length < this.m.system_available.length) {
            $('<div/>', {'class': 'case', 'text': 'selected locus'}).appendTo(head); 
        }
        
        if (this.m.system_available.length>1){
            for (var i=0; i<this.m.system_selected.length; i++){
                var system = this.m.system_selected[i]
                var system_label = $('<div/>', {'class': 'case', 'text': system}).appendTo(head);
                $('<span/>', {'class': 'system_colorbox', style:'background-color:'+this.m.germlineList.getColor(system)}).appendTo(system_label);
            }
        }

        var box;
        if (time == -1){
            for (var j=0; j<this.m.samples.order.length; j++){
                var t = this.m.samples.order[j]
                box=this.readsStat2(t)
                box.appendTo(reads_stats);
            }
        }else{
            box=this.readsStat2(time)
            box.appendTo(reads_stats);
        }
        
        return this;
    },
    
    readsStat2: function (time){
        var box = $('<div/>', {'class': 'float-left'})
        $('<div/>', {'class': 'case centered', 'text': this.m.getStrTime(time, "short_name")}).appendTo(box);
        $('<div/>', {'class': 'case centered', 'text': this.m.toStringThousands(this.m.reads.total[time])}).appendTo(box);
        
        var segmented = ((this.m.reads.segmented_all[time]/this.m.reads.total[time])*100).toFixed(0) + "%"
        var seg_box = $('<div/>', {'class': 'case centered', 'text': segmented}).appendTo(box);
        $('<div/>', {'class': 'background1'}).appendTo(seg_box);
        $('<div/>', {'class': 'background2', style: 'width:'+segmented}).appendTo(seg_box);
        
        if (this.m.system_selected.length < this.m.system_available.length) {

            segmented = ((this.m.reads.segmented[time]/this.m.reads.total[time])*100).toFixed(0) + "%"
            seg_box = $('<div/>', {'class': 'case centered', 'text': segmented}).appendTo(box);
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

            var slice;
            if (value <1){
                slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    
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
                slice = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    
                slice.setAttribute('r', radius)
                slice.setAttribute('cx', radius)
                slice.setAttribute('cy', radius)
                slice.setAttribute('fill', this.m.germlineList.getColor(system));
                pie.appendChild(slice)
            }
            
            start = stop;
        }

        return pie
    },
    
    cloneList : function(time) {
        if (typeof time == "undefined") time = -1
        var container = this.container('Selected clones')
        
        for (var i=0; i<this.list.length; i++){
            var cloneID = this.list[i]
            if (this.m.clone(cloneID).hasSizeConstant())
                this.clone(cloneID, time).appendTo(this.w.document.body);
        }
        
        return this
    },
    
    clone : function(cloneID, time) {
        if (typeof time == "undefined") time = -1
        var color = this.getCloneExportColor(cloneID);
        var system = this.m.clone(cloneID).germline
        var clone = $('<div/>', {'class': 'clone'})
        
        var head = $('<span/>', {'class': 'clone_head'}).appendTo(clone);
        //clone svg path icon
        if (time == -1){
            var icon = $('<span/>', {'class': 'icon'}).appendTo(head);
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            var polyline = document.getElementById("polyline" + cloneID).cloneNode(true)
            polyline.setAttribute("style", "stroke-width:30px; stroke:"+color);
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
                $('<span/>', {'text': this.m.clone(cloneID).getStrSize(t)+'\u00a0', 'class': 'clone_value'}).appendTo(reads_stats);
            }
        }else{
            $('<span/>', {'text': this.m.clone(cloneID).getPrintableSize(time)+'\u00a0', 'class': 'float-right'}).appendTo(head);
        }
        
        //colorized clone sequence
        var sequence = $('<div/>', {'class': 'sequence'}).appendTo(clone);
        var nbsp = "\u00A0"
        if (this.m.clone(cloneID).hasSeg('5', '3')){
            var seg = this.m.clone(cloneID).seg
            var seq = this.m.clone(cloneID).getSequence()
            var seqV = seq.substring(0, seg['5'].stop + 1)
            var seqN = seq.substring(seg['5'].stop + 1, seg['3'].start)
            var seqJ = seq.substring(seg['3'].start)

            $('<span/>', {'class': 'v_gene', 'text': seqV}).appendTo(sequence);
            $('<span/>', {'class': 'space', 'text': nbsp}).appendTo(sequence);
            if (this.m.clone(cloneID).getGene("4") != "undefined D"){
                var seqN1 = seq.substring(seg['5'].stop + 1, seg['4'].start)
                var seqD  = seq.substring(seg['4'].start , seg['4'].stop + 1)
                var seqN2 = seq.substring(seg['4'].stop + 1, seg['3'].start)
                $('<span/>', {'class': 'n_gene', 'text': seqN1}).appendTo(sequence);
                $('<span/>', {'class': 'space', 'text': nbsp}).appendTo(sequence);
                $('<span/>', {'class': 'd_gene', 'text': seqD}).appendTo(sequence);
                $('<span/>', {'class': 'space', 'text': nbsp}).appendTo(sequence);
                $('<span/>', {'class': 'n_gene', 'text': seqN2}).appendTo(sequence);
                $('<span/>', {'class': 'space', 'text': nbsp}).appendTo(sequence);
            } else {
                $('<span/>', {'class': 'n_gene', 'text': seqN}).appendTo(sequence);
                $('<span/>', {'class': 'space', 'text': nbsp}).appendTo(sequence);
            }
            $('<span/>', {'class': 'j_gene', 'text': seqJ}).appendTo(sequence);
        }
        else if (this.m.clone(cloneID).getSequence() != "0") {
            $('<span/>', {'class': 'unseg_gene', 'text': this.m.clone(cloneID).getSequence()}).appendTo(sequence);
        } else {
            $('<span/>', {'text': 'segment fail'}).appendTo(sequence);
        }

        //CloneDB results
        if (typeof this.m.clones[cloneID].seg.clonedb != 'undefined'){
          var clonedbContent = $('<div/>', {'class': 'cloneDB'}).appendTo(clone);
          var table = $('<table/>', {'class': 'info-table'}).appendTo(clonedbContent);
          var result = this.m.clones[cloneID].seg.clonedb.clones_names;
          var j = 0;
          for (var c in result){
            var row = $('<tr/>').appendTo(table);
            $('<td/>', {'class': 'label', 'text': result[j]}).appendTo(row);
            $('<td/>', {'text': result[c][0] +' clone'+((result[c][0] === 1) ? '' : 's') + ' (' + this.m.formatSize(result[c][1],true,this.m.getSizeThresholdQ(this.m.t)) + ')'}).appendTo(row);
            j++;
          }
        }
        return clone
    },

    sampleLog: function() {
        if (typeof this.m.logs == 'undefined')
            return this

        var log = this.container("Log")

        var table = $('<table/>', {'class': 'log-table flex'}).appendTo(log);
        for (var i=0; i < this.m.logs.length; i++ ){
            line = this.logLine(m.logs[i]);
            if(i % 2 === 0)
                line.addClass('even');
            else
                line.addClass('odd');
            line.appendTo(table);
        }
        return this
    },

    logLine: function(log_line) {
        var line = $('<tr/>', {'class': 'log-row'});
        console.log(log_line)
        console.log(log_line.message)
        $('<td/>', {'class': 'log-date', 'text': log_line.created}).appendTo(line);
        $('<td/>', {'class': 'log-message', 'text': log_line.message}).appendTo(line);

        return line;
    },

    sendMail : function() {
        var clones = ''
        var list = m.getSelected()
        if (list.length>0){
            clones += "Let's look on the following clones: \n" //  + list.length
            for (var i=0; i<list.length; i++){
                clones += m.clone(list[i]).getFasta() + '\n'
            }
        }/**/


        var link = "mailto:support@vidjil.org" +
            "?subject=" + escape("[Vidjil] Question") +
            "&body=" + escape("Dear Vidjil team," +
                              "\n\nI have a question on the results I obtain on the following sample: " + window.location.href +
                              "\n\n" + clones)
        ;
        window.location.href = link;
    },

    getCloneExportColor : function(cloneID){
        var color;
        switch (this.colorMode) {
            case "tag":
                rcolor = this.m.tag[this.m.clone(cloneID).getTag()].color;
                break;
            case "colorBy":
                color = this.m.clone(cloneID).getColor();
                break;
            default:
                color = this.m.clone(cloneID).getColor();
                break;
        }
        return color;
    }
    
}

