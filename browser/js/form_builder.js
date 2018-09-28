function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function labelise(text) {
    var split = text.split('_');
    var result = "";
    for (var i = 0; i < split.length; i++) {
        split[i] = split[i] ; // capitalise(split[i]);
    }
    return split.join(' ');
}

function add_file(target_id, index, group_ids) {
    var target = document.getElementById(target_id);
    var source = $("input[name='source']:checked").val() == 'nfs';
    var num_files = $("select#pre_process").find(':selected').attr("required_files"); // number of files requested by pre_process
    var builder = new FileFormBuilder(group_ids, source, num_files);
    target.appendChild(builder.build(index));
    $('#jstree_loader_' + index).trigger('load');
}

function FormBuilder() {
    if (typeof FormBuilder.instance === 'object') {
        return FormBuilder.instance;
    }

    Closeable.call(this);

    FormBuilder.instance = this;
    this.index = 0;
}

FormBuilder.prototype = Object.create(Closeable.prototype);

FormBuilder.prototype.build_wrapper = function() {
        var d = document.createElement('div');
        d.className = "field_div";
        return d;
    }

FormBuilder.prototype.build_label = function(txt, object, field) {
        var l = document.createElement('label');
        l.htmlFor = field + "_" + this.index;
        l.id = object + "_" + field + "__label_" + this.index;
        l.innerText = txt + ":";
        return l;
    }

FormBuilder.prototype.build_input = function(id, className, name, input_type, set_type, placeholder, required) {
        var i = document.createElement('input');
        i.id = set_type + "_" + id + "_" + this.index;
        i.className = "form-control " + className;
        i.type = input_type;
        i.name = set_type + "[" + this.index + "][" + name + "]";

        if (typeof required !== "undefined") {
            i.required = required;
        }

        if (typeof placeholder !== "undefined") {
            i.placeholder = placeholder;
        }

        return i;
    }

FormBuilder.prototype.build_field = function(id, name, label, required) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        d.appendChild(this.build_input(id, 'string', name, 'text', this.type, label, required));
        return d;
    }

FormBuilder.prototype.build_textarea = function(id, className, name, set_type, placeholder) {
        var t = document.createElement('textarea');
        t.id = set_type + "_" + id + "_" + this.index;
        t.className = "form-control " + className;
        t.name = set_type + "[" + this.index + "][" + name + "]";
        t.rows = 1;
        t.placeholder = placeholder;
        return t;
    }

FormBuilder.prototype.build_div = function(type) {
        var d = document.createElement('div');
        var c = document.createElement('div');
        c.className = "clear";
        d.appendChild(c);
        var s = document.createElement('span');
        s.className = "left form_label"
        s.innerText = capitalise(type == 'generic' ? 'set' : type) + " " + (this.index+1);
        d.appendChild(s);
        return d;
    }

FormBuilder.prototype.build_legend = function(text) {
        var l = document.createElement('legend');
        l.innerText = text;
        return l;
    }

FormBuilder.prototype.build_date = function(id, object, name, label) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        var i = this.build_input(id, 'date', name, 'text', object, 'yyyy-mm-dd', false);
        i.pattern = "(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))";
        i.title = label;
        d.appendChild(i);
        return d;
    }

FormBuilder.prototype.build_info = function(object, keys, label) {
        var d = this.build_wrapper();
        var id = 'info';

        var txt = this.build_input('info', "text", 'info', 'text', object, label + ' information (#tags can be used)');
        $(txt).data('needs-atwho', true);
        $(txt).on('focus', function() {
            $(this).data('keys', keys);
            new VidjilAutoComplete().setupTags(this);
        });
        txt.onkeydown = function(event) {
            if (event.keyCode == 13) {
                return false;
            }
        }
        d.appendChild(txt);
        return d;
    }

function SetFormBuilder() {
    this.type = 'foobar';
    FormBuilder.call(this);
}

SetFormBuilder.prototype = Object.create(FormBuilder.prototype);

SetFormBuilder.prototype.set_id = function() {
        var id = 'id_label';
        var f = this.build_field(id, id, capitalise(this.type)+' ID');
        f.firstChild.className += " stringid";
        return f;
    };

SetFormBuilder.prototype.build_date = function(id, name, label) {
        return Object.getPrototypeOf(SetFormBuilder.prototype).build_date.call(this, id, this.type, name, label);
    }

function PatientFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'patient'
}

PatientFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

PatientFormBuilder.prototype.build = function(index) {
        this.index = index;
        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.set_id());
        div.appendChild(this.build_field('first_name', undefined, undefined, true));
        div.appendChild(this.build_field('last_name', undefined, undefined, true));
        div.appendChild(this.build_date('birth'));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'patient'));
        return div;
    };

PatientFormBuilder.prototype.createCloseButton = function() {
        var self = this;
        var close = Object.getPrototypeOf(PatientFormBuilder.prototype).createCloseButton.call(this);
        $(close).click(function() {
            var button = document.getElementById('patient_button');
        });
        return close;
    };

function RunFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'run';
}

RunFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

RunFormBuilder.prototype.build = function(index) {
        this.index = index;
        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.set_id());
        div.appendChild(this.build_field('name', undefined, undefined, true));
        div.appendChild(this.build_date('run_date', 'run_date', 'Date'));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'run'));
        // div.appendChild(this.build_field('sequencer'));
        // div.appendChild(this.build_field('pcr', 'pcr', 'PCR'));
        return div;
    };

RunFormBuilder.prototype.createCloseButton = function() {
        var self = this;
        var close = Object.getPrototypeOf(RunFormBuilder.prototype).createCloseButton.call(this);
        $(close).click(function() {
            var button = document.getElementById('run_button');
        });
        return close;
    };

function GenericFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'generic';
}

GenericFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

GenericFormBuilder.prototype.build = function(index) {
        this.index = index;
        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.build_field('name', undefined, undefined, true));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'set'));
        return div;
    }

GenericFormBuilder.prototype.createCloseButton = function() {
        var self = this;
        var close = Object.getPrototypeOf(GenericFormBuilder.prototype).createCloseButton.call(this);
        $(close).click(function() {
            var button = document.getElementById('generic_button');
        });
        return close;
    };

function FileFormBuilder(group_ids, source, num_files) {
    FormBuilder.call(this);
    this.group_ids = group_ids;
    this.source = source;
    this.num_files = num_files;

}

FileFormBuilder.prototype = Object.create(FormBuilder.prototype);

FileFormBuilder.prototype.build = function(index) {
    this.index = index;
    var div = this.build_div('sample');
    div.appendChild(this.createCloseButton());
    div.appendChild(this.build_hidden_fields());
    div.appendChild(this.build_file_div());
    div.appendChild(this.build_date('sampling_date', 'file'));
    div.appendChild(this.build_info('file', this.group_ids, 'sample'));
    div.appendChild(this.build_set_div());
    return div;
}

FileFormBuilder.prototype.build_file_div = function() {
    var self = this;
    var hide_second = this.source || this.num_files < 2;
    var d = document.createElement('div');
    d.className="field_div";
    var file1 = this.build_file_field(1, this.source);
    var file_input = file1.getElementsByTagName('input')[0];
    file_input.onchange = function() {
        db.upload_file_onChange('file_filename_' + self.index, this.value);
    }
    d.appendChild(file1);
    d.appendChild(this.build_file_field(2, hide_second));
    d.appendChild(this.build_jstree(!this.source));
    return d;
}

FileFormBuilder.prototype.build_hidden_fields = function() {
    var d = document.createElement('div');
    d.className = "hidden";
    var i = this.build_input('filename', 'filename', 'filename', 'text', 'file');
    i.hidden = true;
    i.className = '';
    d.appendChild(i);
    i = this.build_input('id', '', 'id', 'text', 'file');
    i.hidden = true;
    i.className = '';
    d.appendChild(i);
    return d;
}

FileFormBuilder.prototype.build_set_div = function() {
    var self = this;
    var f = document.createElement('div');
    f.className = "field_div"

    var d = document.createElement('div');
    d.className = "token_div form-control";
    d.onclick = function() {
        $('#token_input_' + self.index).focus();
    };
    f.appendChild(d);

    var i = this.build_input('set_list', '', 'set_ids', 'text', 'file');
    i.hidden = true;
    i.className = '';
    d.appendChild(i);

    var set_div = document.createElement('div');
    set_div.id = "set_div_" + this.index;
    set_div.className = "token_container";
    d.appendChild(set_div);

    var i2 = document.createElement('input');
    i2.type = 'text';
    i2.id = 'token_input_' + this.index;
    i2.className = 'token_input';
    i2.autocomplete = "off";
    i2.onfocus = function() {
        new VidjilAutoComplete().setupSamples(this);
        new Tokeniser(document.getElementById('set_div_' + self.index), document.getElementById('file_set_list_' + self.index));
    }
    i2.dataset.needsAtwho = true;
    i2.dataset.needsTokeniser = true;
    i2.dataset.groupIds = "[" + this.group_ids + "]";
    i2.dataset.keys = '["generic", "patient", "run"]';
    i2.placeholder = "other patient/run/sets";
    d.appendChild(i2);

    return f;
}

FileFormBuilder.prototype.build_file_field = function(id, hidden) {
    var d = this.build_wrapper();
    d.className += " file_" + id;
    if (this.source || hidden) {
        d.style.display = "none";
    }
    var i = this.build_input('upload_' + id, 'upload_field', 'file'+id, 'file', 'file');
    if (this.source) {
        i.disabled = true;
    }
    i.title = "(.fa, .fastq, .fa.gz, .fastq.gz, .clntab)";
    d.appendChild(i);
    return d;
}

FileFormBuilder.prototype.build_jstree = function() {
    var self = this;
    var w = this.build_wrapper();
    var d = document.createElement('div');
    d.id = "jstree_field_" + self.index;
    w.appendChild(d);

    d.className += " jstree_field form-control";
    if (!this.source) {
        d.hidden = true;
    }
    d.onclick = function() {
        db.display_jstree(self.index);
    }

    var sel = document.createElement('span');
    sel.className = "button2";
    sel.appendChild(document.createTextNode(('browse')));
    d.appendChild(sel);
    var indicator = document.createElement('span');
    indicator.id = "file_indicator_" + self.index;
    d.appendChild(indicator);
    return d;
}

FileFormBuilder.prototype.createCloseButton = function() {
        var self = this;
        var close = Object.getPrototypeOf(FileFormBuilder.prototype).createCloseButton.call(this);
        $(close).click(function() {
            var button = document.getElementById('file_button');
        });
        return close;
    }
