
function Report(model, settings) {
    var self = this;
    this.m = model;

    // create storage in model if needed before saving
    if (typeof this.m.report_save == "undefined") 
    this.m.report_save = {}; 

    this.colorMode = "colorBy";     // "colorBy" / "tag" / TODO...
    this.clones    = []

    // name of setting sheet to use as default
    this.default_setting = "Full report";

    // hard coded default settings for report
    this.default_settings = {
        "Full report" : {
            name : "Full report",
            samples : undefined,
            locus : undefined,
            selected_color: "unique",
            blocks: [
                    {blockType: "file_info"},
                    {blockType: "sample_info", sample: "#1"},
                    {blockType: "reads_stats"},
                    {blockType: "monitor"},
                    {blockType: "scatterplot", sample: "#1", axisX:"V/5' gene", axisY:"J/3' gene", locus:"", mode:"grid"},
                    {blockType: "clones", info : ["productivity", "hypermutation", "5length"]},
                    {blockType: "log_db"},
                    {blockType: "comments"},
                    ],
            clones_fields: ["productivity", "hypermutation", "5length"]

        },
        "ALL -- Diagnosis" : {
            name : "ALL -- Diagnosis",
            samples : undefined,
            locus : undefined,
            selected_color: "unique",
            blocks: [
                {blockType: "file_info"},
                {blockType: "sample_info", time: "#1"},
                {blockType: "reads_stats"},
                {blockType: "scatterplot", sample: "#1", axisX:"V/5' gene", axisY:"J/3' gene", locus:"", mode:"grid"},
                {blockType: "clones", info : []},
                {blockType: "log_db"},
                {blockType: "comments"},
                ],
            clones_fields: []
        },
        "CLL -- Diagnosis" : {
            name : "CLL -- Diagnosis",
            samples : undefined,
            locus : undefined,
            selected_color: "unique",
            blocks: [
                {blockType: "file_info"},
                {blockType: "sample_info", time: this.m.t},
                {blockType: "reads_stats"},
                {blockType: "scatterplot", sample: "#1", axisX:"V/5' gene", axisY:"J/3' gene", locus:"", mode:"grid"},
                {blockType: "clones", info : ["productivity", "hypermutation", "5length"]},
                {blockType: "log_db"},
                {blockType: "comments"},
            ],
            clones_fields: ["productivity", "hypermutation", "5length"]
        }
    }

    // default blocks def
    this.available_blocks = {
        "file_info":    {'name': "Report information",  'unique': true,     'inMenu': true },
        "reads_stats":  {'name': "Reads stats per locus",'unique': true,    'inMenu': true },
        "sample_info":  {'name': "Sample information",  'unique': false,    'inMenu': true,
                         'parameters':[{
                                    'name': 'sample',
                                    'options' : function() {
                                        var o = []
                                        for (var i in self.m.samples.order) 
                                            o.push(self.m.samples.original_names[self.m.samples.order[i]])
                                        return o},
                                    'pretty'  : function(o){return self.m.getStrTime(self.m.getTimeFromFileName(o), "name")} 
                                      }]},
        "monitor":      {'name': "Monitor",             'unique': true,     'inMenu': true },
        "log_db":       {'name': "Database log",        'unique': true,     'inMenu': true },
        "clones":       {'name': "Clones",              'unique': true,     'inMenu': true,
                         'parameters':[{
                                    'name': 'info',
                                    'checkboxes' : ['productivity', 'hypermutation', '5length'],
                                        }]},
        "comments":     {'name': "Comments",            'unique': false,    'inMenu': false },
        "scatterplot":  {'name': function (c){ return "Plot: ["+ c.axisX +" | "+ c.axisY +"] ["+ c.locus +"]"},
                         'unique': false,    'inMenu': false,
                         'parameters':[{
                                    'name': 'sample',
                                    'options' : function() {
                                        var o = []
                                        for (var i in self.m.samples.order) 
                                            o.push(self.m.samples.original_names[self.m.samples.order[i]])
                                        return o},
                                    'pretty'  : function(o){return self.m.getStrTime(self.m.getTimeFromFileName(o), "name")} 
                                        }]}
    }
    
    if (typeof settings != "undefined")
        this.settings = settings;
    else
        this.settings = (JSON.parse(JSON.stringify(this.default_settings[this.default_setting]))); 

    this.local_settings = {};
    if (localStorage && localStorage.getItem('report_templates')){
        this.local_settings = JSON.parse(localStorage.getItem('report_templates'))
    }

    this.container_map = new WeakMap();

}

Report.prototype = {

    reset: function(){
        this.settings = (JSON.parse(JSON.stringify(this.default_settings[this.default_setting]))); 
    },


    /**
     * save current setting sheet
     * savename      Name for report
     * overwrite     (bool); overwrite report/template
     * destination   Save as report in analysis, or as template in localstorage
     */
    save: function(savename, overwrite, as_template){
        var self=this;

        // use name found in setting sheet if savename is not provided
        if (typeof savename == "undefined"){
            savename = this.settings.name;
        }

        // use default settings target if as_template is not provided
        if (as_template == undefined){
            as_template = true
        }

        // if settings does not contain a name -> retry
        if (typeof savename == "undefined" || savename == ""){
            console.log({ msg: "you must set a name to your report before saving it", type: "flash", priority: 2 });
            this.saveas();
            return;
        }

        // we are on a template settings, save as a new report instead
        if(typeof this.default_settings[savename] != "undefined"){
            this.saveas()
            return;
        }
        
        this.settings.name = savename;

        keys = Object.keys(this.default_settings)
        if (keys.indexOf(savename) != -1) {
            console.log({ msg: "You try to overwrite an default template, use 'save as template/report' to save it under a new name",
             type: "flash", priority: 2 });
            return;
        } else if (as_template && this.m.report_save[savename] != undefined ){
            console.log({ msg: "A report with the same name already exist. Please change the template name",
                type: "flash", priority: 2 });
            return;
        } else if (!as_template && this.local_settings[savename] != undefined ){
            console.log({ msg: "A local template with the same name already exist. Please change the report name",
                type: "flash", priority: 2 });
            return;
        }

        if (typeof this.m.report_save[savename] == "undefined" || overwrite){
            // save
            try {
                if (as_template && (this.local_settings[savename] == undefined || overwrite)){
                    var temp_settings = JSON.parse(JSON.stringify(this.settings))
                    temp_settings.clones  = []
                    temp_settings.locus   = undefined
                    temp_settings.samples = undefined
                    for (var b = temp_settings.blocks.length - 1; b >= 0; b--) {
                        var block = temp_settings.blocks[b]
                        block.sample = undefined
                    }
                    this.local_settings[savename] = temp_settings
                    localStorage.setItem('report_templates', JSON.stringify(this.local_settings))
                    console.log({ msg: "report template '"+savename+"' has been saved", type: "flash", priority: 1 });
                } else if (!as_template && (this.m.report_save[savename] == undefined || overwrite)) {
                    this.settings.clones = (JSON.parse(JSON.stringify(this.clones))); 
                    this.m.report_save[savename] = JSON.parse(JSON.stringify(this.settings))
                    console.log({ msg: "report settings '"+savename+"' has been saved", type: "flash", priority: 1 });
                    this.m.analysisHasChanged = true;
                }
                console.closeConfirmBox()
            } catch (error) {
                console.log({ msg: "failed to save report settings", type: "flash", priority: 3 });
            }
            this.menu()
        }
        else{
            console.confirmBox( "A report with this name already exist, saving will overwrite it </br>"+
                                "Use 'Save As' instead to create a new save under another name",
                                function(){self.save(savename, true, as_template)})
        }
    },

    /**
     * Open confirmBox to ask user to fill a name for report/template
     * Close confirmBox only if save succesed
     */
    saveas: function(overwrite, as_template){
        var self = this;

        var savename = true;
        if (typeof this.default_settings[this.settings.name] == "undefined")
            savename = this.settings.name
        

        console.confirmBox( "Enter a name to save this report</br>"+
                            "",
                            function(){self.save(console.confirm.input.val(), overwrite, as_template);},
                            savename,
                            close_by_callback=true )
    },

    delete: function(skipConfirm){
        var self = this

        if (typeof this.default_settings[this.settings.name] != "undefined"){
            console.log({ msg: "you cannot delete a default template", type: "flash", priority: 2 });
            return;
        }

        var savename = this.settings.name
        if (this.m.report_save[savename]){ // analysis
            if (typeof skipConfirm == "boolean" && skipConfirm){
                delete this.m.report_save[savename]
                this.load(this.default_setting); 
            }
            else{
                console.confirmBox( "Are you sure you want to delete ["+savename+"] report ?</br>",
                                    function(){self.delete(true)})
            }
        } else if (this.local_settings[savename]){ // template
            if (typeof skipConfirm == "boolean" && skipConfirm){
                delete this.local_settings[savename]
                localStorage.setItem('report_templates', JSON.stringify(this.local_settings))
                this.load(this.default_setting); 
            }
            else{
                console.confirmBox( "Are you sure you want to delete ["+savename+"] template ?</br>",
                                    function(){self.delete(true)})
            }
        }

    },

    // load a setting sheet from default_list or model using name
    // Available sources: analysis, template, default
    load: function(name, source){

        // exist in default settings list 
        if (typeof this.default_settings[name] != "undefined"){
            this.settings = (JSON.parse(JSON.stringify(this.default_settings[name]))); 
            this.menu();
            return
        }

        // exist in model 
        else if (source == "analysis" && typeof this.m.report_save[name] != "undefined"){
            this.settings = (JSON.parse(JSON.stringify(this.m.report_save[name]))); 
            if (typeof this.settings.clones != 'undefined' && this.settings.clones.length != 0)
            this.clones =  (JSON.parse(JSON.stringify(this.settings.clones)));
        }
        else if (source == "template" && typeof this.local_settings[name] != "undefined"){
            this.settings = (JSON.parse(JSON.stringify(this.local_settings[name]))); 
            this.initLocus()
        }
        else {
            //does not exist
            console.log("requested save does not exist")
        }

        this.menu();
        return
    },

    menu: function(){
        var template = document.getElementById("report-settings");
        var clone = template.content.firstElementChild.cloneNode(true);   
        console.popupHTML(clone)

        this.initSave()
        //this.initType()
        this.initSamples()
        this.initLocus()
        this.initColor()
        this.initClones()
        this.initBlocks()
    },

    initSave: function(){
        var self = this;

        var handle = function(){
            if (this.value) {
                var source = this.options[this.selectedIndex].getAttribute('source')
                self.load(this.value, source);
            } else {
                self.menu();
            }
        }

        var save_select = $("#report-settings-save")

        var div = $('<div/>',   {}).appendTo(save_select);

        var select = $('<select/>', { name: 'rs-save-select',
                                      id:   'rs-save-select' }).appendTo(div).change(handle);

        var optgrp_default = $('<optgroup/>',  { id: "optgroup_default_template", label: "Report templates", title: "Default reports; can be use as template"})

        var keys = Object.keys(this.default_settings);
        for (var i = 0; i < keys.length; i++){
            var name = keys[i];
            $('<option/>',  { text: name,
                            selected: (self.settings.name == name),
                            source: "default",
                            value: name}).appendTo(optgrp_default);
        }
        optgrp_default.appendTo(select);
 

        var optgrp_local_template = $('<optgroup/>',  { id: "optgroup_user_template", label: "Own templates", title: "User created reports templates"})

        keys = Object.keys(this.local_settings);
        for (var t = 0; t < keys.length; t++){
            var template_name = keys[t];
            $('<option/>',  { text: template_name,
                            selected: (self.settings.name == template_name),
                            source: "template",
                            value: template_name}).appendTo(optgrp_local_template);
        }
        optgrp_local_template.appendTo(select);


        var optgrp_users = $('<optgroup/>',  { id: "optgroup_report_saved", label: "Saved reports", title: "User report; stored locally"})

        keys = Object.keys(this.m.report_save);
        for (var j = 0; j < keys.length; j++){
            var savename = keys[j];
            $('<option/>',  { text: savename,
                              selected: (self.settings.name == savename),
                              source: "analysis",
                              value: savename}).appendTo(optgrp_users);
        }
        optgrp_users.appendTo(select);
/*
        if(typeof this.default_settings[this.settings.name] != "undefined")
            $("#rs-save-button").addClass("disabledClass")
        else
            $("#rs-save-button").remove("disabledClass")
*/

        if(typeof this.default_settings[this.settings.name] != "undefined")
            $("#rs-delete-button").addClass("disabledClass")
        else
            $("#rs-delete-button").remove("disabledClass")

    },

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

        var count = 0;
        for (i=0; i < this.m.samples.order.length; i++){
            var timeId = this.m.samples.order[i]

            var selected = (self.settings.samples.indexOf(this.m.getStrTime(timeId, "original_name")) != -1)
            var text = "#"+this.m.getStrTime(timeId, "order") +" "+ this.m.getStrTime(timeId, "name")

            if (selected) count++
            var div = $('<div/>',   { id:  'rs-sample-select'+i, 
                                        type: 'checkbox', 
                                        class: (selected) ? "rs-sample rs-selected" : "rs-sample rs-unselected",
                                        value: this.m.getStrTime(timeId, "original_name"),
                                        text: text}).appendTo(parent).click(handle)
        }
        $("#rs-selected-sample-count").html("["+count+" selected]")
    },

    /**
     * Get locus state inside export obj. true if present in list, false in other case
     */
    getLocusState: function(locus){
        return self.settings.locus.indexOf(locus) != -1
    },

    /**
     * Change the locus status after a click on one locus tile
     * Take into account the shift press status to modifiy the behavior of seleciton
     * Menu is rerender after modification
     */
    changeLocus: function(locusDom, shiftkey){
        var locus = $(locusDom).attr("value")
        if (!shiftkey){ // swich only this locus
            if (this.settings.locus.indexOf(locus) != -1){
                this.settings.locus.splice(this.settings.locus.indexOf(locus),1)
            } else {
                this.settings.locus.push(locus)
            }
        } else { // Switch all locus action
            if (this.settings.locus.indexOf(locus) == -1){// case 0; locus not present, hide all other, and show only this one
                this.settings.locus = [locus]
            } else if (this.settings.locus.length > 1 && this.settings.locus.indexOf(locus) != -1){// case 1; some/all locus present
                // hide all other locus
                this.settings.locus = [locus]
            } else if (this.settings.locus.length == 1 && this.m.system_selected.length > 1){ // only one active locus
                // Show all locus
                this.settings.locus = []
                for (var i=0; i<this.m.system_selected.length; i++){
                    this.settings.locus.push(this.m.system_selected[i])
                }
            }
        }
        this.initLocus() // rerender content
    },

    initLocus: function(){
        var self = this;

        // use displayed locus as default 
        if (typeof this.settings.locus == "undefined"){
            this.settings.locus = []
            for (var i=0; i<this.m.system_selected.length; i++)
                this.settings.locus.push(this.m.system_selected[i])
        }

        var handle = function(e){
            self.changeLocus(this, e.shiftKey)
        }

        var checkBoxes   = []
        var locus_select = $("#report-settings-locus-select")
        var parent       = $("#rs-locus-list")
        parent.empty() // remove all previous dom element if rerender
        for (var j = 0; j < this.m.system_available.length; j++){
            var locus = this.m.system_available[j]
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

    initColor: function(){
        var self = this;

        var handle1 = function(){
            self.settings.default_color = this.value;
        }
        var color_select1 = $("#rs-default-color")

        color_select1.change(handle1);

        $('<option/>',  {   text: "-- keep current color --",
                            selected: (self.settings.default_color == "default"),
                            value: "default"}).appendTo(color_select1);

        var available_axis = AXIS_COLOR
        for (var key in available_axis) {
            var axisP = Axis.prototype.getAxisProperties(available_axis[key])
            if (typeof axisP.hide == "undefined" || !axisP.hide){
                $('<option/>',  {   text:  axisP.name,
                                    selected: (self.settings.default_color == axisP.name),
                                    value: axisP.name}).appendTo(color_select1);
            }
        }

        var handle2 = function(){
            self.settings.selected_color = this.value;
        }
        var color_select2 = $("#rs-selected-color")

        color_select2.change(handle2);

        $('<option/>',  {   text: "use default color", 
                            selected: (self.settings.selected_color == "default"),
                            value : "default"}).appendTo(color_select2);
        $('<option/>',  {   text: "use unique color" , 
                            selected: (self.settings.selected_color == "unique"),
                            value : "unique"}).appendTo(color_select2);


    },  

    initClones: function(){
        var self = this;
        var main = $("#report-settings-clones")
        var parent = $("#report-clones-list");
        parent.empty() // Erase previous content

        // add/remove sample to list on click
        var handle = function(){
            self.removeClone($(this).attr("value"));
            $(this).parent().remove()
            report.initClones() // update
        }

        var count =0;
        for (var i=0; i<this.clones.length; i++){
            var cloneID = this.clones[i]
            
            var text, locus;
            for (var j=0; j<this.m.clones.length; j++){
                if ( this.m.clones[j].id == cloneID){
                    text = this.m.clones[j].getName()
                    locus = this.m.clones[j].getLocus()
                }
            }

            if (text != undefined){
                count++
                var div = $('<div/>',   {id:  'rs-clone-'+cloneID, 
                                        class: 'rs-selected',
                                        value: cloneID,
                                        text: text}).prepend(this.m.systemBox(locus)).appendTo(parent)
                                        
                          $('<button/>',{value: cloneID , 
                                        title: "remove clone from report",
                                        class: "icon-cancel button_right", 
                                        }).click(handle).appendTo(div)
            }
        }
        $("#rs-selected-clones-count").html("["+count+" selected]")

        if (count == 0){
            var info = $('<div/>', {text: "Add clonotypes to the report with"})
            $('<i/>', {class: "icon-star-2", style:"pointer-events:none;"}).appendTo(info)
            info.appendTo(parent)
        }


    },

    initBlocks: function(){
        var self = this;

        var handle = function(){
            self.removeBlock(parseInt($(this).attr("value")));
            self.initBlocks()
        }

        var handle_up = function(){
            self.upBlock(parseInt($(this).attr("value")));
            self.initBlocks()
        }

        var handle_down = function(){
            self.downBlock(parseInt($(this).attr("value")));
            self.initBlocks()
        }

        var block_list = $("#report-settings-block")
        block_list.find(".rs-flex").remove()
        block_list.find(".rs-flex-parent-v").remove()

        var parent = $('<div/>', { class: "rs-flex-parent-v"}).appendTo(block_list);
        for (var i = 0; i < this.settings.blocks.length; i++){
            var conf = this.settings.blocks[i]
            var text = this.getBlockName(conf)

            var div   = $('<div/>',   { class: "rs-block rs-selected",
                                        text: text}).appendTo(parent);
                        $('<button/>',{ value:  i , 
                                        class: "icon-cancel button_right", 
                                        title: "remove this section"
                                        }).click(handle).appendTo(div)
                        $('<button/>',{ value:  i , 
                                        class: "icon-down-open button_right",
                                        title: "move this section up"
                                        }).click(handle_down).appendTo(div)
                        $('<button/>',{ value:  i , 
                                        class: "icon-up-open button_right", 
                                        title: "move this section down"
                                        }).click(handle_up).appendTo(div)

            //this block has parameters
            if (this.available_blocks[conf.blockType] && this.available_blocks[conf.blockType].parameters){   
                for (var p in this.available_blocks[conf.blockType].parameters){
                    var parameter = this.available_blocks[conf.blockType].parameters[p]
                    
                    if (parameter.options)
                        this.parameterDivOptions(conf, parameter).appendTo(div)
                    else if (parameter.checkboxes)
                        this.parameterDivCheckboxes(conf, parameter).appendTo(div)
                    
                }
            }
        }


        var handle2 = function(){
            var block = {blockType : this.value }
            if (this.value == "sample_info") {
                block.sample = self.m.samples.original_names[self.m.t]
                block.timestamp = Date.now()
            }
            self.addBlock(block);
            self.initBlocks();
        }

        var div_select = $('<div/>',   {class : "rs-flex", text: "Add section: "}).appendTo(block_list);

        var select = $('<select/>', { name: 'rs-new-block-select',
                                      id:   'rs-new-block-select' }).appendTo(div_select).change(handle2);

        $('<option/>',  { text: "---", disabled:"disabled", selected: true}).appendTo(select);

        for (var block_type in this.available_blocks){
            var name = this.getBlockName({blockType: block_type, time : self.m.t })

            if (!this.available_blocks[block_type].inMenu) continue
            
            var already_exist = false
            for (var b in this.settings.blocks)
                if (this.settings.blocks[b].blockType == block_type)
                    already_exist = true

            if ( !this.available_blocks[block_type].unique || !already_exist )
                $('<option/>',  {   text: name,
                                    value: block_type}).appendTo(select);
        }

    },  

    parameterDivOptions: function(block, parameter){
        var self = this;

        var blockIndex = this.indexOfBlock(block)

        var handle = function(){
            if (this.value)
                self.settings.blocks[blockIndex][parameter.name] = this.value
        }

        var div = $('<div/>',   {class : "rs-flex-parent-h", text: parameter.name+": "}) 
        var select = $('<select/>').change(handle).appendTo(div);

        var options
        if (typeof parameter.options == 'function')
            options = parameter.options()
        else
            options = parameter.option

        for (var i in options) {
            var o = options[i]

            var text = o
            if (parameter.pretty) text = parameter.pretty(o)

            var selected = false
            if (o == block[parameter.name]) selected = true
            
            $('<option/>',  {   text:  text,
                                selected: selected,
                                value: o
                            }).appendTo(select);
        }

        return div
    },

    parameterDivCheckboxes: function(block, parameter){
        if (block[parameter.name] == undefined) {block[parameter.name] = []}

        var self = this;

        var blockIndex = this.indexOfBlock(block)

        var handle = function(){
            var p = self.settings.blocks[blockIndex][parameter.name]

            var index = p.indexOf(this.firstChild.value)

            if (index == -1){
                p.push(this.firstChild.value)
                this.firstChild.checked = true
            } else {
                this.firstChild.checked = ""
                p.splice(index, 1)
            }

        }


        var div = $('<div/>',   {class : "rs-flex-parent-h", text: parameter.name+": "}) 
        var dropdown = $('<span/>',   {class : "dropdown-check-list"}).appendTo(div)

        var anchorEvent = function(evt) {
            var checkList = $(this).parent()[0]
            if (checkList.classList.contains('visible'))
              checkList.classList.remove('visible');
            else
              checkList.classList.add('visible');
        }
        var span = $('<span/>',   {class : "rs-anchor", text: "Select "}).click(anchorEvent).appendTo(dropdown)
        var ul = $('<ul/>',   {class : "rs-items"}).appendTo(dropdown)

        var checkboxes 
        if (typeof parameter.checkboxes  == 'function')
            checkboxes  = parameter.checkboxes()
        else
            checkboxes = parameter.checkboxes
        
        for (var i in checkboxes) {
            var c = checkboxes[i]

            var checked = false
            if (block[parameter.name].indexOf(c) != -1) checked = true
            
            var li = $('<li/>', {text : c}).click(handle).appendTo(ul);
            $('<input/>', { type    : "checkbox", 
                            value   : c
                            }).prop('checked', checked)
                              .prependTo(li)
        }

        return div
    },

    getBlockName: function(conf){
        var text = ""

        switch (typeof this.available_blocks[conf.blockType].name) {
            case "string":
                text = this.available_blocks[conf.blockType].name
                break;
            case "function":
                try {
                    text = this.available_blocks[conf.blockType].name(conf)
                } catch (e) {
                    console.error("failed to generate report blockname for "+conf.blockType+" block")
                    text = conf.blockType
                }
                break;
            default:
                text = "unknow block"
                break;
            }

        return text
    },

    print: function(){ 

        if (typeof this.settings.samples != 'object' ||
                   this.settings.samples.length == 0 ) {
            console.log({   msg: "Report: select at least one sample before generating report", 
                            type: "flash", 
                            priority: 2 });
            return        
        }

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
        
        this.m.wait("Generating report...")
        var color; 
        if (this.settings.default_color != "default") 
            color = this.settings.default_color
        this.switchstate(this.settings.locus, array_sample_ids, color);

        var self = this
        this.w = window.open("report.html", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
        
        //convert cloneID into clone index
        this.list = []
        for (var j=0; j<this.clones.length; j++){
            cloneID = this.clones[j];
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
            
            if (self.settings.blocks)
                self.settings.blocks.forEach(function(block){
                    try {
                        self.block(block);
                    } catch (error) {
                        console.log("failed to print block " + block.blockType)
                    }
                    
                });
            
            self.restorestate()    
            self.m.resize()
            self.m.resume()
            self.m.update()
        }
        
    },
    
    savestate: function(){
        this.save_state = {};

        this.save_state.system_selected = this.m.system_selected.slice()
        this.save_state.samples_order = this.m.samples.order.slice()
        this.save_state.axis_color = this.m.color.axis.name
        this.save_state.time   = copyHard(this.m.t)
        if (typeof sp_export != "undefined"){
            this.save_state.locus = copyHard(sp_export.system)
            this.save_state.axisX = copyHard(sp_export.axisX.name)
            this.save_state.axisY = copyHard(sp_export.axisY.name)
            this.save_state.mode  = copyHard(sp_export.mode)
        }
        return this;
    },
    
    switchstate: function(system_list, sample_list, color){
        this.savestate();
        this.m.system_selected = system_list;
        if (typeof color != "undefined")
            this.m.color.set(color)
        this.m.changeTimeOrder( sample_list );
        return this;
    },
    
    restorestate: function(){
        this.m.system_selected = this.save_state.system_selected.slice()
        this.m.changeTimeOrder(this.save_state.samples_order)
        this.m.color.set(this.save_state.axis_color)

        // rerender with locus present in main page
        this.m.changeTime(this.save_state.time)
        this.m.changeGermline(this.save_state.locus, false)
        if (typeof sp_export != "undefined"){
            sp_export.changeSplitMethod(this.save_state.axisX, this.save_state.axisY, this.save_state.mode, false)
        }
        return this;
    },
    
    //add a new container to the html report 
    container : function(title, block, sibling) {
        var self = this;

        var container = $('<div/>', {
            'class': 'container'
        })

        var div_containers = self.w.document.getElementById("containers")

        if (typeof sibling == "undefined")
            container.appendTo(div_containers);
        else
            container.insertAfter(sibling);
        
        if (typeof block != "undefined"){
            this.container_map.set(container, block)


            var content = $('<div/>', {
                'class': 'container_content',
            }).appendTo(container);


            var content_header = $('<div/>', {
                'class': 'container_content',
                "style": "display: flex;justify-content: space-between;"
            }).appendTo(container);



            $('<h3/>', {
                'text': title
            }).appendTo(content_header);

            // Action icons, move, indert, delete
            var icons = $('<div/>', {'class': 'container_content',"style": "display: flex;font-size:100%;"})


            var upButton = $('<i/>', {
                'class': 'container_button pointer icon-up-open',
                'title': 'move this section up'
            }).click(function(){self.upContainer(container)})
              .appendTo(icons);

            var downButton = $('<i/>', {
                'class': 'container_button pointer icon-down-open',
                'title': 'move this section down'
            }).click(function(){self.downContainer(container)})
              .appendTo(icons);

            var logButton = $('<i/>', {
                'class': 'container_button pointer icon-pencil-1',
                'title': 'insert comments below this section'
            }).click(function(){self.insertComments(container) })
              .appendTo(icons);

            var closeButton = $('<i/>', {
                'class': 'container_button pointer icon-cancel',
                'title': 'remove this section'
            }).click(function(){self.removeContainer(container)})
              .appendTo(icons);

            icons.appendTo(content_header);
            content_header.appendTo(content);

            return content
        }
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
                        'placeholder': block.text != undefined ? block.text : ""
                        }).change(handle).appendTo(comments)
    
        return this
    },

    // add comment block after a given container on a report
    //
    insertComments: function(container){
        var parent_block = this.container_map.get(container)

        var comments_block = {  blockType: "comments",
                                text : "Write comments"}

        var index = this.settings.blocks.indexOf(parent_block) + 1
        if ( index > 0 ){
            this.settings.blocks.splice(index, 0, comments_block);
            this.comments(this.settings.blocks[index], container)
        }   
    },

    // delete block of a given container
    //
    removeContainer: function(container){
        var block = this.container_map.get(container)

        this.removeBlock(block)
        $(container).remove()
        this.menu();
    },

    upContainer: function(container){
        var block = this.container_map.get(container)

        this.upBlock(block)
        $(container).insertBefore($(container).prev());
        this.menu();
    },

    downContainer: function(container){
        var block = this.container_map.get(container)

        this.downBlock(block)
        $(container).insertAfter($(container).next());
        this.menu();
    },

    info : function(block) {
        var info = this.container("Report information", block)
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


        if (typeof this.m.db_key != "undefined" &&
            typeof this.m.db_key.sample_set_id != "undefined"){
            content.push({'label': "Hosting server:"  , 'value' : window.location.hostname});
            }
        
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
    
    sampleInfo : function(block) {
        //retrieve timeID
        var time
        if (block.sample && typeof block.sample == "string"){
            if (block.sample[0] == '#')
                time = this.m.getTimeFromOrder(parseInt(block.sample.substring(1)))
            else
                time = this.m.getTimeFromFileName(block.sample)
        }

        if (typeof time == "undefined" || time == -1)
            return this

        var sinfo = this.container("Sample information ("+this.m.getStrTime(time, "short_name")+")", block)
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

    // TODO: make it use block 
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
    
    
    addGraph : function(block) {
    
        // We can't output a monitoring graph with a single sample 
        if (report.settings.samples.length < 2)
            return this

        //resize 791px ~> 21cm
        graph.resize(791,250)
        graph.draw(0)
        
        var w_graph = this.container("Monitoring", block)
        w_graph.addClass("graph");
        
        var svg_graph = this.svg_graph()
        
        w_graph.append(svg_graph)
        graph.resize();
        
        return this;
    },
    
    //TODO
    normalizeInfo: function (block) {
        if (this.m.normalization_mode != this.NORM_FALSE){
            var container = this.container("Normalization", block)
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
        var block = {
            'blockType' : "scatterplot",
            'locus' :   sp.system,
            'sample':   this.m.samples.original_names[sp.m.t],
            'axisX' :   sp.axisX.name,
            'axisY' :   sp.axisY.name,
            'mode'  :   sp.mode
        }

        if (sp.axisX.scale && sp.axisX.useCustomScale)
            block.domainX = sp.axisX.scale.domain.slice(0)
        if (sp.axisY.scale && sp.axisY.useCustomScale)
            block.domainY = sp.axisY.scale.domain.slice(0)
        

        if (this.indexOfBlock(block) == -1){
            this.settings.blocks.push(block)
            console.log({ msg: "Plot has been added to current report", type: "flash", priority: 1 });
        }
        else{
            console.log({ msg: "This plot is already present", type: "flash", priority: 2 });
        }

    },

    addBlock: function(block) {
        if (this.indexOfBlock(block) == -1 || !this.isUniqueBlock(block)){
            this.settings.blocks.push(block)
            console.log({ msg: "Section added to the report", type: "flash", priority: 1 });
        }
        else{
            console.log({ msg: "This section is already present", type: "flash", priority: 2 });
        }
    },

    indexOfBlock: function(block){
        // check if block object is already in list
        var index = this.settings.blocks.indexOf(block)
        if (index != -1) return index

        // check if a similar block object already exist
        var strblock = JSON.stringify(block);  
        for (var i=0; i< this.settings.blocks.length; i++){
            if (JSON.stringify(this.settings.blocks[i]) == strblock){
                return i;
            }
        }
        return -1
    },

    // add a list of clones to current report
    addClones : function(list) {
        for (var i=0; i<list.length; i++){
            var clone_id  = m.clone(list[i]).id
            if (this.clones.indexOf(clone_id) == -1)
                this.clones.push(clone_id)
        }
        // If menu is already open, update it
        // Usefull when user already selected clonotype, but don't add them
        if ($("#report-menu").is(":visible")){
            this.menu()
        }
    },

    // remove a clone from settings by clone id 
    removeClone : function(id) {
        var index = this.clones.indexOf(id)
        if ( index != -1) this.clones.splice(index, 1)
    },

    // print a block in the report using given conf
    block: function(conf){
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
            case "file_info":
                this.info(conf)
                break;
            case "sample_info":
                this.sampleInfo(conf)
                break;
            case "reads_stats":
                this.readsStat(conf)
                break;
            case "monitor":
                this.addGraph(conf)
                break;
            case "log_db":
                this.sampleLog(conf)
                break;
            case "clones":
                this.cloneList(conf)
                break;
            default:
                break;
        }
    },

    // remove a block (can use either block object or index in settings.blocks array)
    removeBlock : function(block) {
        var index;
        if (typeof block == "number")
            index = block;
        
        if (typeof block == "object")
            index = this.indexOfBlock(block);

        if (index > -1 && index < this.settings.blocks.length)
            this.settings.blocks.splice(index, 1)
    },

    upBlock : function(block) {
        var index;
        if (typeof block == "number")
            index = block;
        
        if (typeof block == "object")
            index = this.indexOfBlock(block);

        if (index > 0 && index < this.settings.blocks.length){
            block = this.settings.blocks.splice(index, 1)[0];
            this.settings.blocks.splice(index-1, 0, block);
        }
    },

    downBlock: function(block){
        var index;
        if (typeof block == "number")
            index = block;
        
        if (typeof block == "object")
            index = this.indexOfBlock(block);

        if (index > -1 && index < this.settings.blocks.length-1){
            block = this.settings.blocks.splice(index, 1)[0];
            this.settings.blocks.splice(index+1, 0, block);
        }
    },

    isUniqueBlock: function(block){
        if (typeof block.blockType != "string")
            return false

        if (typeof this.available_blocks[block.blockType] != "object")
            return false

        if (typeof this.available_blocks[block.blockType].unique == "boolean")
            return this.available_blocks[block.blockType].unique

        return false
    },

    isInMenuBlock: function(block){
        if (typeof block.blockType != "string")
            return false

        if (typeof this.available_blocks[block.blockType] != "object")
            return false

        if (typeof this.available_blocks[block.blockType].inMenu == "boolean")
            return this.available_blocks[block.blockType].inMenu

        return false
    },

    scatterplot : function(block) {
        if (typeof block == "undefined")       block = {}
        if (typeof block.locus == "undefined") block.locus = sp_export.system
        if (block.locus == "")                 block.locus = sp_export.system
        if (typeof block.sample == "undefined")block.sample= this.m.samples.original_names[this.m.t]
        if (typeof block.axisX == "undefined") block.axisX = sp_export.axisX.name
        if (typeof block.axisY == "undefined") block.axisY = sp_export.axisY.name
        if (typeof block.mode == "undefined")  block.mode  = sp_export.mode

        //retrieve timeID
        var time
        if (block.sample && typeof block.sample == "string"){
            if (block.sample[0] == '#')
                time = this.m.getTimeFromOrder(parseInt(block.sample.substring(1)))
            else
                time = this.m.getTimeFromFileName(block.sample)
        }

        if (typeof time == "undefined" || time == -1)
            return this

        this.m.changeTime(time)
        this.m.changeGermline(block.locus, false)

        sp_export.changeSplitMethod(block.axisX, block.axisY, block.mode, true)
        if (typeof block.domainX != "undefined")
            sp_export.updateScaleX(block.domainX)
        if (typeof block.domainY != "undefined")
            sp_export.updateScaleY(block.domainY)
        
        //resize 791px ~> 21cm
        sp_export.resize(771,250)
        sp_export.fastForward()
        
        var container_name  =   sp_export.toString() +"  ["+
                                this.m.getStrTime(time, "order")+"]."+
                                this.m.getStrTime(time, "short_name");
        var w_sp = this.container(container_name, block)
        w_sp.addClass("scatterplot");
        
        var svg_sp = document.getElementById(sp_export.id+"_svg").cloneNode(true);
        
        //set viewbox (same as resize)
        svg_sp.setAttribute("viewBox","0 0 791 250");
        
        for (var i = 0; i < this.m.clones.length; i++) {
            var circle = svg_sp.querySelectorAll('[id="'+sp_export.id+'_circle'+i+'"]')[0]
            var color = this.getCloneExportColor(i);
            $(circle).css({"fill": color});
            
            //remove virtual and disabled clones
            if (this.m.clone(i).germline != block.locus || !this.m.clone(i).isInScatterplot() || !this.m.clone(i).isActive()) {
                circle.parentNode.removeChild(circle);
            }
        }
        
        if (block.mode != "bar"){
            var bar_container = svg_sp.querySelectorAll('[id="'+sp_export.id+'_bar_container"]')[0]
            bar_container.parentNode.removeChild(bar_container);
        }

        if (block.mode != "grid" && block.mode != "tsne"){
            var plot_container = svg_sp.querySelectorAll('[id="'+sp_export.id+'_plot_container"]')[0]
            plot_container.parentNode.removeChild(plot_container);
        }

        w_sp.append(svg_sp)
        sp_export.resize();

        return this
    },
    
    readsStat: function(block, time_list, locus_list) {
        if (typeof time_list == "undefined")  time_list  = this.m.samples.order;
        if (typeof locus_list == "undefined") locus_list = this.m.system_selected;
        var container = this.container('Samples, loci, reads', block)
                
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
        $('<th/>',     {'text': 'Sampling date'}).appendTo(header);
        $('<th/>',     {'text': '+'}).appendTo(header);
        for (var i = 0; i < locus_list.length; i++)
            $('<th/>', {'text': locus_list[i]}).appendTo(header);

        return header;
    },

    readsStat_line: function(time, locus_list){
        var line = $('<tr/>', {});

        $('<td/>',     {'text': '#' + this.m.getStrTime(time, "order")}).appendTo(line);
        $('<td/>',     {'text': this.m.getStrTime(time, "name")}).appendTo(line);
        $('<td/>',     {'text': this.m.getStrTime(time, "sampling_date")}).appendTo(line);
        $('<td/>',     {'text': this.m.getStrTime(time, "delta_date")}).appendTo(line);
        var segmented_reads = this.m.reads.segmented[time]
        for (var i = 0; i < locus_list.length; i++){
            var locus_reads = this.m.reads.germline[locus_list[i]][time];
            var percent = 100*(locus_reads/segmented_reads);
            if (locus_reads == 0)
                percent = "";
            else if (percent<0.1)
                percent = " (<0.1%)";
            else
                percent = " ("+percent.toFixed(1)+"%)";

            $('<td/>', {'text': this.m.toStringThousands(locus_reads) + percent}).appendTo(line);
        }

        return line;
    },
    
    cloneList : function(block) {

        if (this.list.length == 0) return this

        var container = this.container('Clonotypes', block)
        container.parent().css("page-break-inside", "auto") // revert css value to allow this block on 2+ pages
        
        for (var i=0; i<this.list.length; i++){
            var cloneID = this.list[i]
            if (this.m.clone(cloneID).hasSizeConstant())
                this.clone(cloneID, block).appendTo(container);
        }
        
        return this
    },
    
    clone : function(cloneID, block) {
        var color = this.getCloneExportColor(cloneID);
        var clone = $('<div/>', {'class': 'clone'})
        var clone_polyline = document.getElementById("polyline" + cloneID)
        
        var head = $('<span/>', {'class': 'clone_head'}).appendTo(clone);
        //clone svg path icon
        if (clone_polyline != null){
            var icon = $('<span/>', {'class': 'icon'}).appendTo(head);
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            var polyline = clone_polyline.cloneNode(true)
            polyline.setAttribute("style", "stroke-width:30px; stroke:"+color);
            svg.appendChild(polyline)
            svg.setAttribute("viewBox","0 0 791 300");
            svg.setAttribute("width","80px");
            svg.setAttribute("height","30px");
            icon.append(svg)
        }
        
        //clone label
        $('<span/>', {'text': ">"+this.m.clone(cloneID).getShortName()+'\u00a0', 'class': 'clone_name', style : 'color:'+color}).appendTo(head);
        if (typeof this.m.clone(cloneID).c_name != "undefined"){
            $('<span/>', {'text': this.m.clone(cloneID).c_name+'\u00a0', 'class': 'clone_name', style : 'color:'+color}).appendTo(head);
        }
        
        //clone reads stats
        var reads_stats = $('<span/>', {'class': 'clone_table'}).appendTo(clone);


        var system = this.m.clone(cloneID).getLocus()
        var systemGroup = this.m.systemGroup(system)

        var header = "sample # </br>"+
                    "reads # </br>"+
                    "reads % </br>"+
                    system + " %"

        if (systemGroup != system && systemGroup != '')
            header += "</br>"+systemGroup+" %"

        $('<span/>', {  'html':  header,
                        'class': 'clone_value'}).appendTo(reads_stats);

        for (var i2=0; i2<this.m.samples.order.length; i2++){
            var t2 = this.m.samples.order[i2]
            var sizes    = this.m.clone(cloneID).getStrAllSystemSize(t2)

            var html = "#"+this.m.getStrTime(t2, "order") + "</br>"+
                        this.m.clone(cloneID).getReads(t2)+ "</br>"+
                        sizes.global+ "</br>"+
                        sizes.system

            if (systemGroup != system && systemGroup != '')
                html += "</br>"+sizes.systemGroup

            $('<span/>', {  'html':  html,
                            'class': 'clone_value'}).appendTo(reads_stats);
            }
    

        // Fill more information depending of the settings for clone informations (productivity, hypermutation, ...)
        var fields = {
            'productivity':  function(c){ return {'text': c.getProductivityNameDetailed()+'\u00a0', 'class': 'clone_value'} },
            'hypermutation': function(c){ return c.getVIdentityIMGT(t) == "unknown" ? undefined : {'text': "V-REGION Identity: "+ c.getVIdentityIMGT(t)+'%\u00a0', 'class': 'clone_value'} },
            '5length':       function(c){ return {'text': "V length: "     + c.getSegLength("5", (c.germline.includes("+") ? false : true))+'\u00a0', 'class': 'clone_value'}}
            }
        var more_info = $('<span/>', {'class': 'clone_table'}).appendTo(clone);

        var field_keys = Object.keys(fields)
        for (var k=0; k<field_keys.length; k++){
            var field_key = field_keys[k]

            if (block.info.indexOf(field_key) != -1){
                var content = fields[field_key](this.m.clone(cloneID))
                if (content)
                    $('<span/>', content ).appendTo(more_info);
            }
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

    sampleLog: function(block) {
        if (typeof this.m.logs == 'undefined')
            return this

        // remove logs with specific text
        var filters = ["load sample", "load analysis"]

        var filtered_logs = []
        var isFiltered;
        for (var i=0; i<this.m.logs.length; i++){

            isFiltered = false
            for (var j=0; j<filters.length; j++)
                if (this.m.logs[i].message.indexOf(filters[j]) != -1)
                    isFiltered = true

            if (!isFiltered)
                filtered_logs.push(this.m.logs[i])
        }

        // all logs have been filtered out
        if (filtered_logs.length == 0)
            return this

        var div_log = this.container("Log", block)
        var table = $('<table/>', {'class': 'log-table flex'}).appendTo(div_log);

        for (var l=0; l < filtered_logs.length; l++ ){
            line = this.logLine(filtered_logs[l]);
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
        var color = this.m.clone(cloneID).getColor();
        switch (this.settings.selected_color) {
            case "unique":
                var index = this.clones.indexOf(this.m.clone(cloneID).id)
                color = colorGeneratorIndex(index)
                break;
            default:
                color = this.m.clone(cloneID).getColor();
                break;
        }
        
        return color;
    }
    
}

