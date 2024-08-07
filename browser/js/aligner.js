require(['./js/aligner_menu',
         './js/aligner_layer']);

/** segment 
 * Segment is a view object to see the sequences of the selected clones in the model <br>
 * some function are provided to allow alignement / highlight / imgt request / ...
 * @constructor
 * @param {string} id - dom id of the html div who will contain the segmenter
 * @param {Model} model
 * @augments View
 * @this View
 * */
function Aligner(id, model, database) {
    
    View.call(this, model);
    this.db = database;
    
    this.id = id;
    this.m = model;
    this.memtab = [];
    this.sequence = {};
    this.sequence_order = [];
    this.is_open = false;
    this.aligned = false;   
    this.selectedAxis = [];
    this.index = [];
}

Aligner.prototype = {

    /**
     * init the view before use
     * */
    init: function () {
        this.build();
    },

    /**
     * build needed html elements (button / highlight menu)
     * 
     * */
    build: function () {
        var self = this;
        try {
            self.build_segmenter();
            for (var c_id = 0; c_id < self.m.clones.length; c_id++)
                self.build_sequence(c_id);
            self.build_align_settings_menu();
            self.build_menu();
            self.build_axis_menu();
                
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    build_menu: function(){
        var self = this;

        for (var i in ALIGNER_MENU){
            var menu = ALIGNER_MENU[i];

            var parent = document.getElementById(menu.id);
            var menuC = parent.getElementsByClassName("menu-content")[0];
            
            for (var c in menu.checkbox){
                var mc = menu.checkbox[c];
                var template = document.getElementById("aligner-checkbox");
                var clone = template.content.firstElementChild.cloneNode(true);
                var input = clone.getElementsByClassName("aligner-checkbox-input")[0];
                var text = clone.getElementsByClassName("aligner-checkbox-text")[0];

                var id  = "aligner_checkbox_"+mc.id;
                clone.title = mc.title;
                input.id = id;

                if (localStorage.getItem(`aligner_layers_${mc.title}`)){
                    input.checked = localStorage.getItem(`aligner_layers_${mc.title}`) === "true"
                    self.toggleLayers(mc.layers, input.checked, true);
                } else {
                    input.checked = mc.enabled;
                }

                clone.setAttribute("for", id);
                text.innerHTML = mc.text;

                this.connect_checkbox(clone, mc.title, mc.layers);
                menuC.appendChild(clone);
            }
        }
    }, 

    build_axis_menu: function(){
        var self = this;

        var available_axis = AXIS_ALIGNER;
        this.selectedAxis  = []

        var menu = document.getElementById("segmenter_axis_select");
        for (var i in available_axis) {
            var axis_p = Axis.prototype.getAxisProperties(available_axis[i]);

            if (typeof axis_p.hide != 'undefined' && axis_p.hide) continue;

            var axis_label = document.createElement('label');
            axis_label.setAttribute('for', "sai"+i);
            axis_label.className = "aligner-checkbox-label";
            if (typeof axis_p.class == "string") axis_label.className += " "+axis_p.class
            axis_label.title = axis_p.doc;

            var axis_option = document.createElement('span');
            var axis_text = document.createTextNode(axis_p.name);
            var axis_input = document.createElement('input');
            axis_input.setAttribute('type', "checkbox");
            axis_input.setAttribute('value', axis_p.name);
            axis_input.setAttribute('id', "sai"+i); // segmenter axis input
            axis_input.className = "aligner-checkbox-input";

            // control if a value is present in localsettings
            if (localStorage.getItem(`aligner_axis_${axis_p.name}`)){
                if (localStorage.getItem(`aligner_axis_${axis_p.name}`) == "true"){
                    if (this.selectedAxis.length < 5) {
                        this.selectedAxis.push(Axis.prototype.getAxisProperties(axis_p.name))
                        axis_input.setAttribute('checked', "");
                    }
                }
            } else {
                if (axis_p.name == "Size" ||
                    axis_p.name == "[IMGT] Productivity" ||
                    axis_p.name == "[IMGT] VIdentity" ){
                        if (this.selectedAxis.length < 5) {
                            axis_input.setAttribute('checked', "");
                            this.selectedAxis.push(Axis.prototype.getAxisProperties(axis_p.name))
                        }
                } 
            }


            axis_label.appendChild(axis_input);
            axis_label.appendChild(axis_text);
            axis_option.appendChild(axis_label);
            menu.appendChild(axis_label);
            this.connect_axisbox(axis_label, axis_p.name);

            $(axis_input).unbind("click");
        }
    },

    // return list of external data that need to be refreshed to display enabled layers
    needRefresh: function(){
        var refreshList = []
        for (var s in this.sequence){
            var r = this.sequence[s].needRefresh()
            for (var s2 in r ) 
                if (refreshList.indexOf(r[s2]) == -1)
                    refreshList.push(r[s2])
        }
        return refreshList
    },

    // check if some enabled layers in segmenter need external data from IMGT/cloneDB to be displayed and update buttons accordingly
    updateButton: function(){
        var self = this;

        var refreshList = this.needRefresh()
        var button = $("#align-refresh-button")
        var icon   = button.find('i')

        refreshList.filter(provider => (self.pendingAnalysis != undefined && self.pendingAnalysis[provider] > 0))
        // Update global external provider button
        if (typeof this.pendingAnalysis != 'undefined' && this.pendingAnalysis > 0){
            // Some provider are pending
            icon.addClass('animate-spin')
            button.addClass('disabledClass')
        }else if (refreshList.length == 0)  {
            // No provider pending
            button.removeClass('disabledClass')
            icon.removeClass()
            icon.addClass('icon-ok')
        }else{
            // At least one provider is possible
            button.removeClass('disabledClass')
            icon.removeClass()
            icon.addClass('icon-arrows-ccw')
        }

        // Update child button of each provider
        button.children(".menu-content").children("a").each(function () {
            self.refreshIconProvider($(this).data("target"))
        })

        return this        
    },

    retrieveExternalData: function(providerList, cloneList){
        var self = this

        if (typeof providerList == 'undefined')
            providerList = this.needRefresh()

        if (typeof cloneList == 'undefined')
            cloneList = this.sequenceListInSegmenter()

        var callback = function(serviceName){
            self.pendingAnalysis[serviceName]--
            self.updateButton()    
        }
        
        this.pendingAnalysis = {}
        for (var i in providerList){
            serviceName = providerList[i]

            this.pendingAnalysis[serviceName] = 0;

            switch (serviceName) {
                case "IMGT":
                    this.pendingAnalysis[serviceName]++
                    this.sendTo('IMGTSeg', cloneList, callback(serviceName))
                    break;
                case "cloneDB":
                    this.pendingAnalysis[serviceName]++
                    db.callCloneDB(cloneList, callback(serviceName))
                    break;
                default:
                    break;
            }
        }
    },

    //check axis selected in menu to update and update axisBox dom elements accordingly
    getSelectedAxis:function (){
        var self = this;

        var menu = document.getElementById("segmenter_axis_select");
        var inputs = menu.getElementsByTagName("input");
        var selectedAxis = [];

        for (var i in inputs){
            if (inputs[i].checked) selectedAxis.push(inputs[i].value);
        }

        console.default.log( `${selectedAxis.length} selectedAxis: ${selectedAxis}`)
        return selectedAxis
    },


    //check axis selected in menu to update and update axisBox dom elements accordingly
    connect_axisbox:function (elem, title){
        var self = this;

        $(function () {
            $(elem).find('input').unbind("click");
            $(elem).find('input').click(function(e){
                var input = elem.getElementsByTagName("input")[0];
                var axis  = Axis.prototype.getAxisProperties(input.value)
                var selectedAxis = self.getSelectedAxis()

                if (input.checked){
                    if (selectedAxis.length > 5 ){
                        console.log({ msg: "Data columns selection is limited to 5.<br/>Please disable some axis before adding new one.", type: "flash", priority: 2 });
                        input.checked = false;
                        return
                    } else {
                        self.selectedAxis.push(axis)
                        self.update()
                    }
                } else if (!input.checked){
                    var index = self.selectedAxis.indexOf(axis)
                    self.selectedAxis.splice(index, 1)
                    self.update()
                }

                if (localStorage){
                    localStorage.setItem(`aligner_axis_${title}`, input.checked)
                } 
            });
        });
    },

    connect_checkbox: function(elem, title, layers){
        var self = this;
        
        //connect event to checkbox and checkbox_label
        $(function () {
            $(elem).find('input').unbind("click");
            $(elem).find('input').click(function(e){
                var input = elem.getElementsByTagName("input")[0];
                if (localStorage){
                    localStorage.setItem(`aligner_layers_${title}`, input.checked)
                } 
                self.toggleLayers(layers, input.checked, true);
                e.stopPropagation();
            });
        });
    },

    open : function(){
        var self = this;
        this.min_H = 130;
        this.max_H = 500;

        var seg = $(this.div_segmenter);

        var cur_H = seg.height()
        var auto_H = seg.css('height', 'auto').height();
        if (auto_H > self.max_H) auto_H = this.max_H;
        if (cur_H  < self.min_H) cur_H  = this.min_H;
        seg.stop().height(cur_H).animate({ height: auto_H }, 250, function(){
            $(self.div_segmenter).height('auto');
        });

        $("#"+this.id).css('box-shadow', '0px -4px 8px 0px rgba(0, 0, 0, 0.2)')

        var icon = $("#aligner-open-button").find(".icon-up-open")
        icon.removeClass("icon-up-open")
        icon.addClass("icon-down-open")

        this.is_open = true;
    },

    close : function(){
        this.min_H = 130;

        $(this.div_segmenter).stop().animate({ height: this.min_H }, 250);

        $("#"+this.id).css('box-shadow', '')

        var icon = $("#aligner-open-button").find(".icon-down-open")
        icon.removeClass("icon-down-open")
        icon.addClass("icon-up-open")

        this.is_open = false;
    },

    toggle : function(){
        if (this.is_open)
            this.close();
        else
            this.open()
    },

    build_segmenter: function () {
        var self = this;

        // create a new dom element from aligner template  
        var template = document.getElementById("aligner");
        var clone = template.content.firstElementChild.cloneNode(true);

        // remove content from div assigned to aligner and put template copy in it
        var parent = document.getElementById(this.id);
        parent.removeAllChildren();
        parent.appendChild(clone);


        // restore mouse functions
        this.div_segmenter = clone.getElementsByClassName("segmenter")[0];
        self.min_H = 130;
        self.max_H = 500;
        $(this.div_segmenter)
            .scroll(function () {
                var leftScroll = $(self.div_segmenter).scrollLeft();
                $('.seq-fixed').css({ 'left': +leftScroll });
            })
  

        // Focus/hide/label
        document.getElementById("focus_selected").onclick = function () { self.m.filter.add("Clonotype", "focus", self.m.getSelected()); };
        document.getElementById("hide_selected").onclick = function () { self.m.filter.add("Clonotype", "hide", self.m.getSelected()); };
        document.getElementById("reset_focus").onclick = function () {  self.m.filter.remove("Clonotype", "focus")
                                                                        self.m.filter.remove("Clonotype", "hide") };
        document.getElementById("star_selected").onclick = function (e) {
            if (m.getSelected().length > 0) { self.m.tags.openSelector(m.getSelected(), e); }};
        document.getElementById("cluster").onclick = function () { self.m.merge(); };
        document.getElementById("align").onclick = function () { self.toggleAlign(); };
        document.getElementById("aligner-open-button").onclick = function () { self.toggle(); };

    },

    build_sequence: function(cloneID){
        if (this.m.clone(cloneID) && !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return;
        }
        var parent = document.getElementById("listSeq");
        var template = document.getElementById("aligner-sequence");
        var clone = template.content.firstElementChild.cloneNode(true);
        clone.id = "seq" + cloneID;
        parent.appendChild(clone);

        var spanM = this.build_spanM(cloneID)
        clone.getElementsByClassName("sequence-holder")[0].appendChild(spanM);

        this.index[cloneID] = new IndexedDom(clone);

    },

   build_align_settings_menu: function(){
    var self = this;
      $(function () {
        $('#highlight_match').change(function () {                
           self.use_dot = this.checked;
           self.update();
        }).change(); //ensure visible state matches initially
      });
    }, 

    /**
     * complete a node with a clone sequence
     * @param {integer} cloneID - clone index 
     * */
    build_spanM: function (cloneID) {
        //copy template
        var template = document.getElementById("aligner-M");
        var clone = template.content.firstElementChild.cloneNode(true);

        return clone;
    },
    
    /**
     * complete a node with a clone information
     * @param {integer} sequenceID - sequence index 
     * */
    build_spanF: function (sequenceID) {
        var self = this;

        //copy template
        var template = document.getElementById("aligner-F");
        var cloneT = template.content.firstElementChild.cloneNode(true);

        //this is a custom sequence
        if (this.isGermline(sequenceID)){
            cloneT.getElementsByClassName("nameBox2")[0].appendChild(document.createTextNode(sequenceID));
            cloneT.getElementsByClassName("delBox")[0].onclick = function () {
                self.removeSequence(sequenceID, true);
            };
            return cloneT;
        }

        //this is a clone sequence
        var cloneID = sequenceID;
        var clone = this.m.clone(cloneID);
        
        //???
        clone.div_elem(cloneT, false);

        //edit
        if (this.m.focus == cloneID) $(cloneT).addClass("list_focus");
        cloneT.getElementsByClassName("nameBox")[0].title = clone.getName();
        cloneT.getElementsByClassName("nameBox")[0].style.color = clone.color;
        cloneT.getElementsByClassName("nameBox2")[0].appendChild(document.createTextNode(clone.getShortName()));
        cloneT.getElementsByClassName("delBox")[0].onclick = function () {
            self.removeSequence(cloneID);
        };

        var span_info = cloneT.getElementsByClassName("infoBox")[0]
        span_info.id = `aligner_info_${cloneID}`
        span_info.onclick = function () {self.m.displayInfoBox(cloneID)}

        var dom_content = clone.getWarningsDom()
        span_info.classList            = dom_content.className
        span_info.firstChild.classList = dom_content.icon
        span_info.firstChild.title     = dom_content.title

        cloneT.getElementsByClassName("axisBox")[0].color = clone.getColor();
        this.fillAxisBox(cloneT.getElementsByClassName("axisBox")[0], clone);

        return cloneT;
    },

    toggleLayers: function(layers, enabled, update){
        if (typeof update == "undefined") update = false;

        for (var l in layers)
            LAYERS[layers[l]].enabled = enabled;

        if (update)
            for (var s in this.sequence)
                this.sequence[s].updateLayers(layers);
        
        this.updateButton()
    },


    getCGIAddress: function(){
        var cgi_address = "";

        if (typeof config != 'undefined') {
            if (config.cgi_address){
                if (config.cgi_address) cgi_address = config.cgi_address;
                if (config.cgi_address == "default") cgi_address = "http://"+window.location.hostname+"/cgi/";
            }
        }
        return cgi_address;
    },

    /**
     * clear functionnal data in order to start from a clean instance when loading a new .vidjil file
     * */
    reset: function() {
        this.sequence = {};
        this.sequence_order = [];
        this.index = [];
        if (document.getElementById("listSeq"))
            document.getElementById("listSeq").innerHTML = "";
    },

    removeSequence:function(id, update){
        if (typeof update == "undefined") update=true 

        delete this.sequence[id];
        this.sequence_order.splice( this.sequence_order.indexOf(id), 1 );
        if (this.isClone(id)) this.m.clone(id).unselect();
        
        if (update) this.updateDom()
                        .show()
    },

    removeAllSequence: function(update){
        if (typeof update == "undefined") update=true 

        var keys = Object.keys(this.sequence)
        for (var i =0; i<keys.length; i++)
            this.removeSequence(keys[i], false)

        if (update) this.updateDom()
                        .updateButton()
                        .show()
    },

    /**
     * 
     */
    update: function() {
        var self = this;
        try{
            var list = [];
            for (var i = 0; i < this.m.clones.length; i++) list.push(i);
            this.updateElem(list);
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /**
     * check the list for newly selected/unselected clones to add/remove to segmenter 
     * update others
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElem: function (list) {

        //nothing selected => remove all sequence including germline
        if (this.m.getSelected().length == 0) {
            this.removeAllSequence()
            return
        }

        var self = this;
        var cloneID;
        
        list.sort(function(a,b){ return self.m.clone(b).getSize() - self.m.clone(a).getSize(); });

        // remove unselected clones
        for (var i = 0; i < list.length; i++) {     
            cloneID = list[i];   
            if (!this.m.clone(cloneID).isSelected()) 
                if (this.sequence[cloneID])         
                    this.removeSequence(cloneID, false);
        }

        // add newly selected clones
        for (var j = 0; j < list.length; j++) {     
            cloneID = list[j];
            if (this.m.clone(cloneID).isSelected() && 
                Object.keys(this.sequence).indexOf(cloneID) == -1 )
                this.addCloneToSegmenter(cloneID)
            
        }

        var dom_content = this.m.clone(cloneID).getWarningsDom()
        var info_align  = document.getElementById(`aligner_info_${this.m.clone(cloneID).index}`)
        if (info_align != null) {
            info_align.classList = dom_content.className
            info_align.firstChild.classList = dom_content.icon
            info_align.firstChild.title = dom_content.title
        }

        this.updateDom(list)
            .updateButton()
        
    },

    updateDom:function(list){
        var keys = Object.keys(this.index)
        var keys2 = Object.keys(this.sequence)
        if (typeof list == "undefined") list = Object.keys(this.sequence)

        //update germline sequence
        for (var k in keys2)
            if(isNaN(keys2[k]))
                if (list.indexOf(keys2[k]) == -1)
                    list.push(keys2[k])


        //update dom object of sequence in aligner
        var l_spacing;        
        for (var j=0; j<list.length; j++)  
            if (this.sequence[list[j]] != null){
                var dom = this.index[list[j]]
                dom.display("main", "block");
                dom.replace("seq-fixed", this.build_spanF(list[j]));
                if (l_spacing == undefined)
                    l_spacing = this.sequence[list[j]].updateLetterSpacing();
                else
                    this.sequence[list[j]].updateLetterSpacing(l_spacing);
                dom.content("seq-mobil", this.sequence[list[j]].toString());        
            }

        //hide unused sequence dom object
        for (var i=0; i<keys.length; i++)
            if (this.index[keys[i]] != null && keys2.indexOf(keys[i])==-1) 
                this.index[keys[i]].display("main", "none");

        var div_segmenter = document.getElementsByClassName("segmenter")[0];
        $('.seq-fixed').css({ 'left': + $(div_segmenter).scrollLeft() });
        this.updateStats();

        return this;
    },

    /**
     * used to highlight mouseover clones or selected clones.
     * in the segmenter case selecting/unselecting clones produces more than just a highlight and need an update
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function (list) {   
        this.updateElem(list);    
    },

    isClone: function (id) {
        return !isNaN(id);
    },
    
    isGermline: function (id) {
        return isNaN(id);
    },

    sequenceListInSegmenter: function() {
        return Object.keys(this.sequence);
    },

    fillAxisBox: function (axisBox, clone) {
        axisBox.removeAllChildren();
        
        for (var i in this.selectedAxis) {
            var span = document.createElement('span');
            var axis = this.selectedAxis[i];
            span.removeAllChildren();
            span.className = axis.name;
            span.setAttribute('title', this.selectedAxis[i].doc);

            if (axis.hover != undefined)
                span.setAttribute('title', axis.hover(clone, this.m.getTime()) )
            
            if (typeof axis.refresh != 'undefined' && typeof axis.refresh(clone) != 'undefined'){
                span.appendChild(this.refreshIcon(axis.refresh(clone)))
            } else {
                span.appendChild(axis.pretty ? axis.pretty(axis.fct(clone)) : document.createTextNode(axis.fct(clone)));
            }

            axisBox.appendChild(span);
        }
    },

    /**
     * Refresh external icon of one clonotype in aligner
     * Allow to launch external action for on provider
     */
    refreshIcon: function(provider){
        var self = this
        var span = document.createElement('span')
        var im = document.createElement('i')
        var button = $("#align-refresh-button")

        span.className = 'aligner-inline-button'
        im.className ='icon-arrows-ccw'
        span.setAttribute('title', "missing data, click to try to retrieve from "+provider);

        if (typeof this.pendingAnalysis != 'undefined' &&
                this.pendingAnalysis[provider] > 0){ // get list provider
                span.className = 'aligner-inline-button disabledClass'
                im.className = 'icon-arrows-ccw animate-spin'
        }

        span.onclick = function(){self.retrieveExternalData([provider])}

        span.appendChild(im)
        return span
    },

    /**
     * Allow to refresh icon in aligner header and menu.
     */
    refreshIconProvider: function(provider){
        var self = this

        var button = $("#align-refresh-button").children(".menu-content")
                                               .find(`[data-target='${provider}']`)
        var icon   = $("#icon_external_"+provider)

        var onclickfct = function(){
            segment.retrieveExternalData([$(this).data("target")])
        }

        if (!config[provider]){
            button.hide()
            button.prop('onclick', null);
        } else {
            button.show()

            var needRefresh = this.needRefresh()
            if (typeof this.pendingAnalysis != 'undefined' &&
                needRefresh.indexOf(provider) != -1 &&
                this.pendingAnalysis[provider] > 0){ // get list provider
                    icon.removeClass()
                        .addClass('animate-spin')
            } else if (this.pendingAnalysis == undefined || (typeof this.pendingAnalysis != 'undefined' && needRefresh.indexOf(provider) != -1)){
                button.removeClass('disabledClass')
                icon.removeClass()
                    .addClass('icon-arrows-ccw')
            } else {
                button.addClass('disabledClass')
                icon.removeClass()
                    .addClass('icon-ok')
            }
        }

    },

        
    /**
     * add a clone in the segmenter<br>
     * build a div with clone information and sequence
     * @param {intger} cloneID - clone index 
     * */
    addCloneToSegmenter: function (cloneID, update) {
        var self = this;

        if (typeof update == "undefined") update = false

        if ( !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return;
        }

        if (this.sequence[cloneID]){
            // This clone has already been added to the segmenter
            return;
        }

        this.aligned = false ;
        if (this.aligned) this.resetAlign();
        this.sequence[cloneID] = new Sequence(cloneID, this.m, this);
        this.sequence[cloneID].load();
        this.sequence_order.push(cloneID);
        
        document.getElementById("listSeq").appendChild(document.getElementById("seq" + cloneID))
        if (update) this.updateDom();
    },

    /**
    * add a sequence to the segmenter
    * build a div with sequence information and sequence
    * @param {str} id sequence id
    * @param {str} sequence
    **/
        addSequenceToSegmenter : function(id, str, update){
        if (typeof update == "undefined") update = true
        this.aligned = false
        this.resetAlign()
        str = str.split(".").join("")
        if (typeof this.sequence[id]=="undefined"){
            this.sequence[id] = new Sequence(id, this.m, this);
            this.sequence[id].load(str);
            this.sequence_order.push(id);
        }
        document.getElementById("listSeq").appendChild(document.getElementById("seq" + id));
        if (update) this.updateDom();
    },

    /**
    * select all the germline of a clone .
    * add them to the segmenter
    **/
    add_all_germline_to_segmenter : function(update) {
        if (typeof update == "undefined") update = true
        for (var id in this.sequence) {
           if (this.isClone(id)) {
                var c = this.m.clone(id);
                this.addGermlineToSegmenter(c.getGene("3"), false);
                this.addGermlineToSegmenter(c.getGene("4"), false);
                this.addGermlineToSegmenter(c.getGene("5"), false);
            }
        }
        if (update) this.updateDom();
        this.show();
    },

    /**
    * get the germline from the germline object
    * and use add germline to the segmenter
    * @param {str} geneId sequence id
    **/
    addGermlineToSegmenter: function(geneId, update) {
        if (typeof update == "undefined") update = true
        var keys = Object.keys(this.m.germline)
        for (var i = 0; i < keys.length; i++)
        if (typeof this.m.germline[keys[i]][geneId] != "undefined")
            this.addSequenceToSegmenter(geneId, this.m.germline[keys[i]][geneId], update); 
    },

    /**
     * build a request with currently selected clones to send to IMGT or igblast <br>
     * (see crossDomain.js)
     * @param {string} address - 'imgt', 'arrest', 'igBlast' or 'blast'
     * */
    sendTo: function (address, list, callback) {

        if (typeof list == 'undefined')
            list = this.sequenceListInSegmenter();

        var request = "";
        var system;
        var max;
        var c;

        var sample_set_id = "(---)"
        if (typeof this.m.db_key != "undefined" &&
            typeof this.m.db_key.sample_set_id != "undefined")
            sample_set_id ="("+this.m.db_key.sample_set_id+")"
            
        // Split list of clonotype by system
        var systems = {}
        for (var l_pos = 0; l_pos < list.length; l_pos++) {
            if (this.isClone(list[l_pos])) {
                c = this.m.clone(list[l_pos]);
                if (c.getSize()>max || !max){
                    system = c.getLocus();
                    if (systems[system] == undefined){
                        systems[system] = [list[l_pos]]
                    } else { systems[system].push(list[l_pos]) }
                }
            }
        }
        // Make recursive call if needed on each system
        var systems_keys = Object.keys(systems)
        if (systems_keys.length > 1) {
            for (var key_pos = 0; key_pos < systems_keys.length; key_pos++) {
                var locus = systems_keys[key_pos]
                this.sendTo(address, systems[locus], callback)
            }
            return // bypass after recursive calls
        }

        for (var i = 0; i < list.length; i++) {
            if (this.isClone(list[i])) {
                c = this.m.clone(list[i]);
                
                if (c.seg.imgt && address == 'IMGTSeg'){
                    if (c.seg.imgt.trimming_before  == this.m.trimming_before_external &&
                        c.seg.imgt.trimming_primer  == this.m.primerSetCurrent){
                      continue;
                    }         
                } // else, modified option, relunch request

                request += ">" + sample_set_id + " #" + c.index + " " + c.getName() + "\n"
                if (typeof (c.getSequence()) == 0){
                    request +=  c.id + "\n";
                } else if ( this.m.trimming_before_external && 
                            this.m.primerSetCurrent != undefined) {
                    request += c.trimmingFeature("primer5", "primer3", false) + "\n";
                } else {
                    request += c.getSequence() + "\n";
                }
                
                if (c.getSize()>max || !max){
                    system = c.getLocus();
                    max=c.getSize();
                }
            }
            else if (typeof this.m.germline[list[i]]) {
                request += ">" +list[i] + "\n" +this.m.germline[this.sequence[list[i]].locus][list[i]] + "\n";
            }
        }

        if (request != ""){
            if (address == 'IMGTSeg') {
                imgtPostForSegmenter(this.m.species, request, system, undefined, callback);
                var change_options = {'xv_ntseq' : 'false', // Deactivate default output
                                    'xv_summary' : 'true'}; // Activate Summary output
                imgtPostForSegmenter(this.m.species, request, system, change_options, callback);
            } else {
                window[address+"Post"](this.m.species, request, system);
                if (callback) callback();
            }
        }
        else{
            if (callback) callback();
        }

        this.update();

    },

    /**
     * TODO: move the horizontal slider to focus the most interesting parts of the sequences
     * */
    show: function () {
        if (Object.keys(this.sequence).length > 0) {
            var sequence = this.sequence[this.sequence_order[0]]
            var mid = (sequence.seq.length/2)*CHAR_WIDTH;

            try {
                if (sequence.id && this.m.clone(sequence.id).seg.cdr3){
                    cdr3 = this.m.clone(sequence.id).seg.cdr3;
                    mid = ((sequence.pos[cdr3.start]+sequence.pos[cdr3.stop])/2) * CHAR_WIDTH - (window.innerWidth/2) + 225;
                }
            } catch (error) {}
            

            $(this.div_segmenter)
                .animate({
                    scrollLeft: 0
                }, 0);
            $(this.div_segmenter)
                .animate({
                    scrollLeft: mid
                }, 0);
        }
        return this
    },

    /**
     * enable/disable alignment
     * */
    toggleAlign: function () {
        if (this.aligned)
            this.resetAlign() ;
        else
            this.align() ;
    },

    /**
     * align currently selected clone's sequences using a server side cgi script
     * */
    align: function () {
        var self = this;
        var list = this.sequenceListInSegmenter();
        var request = "";
        this.memTab = list;

        if (list.length === 0) return;

        for (var i = 0; i < list.length; i++) {
            var seq = this.sequence[list[i]].seq.join("")
            if (seq == "") seq = "---"
            request += ">" + list[i] + "\n" + seq + "\n";
        }

        $.ajax({
            type: "POST",
            data: request,
            url: this.getCGIAddress() + "align.cgi",
            beforeSend: function () {
                $(".seq-mobil").css({ opacity: 0.5 });
            },
            complete: function () {
                $(".seq-mobil").css({ opacity: 1 });
            },
            success: function (result) {
                self.aligned = true ;
                self.displayAjaxResult(result);
                self.show();
            },
            error: function () {
                console.log({"type": "flash", "msg": "cgi error : impossible to connect", "priority": 2});
            }
        });

        // Allow to use button of the export menu
        try {

            div = document.getElementById("export_fasta_align");
            div.classList.remove("disabledClass");
        } catch (err) {
            // Div doesn't exist (qunit only ?)
        }
    },

    /**
     * transform currently selected sequences in fasta format
     * @return {string} fasta 
     * */
    toFasta: function () {
        var selected = this.m.orderedSelectedClones;
        var result = '';

        for (var i = 0; i < selected.length; i++) {
            if (typeof this.sequence[selected[i]] !== "undefined" &&
                typeof this.sequence[selected[i]].seq !== "undefined") {
                if (this.isClone(selected[i])) {
                    result += "> " + this.m.clone(selected[i]).getName() + " // " + this.m.clone(selected[i]).getStrSize() + "\n";
                } else {
                    result += "> " + selected[i];
                }
                result += this.sequence[selected[i]].seq.join('') + "\n";
            }
        }
        return result;
    },


    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportAlignFasta: function () {

        var list = this.m.getSelected();
        if (list.length>0){
        
            var fasta = this.toFasta();
            openAndFillNewTab( "<pre>" + fasta );
        }else{
            console.log({msg: "Export FASTA: please select clones to be exported", type: 'flash', priority: 2});
        }
        
    },


    /**
     * remove alignement
     * */
    resetAlign: function() {
        var selected = this.sequenceListInSegmenter();

        this.aligned = false;

        try {
            div = document.getElementById("export_fasta_align");
            div.classList.add("disabledClass");
        } catch (err) {
            // Div doesn't exist (qunit only ?)
        }

        try{
            if( selected.length && this.index.length){
                for (var i = 0; i < selected.length; i++) {
                    this.sequence[selected[i]].load();
                }
            }
            this.update();
        } catch (err) {
        }
    },
    
    
    /**
     * callback function for align()
     * @param {file} file - align file done by the cgi script
     * */
    displayAjaxResult: function(file) {

        var json = JSON.parse(file);

	    // Load all (aligned) sequences
        for (var i = 0; i < json.seq.length; i++) {
            this.sequence[this.memTab[i]].load(json.seq[i], true);
    	}

	    this.update();
    },
    
    /**
     * build and display statistics about selected clones
     * */
    updateStats: function (){
        var list = this.m.getSelected();
        var sumPercentage = 0;
        var sumReads = 0;
        var sumRawReads = 0;
        var length = 0;
        var nb_clones_not_constant = 0;
        var lastActiveClone = 0;
        var extra_info_system;
            
        //verifier que les points sélectionnés sont dans une germline courante
        for (var i = 0; i < list.length ; i++){
            if (this.m.clones[list[i]].isActive()) {
                lastActiveClone = this.m.clones[list[i]];
                if (lastActiveClone.hasSizeConstant()) {
                  length += 1;
                } else {
                  var timepoint = this.m.t;
                  nb_clones_not_constant += lastActiveClone.current_clones[timepoint];
                }
                sumPercentage += lastActiveClone.getSize();
                sumReads+= lastActiveClone.getReads();
                sumRawReads+= lastActiveClone.getRawReads();
            }
        }

        var t = "";
        if (sumRawReads > 0) {

            if (length) t += length ;
            if (nb_clones_not_constant) t += '+' + nb_clones_not_constant;
            t += " clonotype" + (length+nb_clones_not_constant>1 ? "s" : "") + ", ";

            t += this.m.toStringThousands(sumRawReads) + " read" + (sumRawReads>1 ? "s" : "");

            if (sumRawReads != sumReads)
               t += " [" + this.m.toStringThousands(Math.floor(sumReads*100)/100) + " norm.]";

            percentageStr = this.m.getStrAnySize(this.m.t, sumPercentage);
            if (percentageStr != "+")
                t += " (" + percentageStr + ")";
            if (length == 1){
                extra_info_system = lastActiveClone.getStrAllSystemSize(this.m.t, true);
            }
            t += " ";
        }
            
        $(".stats_content").text(t);
        if (length == 1) {
            s = '';
            if (extra_info_system != undefined && extra_info_system.systemGroup !== undefined) {
                s = extra_info_system.systemGroup;
                if (extra_info_system.system !== undefined)
                    s += ', ';
            }
            if (extra_info_system != undefined && extra_info_system.system !== undefined) {
                s += extra_info_system.system;
            }
            $(".stats_content").prop('title', s);
        }

        if (this.m.getSelected().length > 0){  
            $("#star_selected").css("display", "")
            $("#focus_selected").css("display", "")
            $("#hide_selected").css("display", "")
        } else {
            $("#star_selected").css("display", "none")
            $("#focus_selected").css("display", "none")
            $("#hide_selected").css("display", "none")
        }

        if (this.m.filter.check("Clonotype", "focus") != -1 ||
            this.m.filter.check("Clonotype", "hide") != -1)
                $("#reset_focus").css("display", "")
            else
                $("#reset_focus").css("display", "none")
    },

    /**
     * find and return the list of clone fields who contain potential information that can be highlighted on sequences
     * @return {string[]} - field list
     *
     * Please note that these pushed values will have to be present in the model ( and properly set with start, stop, seq)
     * to be processed and displayed in the segmenter. ( )
     *
     * */
    findPotentialField : function () {
        // Guess fields for the highlight menu
        result = [""];
        forbidden_fields = ['m', 'sequence'];

        for (var j=0; (j<10 & j<this.m.clones.length) ; j++){
            var clone = this.m.clone(j);

            for (var i in clone) {
                if (forbidden_fields.indexOf(i) == -1 &&(this.isDNA(clone[i]) || this.isPos(clone[i]) )){
                    if (result.indexOf(i) == -1) result.push(i);
                }
            }
            
            // In the .seg element, What looks like DNA sequence or what is a Pos field
            for (var k in clone.seg) {
                if (forbidden_fields.indexOf(k) == -1 &&(this.isDNA(clone.seg[k]) || this.isPos(clone.seg[k])) ){
                    if (result.indexOf(k) == -1) result.push(k);
                }
            }
        }

        //Add external infos like IMGT's ... to selectbox values in a static way
        // as imgt info might not have been requested at the moment of menu buidling.
        result.push("V-REGION");
        result.push("J-REGION");
        result.push("D-REGION");
        result.push("CDR3-IMGT");


        return result;
    },

    /**
     * determine if a string is a DNA sequence or not
     * @param {string}
     * @return {bool}
     * */
    isDNA : function (string) {
        if (typeof string === 'undefined' || string === null) {
            return false;
        }else if (string.constructor === String) {
            var reg = new RegExp("^[ACGTacgt]+$");
            return reg.test(string);
        }else if (string.constructor === Array & string.length>0) {
            return this.isDNA(string[0]);
        }else{
            return false;
        }
    },
    
    /**
     * check if the object can be used to find a position on a sequence
     * @param {object}
     * @return {bool}
     * */
    isPos : function (obj) {
        if (typeof obj === 'undefined' || obj === null) {
            return false;
        }else if (typeof obj.start != 'undefined' && typeof obj.stop != 'undefined') {
            return true;
        }else{
            return false;
        }
    },

    shouldRefresh: function() {
        this.init();
    },

    empty: function() {
        this.reset();
    },


}; //fin prototype Segment

Aligner.prototype = $.extend(Object.create(View.prototype), Aligner.prototype);