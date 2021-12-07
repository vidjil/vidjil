
function Report(model, settings) {
    this.m = model;

    // create storage in model if needed before saving
    if (typeof this.m.report_save == "undefined") 
    this.m.report_save = {}; 

    this.colorMode = "colorBy";     // "colorBy" / "tag" / TODO...

    // name of setting sheet to use as default
    this.default_setting = "New Report";

    // hard coded default settings for report
    this.default_settings = {
        "New Report" : {
            name : "New Report",
            //type : "multi",
            sample : undefined,
            samples : undefined,
            locus : undefined,
            clones : [],
            blocks: []
        },
        "New Monitor Report" : {
            name : "New Monitor Report",
            //type : "multi",
            sample : undefined,
            samples : undefined,
            locus : undefined,
            clones : [],
            blocks: []
        },
        "New Sample Report" : {
            name : "New Sample Report",
            //type : "single",
            sample : undefined,
            samples : undefined,
            locus : undefined,
            clones : [],
            blocks: []
        }
    }
    
    if (typeof settings != "undefined")
        this.settings = settings;
    else
        this.settings = (JSON.parse(JSON.stringify(this.default_settings[this.default_setting]))); 

    this.container_map = new WeakMap();
}

Report.prototype = {

    // save current setting sheet
    save: function(savename, overwrite){
        var self=this;

        // use name found in setting sheet if savename is not provided
        if (typeof savename == "undefined"){
            savename = this.settings.name;
        }

        // if settings does not contain a name -> abort
        if (typeof savename == "undefined"){
            console.log("you must set a name to your report before saving");
            return;
        }   

        this.settings.name = savename;

        keys = Object.keys(this.default_settings)
        if (keys.indexOf(savename) != -1) {
            console.log("you can't save on this setting page, use 'save as' to save it under a new name");
            return;
        }
        
        if (typeof this.m.report_save[savename] == "undefined" || overwrite){
            // save
            try {
                this.m.report_save[savename] = JSON.parse(JSON.stringify(this.settings))
                console.log({ msg: "report settings '"+savename+"' has been saved", type: "flash", priority: 1 });
                this.m.analysisHasChanged = true;
            } catch (error) {
                console.log({ msg: "failed to save report settings", type: "flash", priority: 3 });
            }
            this.menu()
        }
        else{
            console.confirmBox( "A report with this name already exist, saving will overwrite it </br>"+
                                "Use 'Save As' instead to create a new save under another name",
                                function(){self.save(savename, true)})
        }
    },

    saveas: function(){
        var self = this;

        var savename = true;
        if (typeof this.default_settings[this.settings.name] == "undefined")
            savename = this.settings.name
        

        console.confirmBox( "Define a new name for this report settings, </br>"+
                            "",
                            function(){self.save(console.confirm.input.val())},
                            savename)
    },

    // load a setting sheet from default_list or model using name
    load: function(name){
        // exist in default settings list 
        if (typeof this.default_settings[name] != "undefined"){
            this.settings = (JSON.parse(JSON.stringify(this.default_settings[name]))); 
            this.menu();
            return
        }

        // exist in model 
        if (typeof this.m.report_save[name] != "undefined"){
            this.settings = (JSON.parse(JSON.stringify(this.m.report_save[name]))); 
            this.menu();
            return
        }

        //does not exist
        console.log("requested save does not exist")
    },

    menu: function(){
        var template = document.getElementById("report-settings");
        var clone = template.content.firstElementChild.cloneNode(true);   
        console.popupHTML(clone)

        this.initSave()
        //this.initType()
        this.initSamples()
        this.initLocus()
        this.initClones()
        this.initBlocks()
    },

    initSave: function(){
        var self = this;

        var handle = function(){
            if (this.value)
                self.load(this.value);
            else
                self.menu();
        }

        var save_select = $("#report-settings-save")

        var div = $('<div/>',   {}).appendTo(save_select);

        var select = $('<select/>', { name: 'rs-save-select',
                                      id:   'rs-save-select' }).appendTo(div).change(handle);

        $('<option/>',  { text: "--- Default Report ---"}).appendTo(select);

        var keys = Object.keys(this.default_settings);
        for (var i = 0; i < keys.length; i++){
            var name = keys[i];
            $('<option/>',  { text: name,
                            selected: (self.settings.name == name),
                            value: name}).appendTo(select);
        }

        $('<option/>',  { text: "--- User Report ---"}).appendTo(select);

        keys = Object.keys(this.m.report_save);
        for (var i = 0; i < keys.length; i++){
            var savename = keys[i];
            $('<option/>',  { text: savename,
                              selected: (self.settings.name == savename),
                              value: savename}).appendTo(select);
        }

        if(typeof this.default_settings[this.settings.name] != "undefined")
            $("#rs-save-button").addClass("disabledClass")
        else
            $("#rs-save-button").remove("disabledClass")
    },
/*
    initType: function(){
        var self = this;
        var max_width=0;
        var checkBoxes = []
        var type = ["single", "multi"]
        var type_select = $("#report-settings-type-select")
        var parent = $('<div/>', { class: "rs-flex-parent"}).appendTo(type_select);

        var handle = function(){
            self.settings.type = this.value
            if (this.value == "single"){
                $("#report-settings-multi_sample-select").hide()
                $("#report-settings-sample-select").show()
            }else{
                $("#report-settings-multi_sample-select").show()
                $("#report-settings-sample-select").hide()
            }
        }

        for (var i = 0; i < type.length; i++){
            var div   = $('<div/>',   { class: "rs-flex-child"}).appendTo(parent);
            var input = $('<input/>', { id:  'rs-type-select'+i, 
                                        name: 'rs-type-select',
                                        type: 'radio',
                                        checked: this.settings.type == type[i],
                                        value: type[i]}).appendTo(div).change(handle)
            var label = $('<label/>', { for: 'rs-type-select'+i, 
                                        text: type[i]}).appendTo(div)

            if (max_width < label.width()) max_width=label.width(); 
            checkBoxes.push(div)
        }
        for(var j=0;j<checkBoxes.length;j++) 
            checkBoxes[j].css({"min-width": ""+(max_width+30)+"px"})
    },
    */

    initSamples: function(){
        var self = this;
        var sample_select = $("#report-settings-sample-select")
        var parent = $('<div/>', { class: "rs-flex-parent-v"}).appendTo(sample_select);
        var i;

        // use displayed samples as default 
        if (this.settings.samples == undefined){
            this.settings.samples = []
            for (i=0; i<this.m.samples.order.length; i++)
                this.settings.samples.push(this.m.getStrTime(this.m.samples.order[i], "original_name"))
        } 

        // add/remove sample to list on click
        var handle = function(){
            if ($(this).hasClass("rs-selected"))
                self.settings.samples.splice(self.settings.samples.indexOf($(this).attr("value")),1)
            else
                self.settings.samples.push($(this).attr("value"))
                
            var count = 0
            for (var j=0; j < self.m.samples.order.length; j++){
                var timeId = self.m.samples.order[j]
                if (self.settings.samples.indexOf(self.m.getStrTime(timeId, "original_name")) != -1)
                    count++;
            }
            $("#rs-selected-sample-count").html("["+count+" selected]")

            $(this).toggleClass("rs-selected");
            $(this).toggleClass("rs-unselected");
        }

        for (i=0; i < this.m.samples.order.length; i++){
            var timeId = this.m.samples.order[i]

            var selected = (self.settings.samples.indexOf(this.m.getStrTime(timeId, "original_name")) != -1)
            var div = $('<div/>',   { id:  'rs-sample-select'+i, 
                                        type: 'checkbox', 
                                        class: (selected) ? "rs-sample rs-selected" : "rs-sample rs-unselected",
                                        value: this.m.getStrTime(timeId, "original_name"),
                                        text: this.m.getStrTime(timeId, "name")}).appendTo(parent).click(handle)
        }
    },
/*
    initSample: function(){
        var self = this;

        if (typeof this.settings.sample == "undefined")
            this.settings.sample = this.m.getTime()

        var handle = function(){
            self.settings.sample = this.value;
        }

        var sample_select = $("#report-settings-sample-select")

        var div = $('<div/>',   {}).appendTo(sample_select);

        var label = $('<label/>',   { for:  'rs-sample-select',
                                      text: '' }).appendTo(div)
        var select = $('<select/>', { name: 'rs-sample-select',
                                      id:   'rs-sample-select' }).appendTo(div).change(handle);                        

        for (var i = 0; i < this.m.samples.order.length; i++){
            var timeId = this.m.samples.order[i]
            $('<option/>',  { text: this.m.getStrTime(timeId, "name"),
                              selected: (self.settings.sample == this.m.getStrTime(timeId, "original_name")),
                              value: this.m.getStrTime(timeId, "original_name")}).appendTo(select);
        }

        if (this.settings.type=="single") sample_select.show();
    },
    */

    initLocus: function(){
        var self = this;

        // use displayed locus as default 
        if (typeof this.settings.locus == "undefined"){
            this.settings.locus = []
            for (var i=0; i<this.m.system_selected.length; i++)
                this.settings.locus.push(this.m.system_selected[i])
        }

        var handle = function(){

            if ($(this).hasClass("rs-selected"))
                self.settings.locus.splice(self.settings.locus.indexOf($(this).attr("value")),1)
            else
                self.settings.locus.push($(this).attr("value"))
        
            $(this).toggleClass("rs-selected");
            $(this).toggleClass("rs-unselected");
        }

        var checkBoxes = []
        var locus_select = $("#report-settings-locus-select")
        var parent = $('<div/>', { class: "rs-flex-parent-h"}).appendTo(locus_select);
        for (var i = 0; i < this.m.system_available.length; i++){
            var locus = this.m.system_available[i]
            var selected = this.settings.locus.indexOf(locus) != -1

            var div   = $('<div/>',   { class: "rs-locus"}).appendTo(parent);
            var input = $('<div/>',   { id:   'rs-locus-select'+locus, 
                                        type: 'checkbox', 
                                        value: locus,
                                        class: (selected) ? "rs-selected" : "rs-unselected",
                                        checked: selected,
                                        text: locus }).appendTo(div).append(this.m.systemBox(locus)).click(handle);

            checkBoxes.push(div)
        }
    },  

    initClones: function(){
        var self = this;
        var main = $("#report-settings-clones")
        var parent = $('<div/>', { class: "rs-flex-parent-v"}).appendTo(main);

        // add/remove sample to list on click
        var handle = function(){
            self.removeClone($(this).attr("value"));
            $(this).parent().remove()
        }

        for (var i=0; i<this.settings.clones.length; i++){
            var cloneID = this.settings.clones[i]
            
            var text;
            for (var j=0; j<this.m.clones.length; j++){
                if ( this.m.clones[j].id == cloneID)
                    text = this.m.clones[j].getName();
            }

            if (text != undefined){
                var div = $('<div/>',   {id:  'rs-clone-'+cloneID, 
                                        class: 'rs-selected',
                                        value: cloneID,
                                        text: text}).appendTo(parent)
                          $('<button/>',{value: cloneID , 
                                        text: "remove", 
                                        style: "float:right;"}).click(handle).appendTo(div)
            }
        }
    },

    initBlocks: function(){
        var self = this;

        var handle = function(){
            self.removeBlock(parseInt($(this).attr("value")));
            self.menu();
        }

        var block_list = $("#report-settings-block")
        var parent = $('<div/>', { class: "rs-flex-parent-v"}).appendTo(block_list);
        for (var i = 0; i < this.settings.blocks.length; i++){
            var conf = this.settings.blocks[i]
            var text = ""

            switch (conf.blockType) {
                case "scatterplot":
                    text = "Scatterplot: ["+ conf.axisX +" | "+ conf.axisY +"] ["+ conf.locus +"]"
                    break;
                case "comments":
                    text = "User comment: "
                    break;
                default:
                    break;
            }

            var div   = $('<div/>',   { class: "rs-block rs-selected",
                                        text: text}).appendTo(parent);
                        $('<button/>',{ value:  i , 
                                        text: "remove", 
                                        style: "float:right;"}).click(handle).appendTo(div)
        }
    },  

    print: function(){ 
        this.container_map = new WeakMap();

        //reorder samples
        var array_sample_names = []
        var array_sample_ids = []
        for (var i=0; i<this.m.samples.order.length; i++){
            var timeID = this.m.samples.order[i];
            if (this.settings.samples.indexOf(this.m.getStrTime(timeID, "original_name")) != -1){
                array_sample_names.push(this.m.getStrTime(timeID, "original_name"));
                array_sample_ids.push(timeID)
            }
        }
        //this.settings.samples = array;
        
        this.m.wait("Generating report...")
        this.switchstate(this.settings.locus, array_sample_ids);

        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        //convert cloneID into clone index
        this.list = []
        for (var j=0; j<this.settings.clones.length; j++){
            cloneID = this.settings.clones[j];
            for (var k=0; k<this.m.clones.length; k++)
                if (cloneID == this.m.clones[k].id) 
                    this.list.push(k)   
        }
        
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
                //.normalizeInfo()
                .readsStat3()
                .addGraph()

            if (self.settings.blocks)
                self.settings.blocks.forEach(function(block){
                    self.block(block);
                });
            
            self.cloneList()
                .contamination()
                .sampleLog()
                .comments({})
                .restorestate()
                
            self.m.resize()
            self.m.resume()
        }
        
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
                .comments({})
                
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
                //.normalizeInfo()
                .readsStat3()
                .addGraph()
                .cloneList()
                .contamination()
                .sampleLog()
                .comments({})
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
                self.scatterplot({'locus' : system, 'time': self.m.t})
            }

            self.sampleLog()
                .softwareInfo(self.m.t)
                .comments({})
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
    container : function(title, block, sibling) {
        var self = this;

        var container = $('<div/>', {
            'class': 'container'
        })

        if (typeof sibling == "undefined")
            container.appendTo(this.w.document.body);
        else
            container.insertAfter(sibling);
        
        if (typeof block != "undefined"){
            this.container_map.set(container, block)

            var float = $('<div/>', {
                'class': 'container_floatBox'
            }).appendTo(container);

            var closeButton = $('<button/>', {
                'class': 'container_button',
                'text' : 'remove container',
                'title': 'click to remove highligthed container' 
            }).click(function(){self.deleteBlock(container)})
              .appendTo(float);

            var logButton = $('<button/>', {
                'class': 'container_button',
                'text' : 'insert comment',
                'title': 'click to insert comment' 
            }).click(function(){self.insertComments(container) })
            .appendTo(float);
        }

        var content = $('<div/>', {
            'class': 'container_content'
        }).appendTo(container);

        $('<h3/>', {
            'text': title
        }).appendTo(content);
        
        return content
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

    comments: function(block, div) {
        var self = this;
        var comments = this.container("Comments", block, div)

        var handle = function (){
            block.text = this.value
        }

        $('<textarea/>', {'title': "These comments won't be saved.", 
                        'style': "width: 100%; display: block; overflow: hidden; resize: vertical;",
                        'rows': 5, 
                        'text': block.text
                        }).change(handle).appendTo(comments)
    
        return this
    },

    // add comment block after a given container on a report
    //
    insertComments: function(container){
        var parent_block = this.container_map.get(container)

        var comments_block = {  blockType: "comments",
                            text : "hello"}

        var index = this.settings.blocks.indexOf(parent_block) + 1
        if ( index > 0 ){
            this.settings.blocks.splice(index, 0, comments_block);
            this.comments(this.settings.blocks[index], container)
        }   
    },

    // delete block of a given container
    //
    deleteBlock: function(container){
        var parent_block = this.container_map.get(container)

        var index = this.settings.blocks.indexOf(parent_block)
        if ( index != -1 ){
            this.settings.blocks.splice(index, 1);
            $(container).remove()
        }   
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

    // add current scatterplot to report settings
    addScatterplot : function(sp) {
        var conf = {
            'blockType' : "scatterplot",
            'locus' : sp.m.germlineV.system,
            'time'  : sp.m.t,
            'axisX' : sp.axisX.name,
            'axisY' : sp.axisY.name,
            'mode'  : sp.mode
        }

        if (this.indexOfBlock(conf) == -1){
            this.settings.blocks.push(conf)
            console.log({ msg: "scatterplot has been added to current report", type: "flash", priority: 1 });
        }
        else{
            console.log({ msg: "This scatterplot is already present in report", type: "flash", priority: 2 });
        }

    },

    indexOfBlock: function(block){
        // check if block object is already in list
        var index = this.settings.blocks.indexOf(block)
        if (index != -1) return index

        // check if a similar block object already exist
        var strblock = JSON.stringify(block);  
        for (var i=0; i< this.settings.blocks.length; i++){
            if (JSON.stringify(this.settings.blocks[i]) == strblock)
                return i;
        }
        return -1
    },

    // add a list of clones to current report
    addClones : function(list) {
        for (var i=0; i<list.length; i++){
            var clone_id  = m.clone(list[i]).id
            if (this.settings.clones.indexOf(clone_id) == -1)
                this.settings.clones.push(clone_id)
        }
    },

    // remove a clone from settings by clone id 
    removeClone : function(id) {
        var index = this.settings.clones.indexOf(id)
        if ( index != -1) this.settings.clones.splice(index, 1)
    },

    // print a block in the report using given conf
    block : function(conf){
        // no conf => nothing to do
        if (typeof conf == "undefined") return;

        // missing blocktype ?
        if (typeof conf.blockType == "undefined") return;

        // use correponding printer for blocktype 
        switch (conf.blockType) {
            case "scatterplot":
                this.scatterplot(conf)
                break;
            case "comments":
                this.comments(conf)
                break;
            default:
                break;
        }
    },

    // remove a block by index
    removeBlock : function(index) {
        this.settings.blocks.splice(index, 1)
    },

    scatterplot : function(conf) {

        if (typeof conf == "undefined")       conf = {}
        if (typeof conf.locus == "undefined") conf.locus = this.m.germlineV.system
        if (typeof conf.time == "undefined")  conf.time  = this.m.t
        if (typeof conf.axisX == "undefined") conf.axisX = this.m.sp.axisX.name
        if (typeof conf.axisY == "undefined") conf.axisY = this.m.sp.axisY.name
        if (typeof conf.mode == "undefined")  conf.mode  = this.m.sp.mode

        this.m.changeTime(conf.time)
        this.m.changeGermline(conf.locus, false)

        this.m.sp.changeSplitMethod(conf.axisX, conf.axisY, conf.mode)
        
        //resize 791px ~> 21cm
        this.m.sp.resize(791,250)
        this.m.sp.fastForward()
        
        var container_name  = this.m.getStrTime(conf.time, "short_name") + ' – ' + conf.locus;
        var w_sp = this.container(container_name, conf)
        w_sp.addClass("scatterplot");
        
        var svg_sp = document.getElementById(this.m.sp.id+"_svg").cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.setAttribute("viewBox","0 0 791 250");
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="'+this.m.sp.id+'_circle'+i+'"]')[0]
            var color = this.getCloneExportColor(i);
            $(circle).css({"fill": color});
            
            //remove virtual and disabled clones
            if (this.m.clone(i).germline != conf.locus || !this.m.clone(i).isInScatterplot() || !this.m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        
        var bar_container = svg_sp.querySelectorAll('[id="'+this.m.sp.id+'_bar_container"]')[0]
        bar_container.parentNode.removeChild(bar_container);
        
        w_sp.append(svg_sp)
        this.m.sp.resize();

        return this
    },
    
    readsStat3: function(time_list, locus_list) {
        if (typeof time_list == "undefined")  time_list  = this.m.samples.order;
        if (typeof locus_list == "undefined") locus_list = this.m.system_selected;
        var container = this.container('Reads distribution')
                
        var reads_stats = $('<table/>', {'class': "report_table"}).appendTo(container);

        this.readsStat_header(locus_list).appendTo(reads_stats);
        for (var i = 0; i < time_list.length; i++)
            this.readsStat_line(time_list[i], locus_list).appendTo(reads_stats);
        
        return this;
    },

    readsStat_header: function(locus_list){
        var header = $('<tr/>', {} )

        $('<th/>',     {'text': '#'}).appendTo(header);
        $('<th/>',     {'text': 'Sample'}).appendTo(header);
        for (var i = 0; i < locus_list.length; i++)
            $('<th/>', {'text': locus_list[i]}).appendTo(header);

        return header;
    },

    readsStat_line: function(time, locus_list){
        var line = $('<tr/>', {});

        $('<td/>',     {'text': this.m.getStrTime(time, "order")}).appendTo(line);
        $('<td/>',     {'text': this.m.getStrTime(time, "name")}).appendTo(line);
        var segmented_reads = this.m.reads.segmented[time]
        for (var i = 0; i < locus_list.length; i++){
            var locus_reads = this.m.reads.germline[locus_list[i]][time];
            var percent = 100*(locus_reads/segmented_reads);
            if (percent<0.1)
                percent = " (<0.1%)";
            else
                percent = " ("+percent.toFixed(1)+"%)";

            $('<td/>', {'text': locus_reads + percent}).appendTo(line);
        }

        return line;
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
        var container = this.container('Clonotypes')
        
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

        var link = "mailto:" + (typeof config !== 'undefined' ? (config.support || "support@vidjil.org") : "support@vidjil.org") +
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
        
        var index = this.settings.clones.indexOf(this.m.clone(cloneID).id)
        if (index != -1 && index <8) color = m.tag[index].color 

        return color;
    }
    
}

