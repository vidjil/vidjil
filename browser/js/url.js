function Url(model, win) {
    View.call(this, model);

    this.m = model;
    this.window = (typeof win != "undefined") ? win : window

    this.encoder = new UrlEncoder();
    this.url_dict = this.parseUrlParams();
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
            sp_params.forEach(function(e,i,a) { a[i] = decodeURIComponent(e) })
            if (sp_params.length == 2) {
                sp_params.push(this.sp.mode);
            }
            this.sp.changeSplitMethod(sp_params[0], sp_params[1], sp_params[2]);
            this.sp.cancelPreset()
        }
    },

    parseUrlParams:function () {
        params={}
        var url = this.window.location;
        var url_param = [];
        if (url.search.length > 0) {
            url_param = url.search.substr(1).split("&");
        }
        for (var i = 0; i < url_param.length; i++) {
            var tmparr = url_param[i].split("=");

            // if the format isn't respected ignore parameter
            if (tmparr.length !== 2) {
                console.log("incorrect parameter: " + url_param[i]);
                continue;
            }

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
            var val = params_dict[key];
            if ((typeof key != "undefined" && key !== "") && (typeof val != "undefined")) {
                var encoded = this.encoder.encode(key);
                if (val.constructor !== Array && val !== '') {
                    params_list.push(encoded+"="+val)
                } else if (val.constructor === Array) {
                    for (var i = 0; i < val.length; i++) {
                        params_list.push(encoded+"="+val[i]);
                    }
                }
            }
        }
        return params_list.join("&");
    },

    pushUrl: function(params) {
        var new_url;
        new_url = this.window.location.pathname + '?' + params;
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

function PositionalUrl(model, win) {
    Url.call(this, model, win);
}

PositionalUrl.prototype = Object.create(Url.prototype);

PositionalUrl.prototype.parseUrlParams = function() {
        var params = Url.prototype.parseUrlParams.call(this);

        var url = this.window.location;
        var slash_params = url.pathname.substr(1).split('/');
        var positional_params = [];
        for (var k = 0; k < slash_params.length; k++) {
            if(slash_params[k] !== 'browser'  && slash_params[k] !== "index.html" && slash_params[k] !== "")
                positional_params.push(slash_params[k]);
        }
        var pos_param_keys = this.getStraightParams();
        for (var j = 0; j < positional_params.length; j++) {
            params[pos_param_keys[j]] = positional_params[j];
        }
        return params;
    }

PositionalUrl.prototype.generateParamsString = function(params_dict) {
        var params_list = [];
        var positional_params = [];
        for (var key in params_dict){
            var val = params_dict[key];
            if ((typeof key != "undefined" && key !== "") && (typeof val != "undefined")) {
                var pos = this.getPosition(key);
                if (pos >= 0) {
                    positional_params[pos] = val;
                } else {
                    var encoded = this.encoder.encode(key);
                    if (val.constructor !== Array && val !== '') {
                        params_list.push(encoded+"="+val)
                    } else if (val.constructor === Array) {
                        for (var i = 0; i < val.length; i++) {
                            params_list.push(encoded+"="+val[i]);
                        }
                    }
                }
            }
        }
        return '/' + positional_params.join('/') + '?' + params_list.join("&");
    }

PositionalUrl.prototype.pushUrl = function(params) {
        var new_url = this.window.location.href.split('browser')[0] + 'browser' + params;
        console.log("new url: " + new_url);
        this.window.history.pushState('plop', 'plop', new_url);
    };

PositionalUrl.prototype.getPosition = function(param) {
        return this.getStraightParams().indexOf(param);
    };

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
