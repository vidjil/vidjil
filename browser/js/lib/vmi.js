/**
 * Decorator for vmi menu
 **/
function MenuDecorator() {
    this.elements = [];
}

MenuDecorator.prototype = {
    decorate : function(view) {
        this.elements.push(view)
        var div = document.createElement('div');
        div.textContent = view.id;

        return div;
    }
}

/**
 * Constructor for vmi Views
 * @param {string} id - id for the view and the node
 * @param {string} parentId - id of the default parent node/panel of the view
 * @param {string} classes - class(es) to add to the view node
 **/
function VMIView(id, parentId, classes, restricted, prefill, callback) {
    this.parentId = parentId;
    this.id = id;
    this.mutable = true;
    if (restricted == undefined) {
        restricted = []
    }
    if (prefill == undefined) {
        prefill = false
    }
    this.restricted = restricted

    this.callback = callback;

    var parent = document.getElementById(parentId);

    var node = document.createElement('div');
    node.className = "view " + classes;
    node.id = id;
    if (prefill){
        node.textContent = "View "+id;
    }
    // node.onclick = function() {
    //     this.parentNode.removeChild(this);
    // }

    this.node = node;
    // document.getElementById("drawer").appendChild(node);
    parent.appendChild(node);
}

VMIView.prototype = {
    setMutable : function(bool) {
        if(typeof bool === 'undefined') {
            return;
        }
        this.mutable = bool;
    }
}

/**
 * Constructor for vmi Panels
 * @param {string} id - id for the panel and the DOM node
 * @param {string} parent_id - id of the DOM node to insert to panel
 * @param {function} callback - function to be executed when adding and removing views from the panel
 **/
function Panel(id, parent_id, callback) {
    this.id = id;
    this.parentId = parent_id;
    this.callback = callback;
    this.node = this.createInDOM();
}

Panel.prototype = {
    /**
     * Add a VMI view to the panel and trigger callbacks
     * @param {VMIView} view
     **/
    addView: function(view) {
        view.parentId = this.id;
        var parent = document.getElementById(this.id);

        if (parent === null) {
            console.error('Error, panel not in DOM: ' + this.id);
            return;
        }
        parent.insertBefore(view.node, parent.firstChild);
        if(typeof view.callback !== 'undefined') {
            view.callback();
        }

        if(typeof this.callback !== 'undefined') {
            this.callback(view);
        }
    },

    /**
     * Insert the panel into the DOM based on parentId
     **/
    insertInDOM: function(div) {
        parent = document.getElementById(this.parentId);

        if (this.parentId == "vmi-panels"){
            div.className = "vmi-panel_parent";
        } else {
            //div.className = "vmi-panel";
        }

        if(parent === null) {
            document.body.appendChild(div);
        } else {
            parent.appendChild(div);
        }
    },

    createInDOM: function() {
        var existing = document.getElementById(this.id);
        if(existing !== null) {
            console.log('panel already in DOM: ' + this.id);
            return existing;
        }
        var div = document.createElement('div');
        div.id = this.id;
        this.insertInDOM(div);
        return div;
    },

    updateInDOM: function() {
        if(typeof this.node === 'undefined') {
            console.log('panel not in DOM: ' + this.id);
            return;
        } else if((typeof this.node.parentNode !== 'undefined') && (div.parentNode.id === this.parentId)) {
            // panel is already in the right place
            return;
        }
        this.insertInDOM(this.node);
    }
}

function VMI(default_parent) {
    // var vmi = {};

    this.views = {}; // Object referencing each View built with vmi
    this.selectedView; // Stores focused View for menu interactions and edit mode
    this.panels = {};
    this.available_panels = []
    this.default_decorator = new MenuDecorator()
    this.drawer;
    if(typeof default_parent === 'undefined') {
        this.default_parent = 'vmi-panels';
    } else {
        this.default_parent = default_parent;
    }
}

VMI.prototype = {

    /**
     * Create a view in the given parent
     * @param {string} id
     * @param {string} parentId
     * @param {string} classes
     * @param {string} restricted
     **/
    addView : function(id, parentId, classes, restricted, callback) {
        var view = new VMIView(id, parentId, classes, restricted, false, callback)
        this.views[id] = view;
        var panel = this.panels[parentId];
        panel.addView(view);
        return view;
    },

    /**
     * Places a view into a given panel
     * @param {View} view
     * @param {string} panel - panel id ; if none is given the view is set to its last parent
     **/
    setView : function(view, panel_id) {
        if (typeof panel_id === 'undefined') {
            panel_id = view.parentId
        }

        var parent = this.panels[view.parentId];
        var panel = this.panels[panel_id];
        panel.addView(view);

        if(typeof parent.callback !== 'undefined') {
            parent.callback(view);
        }
    },

    /**
     * Hides the view by placing it into the drawer (invisible div)
     * @param {View} view
     **/
    hideView : function(view) {
        this.drawer.appendChild(view.node);
        if (typeof view.parentId !== 'undefined') {
            var parent = this.panels[view.parentId];
            if (typeof parent.callback !== 'undefined') {
                parent.callback(view);
            }
        }
    },

    hideAllViews : function() {
        var self = this;
        var views = Object.keys(self.views).map(function(key) {
            return self.views[key];
        });
        for(i in views) {
            this.hideView(views[i]);
        }
    },

    hidePanel : function(panel) {
        // TODO use this or another drawer ?
        if(panel.node.parentNode === null) {
            return;
        }
        panel.node.parentNode.removeChild(panel.node);
    },

    hideAllPanels : function() {
        var self = this;
        var panels = Object.keys(self.panels).map(function(key) {
            return self.panels[key];
        });
        for(i in panels) {
            this.hidePanel(panels[i]);
        }
    },

    viewSelector : function(view) {
        var self = this;
        var f = function() {
            self.hideEditors();
            $(".editor").css("display", "");
            self.selectedView = view;
        }
        return f;
    },

    /**
    * Generates a setter for a specific view, to be triggered when ctrl+clicking in menu
    * @param {View} view
    **/
    viewSetter : function(view) {
        var self = this
        
        var f = function(e) {
            self.hideEditors();
            if (e.ctrlKey) {
                available_panels = $(".editor")
                var id_panel;
                $(".editor").each(function(i, obj){
                    id_panel = obj.dataset.panel
                    if (view.restricted.indexOf(id_panel) == -1) {
                        var element = document.getElementById(obj.id)
                        element.style.display = 'inherit';
                    }
                });
                self.selectedView = view;
                focus(e.target);
            } else {
                self.setView(view);
            }
        };
        return f;
    },

    /**
     * Generates a function to hide a view
    * @param {View} view
     **/
    viewHider: function(view) {
        var self = this;
        var func = function(e) {
            self.hideView(view);
            e.stopPropagation();
        }
        return func;
    },

    /**
     * Builds menu buttons and interactions, especially depending on the views registered in this.views
     **/
    setMenuOptions : function(decorator) {
        if (typeof decorator === "undefined") {
            decorator = this.default_decorator;
        }
        var self = this
        //var menu = document.getElementById("vmi-menu");
        var menu = document.createElement('div');
        menu.id = "vmi-menu";
        var div;
        var view;
        var cross, crossspan;

        var views = Object.keys(self.views).map(function(key) {
            return self.views[key];
        });
        for (var i in views) {
            view = views[i]
            if(!view.mutable)
                continue;
            
            div = decorator.decorate(view);
            div.onclick = this.viewSetter(view);
            div.onmouseover = function(){ 
                var view_id = this.textContent
                var div     = document.getElementById(view_id)
                div.classList.add("vmi-highlight");
            }
            div.onmouseout  = function(){ 
                var view_id = this.textContent
                var div     = document.getElementById(view_id)
                div.classList.remove("vmi-highlight");
            }
            crossspan = document.createElement('span');
            crossspan.classList.add("cancel-container");
            cross = document.createElement('i');
            cross.onclick = this.viewHider(view);
            cross.classList.add("cancel-button");
            cross.classList.add("icon-cancel-circled");
            crossspan.appendChild(cross);
            div.insertBefore(crossspan, div.childNodes[0]);
            // div.ondblclick = viewSelector(views[i]);
            // div.addEventListener('dblclick', focus);
            menu.appendChild(div);
        }

        div = document.createElement('div');
        div.textContent = "X";
        div.className = "editor";
        div.id = "editor_vmi-menu"
        div.onclick = function() {
            var v = self.selectedView;
            // if (v) v.node.parentNode.removeChild(v.node);
            if (v) self.hideView(v);
            self.hideEditors();
        }
        menu.appendChild(div);
        return menu;
    },

    /**
     * Hides edit mode elements
     * Also unfocuses the selected view
     **/
    hideEditors : function() {
        $(".editor").hide();
        $(".focused").removeClass("focused");
        this.selectedView = undefined;
    },

    /**
     * Builds overlays to be displayed over panels in edit mode
     **/
    setOverlays : function() {
        var self = this
        list_of_overlay = this.available_panels

        var setOverlay = function(id) {
            div = document.createElement('div');
            div.className = "editor overlay";
            div.id = "editor_"+id;
            div.dataset.panel = id
            div.onclick = function() {
                self.setView(self.selectedView, id);
                self.hideEditors();
            }
            document.getElementById(id).appendChild(div);
        }
        for (var pos in list_of_overlay){
            overlay = list_of_overlay[pos]
            setOverlay(overlay);
        }
    },

    /**
     * Builds HTML drawer
     **/
    setupDrawer : function() {
        var drawer = document.createElement('div');
        drawer.id = "vmi-drawer";


        document.body.appendChild(drawer);
        this.drawer = drawer;

    },

    /**
     * Build a div with the default panel id
     **/
    setupPanel : function() {
        var panel = new Panel('vmi-panels');
        this.panels[panel.id] = panel;
    },

    add_panel: function(panel, add_to_available) {
        this.panels[panel.id] = panel;

        if (typeof(add_to_available) === 'undefined') {
            add_to_available = false;
        }

        if( add_to_available){
            this.available_panels.push(panel.id)
        }
    },

    create_or_update_panel : function(child_id, parent_div_id, add_to_available) {
        var parent_div = document.getElementById(parent_div_id)
        // verify parent_div 
        if (parent_div == null){
            console.error(" create_panel: Parent div doesn't exist: " + parent_div_id)
            parent_div_id = this.default_parent;
        }
        // verify if child not already exist
        var elt = this.panels[child_id];
        if (elt != null){
            console.log("panel already exist: " + child_id)
            elt.parentId = parent_div_id;
            elt.updateInDOM();
            if(this.available_panels.indexOf(child_id) == -1 && add_to_available){
                this.available_panels.push(child_id)
            }
        } else {
            var panel = new Panel(child_id, parent_div_id);
            this.add_panel(panel, add_to_available);
        }
        var parent = this.panels[parent_div_id]
        if(typeof parent !== 'undefined') {
            if(typeof parent.callback !== 'undefined') {
                parent.callback();
            }
        }
        return;
    },

    /**
     * todo : transmettre par un paramètre la création des panels : exemple --> {"AB": ["A","B"], "C": ["C"]}
     */
    setupPanels : function(instructions, parent_div){
        if (typeof(parent_div) === 'undefined') {
            parent_div = this.default_parent;
        }

        // determiner si instruction est une liste ou un dico
        if (Array.isArray(instructions)){
            // if list, call create_panel on each elements of the list
            for( var new_panel_pos in instructions) {
                var new_instructions = instructions[new_panel_pos]
                this.setupPanels(new_instructions, parent_div)
            }
        } else if(typeof instructions === "object") {
            // make a loop for recursive call on each elements
            var keys = Object.keys(instructions)
            for (var super_panel_pos in keys){
                var super_panel = keys[super_panel_pos]
                this.create_or_update_panel(super_panel, parent_div, false)

                // create childs div
                var child_instructions = instructions[super_panel]
                this.setupPanels(child_instructions, super_panel)
            }
        } else {
            this.create_or_update_panel(instructions, parent_div, true)
        }
    },


    /**
     * Allow to switch the position of two div
     * @param  {str} a id of the first div
     * @param  {str} b id of the second div
     */
    swapNodes : function(a, b){
        var div_a = document.getElementById(a)
        var div_b = document.getElementById(b)

        var aparent  = div_a.parentNode;
        var asibling = div_a.nextSibling === div_b ? div_a : div_a.nextSibling;
        div_b.parentNode.insertBefore(div_a, div_b);
        aparent.insertBefore(div_b, asibling);
    },


    /**
     * Return a view element getted by his id
     * @param  {string} view_id An id of the view to get
     * @return {this.View}         The view getted (if found)
     */
    getView : function(view_id){
        return this.views[view_id];
    },


    /**
     * Allow to switch the position of two div
     * @param  {str} a id of the first panel
     * @param  {str} b id of the second panel
     */
    swapPanels : function(a, b){
        var panel_a  = document.getElementById(a)
        var panel_b  = document.getElementById(b)
        var panels   = [panel_a, panel_b]
        var list_id  = {}
        var panel_ids = []

        for (panel_pos in panels){
            var panel    = panels[panel_pos]          // objet panel
            var nodelist = panel.childNodes           // liste des enfants
            var nodelist_keys = Object.keys(nodelist) // key de la liste enfants
            list_id[panel.id] = []
            panel_ids.push(panel.id)

            for (var pos in nodelist_keys){
                var div = nodelist[pos]        
                list_id[panel.id].push(div.id) 
            }
        }
        for (panel_pos in panels){
            if ( panel_pos == "0") {
                panel_from = panel_ids[1]
                panel_to   = panel_ids[0]
            } else {
                panel_from = panel_ids[0]
                panel_to   = panel_ids[1]
            }
            for (var elt in list_id[panel_from]){
                var view = this.getView( list_id[panel_from][elt] )
                this.setView( view, panel_to )
            }
        }
     
    }
}