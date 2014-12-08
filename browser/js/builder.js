function Builder(model) {
    this.m = model; //Model utilisé
    this.m.view.push(this); //synchronisation au Model
    this.colorMethod = "";
    this.width_left_container = $("#left-container")
        .css("width")


    this.drag_separator = false
}

//TODO need a reset function

Builder.prototype = {

    init: function () {
        var self = this;

        d3.select("#visu-separator")
            .on("mousedown", function () {
                self.dragSeparator()
            })
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

        this.build_tagSelector()
        this.build_displaySelector()
        this.build_info_container()
        this.build_clusterSelector()
        this.build_settings()
        if (typeof config != 'undefined' && typeof config.use_database != 'undefined' && config.use_database) this.build_db()
        
        if (this.m.samples.order.length == 1) this.resizeGraph(0) 
        else this.resizeGraph(50) 
    },

    update: function () {

            this.build_info_container()

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
    },

    dropSeparator: function () {
        if (this.drag_separator) {
            this.m.resize();
            this.drag_separator = false;

            var sel = window.getSelection();
            sel.removeAllRanges();
        }
    },
    
    build_settings: function () {
        var self = this;
        var normalize_list = document.getElementById("normalize_list")
        normalize_list.innerHTML=""
        
        var input = document.createElement("input")
        input.type = "radio"
        input.value= -1;
        input.name = "normalize_list"
        input.id = "reset_norm"
        input.checked=true;
        
        var div = document.createElement("div")
        div.onclick = function () {
            self.m.compute_normalization(-1) 
            this.firstChild.checked=true
            self.m.update()
        }
        div.className="buttonSelector"
        div.appendChild(input)
        div.appendChild(document.createTextNode("none"))
        
        normalize_list.appendChild(div)
        
        for (var i=0; i<self.m.clones.length; i++){
            if (typeof self.m.clone(i).expected != "undefined"){
                
                var input = document.createElement("input")
                input.value=i;
                input.type = "radio"
                input.name = "normalize_list"
                if (self.m.normalization.id==i) input.checked=true;
                
                var text = document.createTextNode(self.m.clone(i).getName() + " => " +self.m.clone(i).expected)
                
                var div = document.createElement("div")
                div.onclick = function () {
                    self.m.compute_normalization(this.firstChild.value) 
                    this.firstChild.checked=true
                    self.m.update()
                }
                div.className="buttonSelector"
                div.appendChild(input)
                div.appendChild(text)
                
                normalize_list.appendChild(div)
            }
        }
        
        for (var key in self.m.data){
            if (typeof self.m.data[key].expected != "undefined"){
                
                var input = document.createElement("input")
                input.value=key;
                input.type = "radio"
                input.name = "normalize_list"
                if (self.m.normalization.id==key) input.checked=true;
                
                var text = document.createTextNode(key + " => " +self.m.data[key].expected)
                
                var div = document.createElement("div")
                div.onclick = function () {
                    self.m.compute_data_normalization(this.firstChild.value) 
                    this.firstChild.checked=true
                    self.m.update()
                }
                div.className="buttonSelector"
                div.appendChild(input)
                div.appendChild(text)
                
                normalize_list.appendChild(div)
            }
        }
        
    },

    /*complete tagSelector html element with correct info about current tagname
     * */
    build_tagSelector: function () {
        var self = this;

        var tagSelector = document.getElementById("tagSelector")
        var listTag = tagSelector.getElementsByTagName("ul")[0]

        //reset
        listTag.innerHTML = "";

        for (var i = 0; i < tagName.length; i++) {
            (function (i) {
                var span3 = document.createElement('span');
                span3.onclick = function (tag) {
                    self.editTagName(i, this);
                }
                span3.className = "edit_button"
                span3.appendChild(document.createTextNode("..."))

                var span1 = document.createElement('span');
                span1.className = "tagColorBox tagColor" + i
                span1.onclick = function () {
                    var cloneID = parseInt(document.getElementById('tag_id').innerHTML);
                    self.m.clone(cloneID).changeTag(i)
                    $('#tagSelector').hide('fast')
                }
                
                var span2 = document.createElement('span');
                span2.className = "tagName" + i + " tn"
                span2.onclick = function () {
                    var cloneID = parseInt(document.getElementById('tag_id').innerHTML);
                    self.m.clone(cloneID).changeTag(i)
                    $('#tagSelector').hide('fast')
                }

                var div = document.createElement('div');
                div.className = "tagElem"
                div.appendChild(span1)
                div.appendChild(span2)
                div.appendChild(span3)

                var li = document.createElement('li');
                li.appendChild(div)

                listTag.appendChild(li);
            })(i)
        }
        


        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode("expected size : "))

        var span2 = document.createElement('span');
        var input = document.createElement('input');
        input.type = "number";
        input.step = "0.0001"
        input.id = "normalized_size";
        input.onkeydown = function () {
            if (event.keyCode == 13) document.getElementById('normalized_size_button')
                .click();
        }
        
        span2.appendChild(input)
        
        var span3 = document.createElement('button');
        span3.appendChild(document.createTextNode("ok"))
        span3.id = "normalized_size_button";
        span3.onclick = function () {
            var cloneID = parseInt(document.getElementById('tag_id')
                .innerHTML);
            var size = parseFloat(document.getElementById('normalized_size').value);
            
            if (size>0 && size<1){
                document.getElementById('normalized_size').value = ""
                self.m.clone(cloneID).expected=size;
                self.m.compute_normalization(cloneID, size)
                self.m.update()
                $('#tagSelector')
                    .hide('fast')
                self.build_settings()
            }else{
                myConsole.popupMsg("expected input between 0.0001 and 1")
            }
        }
        
        var div = document.createElement('div');
        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(span3)
        
        var li = document.createElement('li');
        li.appendChild(div)

        listTag.appendChild(li);
        
        document.getElementById("normalized_data").onkeydown = function () {
            if (event.keyCode == 13) document.getElementById('normalized_data_button').click();
        }
        document.getElementById("normalized_data_button").onclick = function () {
            var data = document.getElementById('data_name').innerHTML
            var size = parseFloat(document.getElementById('normalized_data').value);
            
            document.getElementById('normalized_data').value = ""
            self.m.compute_data_normalization(data, size)
            self.m.update()
            $('#dataMenu').hide('fast')
            self.build_settings()
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

        var input = document.createElement('input');
        input.type = "text";
        input.id = "new_tag_name";
        input.value = tagName[tagID];
        input.style.width = "100px";
        input.style.border = "0px";
        input.style.margin = "0px";
        input.onkeydown = function () {
            if (event.keyCode == 13) document.getElementById('btnSaveTag')
                .click();
        }
        $(input).focusout(function() {
            self.build_tagSelector()
            self.build_displaySelector()
        })
        divParent.appendChild(input);
        divParent.onclick = "";

        var a = document.createElement('a');
        a.className = "button";
        a.appendChild(document.createTextNode("save"));
        a.id = "btnSaveTag";
        a.onclick = function () {
            var newTagName = document.getElementById("new_tag_name")
                .value;
            tagName[tagID] = newTagName
            self.build_tagSelector()
            self.build_displaySelector()
            self.m.analysisHasChanged = true
        }
        divParent.appendChild(a);
        $('#new_tag_name')
            .select();
    },

    /* 
     * */
    edit: function (elem, data) {
        var self = this;
        var divParent = elem.parentNode;
        divParent.innerHTML = "";

        var input = document.createElement('input');
        input.type = "text";
        input.id = "edit_value";
        input.value = self.m.samples[data][self.m.t];
        input.style.width = "200px";
        input.style.border = "0px";
        input.style.margin = "0px";
        input.onkeydown = function () {
            if (event.keyCode == 13) document.getElementById('btnSave')
                .click();
        }
        $(input).focusout(function() {
            m.update()
        })
        divParent.appendChild(input);
        divParent.onclick = "";

        var a = document.createElement('a');
        a.className = "button";
        a.appendChild(document.createTextNode("save"));
        a.id = "btnSave";
        a.onclick = function () {
            self.m.samples[data][self.m.t] = document.getElementById("edit_value").value
            self.build_info_container()
            self.m.update()
            self.m.analysisHasChanged = true
        }
        divParent.appendChild(a);
        $('#edit_value')
            .select();
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
        for (var i = 0; i < tagName.length; i++) {
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
                    nextDisplayTag(this)
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
                        m.changeGermline(system)
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

        initTag();
    },
    
    //TODO need to build complete Selector 
    build_clusterSelector: function () {
        var self = this;

        var clusterSelector = document.getElementById("clusterby_button")
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
        
        if (self.m.clones[0].germline){
            
            var system = document.createElement('a');
                system.className = "buttonSelector"
                system.onclick = function () { m.clusterBy(function(id){return m.clone(id).getSystem()});} 
                system.appendChild(document.createTextNode("system"));
            clusterSelector.appendChild(system)
        }
    },

    toggle_left_container: function () {
        console.log("plop")
        var self = this
        var elem = $("#left-container")

        if (elem.css("display") == "none") {
            elem.css("display", "")
            self.m.resize();
        } else {
            elem.css("display", "none")
            self.m.resize();
        }
    },

    toggle_segmenter: function () {
        var self = this
        seg = $("#segmenter")
        bot = $("#bot-container")
        mid = $("#mid-container")

        if (seg.css("display") == "none") {
            seg.css("display", "")
            seg.css("overflow-x", "scroll")
            bot.animate({
                height: "125px"
            }, 400, function () {
                //$("#toggle-segmenter").html("+ + +")
            })
            mid.animate({
                bottom: "125px"
            }, 400, function () {
                self.m.resize();
            })
        } else {
            seg.css("display", "none")
            seg.css("overflow-x", "hidden")
            bot.animate({
                height: "25px"
            }, 400, function () {
                //$("#toggle-segmenter").html("- - -")
            })
            mid.animate({
                bottom: "25px"
            }, 400, function () {
                self.m.resize();
            })
        }
    },

    build_info_container: function () {
        var self = this
        var parent = document.getElementById("info")
        parent.innerHTML = "";

        //file name
        var div_data_file = document.createElement('div');
        div_data_file.id = "info_data_file"
        div_data_file.appendChild(document.createTextNode(this.m.getPrintableAnalysisName()));
        parent.appendChild(div_data_file)

        //global info
        var div_analysis_file = this.build_info_line("info_analysis_file", "analysis", this.m.analysisFileName)
        parent.appendChild(div_analysis_file)
        
        //system
        if (this.m.system =="multi"){
            var div_multi_system = this.build_multi_system()
            parent.appendChild(div_multi_system)
        }else{
            var div_system = this.build_info_line("info_system", "system", this.m.system)
            parent.appendChild(div_system)
        }
        
        //point info
        var div_point = this.build_info_line("info_point", "point",  this.m.getStrTime(this.m.t, "name") )

        if (this.m.samples.order.length > 1){
            var nextTime = document.createElement('span')
            nextTime.appendChild(document.createTextNode(">"));
            nextTime.className = "next_button button_right"
            nextTime.onclick = function () {
                self.m.nextTime();
            }
            div_point.appendChild(nextTime)    
            
            if (self.m.isPlaying){
                var stop = document.createElement('span')
                stop.appendChild(document.createTextNode("stop"));
                stop.className = "stop_button button_right"
                stop.onclick = function () {
                    self.m.stop();
                }
                div_point.appendChild(stop)
            }else{
                var play = document.createElement('span')
                play.appendChild(document.createTextNode("play"));
                play.className = "play_button button_right"
                play.onclick = function () {
                    self.m.play(self.m.t);
                }
                div_point.appendChild(play)
            }
            
            var previousTime = document.createElement('span')
            previousTime.appendChild(document.createTextNode("<"));
            previousTime.className = "previous_button button_right"
            previousTime.onclick = function () {
                self.m.previousTime();
            }
            div_point.appendChild(previousTime)        
        }
        
        var editTimeName = document.createElement('span')
        editTimeName.appendChild(document.createTextNode("edit"));
        editTimeName.className = "button_right"
        editTimeName.onclick = function () {
            self.edit(this, "names");
        }
        div_point.appendChild(editTimeName)
        
        var infoTime = document.createElement('span')
        infoTime.appendChild(document.createTextNode("Info"));
        infoTime.className = "button_right"
        infoTime.onclick = function () {
            myConsole.dataBox(self.m.getPointHtmlInfo(self.m.t));
        }
        div_point.appendChild(infoTime)
        
        parent.appendChild(div_point)
        
        var div_date = this.build_info_line("info_date", "date", this.m.getStrTime(this.m.t, "sampling_date") )
        var span = document.createElement('span')
        span.appendChild(document.createTextNode("edit"));
        span.className = "button_right"
        span.onclick = function () {
            self.edit(this, "timestamp");
        }
        // div_date.appendChild(span)
        parent.appendChild(div_date)

        var val = "no reads segmented" ;

        if (this.m.reads.segmented[this.m.t] > 0)
        {
        var percent = (this.m.reads.segmented[this.m.t] / this.m.reads.total[this.m.t]) * 100
        val = this.m.reads.segmented[this.m.t] + " reads" + " (" + percent.toFixed(2) + "%)"

	var warning = false ;
	if (percent < 10)  { val += " – Very few reads segmented" ;  warning = "alert" ;  }
	else if (percent < 50)  { val += " – Few reads segmented" ;  warning = "warning" ;  }
        }

        var div_segmented = this.build_info_line("info_segmented", "segmented", val, warning)
        parent.appendChild(div_segmented)
        
        var div_total = this.build_info_line("info_total", "total", this.m.reads.total[this.m.t] + " reads")
        parent.appendChild(div_total)


        var div_color = this.build_info_color()
        parent.appendChild(div_color) 

        initTag();
    },

    build_multi_system: function () {
        var div = document.createElement('div');
        div.className = "info_line";
        
        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode("system : "));
        span1.className = "info_row"
        
        var span2 = document.createElement('span');
        span2.className = "info_row_content"
        
        var keys = 0 ;

	var key_list = this.m.system_available;
	key_list.sort();

        for (var k in key_list) {
	    key = key_list[k];

            if ((key == "TRA" || key == "IGH") && keys > 0) {
                span2.appendChild(document.createElement("br"));
            }

            keys += 1 ;

            var checkbox=document.createElement("input");
                checkbox.type="checkbox";
                checkbox.id = "checkbox_system_"+key
                checkbox.className = "hiddenCheckBox"
                checkbox.appendChild(document.createTextNode(key))
                if (this.m.system_selected.indexOf(key) != -1)
                    checkbox.checked=true
                checkbox.onchange = function () {
                    m.update_selected_system()
                }
            
            var span_system = this.build_systemBox(key)
            span_system.className = "systemBoxMenu";
                
            var span = document.createElement('span');
            span.className = "systemBoxNameMenu";
            if (this.m.system_selected.indexOf(key) == -1)
            span.className = "systemBoxNameMenu inactive";
            span.appendChild(span_system)
            span.appendChild(checkbox)
            span.appendChild(document.createTextNode(key))
            span.onclick = function () {
                this.firstChild.nextSibling.click();
            }
            
            span2.appendChild(span)
        }
        
        div.appendChild(span1)
        div.appendChild(span2)
        
        return div
    },
    
    build_systemBox: function (system){
        
        var span = document.createElement('span')
        span.className = "systemBox";
        if ((typeof system != 'undefined')){
            span.appendChild(document.createTextNode(this.m.germlineList.getShortcut(system)));
            if (this.m.system_selected.indexOf(system) != -1) 
                span.style.background = this.m.germlineList.getColor(system)
            span.title = system
        }else{
            span.appendChild(document.createTextNode("?"));
            if (typeof system != 'undefined')
                span.title = system ;
        }
        return span
    },
    
    build_info_line: function (id, name, value, className) {
        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode(name + " : "));
        span1.className = "info_row"
        var span2 = document.createElement('span');
	if (!(typeof(className) === "undefined"))
	    {
		if (className)
		{
		    span2.className = className ;
		}
	    }
        span2.appendChild(document.createTextNode(value));

        var div = document.createElement('div');
        div.id = id
        div.className = "info_line"
        div.appendChild(span1)
        div.appendChild(span2)

        return div
    },

    build_info_color: function () {
        var self = this

        var div = document.createElement('div');
        div.className = "info_color"

        var span0 = document.createElement('span');
        span0.className="info_row"
        var span1 = document.createElement('span');
        var span2 = document.createElement('span');
        var span3 = document.createElement('span');

        switch (this.m.colorMethod) {
        case "N":
            span0.appendChild(document.createTextNode("color by n length : "));

            span1.appendChild(document.createTextNode(" N=0 "));

            span2.className = "gradient";

            span3.appendChild(document.createTextNode("N=" + this.m.n_max));

            break;
        case "Tag":
            span0.appendChild(document.createTextNode("color by tag: "));

            for (var i = 0; i < tagName.length; i++) {
                var spantag = document.createElement('span');
                spantag.className = "tagColorBox tagColor" + i
                spantag.id = "fastTag" + i
                spantag.onclick = function () {
                    nextDisplayTag(this)
                }

                span2.appendChild(spantag);
            }
            break;
        case "abundance":
            span0.appendChild(document.createTextNode("color by size: "));

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
    
    build_db: function(){
        
    },

}
