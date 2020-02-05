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

        this.vmi.addView("data", this.left_id, "", [], resize_callback);
        this.vmi.addView("list", this.left_id, "", [], resize_callback);
        this.vmi.addView("info", this.left_id, "", [], resize_callback);
        this.vmi.addView("visu", this.visu_id, "", [], resize_callback);
        this.vmi.addView("visu2", this.visu_id, "", [], resize_callback);
        this.vmi.addView("segmenter", this.bot_id, "", [], resize_callback);
        this.vmi.setOverlays(["info-row", "list-row", "data-row", this.visu_id, this.bot_id]);
    },

    reorg_panels : function() {
        this.vmi.hideAllViews();
        this.vmi.hideAllPanels();
        this.vmi.setupPanels([this.visu_id]);
        this.vmi.setView(this.vmi.views.visu, this.visu_id);
        this.vmi.setView(this.vmi.views.visu2, this.visu_id);
    },

    restore_panels : function() {
        this.vmi.hideAllViews();
        this.vmi.hideAllPanels();
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

function resize_callback() {
    m.resize();
}


