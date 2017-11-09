function Url(model, win) {
    View.call(this, model);
    this.m = model;
    this.window = (typeof win != "undefined") ? win : window
    this.url_dict = this.parseUrlParams(this.window.location.search.toString())
    this.url = this.window.location.toString().split('?')[0];
    this.sp = this.m.sp
}

Url.prototype= {

    /**
     * init the view before use
     * @abstract
     * */
    init : function () {
    },
    
    /**
     * update all elements, perform a complete rebuild of the view <br>
     * by default doing a updateElem() on each clone must do the job
     * @abstract
     * */
    update: function () {

        if (!$(".devel-mode:visible").length && typeof this.window.mocked == "undefined")
            return ;

        var selectedList = this.m.getSelected();
        var params_dict = this.url_dict;
        
        params_dict.clone = selectedList.join();

        if (this.sp.select_preset.selectedIndex!=this.sp.default_preset) {
            params_dict.plot = this.sp.splitX+','+this.sp.splitY+','+this.sp.mode;
        } else {
	    delete params_dict[this.sp.mode];
    	}

        var params_list = [];       
        for (var key in params_dict){
            if ((typeof key != "undefined" && key !== "") && (typeof params_dict[key]!= "undefined" && params_dict[key] !== '')) {
                params_list.push(key+"="+params_dict[key])
            }
        }
        
        new_url = "?" + params_list.join("&");
        this.window.history.pushState('plop', 'plop', new_url);
 	this.updateModel()
    },
    
    /**
     * update(size/style/position) a list of selected clones <br>
     * a slight function for operation who impact only a bunch of clones (merge/split/...)
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElem : function (list) {
	this.update();
    },
    
    /**
     * update(style only) a list of selected clones <br>
     * a slight function for operation who impact only styles of clones (select/focus)
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle : function () {
        this.update();
    },
    
    /**
     * resize view to match his div size <br>
     * each view must be able to match the size of it's div
     * @abstract
     * */
    resize : function () {
        
    },

    applyURL : function() {
        var straight_params = this.getStraightParams();
        for (var i = 0; i < straight_params.length; i++) {
            this.m[straight_params[i]] = this.url_dict[straight_params[i]];
        }

        if (typeof this.url_dict.clone !== "undefined") {
            var clones = this.url_dict.clone.split(',');
            for (var j = 0; j < clones.length; j++) {
                var c = this.m.clone(clones[j]);
                if (!c.isVirtual()) {
                    c.select = true;
                }
            }
        }
        if (typeof this.url_dict.plot !== "undefined") {
            var sp_params = this.url_dict.plot.split(',');
            this.sp.changeSplitMethod(sp_params[0], sp_params[1], sp_params[2]);
        }
    },

    parseUrlParams:function (urlparams) {
        params={}
        if (urlparams.length === 0) {
            return params;
        }
        url_param = urlparams.substr(1).split("&");
        for (var i = 0; i < url_param.length; i++) {
            var tmparr = url_param[i].split("=");
	    params[tmparr[0]] = tmparr[1];
        }
        return params
    },

    generateParamsString: function(params_dict) {
        var params_list = [];
        for (var key in params_dict){
            if ((typeof key != "undefined" && key !== "") && (typeof params_dict[key]!= "undefined" && params_dict[key] !== '')) {
                params_list.push(key+"="+params_dict[key])
            }
        }
        return params_list.join("&");
    },

    pushUrl: function(params) {
        var new_url = "?" + params;
        this.window.history.pushState('plop', 'plop', new_url);
    },

    getStraightParams: function() {
        return ["sample_set_id", "patient_id", "run_id", "config"];
    }

};
