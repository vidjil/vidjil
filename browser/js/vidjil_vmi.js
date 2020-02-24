function VidjilVMI() {
    this.parent_id = 'vidjil-panels'
    this.vmi = new VMI(this.parent_id);
    this.vmi.setupDrawer();
    this.mid_id = 'mid-container';
    this.left_id = 'left-container';
    this.visu_id = 'visu-container';
    this.bot_id = 'bot-container';
}

VidjilVMI.prototype = {
    setup : function() {
        var mid_container = new Panel(this.mid_id, this.parent_id, mid_callback);
        var left_container = new Panel(this.left_id, this.mid_id);
        var visu_container = new Panel(this.visu_id, this.mid_id, visu_callback);
        var bot_container = new Panel(this.bot_id);

        this.vmi.add_panel(mid_container, false);
        this.vmi.add_panel(left_container, true);
        this.vmi.add_panel(visu_container, true);
        this.vmi.add_panel(bot_container, true);

        this.vmi.addView("data", this.left_id, "", []);
        this.vmi.addView("list", this.left_id, "", []);
        this.vmi.addView("info", this.left_id, "", []);
        this.vmi.addView("visu", this.visu_id, "", []);
        this.vmi.addView("visu2", this.visu_id, "", []);
        this.vmi.addView("segmenter", this.bot_id, "", []);
        this.vmi.setOverlays([this.visu_id]);
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
    if(left === null) {
        return;
    }

    panelDOM.removeChild(sep);
    panelDOM.insertBefore(sep, left.nextElementSibling);
}
