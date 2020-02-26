function VidjilVMI() {
    this.parent_id = 'vidjil-panels'
    this.menu_id = 'vmiSelector';
    this.vmi = new VMI(this.parent_id);
    this.vmi.setupDrawer();
    this.mid_id = 'mid-container';
    this.left_id = 'left-container';
    this.right_id = 'right-container';
    this.visu_id = 'visu-container';
    this.bot_id = 'bot-container';
}

VidjilVMI.prototype = {
    setup : function() {
        var mid_container = new Panel(this.mid_id, this.parent_id, mid_callback);
        var left_container = new Panel(this.left_id, this.mid_id);
        var visu_container = new Panel(this.visu_id, this.mid_id, visu_callback);
        var right_container = new Panel(this.right_id, this.mid_id);
        var bot_container = new Panel(this.bot_id);

        this.vmi.add_panel(mid_container, false);
        this.vmi.add_panel(left_container, false);
        this.vmi.add_panel(visu_container, true);
        this.vmi.add_panel(right_container, false);
        this.vmi.add_panel(bot_container, false);

        this.vmi.addView("data", this.left_id, "", []);
        this.vmi.addView("list", this.left_id, "", []);
        this.vmi.addView("info", this.left_id, "", []);
        this.vmi.addView("visu", this.visu_id, "", []);
        this.vmi.addView("visu2", this.visu_id, "", []);
        var segmenter_view = this.vmi.addView("segmenter", this.bot_id, "", [], segmenter_callback);
        segmenter_view.setMutable(false);
        this.vmi.addView("visu3", this.right_id, "", []);
        this.vmi.setOverlays([this.visu_id]);

        this.normal_mode();
    },

    reset_menu: function() {
        var menu_container = document.getElementById(this.menu_id);
        menu_container.removeAllChildren();
        var menu = this.vmi.setMenuOptions(new VidjilMenuDecorator());
        menu_container.appendChild(menu);
    },

    tablet_mode : function() {
        this.vmi.hideAllViews();
        this.vmi.hideAllPanels();
        var views = Object.values(this.vmi.views);
        for(i in views) {
            if(views[i].id === 'segmenter')
                continue;
            views[i].setMutable(true);
        }
        this.vmi.setupPanels([this.visu_id, this.bot_id]);
        this.vmi.setView(this.vmi.views.visu, this.visu_id);
        this.vmi.setView(this.vmi.views.visu2, this.visu_id);
        this.vmi.setView(this.vmi.views.segmenter, this.bot_id);
        this.reset_menu();
    },

    normal_mode : function() {
        this.vmi.hideAllViews();
        this.vmi.hideAllPanels();
        var views = Object.values(this.vmi.views);
        for(i in views) {
            views[i].setMutable(false);
        }
        var mutables = ['visu', 'visu2', 'visu3'];
        for(i in mutables) {
            var id = mutables[i];
            this.vmi.views[id].setMutable(true);
        }
        var panels = [{}, this.bot_id];
        panels[0][this.mid_id] = [this.left_id, this.visu_id]
        this.vmi.setupPanels(panels);
        this.vmi.setView(this.vmi.views.data, this.left_id);
        this.vmi.setView(this.vmi.views.list, this.left_id);
        this.vmi.setView(this.vmi.views.info, this.left_id);
        this.vmi.setView(this.vmi.views.visu, this.visu_id);
        this.vmi.setView(this.vmi.views.visu2, this.visu_id);
        this.vmi.setView(this.vmi.views.segmenter, this.bot_id);
        this.reset_menu();
    },

    wide_mode : function() {
        this.vmi.hideAllViews();
        this.vmi.hideAllPanels();
        var views = Object.values(this.vmi.views);
        for(i in views) {
            views[i].setMutable(false);
        }
        var panels = [{}, this.bot_id];
        panels[0][this.mid_id] = [this.left_id, this.visu_id, this.right_id];
        this.vmi.setupPanels(panels);
        this.vmi.setView(this.vmi.views.data, this.left_id);
        this.vmi.setView(this.vmi.views.list, this.left_id);
        this.vmi.setView(this.vmi.views.info, this.left_id);
        this.vmi.setView(this.vmi.views.visu, this.visu_id);
        this.vmi.setView(this.vmi.views.visu2, this.visu_id);
        this.vmi.setView(this.vmi.views.visu3, this.right_id);
        this.vmi.setView(this.vmi.views.segmenter, this.bot_id);
        this.reset_menu();
    }

}

function visu_callback(view) {
    var panelDOM = document.getElementById(this.id);
    var sep = document.getElementById('visu-separator');
    panelDOM.removeChild(sep);
    panelDOM.insertBefore(sep, panelDOM.firstElementChild.nextElementSibling);
}

function mid_callback(view) {
    var panelDOM = document.getElementById(this.id);
    var sep = document.getElementById('vertical-separator');
    var left = document.getElementById('left-container');
    if(left !== null) {
        panelDOM.removeChild(sep);
        panelDOM.insertBefore(sep, left.nextElementSibling);
    }

    var sep_right = document.getElementById('vertical-separator-right');
    var right = document.getElementById('right-container');
    if(right !== null) {
        panelDOM.removeChild(sep_right);
        panelDOM.insertBefore(sep_right, right);
    } else {
        panelDOM.appendChild(sep_right);
    }
}

function segmenter_callback(view) {
    // can we make this cleaner ?
    if(typeof segment !== 'undefined') {
        segment.show();
    }
}
