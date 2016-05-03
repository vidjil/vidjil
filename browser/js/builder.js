function Builder(model, database) {
    if (typeof model != "undefined"){
        this.m = model; //Model utilisé
        this.m.view.push(this); //synchronisation au Model
    }

    if(typeof database != 'undefined') {
        this.db = database;
    }
    this.colorMethod = "";
    this.width_left_container = $("#left-container")
        .css("width")

    this.drag_separator = false
}

//TODO need a reset function

Builder.prototype = {

    init: function () {
        var self = this;
        try {
            d3.select("#visu-separator")
                .on("mousedown", function () {
                    self.dragSeparator();
                });
            d3.select("#visu-container")
                .on("mouseup", function () {
                    self.dropSeparator()
                })
            d3.select("#visu-container")
                .on("mousemove", function () {
                    self.updateSeparator()
                })
            d3.select("#vertical-separator")
                .on("click", function () {
                    self.toggle_left_container()
                });

            this.build_top_container()
            this.build_info_container()
            this.build_clusterSelector()
            this.initTag();

            if (this.m.samples.order.length == 1) this.resizeGraph(0) 
            else this.resizeGraph(50)

        } catch (err) {
            this.db.error(err.stack)
        }
    },

    update: function () {
        try {
            this.build_top_container()
            this.build_info_container()
            this.updateTagBox();
        } catch(err) {
            this.db.error(err.stack)
        }
    },
    
    updateElem: function () {},

    updateElemStyle: function () {},

    resize: function () {},

    dragSeparator: function () {
        this.drag_separator = true;
    },

    updateSeparator: function () {
        if (this.drag_separator) {
            var coordinates = [0, 0];
            coordinates = d3.mouse(d3.select("#visu-container")
                .node());

            var position = coordinates[1]
            var total_height = document.getElementById("visu-container")
                .offsetHeight;

            if (position < 2 || total_height - position < 2) this.dropSeparator()

            var height = position / total_height * 100
            if (height > 90) height = 100;
            if (height < 10) height = 0;
            
            this.resizeGraph(height)
        }
    },
    
    resizeGraph : function (graphSize) {
        var spSize = 100 - graphSize

        document.getElementById("visu")
            .style.height = spSize + "%"
        document.getElementById("visu2")
            .style.height = graphSize + "%"
        this.m.resize();
    },

    dropSeparator: function () {
        if (this.drag_separator) {
            this.drag_separator = false;

            var sel = window.getSelection();
            sel.removeAllRanges();
        }
    },
    
    build_settings: function () {
        var self = this;
        var normalize_list = document.getElementById("normalize_list");
        normalize_list.innerHTML="";
        
        var input = document.createElement("input");
        input.type = "radio";
        input.value= -1;
        input.name = "normalize_list";
        input.id = "reset_norm";
        input.checked=true;
        
        var div = document.createElement("div");
        div.onclick = function () {
            self.m.compute_normalization(-1) ;
            this.firstChild.checked=true;
            self.m.update();
        };
        div.className="buttonSelector";
        div.appendChild(input);
        div.appendChild(document.createTextNode("none"));
        
        normalize_list.appendChild(div);
        
        // Regroup Clones and Data into a single array with only critical data
        var divElements = [];
        for (var i = 0; i < self.m.clones.length; ++i) {
            if (typeof self.m.clone(i).expected != "undefined") {
                divElements.push({
                    id: i,
                    name: self.m.clone(i).getName(),
                    expected: self.m.clone(i).expected
                });
            }
        }
        
        for (var key in self.m.data) {
            if (typeof self.m.data[key].expected != "undefined") {
                divElements.push({
                    id: key,
                    name: self.m.data[key],
                    expected: self.m.data[key].expected
                });
            }
        }

        // Create clickable div for each Clone and Data Entry
        for (var j = 0; j < divElements.length; ++j) {
            var elem = self.setupNormalizeDiv(divElements[i], "buttonSelector");
            console.log(elem);
            normalize_list.appendChild(elem);
        }
        
    },

    
    /* Fonction servant à "déverouiller" l'appel de la fonction compute_normalization(), ainsi qu'à apposer le 'check' au checkBox 'normalize'
     * */
    displayNormalizeButton: function() {
    var normalizeDiv = document.getElementById("normalizeDiv");
    normalizeDiv.style.display="";
	var normalizeCheckbox = document.getElementById("normalize");
	this.m.normalization_switch(true);
    normalizeCheckbox.disabled = false;
	normalizeCheckbox.checked = true;
    },
    
    /* 
     * */
    editTagName: function (tagID, elem) {
        var self = this;
        var divParent = elem.parentNode;
        divParent.innerHTML = "";

        var input = this.setupInput("new_tag_name", "", "text", this.m.tag[tagID].name);
        input.style.width = "100px";
        input.style.border = "0px";
        input.style.margin = "0px";
        input.onkeydown = function (e) {
            e = e || window.event;
            var key = e.keyCode;
            if (key == 0) key = e.which ;
            if (key == 13) document.getElementById('btnSaveTag')
                .click();
        };
        divParent.appendChild(input);
        divParent.onclick = "";

        var a = document.createElement('a');
        a.className = "button";
        a.appendChild(document.createTextNode("save"));
        a.id = "btnSaveTag";
        a.onclick = function (event) {
            event.stopPropagation();
            event.preventDefault();
            var newTagName = document.getElementById("new_tag_name")
                .value;
            self.m.tag[tagID].name = newTagName;
            self.m.analysisHasChanged = true;
        };
        divParent.appendChild(a);
        $('#new_tag_name')
            .select();
    },

    /* 
     * */
    edit: function (elem, data) {
        var self = this;
        var id = "edit_value";
        var init_value = self.m.getStrTime(self.m.t, data);
        var save_callback = function() {
            var value = document.getElementById(id).value;
            self.m.samples[data][self.m.t] = value
            self.post_save(self);
        }

        this.build_input_edit(id, elem, init_value, save_callback)
    },

    //TODO rename
    build_edit: function (input, id, elem, callback) {
        var divParent = elem.parentNode;
        divParent.innerHTML = "";

        divParent.appendChild(input);
        divParent.onclick = "";

        $(input).on('save', callback);
        $(input).select();
    },

    build_input_edit: function(id, elem, value, callback) {
        var input = this.create_edit_input(id, value);
        this.build_edit(input, id, elem, callback);
    },

    create_edit_input: function (id, value) {
        var input = this.setupInput(id, "", "text", value);
        this.setup_edit_input(input);
        input.style.width = "200px";
        input.style.border = "0px";
        input.style.margin = "0px";
        return input;
    },

    setup_edit_input: function (input) {
        input.onkeydown = function (e) {
            e = e || window.event;
            var key = e.keyCode
            if (key == 0) key = e.which 
    //        if (key == 13) $(input).trigger("save");
            else if (key == 27) m.update()
        }
        $(input).focusout(function() {
            setTimeout(function(){
                $(input).trigger("save");
      //          m.update()
            }, 500);
        })
    },
    
    post_save: function(self) {
        self.build_top_container()
        self.build_info_container()
        self.m.update()
        self.m.analysisHasChanged = true
    },

    update_model_data: function(fieldName, value, field_parent) {
        if(typeof field_parent != 'undefined')
            this.m[field_parent][fieldName]= value;
        else
            this.m[fieldName] = value;
        this.post_save(this);
    },

    update_model_sample_data: function(fieldName, value, field_parent) {
        if(typeof field_parent != 'undefined')
            this.m[field_parent][fieldName][this.m.t]= value;
        else
            this.m[fieldName][this.m.t] = value;
        this.post_save(this);
    },

    /*complete displaySelector menu with correct info about current tagname / top
     * */
    build_displaySelector: function () {
        var self = this;

        var displaySelector = document.getElementById("displaySelector")
        var listTag = document.getElementById("tagList")
        var listGermline = document.getElementById("germline_list")
        
        //reset
        listTag.innerHTML = "";
        listGermline.innerHTML = "";

        //init tag list
        for (var i = 0; i < this.m.tag.length; i++) {
            (function (i) {
                var span3 = document.createElement('span');
                span3.onclick = function (tag) {
                    self.editTagName(i, this);
                }
                span3.className = "edit_button"
                span3.appendChild(document.createTextNode("..."))

                var span1 = document.createElement('span');
                span1.className = "tagColorBox tagColor" + i

                var span2 = document.createElement('span');
                span2.className = "tagName" + i + " tn"

                var div = document.createElement('div');
                div.className = "tagElem"
                div.id = "tagDisplay" + i
                div.onclick = function () {
                    self.nextDisplayTag(this)
                }
                div.appendChild(span1)
                div.appendChild(span2)
                div.appendChild(span3)

                var li = document.createElement('li');
                li.appendChild(div)

                listTag.appendChild(li);
            })(i)
        }

        //init slider
        var max_top = 0;
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.clone(i).top > max_top)
                max_top = this.m.clone(i).top
        }
        max_top = (Math.ceil(max_top / 5)) * 5
        document.getElementById("top_slider")
            .max = max_top;
            
        //init notation
        if (this.m.notation_type == "scientific") {
            document.getElementById("notation").checked = true
        }
        
        //init system
        if (this.m.system == "multi") {
            $("#system_menu").css("display", "")
            $("#color_system_button").css("display", "")
            
            for (var key in this.m.system_available) {
                var system = this.m.system_available[key];
                (function (system){
                    var radio=document.createElement("input");
                        radio.type="radio";
                        radio.name="germline";
                        radio.value=system
                        if (this.m.germlineV.system==system) radio.checked=true
                        
                    div = document.createElement('div');
                    div.onclick = function(){
                        m.changeGermline(system, false)
                    }
                    div.className="buttonSelector"
                    div.appendChild(radio)
                    div.appendChild(document.createTextNode(system))
                    
                    li = document.createElement('li');
                    li.appendChild(div)
                    listGermline.appendChild(li);
                })(system)
            }
             
        }else{
            $("#system_menu").css("display", "none")
            $("#color_system_button").css("display", "none")
        }

        this.initTag();
    },
    
    //TODO need to build complete Selector 
    build_clusterSelector: function () {
        var self = this;
    /*
        var clusterSelector = document.getElementById("cluster_menu")
        clusterSelector.innerHTML = "";
        
        if (self.m.clones[0]._target){
        
            var target = document.createElement('a');
                target.className = "buttonSelector"
                target.onclick = function () { m.clusterBy(function(id){return m.clone(id)['_target']});}
                target.appendChild(document.createTextNode("target"));
            clusterSelector.appendChild(target)
            
            var targetV = document.createElement('a');
                targetV.className = "buttonSelector"
                targetV.onclick = function () { m.clusterBy(function(id){return m.clone(id)['_target.V-GENE']});}
                targetV.appendChild(document.createTextNode("target V"));
            clusterSelector.appendChild(targetV)
            
            var targetJ = document.createElement('a');
                targetJ.className = "buttonSelector"
                targetJ.onclick = function () { m.clusterBy(function(id){return m.clone(id)['_target.J-GENE']});} 
                targetJ.appendChild(document.createTextNode("target J"));
            clusterSelector.appendChild(targetJ)
            
            var clonotype = document.createElement('a');
                clonotype.className = "buttonSelector"
                clonotype.onclick = function () { m.clusterBy(function(id){return m.clone(id)['_clonotype']});} 
                clonotype.appendChild(document.createTextNode("clonotype"));
            clusterSelector.appendChild(clonotype)
        }
    */
    },

    toggle_left_container: function () {
        $("#left-container").toggle()
        this.m.resize();
    },

    build_info_container: function () {
        var self = this
        try {
            var parent = document.getElementById("info")
            parent.innerHTML = "";

            var patient_info = typeof this.m.info != 'undefined' ? this.m.info : "";
            var div_patient_info = this.create_generic_info_container(
                    patient_info,
                    'patient_info',
                    'patient_info_text',
                    'patient information',
                    'info');
            parent.appendChild(div_patient_info)

            //global info
            /*var div_analysis_file = this.build_info_line("info_analysis_file", this.m.analysisFileName)
            parent.appendChild(div_analysis_file)*/

            //system
            if (this.m.system =="multi"){
                var div_multi_system = this.build_multi_system()
                parent.appendChild(div_multi_system)
            }else{
                var div_system = this.build_info_line("info_system", this.m.system)
                parent.appendChild(div_system)
            }

            //point info
            var sample_div = document.createElement("div")
            sample_div.className = "sample_details"

            var point_value = this.m.getStrTime(this.m.t, "name")
            point_value = point_value != "" ? point_value : "-/-"
            var point_name_container = document.createElement("div")
            point_name_container.className += "inline-block_90 centered ellipsis"
            point_name_container.title = point_value
            point_name_container.appendChild(document.createTextNode(point_value))

            var infoTime_container = document.createElement("div")
            infoTime_container.className = "inline-block_10"
            var infoTime = self.createClickableElem('span',
                [icon('icon-info', 'sample information')],
                "",
                "button",
                function () {
                    console.log({"type": "big-popup", "msg": self.m.getPointHtmlInfo(self.m.t)});
                }
            );
            infoTime_container.appendChild(infoTime)
            var div_point = this.build_composite_info_line("info_point", [infoTime_container, point_name_container])

            $(div_point).on("dblclick", function() {
                self.edit(this, "names");
            });

            sample_div.appendChild(div_point)

            var span_date = document.createElement("span")
            span_date.appendChild(document.createTextNode(this.m.getStrTime(this.m.t, "sampling_date")))
            var nav_container = document.createElement("div")
            nav_container.className += " centered inline-block_90"
            nav_container.appendChild(span_date)

            var play_stop_container_div = document.createElement("div")
            play_stop_container_div.className = "inline-block_10"
            sample_div.appendChild(play_stop_container_div)

            if (this.m.samples.order.length > 1){
                var nextTime = self.createClickableElem('span',
                    [icon('icon-right-open-1', 'next sample')],
                    "",
                    "next_button button",
                    function () {
                        self.m.nextTime();
                    }
                );
                nav_container.appendChild(nextTime)

                if (self.m.isPlaying){
                    var stop = self.createClickableElem('div',
                        [icon('icon-pause', 'pauses cycling')],
                        "",
                        "stop_button button",
                        function () {
                            self.m.stop();
                        }
                    );

                    play_stop_container_div.appendChild(stop)
                } else {
                    var play = self.createClickableElem('div',
                        [icon('icon-play', 'cycle through samples')],
                        "",
                        "play_button button",
                        function () {
                            self.m.play(self.m.t);
                        }
                    );
                    play_stop_container_div.appendChild(play)
                }
                
                var previousTime = self.createClickableElem('span',
                    [icon('icon-left-open-1', 'previous sample') ],
                    "",
                    "previous_button button",
                    function () {
                        self.m.previousTime();
                    }
                );
                nav_container.insertBefore(previousTime, nav_container.childNodes[0]);
            }

            var span = self.createClickableElem('span',
                [document.createTextNode("edit")],
                "",
                "button_right",
                function () {
                    self.edit(this, "timestamp");
                }
            );
            var div_date = this.build_composite_info_line("info_date", [play_stop_container_div, nav_container])

            // div_date.appendChild(span)
            sample_div.appendChild(div_date)

            parent.appendChild(sample_div)

            var reads_div = document.createElement("div")
            reads_div.className = "reads_details"

            // Segmented reads
            var div_segmented = this.build_line_read_number("info_segmented", "analyzed reads", "analyzed", this.m.reads.segmented_all)
            div_segmented.title = "total: " + this.m.toStringThousands(this.m.reads.total[this.m.t])
            reads_div.appendChild(div_segmented)


            // Segmented reads, on the selected system(s)
            if (this.m.system == "multi") {
                var div_segmented = this.build_line_read_number("info_selected_locus", "selected locus", "on selected locus", this.m.reads.segmented)
                reads_div.appendChild(div_segmented)
            }

            parent.appendChild(reads_div)

            var clear_div = document.createElement("div")
            clear_div.className = "clear"
            parent.appendChild(clear_div)

            var div_color = this.build_info_color()
            parent.appendChild(div_color)

            var div_sequence_info = this.create_sample_info_container(
                    this.m.getInfoTime(this.m.t),
                    'sequence_info',
                    'info_text',
                    'sample information',
                    'info');
            parent.appendChild(div_sequence_info)

            this.initTag();
        } catch(err) {
            this.db.error(err.stack);
        }

    },

    build_line_read_number: function (id, label, qualifier, read_number) {
        var val = "no read";
        var warning_title = false ;
        var warning_class = '' ;

        if (read_number[this.m.t] > 0)
        {
            var percent = (read_number[this.m.t] / this.m.reads.total[this.m.t]) * 100
            val = this.m.toStringThousands(read_number[this.m.t]) + " (" + percent.toFixed(2) + "%)"

	    if (percent < 10)  {
                warning_title = "Very few reads " + qualifier ;
                warning_class = "alert" ;
            }
	    else if (percent < 50)  {
                warning_title = "Few reads " + qualifier ;
                warning_class = "warning" ;
            }
        }
        div = this.build_named_info_line(id, label, val, false);

        if (warning_class != "") {
            var warning_span = document.createElement('span')
            warning_span.className = "warningReads " + warning_class;
            warning_span.appendChild(icon('icon-warning-1', warning_title));
            div.appendChild(warning_span);
        }
        return div;
    },

    build_top_container: function () {
        var self = this;
        var parent = document.getElementById("top_info");
        parent.innerHTML = "";
        parent.appendChild(document.createTextNode(this.m.getPrintableAnalysisName()));

        var selector = document.createElement('div');
        selector.className = 'selector';
        selector.id = 'patientSelector';
        parent.appendChild(selector);
        var interm = document.createElement('div');
        selector.appendChild(interm);
        var menu_box = document.createElement('div');
        menu_box.className = "menu_box";
        interm.appendChild(menu_box);

        if (m.sample_set_id != 'undefined') {
            var open_patient = document.createElement('a');
            open_patient.className = "buttonSelector";
            open_patient.appendChild(document.createTextNode("open patient"));
	    open_patient.onclick = function() {
	        db.call('sample_set/index', {'id' : m.sample_set_id});
	    }
            menu_box.appendChild(open_patient);

            var save_analysis = document.createElement("a");
            save_analysis.className = "buttonSelector"
            save_analysis.appendChild(document.createTextNode("save patient"));
            save_analysis.onclick = function() {
                db.save_analysis();
            }
            menu_box.appendChild(save_analysis);
        }

        $(parent).on('mouseover', function() {
            showSelector('patientSelector');
        })
        document.title = this.m.getPrintableAnalysisName()
    },

    create_sample_info_container: function(info, className, id, placeholder, target) {
        var self = this;
        var container = this.create_info_container(info, className, id, placeholder);
        $(textarea).on("change", function() {
            self.update_model_sample_data(target, this.value, "samples");
        });
        return container;
    },

    create_generic_info_container: function(info, className, id, placeholder, target) {
        var self = this;
        var container = this.create_info_container(info, className, id, placeholder);
        $(textarea).on("change", function() {
            self.update_model_data(target, this.value);
        });
        return container;
    },

    // TODO ambiguous with build_info_container => find another name ?
    create_info_container: function (info, className, id, placeholder, target) {
        var self = this;
        var container = document.createElement('div');
        container.className = className;

        textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.className = 'info_container';
        textarea.innerHTML = info ;
        textarea.setAttribute('placeholder', placeholder);

        container.appendChild(textarea);

        return container;
    },

    build_multi_system: function () {
        var div = document.createElement('div');
        div.className = "info_line locus_line";
        
        var span2 ;
        var keys = 0 ;

    	var key_list = this.m.system_available;
    	key_list.sort();

        var last_key = "";

        for (var k in key_list) {
    	    key = key_list[k];

            // Are we at the start of a new group of locus ?
            if (key.substring(0,2) != last_key.substring(0,2) || keys == 0) {

                if (keys > 0)
                    // Flush existing span2
                    div.appendChild(span2)

                span2 = document.createElement('span')
                span2.className = "locus_row"
            }
            last_key = key ;

            keys += 1 ;

            var checkbox = this.setupInput("checkbox_system_" + key, "", "checkbox", "");
            checkbox.className = "hiddenCheckBox"
            checkbox.appendChild(document.createTextNode(key))
            if (this.m.system_selected.indexOf(key) != -1)
                checkbox.checked=true

            checkbox.onchange = function () {
                m.toggle_system(this.id.replace("checkbox_system_",""))
            }
            
            var span_system = this.m.systemBox(key)
                
            var span = document.createElement('span');
            span.className = "systemBoxNameMenu "+key;
            if (this.m.system_selected.indexOf(key) == -1)
                span.className = "systemBoxNameMenu inactive " + key;
            span.appendChild(span_system)
            span.appendChild(checkbox)
            span.appendChild(document.createTextNode(key))
            span.onclick = function (e) {
                if (e.shiftKey) {
                    m.keep_one_active_system(this.firstChild.nextSibling.textContent)
                } else {
                    this.firstChild.nextSibling.click();
                }
            }
            
            span2.appendChild(span)
        }
        
        div.appendChild(span2)
        
        return div
    },
    
    build_info_line: function (id, value, className) {
        var val = value != ""? value : "-/-"
        var span = document.createElement('span');
	if (!(typeof(className) === "undefined"))
	    {
		if (className)
		{
		    span.className = className ;
		}
	    }
        span.appendChild(document.createTextNode(val));

        var div = document.createElement('div');
        div.id = id
        div.className = "info_line"
        div.appendChild(span)

        return div
    },

    build_composite_info_line: function(id, children) {
        var div = document.createElement('div')
        div.id = id
        div.className = "info_line"

        for(var i = 0; i < children.length; i++) {
            div.appendChild(children[i])
        }
        return div;
    },

    build_named_info_line: function (id, name, value, className) {
        var div = this.build_info_line(id, value, className);
        var inner_span = div.firstChild;
        div.innerHTML = null;

        var info_row = document.createElement("span");
        info_row.className = "info_row";
        info_row.appendChild(document.createTextNode(name));

        div.appendChild(info_row);
        div.appendChild(inner_span);
        return div;
    },

    build_info_color: function () {
        var self = this

        var div = document.createElement('div');
        div.className = "info_color centered vertical_space"

        var span0 = document.createElement('span');
        var span1 = document.createElement('span');
        var span2 = document.createElement('span');
        var span3 = document.createElement('span');

        switch (this.m.colorMethod) {
        case "N":
            span0.appendChild(document.createTextNode("N length"));

            span1.appendChild(document.createTextNode(" 0 "));

            span2.className = "gradient";

            span3.appendChild(document.createTextNode(" " + this.m.n_max + " "));

            break;
        case "Tag":

            for (var i = 0; i < this.m.tag.length; i++) {
                var spantag = document.createElement('span');
                spantag.className = "tagColorBox tagColor" + i
                spantag.id = "fastTag" + i
                spantag.onclick = function () {
                    self.nextDisplayTag(this)
                }

                span2.appendChild(spantag);
            }
            break;
        case 'productive':
            span0.appendChild(document.createTextNode('not productive '));
            var spanNotProductive = document.createElement('span')
            spanNotProductive.style.backgroundColor = colorProductivity('false')
            spanNotProductive.className = 'tagColorBox'
            var spanProductive = document.createElement('span')
            spanProductive.style.backgroundColor = colorProductivity('true')
            spanProductive.className = 'tagColorBox'
            span1.appendChild(spanNotProductive)
            span1.appendChild(spanProductive)
            span2.appendChild(document.createTextNode('productive'));

            var spanNoCDR3 = document.createElement('span')
            spanNoCDR3.className = 'tagColorBox tagColor8'
            span3.style.marginLeft = '20px'
            span3.appendChild(document.createTextNode(' no CDR3 '));
            span3.appendChild(spanNoCDR3);

            break;
        case "abundance":
            span0.appendChild(document.createTextNode("abundance"));

            span1.appendChild(document.createTextNode(" 0% "));

            span2.className = "gradient";

            span3.appendChild(document.createTextNode(" 100%"));

            break;
        }

        div.appendChild(span0)
        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(span3)
        return div;
    },
    
    initTag: function (){
        for (var i =0; i<this.m.tag.length; i++){
            $(".tagColor"+i).prop("title", this.m.tag[i].name);
            $(".tagName"+i).html(this.m.tag[i].name);
        }
        this.updateTagBox();
    },
    
  
    updateTagBox: function(){
        for (var i =0; i<this.m.tag.length; i++){
            if (this.m.tag[i].display){
                $(".tagColor"+i).removeClass("inactiveTag")
            }else{
                $(".tagColor"+i).addClass("inactiveTag")
            }
        }
    },
    
    nextDisplayTag: function(elem){
        var id_tag = elem.id.charAt( elem.id.length-1 ) 
        var s = this.m.tag[id_tag].display;
        this.m.tag[id_tag].display = !s;
        this.m.update();
    },

    // Build an html input tag
    setupInput: function(id, name, type, value) {
        var input = document.createElement("input");
        if(id != "") input.id = id;
        if(name != "") input.name = name;
        if(value != "") input.value = value;
        input.type = type;
        return input;
    },

    // Build a clickable div element that triggers model update
    setupNormalizeDiv: function(elem, className) {
        var self = this;
        var div = document.createElement("div");
        var inputNode = this.setupInput("", "normalize_list", "radio", elem.id);
        if (this.m.normalization.id == elem.id) input.checked = true;
        var textNode = document.createTextNode(elem.name + " → " + elem.expected);

        div.onclick = function () {
            self.m.compute_data_normalization(this.firstChild.value);
            this.firstChild.checked = true;
            self.m.update();
        }

        div.className = className;
        div.appendChild(inputNode);
        div.appendChild(textNode);
        return div;
    },

    createClickableElem: function(type, children, id, className, onclick) {
        var element = document.createElement(type);

        for (var i = 0; i < children.length; ++i)
            element.appendChild(children[i]);
        if (id != "" && typeof id != "undefined") element.id = id;
        if(className != "" && typeof className != "undefined") element.className = className;

        if (typeof onclick === "function")
            element.onclick = onclick;
        else if (typeof onclick != "undefined")
            console.log("Error: invalid parameter " + onclick + " is not a function");

        return element;
    },

}
