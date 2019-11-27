function Url(model, win) {
    View.call(this, model);
    this.type = "URL"; 

    this.m = model;
    this.window = (typeof win != "undefined") ? win : window

    this.encoder = new UrlEncoder();
    this.url_dict = this.parseUrlParams(this.window.location.search.toString())
    this.sp = this.m.sp

    this.m.start(this.url_dict);
}

Url.prototype= {
    update: function () {

        // get selected clones
        var selectedList = this.m.getSelected();
        var params_dict = this.url_dict;
        
        if (selectedList.length > 0) {
            params_dict.clone = selectedList.join();
        } else {
            delete params_dict.clone;
        }

        // get scatterplot settings
        var def_pre = this.sp.preset[Object.keys(this.sp.preset)[this.sp.default_preset-1]];
        if (this.sp.splitX == def_pre.x && this.sp.splitY == def_pre.y && this.sp.mode == def_pre.mode) {
            delete params_dict.plot;
        } else {
            params_dict.plot = this.sp.splitX+','+this.sp.splitY+','+this.sp.mode;
        }

        // get sample_set/patient/run, config...
        var straight_params = this.getStraightParams();
        for (var i = 0; i < straight_params.length; i++) {
            var p = straight_params[i];
            if (typeof this.m[p] !== "undefined") {
                params_dict[p] = this.m[p];
            }
        }

        if (typeof this.m.custom !== "undefined") {
            var custom_ids = [];
            var custom_split = this.m.custom.split('&');
            for (var j = 0; j < custom_split.length; j++) {
                if (custom_split[j] !== "") {
                    custom_ids.push(custom_split[j].split('=')[1]);
                }
            }

            params_dict.custom = custom_ids;
        }

        params = this.generateParamsString(params_dict);

        this.pushUrl(params);
        this.url_dict = params_dict;
    },
    
    /**
     * update(size/style/position) a list of selected clones <br>
     * a slight function for operation who impact only a bunch of clones (merge/split/...)
     * @param {integer[]} list - array of clone index
     * */
    updateElem : function (list) {
	    this.update();
    },
    
    /**
     * update(style only) a list of selected clones <br>
     * a slight function for operation who impact only styles of clones (select/focus)
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle : function () {
        this.update();
    },
    

    applyURL : function() {
        var straight_params = this.getStraightParams();
        for (var i = 0; i < straight_params.length; i++) {
            if (typeof this.url_dict[straight_params[i]] !== "undefined") {
                this.m[straight_params[i]] = this.url_dict[straight_params[i]];
            }
        }

        if (typeof this.url_dict.clone !== "undefined") {
            var clones = this.url_dict.clone.split(',');
            for (var j = 0; j < clones.length; j++) {
                var c = this.m.clone(clones[j]);
                if (typeof c !== "undefined" && c.isInteractable()) {
                    c.select = true;
                }
            }
        }
        if (typeof this.url_dict.plot !== "undefined") {
            var sp_params = this.url_dict.plot.split(',');
            if (sp_params.length == 2) {
                sp_params.push(this.sp.mode);
            }
            this.sp.changeSplitMethod(sp_params[0], sp_params[1], sp_params[2]);
            this.sp.cancelPreset()
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
            var p = params[tmparr[0]];
            var key = this.encoder.decode(tmparr[0]);
            var val = tmparr[1];
            if (typeof p === "undefined") {
                params[key] = val;
            } else if (p.constructor === String){
                params[key] = [];
                params[key].push(p);
                params[key].push(val);
            } else if (p.constructor === Array) {
                params[key].push(val);
            }
        }
        return params
    },

    generateParamsString: function(params_dict) {
        var params_list = [];
        for (var key in params_dict){
            if ((typeof key != "undefined" && key !== "") && (typeof params_dict[key]!= "undefined")) {
                var encoded = this.encoder.encode(key);
                if (params_dict[key].constructor !== Array && params_dict[key] !== '') {
                    params_list.push(encoded+"="+params_dict[key])
                } else if (params_dict[key].constructor === Array) {
                    for (var i = 0; i < params_dict[key].length; i++) {
                        params_list.push(encoded+"="+params_dict[key][i]);
                    }
                }
            }
        }
        return params_list.join("&");
    },

    pushUrl: function(params) {
        var new_url = "?" + params;
        try  {
            this.window.history.pushState('plop', 'plop', new_url);
        } catch(error) {
            console.log(error);
        }
    },

    getStraightParams: function() {
        return ["sample_set_id", "config"];
    },

    loadUrl: function(db, args, filename) {
        this.url_dict = args;
        var newParams = this.generateParamsString(args);
        this.pushUrl(newParams);
        db.load_data(args, filename);
    },

    loadCustomUrl: function(db) {
        this.url_dict = {};
        this.pushUrl("");
        db.load_custom_data();
    }

};
Url.prototype = $.extend(Object.create(View.prototype), Url.prototype);

function UrlEncoder() {
    this.encoding = {
        'sample_set_id': 'set',
        'patient_id': 'patient',
        'run_id': 'run'

    };

    this.decoding = {};
    for (var k in this.encoding) {
        this.decoding[this.encoding[k]] = k;
    }
}

UrlEncoder.prototype = {
    encode: function(param) {
        if (typeof this.encoding[param] === "undefined"){
            return param;
        }
        return this.encoding[param];
    },

    decode: function(param) {
        if (typeof this.decoding[param] === "undefined"){
            return param;
        }
        return this.decoding[param];
    }
}
