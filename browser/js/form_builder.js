function FormBuilder() {
    if (typeof FormBuilder.instance === 'object') {
        return FormBuilder.instance;
    }

    FormBuilder.instance = this
    this.indexes = {
        'patient': 0,
        'run': 0,
        'generic': 0
    };
}

FormBuilder.prototype = {

    patient: function(index) {
        this.indexes['patient'] = index;
        var fieldset = this.fieldset('patient');
        fieldset.appendChild(this.build_input('id', 'text', 'id', 'hidden', 'patient'));
        fieldset.appendChild(this.patient_id());
        fieldset.appendChild(this.first_name());
        fieldset.appendChild(this.last_name());
        fieldset.appendChild(this.birth());
        fieldset.appendChild(this.info());
        return fieldset;
    },

    build_label: function(txt, stype, tgt) {
        var l = document.createElement('label');
        l.htmlFor = tgt + "_" + this.indexes[stype];
        l.id = stype + "_" + tgt + "__label_" + this.indexes[stype];
        l.innerText = txt + ":";
        return l;
    },

    build_input: function(id, className, name, input_type, set_type, placeholder) {
        var i = document.createElement('input');
        i.id = set_type + "_" + id + "_" + this.indexes[set_type];
        i.className = className;
        i.type = input_type;
        i.name = set_type + "[" + this.indexes[set_type] + "][" + name + "]";

        if (typeof placeholder !== "undefined") {
            i.placeholder = placeholder;
        }

        return i;
    },

    build_textarea: function(id, className, name, set_type) {
        var t = document.createElement('textarea');
        t.id = set_type + "_" + id + "_" + this.indexes[set_type];
        t.className = className;
        t.name = set_type + "[" + this.indexes[set_type] + "][" + name + "]";
        return t;
    },

    fieldset: function(type) {
        var f = document.createElement('fieldset');
        f.name = type + this.indexes[type];
        var l = document.createElement('legend');
        l.innerText = type.charAt(0).toUpperCase() + type.slice(1) + " " + (this.indexes['patient']+1);
        f.appendChild(l);
        return f;
    },

    patient_id: function() {
        var d = document.createElement('div');
        var id = 'id_label';
        d.appendChild(this.build_label('Patient ID', 'patient', id));
        d.appendChild(this.build_input(id, 'date', 'id_label', 'text', 'patient'));
        return d;
    },

    first_name: function() {
        var d = document.createElement('div');
        var id = 'first_name';
        d.appendChild(this.build_label('First Name', 'patient', id));
        d.appendChild(this.build_input(id, 'string', id, 'text', 'patient'));
        return d;
    },

    last_name: function() {
        var d = document.createElement('div');
        var id = 'last_name';
        d.appendChild(this.build_label('Last Name', 'patient', id));
        d.appendChild(this.build_input(id, 'string', id, 'text', 'patient'));
        return d;
    },

    birth: function() {
        var d = document.createElement('div');
        var id = 'birth';
        d.appendChild(this.build_label('Birth', 'patient', id));
        d.appendChild(this.build_input(id, 'date', id, 'text', 'patient', 'yyyy-mm-dd'));
        return d;
    },

    info: function() {
        var d = document.createElement('div');
        var id = 'info';
        d.appendChild(this.build_label('Info', 'patient', id));

        var txt = this.build_textarea('info', "text", 'info', 'patient');
        $(txt).data('needs-atwho', true);
        $(txt).on('focus', function() {
            $(this).data('keys', [$('#group_select option:selected').val()]);
            new VidjilAutoComplete().setupTags(this);
        });
        txt.cols = 40;
        txt.rows = 10;
        d.appendChild(txt);
        return d;
    }
}
