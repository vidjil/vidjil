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
function VMIView(id, parentId, classes, restricted) {
    this.parentId = parentId;
    this.id = id;
    if (restricted == undefined) {
        restricted = []
    }
    this.restricted = restricted

    var parent = document.getElementById(parentId);

    var node = document.createElement('div');
    node.className = "view " + classes;
    node.id = id;
    node.textContent = id;
    // node.onclick = function() {
    //     this.parentNode.removeChild(this);
    // }

    this.node = node;
    // document.getElementById("drawer").appendChild(node);
    parent.appendChild(node);
}


function VMI() {
    // var vmi = {};

    this.views = []; // Array referencing each View built with vmi
    this.selectedView; // Stores focused View for menu interactions and edit mode
    this.available_panels = []
    this.default_decorator = new MenuDecorator()
    this.drawer;
}

VMI.prototype = {

    /**
     * Create a view in the given parent
     * @param {string} id
     * @param {string} parentId
     * @param {string} classes
     * @param {string} restricted
     **/
    addView : function(id, parentId, classes, restricted) {
        var view = new VMIView(id, parentId, classes, restricted)
        this.views.push(view);
    },

    /**
     * Places a view into a given panel
     * @param {View} view
     * @param {string} panel - panel id ; if none is given the view is set to its last parent
     **/
    setView : function(view, panel) {
        if (panel) view.parentId = panel;
        var parent = document.getElementById(view.parentId)
        parent.insertBefore(view.node, parent.firstChild);
    },

    /**
     * Hides the view by placing it into the drawer (invisible div)
     * @param {View} view
     **/
    hideView : function(view) {
        this.drawer.appendChild(view.node);
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

        for (var i in this.views) {
            view = this.views[i]
            
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
        var panels = document.createElement('div');
        panels.id = "vmi-panels";

        document.body.appendChild(panels)
    },


    create_panel : function(child_id, parent_div_id, add_to_available=false) {
        var parent_div = document.getElementById(parent_div_id)
        // verify parent_div 
        if (parent_div == null){
            console.error(" create_panel: Parent div doesn't exist: " + parent_div_id)
            parent_div_id = "vmi-panels"
            parent_div = document.getElementById(parent_div_id)
        }
        // verify if child not already exist
        var elt = document.getElementById(child_id) 
        if (elt != null){
            console.log("panel already exist: " + child_id)
            if(this.available_panels.indexOf(child_id) == -1 && add_to_available){
                this.available_panels.push(child_id)
            }
            return
        }
        var child_div  = document.createElement('div');
        child_div.id = child_id;
        if (parent_div_id == "vmi-panels"){
            child_div.className = "vmi-panel_parent";
        } else {
            child_div.className = "vmi-panel";
        }

        parent_div.appendChild(child_div)
        if( add_to_available){
            this.available_panels.push(child_id)
        }
        return;
    },

    /**
     * todo : transmettre par un paramètre la création des panels : exemple --> {"AB": ["A","B"], "C": ["C"]}
     */
    setupPanels : function(instructions, parent_div="vmi-panels"){

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
                this.create_panel(super_panel, parent_div, false)

                // create childs div
                var child_instructions = instructions[super_panel]
                this.setupPanels(child_instructions, super_panel)
            }
        } else {
            this.create_panel(instructions, parent_div, true)
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
        for (var pos in this.views){
            var view = this.views[pos]
            if (view.id == view_id) {
                return view
            }
        }
        return
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
