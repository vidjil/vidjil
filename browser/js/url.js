function Url(model, win) {
    View.call(this, model);
    this.m = model;
    this.window = (typeof win != "undefined") ? win : window;

    this.encoder = new UrlEncoder();
    this.url_dict = this.parseUrlParams(this.window.location.search.toString());
    this.sp = this.m.sp;

    this.m.start(this.url_dict);
}

Url.prototype= {
    update: function () {

        //keep url up to date only for database file
        if (this.m.file_source != "database") {
            this.clean();
            return;
        }

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
        var positionnal_params = this.getPositionnalParams();
        for (var i = 0; i < positionnal_params.length; i++) {
            var p = positionnal_params[i];
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
    

    applyURL : function() {
        var positionnal_params = this.getPositionnalParams();
        for (var i = 0; i < positionnal_params.length; i++) {
            if (typeof this.url_dict[positionnal_params[i]] !== "undefined") {
                this.m[positionnal_params[i]] = this.url_dict[positionnal_params[i]];
            }
        }

        if (typeof this.url_dict.clone !== "undefined") {
            var clones = this.url_dict.clone.split(',');
            for (var j = 0; j < clones.length; j++) {
                var c = this.m.clone(clones[j]);
                if (typeof c !== "undefined" && (c.hasSizeConstant() || c.hasSizeDistrib())) {
                    // Only select constant clone
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

    parseUrlParams:function (urlparams) {
        params={};

        var url = this.window.location;
        var positionnal_params = url.pathname.substr(1).split('-');
        var pos_param_keys = this.getPositionnalParams();
        if (positionnal_params.length > 1 && positionnal_params[0] != "index.html")
            for (var j = 0; j < positionnal_params.length; j++) 
                params[pos_param_keys[j]] = positionnal_params[j];

        if (urlparams.length === 0) {
            return params;
        }

        url_param = urlparams.substr(1).split("&");
        for (var i = 0; i < url_param.length; i++) {
            var tmparr = url_param[i].split("=");
            var p = params[tmparr[0]];
            var key = this.encoder.decode(tmparr[0]);
            var val = tmparr[1];
            if ((key == "") /*empty keys are due to the use of "//" in url, ignore them*/ || 
                (typeof val == "undefined")) { 
                //do nothing
            }
            else if (typeof p === "undefined") {
                params[key] = val;
            } else if (p.constructor === String){
                params[key] = [];
                params[key].push(p);
                params[key].push(val);
            } else if (p.constructor === Array) {
                params[key].push(val);
            }
        }
            
        return params;
    },

    generateParamsString: function(params_dict) {
        var params_list = [];
        var positionnal_params = [];
        for (var key in params_dict){
            var val = params_dict[key];
            if ((typeof key != "undefined" && key !== "") && (typeof val != "undefined")) {
                var pos = this.getPosition(key);
                if (pos >= 0) {
                    positionnal_params[pos] = val;
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
        return positionnal_params.join('-') + '?' + params_list.join("&");
    },

    pushUrl: function(params) {
        var new_url = params;
        try  {
            this.window.history.pushState('plop', 'plop', new_url);
        } catch(error) {
            console.log(error);
        }
    },

    getPositionnalParams: function() {
        return ["sample_set_id", "config"];
    },

    getPosition: function(param) {
        return this.getPositionnalParams().indexOf(param);
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
    },

    clean: function(){
        var url = this.window.location;
        var original_pathname = url.pathname;
        var positionnal_params = url.pathname.substr(1).split('-');
        if (positionnal_params.length > 1 && positionnal_params[0] != "index.html"){   
            var split = original_pathname.split('/');
            if (split[split.length-1] == "")
                split.splice(split.length-1, 1);
            split.splice(split.length-1, 1);
            original_pathname = split.join('/');
        } 

        if (original_pathname == "") original_pathname = "/";
        this.pushUrl(original_pathname);
    }

};
Url.prototype = $.extend(Object.create(View.prototype), Url.prototype);


function UrlEncoder() {
    this.encoding = {
        'sample_set_id': 'set',
        'patient_id': 'patient',
        'run_id': 'run',
        'config': 'conf'
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
