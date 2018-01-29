function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function labelise(text) {
    var split = text.split('_');
    var result = "";
    for (var i = 0; i < split.length; i++) {
        split[i] = capitalise(split[i]);
    }
    return split.join(' ');
}

function FormBuilder() {
    if (typeof FormBuilder.instance === 'object') {
        return FormBuilder.instance;
    }

    FormBuilder.instance = this;
    this.index = 0;
}

FormBuilder.prototype = {

    build_wrapper: function() {
        var d = document.createElement('div');
        d.className = "field_div";
        return d;
    },

    build_label: function(txt, object, field) {
        var l = document.createElement('label');
        l.htmlFor = field + "_" + this.index;
        l.id = object + "_" + field + "__label_" + this.index;
        l.innerText = txt + ":";
        return l;
    },

    build_input: function(id, className, name, input_type, set_type, required, placeholder) {
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
    },

    build_field: function(id, name, label, required, placeholder) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        d.appendChild(this.build_label(label, this.type, id));
        d.appendChild(this.build_input(id, 'string', name, 'text', this.type, required, placeholder));
        return d;
    },

    build_textarea: function(id, className, name, set_type) {
        var t = document.createElement('textarea');
        t.id = set_type + "_" + id + "_" + this.index;
        t.className = "form-control " + className;
        t.name = set_type + "[" + this.index + "][" + name + "]";
        t.rows = 1;
        return t;
    },

    build_fieldset: function(type) {
        var f = document.createElement('fieldset');
        f.name = type + this.index;
        f.appendChild(this.build_legend(capitalise(type) + " " + (this.index+1)));
        return f;
    },

    build_legend: function(text) {
        var l = document.createElement('legend');
        l.innerText = text;
        return l;
    },

    date : function(id, object, name, label) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        d.appendChild(this.build_label(label, this.type, id));
        var i = this.build_input(id, 'date', name, 'text', object, false, 'yyyy-mm-dd');
        i.pattern = "[0-9]{4}-[0-9]{2}-[0-9]{2}";
        i.title = "yyyy-mm-dd"
        d.appendChild(i);
        return d;
    },

}

function SetFormBuilder() {
    this.type = 'foobar';
    FormBuilder.call(this);
}

SetFormBuilder.prototype = Object.create(FormBuilder.prototype);

SetFormBuilder.prototype.set_id = function() {
        var id = 'id_label';
        return this.build_field(id, id, capitalise(this.type)+' ID');
    };

SetFormBuilder.prototype.info = function() {
        var d = this.build_wrapper();
        var id = 'info';
        d.appendChild(this.build_label('Info', this.type, id));

        var txt = this.build_textarea('info', "text", 'info', this.type);
        $(txt).data('needs-atwho', true);
        $(txt).on('focus', function() {
            $(this).data('keys', [$('#group_select option:selected').val()]);
            new VidjilAutoComplete().setupTags(this);
        });
        d.appendChild(txt);
        return d;
    };

function PatientFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'patient'
}

PatientFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

PatientFormBuilder.prototype.build = function(index) {
        this.index = index;
        var fieldset = this.build_fieldset(this.type);
        fieldset.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        fieldset.appendChild(this.set_id());
        fieldset.appendChild(this.build_field('first_name', undefined, undefined, true));
        fieldset.appendChild(this.build_field('last_name', undefined, undefined, true));
        fieldset.appendChild(this.date('birth'));
        fieldset.appendChild(this.info());
        return fieldset;
    };

function RunFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'run';
}

RunFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

RunFormBuilder.prototype.build = function(index) {
        this.index = index;
        var fieldset = this.build_fieldset(this.type);
        fieldset.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        fieldset.appendChild(this.set_id());
        fieldset.appendChild(this.build_field('name', undefined, undefined, true));
        fieldset.appendChild(this.date('run_date', 'run_date', 'Date'));
        fieldset.appendChild(this.info());
        fieldset.appendChild(this.build_field('sequencer'));
        fieldset.appendChild(this.build_field('pcr', 'pcr', 'PCR'));
        return fieldset;
    };

function GenericFormBuilder() {
    SetFormBuilder.call(this);
    this.type = 'generic';
}

GenericFormBuilder.prototype = Object.create(SetFormBuilder.prototype);

GenericFormBuilder.prototype.build = function(index) {
        this.index = index;
        var fieldset = this.build_fieldset('set');
        fieldset.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        fieldset.appendChild(this.build_field('name', undefined, undefined, true));
        fieldset.appendChild(this.info());
        return fieldset;
    }
