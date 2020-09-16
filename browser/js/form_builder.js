function addPatientForm(content) {
    var fieldSet = document.getElementById('fieldset_container')
    var index = document.getElementById('patient_button').dataset.index++
    var div = new PatientFormBuilder().build(index, content)
    fieldSet.appendChild(div);
}

function addRunForm(content) {
    var fieldSet = document.getElementById('fieldset_container')
    var index = document.getElementById('run_button').dataset.index++
    var div = new RunFormBuilder().build(index, content)
    fieldSet.appendChild(div);
}

function addSetForm(content) {
    var fieldSet = document.getElementById('fieldset_container')
    var index = document.getElementById('generic_button').dataset.index++
    var div = new GenericFormBuilder().build(index, content)
    fieldSet.appendChild(div);
}

function addForms(array_content) {
    for (var c in array_content)
        addForm(array_content[c])
    if (array_content.length > 0)
        removeEmptyForms()
}

function addForm(content){
    switch (content.type) {
        case 'patient':
            addPatientForm(content)
            break
        case 'run':
            addRunForm(content)
            break
        case 'generic':
            addSetForm(content)
            break
        default:
            console.log({msg: "addForm() : unknow type", priority: 1})
      }
}

function removeEmptyForms(){
    var fc = document.getElementById('fieldset_container')
    var fl = fc.getElementsByClassName('form_line')

    for (var i = 0; i<fl.length; i++ ){
        var fields = fl[i].getElementsByClassName('form-control')
        var isEmpty=true

        for (var j = 0; j<fields.length; j++ )
            if (fields[j].value != '') isEmpty=false
        
        if (isEmpty)
            fl[i].parentNode.removeChild(fl[i])
    } 
}

/*
*/
function parseClipboard(clipboard){
    console.closePopupMsg()

    var lines = clipboard.split('\n')
    var patient_count, run_count, set_count, unknow_count
    patient_count = run_count = set_count = unknow_count = 0
    var parsed_lines = []

    for(var i = 0; i < lines.length; i++){
        var cells = lines[i].split('\t')

        switch (cells.length) {
            case 5:
                patient_count++
                parsed_lines.push({     type : 'patient', 
                                        patient_id : cells[0],
                                        first_name : cells[1],
                                        last_name : cells[2],
                                        birth : cells[3],
                                        info : cells[4]})
                break
            case 4:
                run_count++        
                parsed_lines.push({     type : 'run', 
                                        run_id : cells[0],
                                        name : cells[1],
                                        date : cells[2],
                                        info : cells[3]})
                break
            case 2:    
                set_count++     
                parsed_lines.push({     type : 'generic', 
                                        name : cells[0],
                                        info : cells[1]})
                break
            default:
                unknow_count++
        }
    }

    if (patient_count == 0 && run_count == 0 && set_count == 0){
        console.log({"type": "popup", "msg":    "Nothing found in clipboard, please be sure to have valid data in clipboard<br>"+
                                                "data in clipboard are expected to be tabulated <br>"+
                                                " (a copy from an excell spreadsheet should be already in this format)<br>"+
                                                "- row must be separeted with a break line<br>"+
                                                "- cells must be separated with a tabulation<br>"+ 
                                                "<br>"+
                                                "- a row with 5 cells will be loaded as a new patient (id/first_name/last_name/date/info)<br>"+
                                                "- a row with 4 cells will be loaded as a new run (id/run_name/date/info)<br>"+
                                                "- a row with 2 cells will be loaded as a new set (set_name/info)<br>"})
        return []
    }

    if (patient_count !=0)
        console.log({msg: patient_count+" patient(s) loaded from clipboard, please check form before saving", type: 'flash', priority: 1})
    if (run_count !=0)
        console.log({msg: run_count+" run(s) loaded from clipboard, please check form before saving", type: 'flash', priority: 1})
    if (set_count !=0)
        console.log({msg: set_count+" set(s) loaded from clipboard, please check form before saving", type: 'flash', priority: 1})
    if (unknow_count !=0)
        console.log({msg: unknow_count+" line(s) have been ignored from clipboard", type: 'flash', priority: 1})

    return parsed_lines
}

function readClipBoard() {
    //clipboard API is missing (old browser)
    if (!navigator.clipboard){
        readClipBoard2()
        return
    }
    
    //clipboard API is incomplete (firefox...)
    var permissionQuery = { name: 'clipboard-read', allowWithoutGesture: false }
    navigator.permissions.query(permissionQuery)
    if (!navigator.clipboard.readText){
        readClipBoard2()
        return
    }

    //user did not allowed clipboard acces?
    navigator.clipboard
        .readText()
        .then(function(clipboard){
            var parsed_content = parseClipboard(clipboard)
            addForms(parsed_content)
        })
        .catch(function(err){
            creadClipBoard2()
            return
        });
}

function readClipBoard2() {
    var template = document.getElementById("clipboard-popup")
    var clone = template.content.firstElementChild.cloneNode(true)
    console.popupHTML(clone)
}



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
        $(l).text(txt + ":"); // for compatibility with older browsers (FF32, IE7/8)
        return l;
    },

    build_input: function(id, className, name, input_type, set_type, placeholder, content, required) {
        var i = document.createElement('input');
        i.id = set_type + "_" + id + "_" + this.index;
        i.className = "form-control " + className;
        i.type = input_type;
        i.name = set_type + "[" + this.index + "][" + name + "]";

        if (typeof required !== "undefined") {
            i.required = required;
        }

        if (content != undefined) 
            i.value = content

        if (typeof placeholder !== "undefined") {
            i.placeholder = placeholder;
        }

        return i;
    },

    build_field: function(id, name, label, content, required) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        d.appendChild(this.build_input(id, 'string', name, 'text', this.type, label, content, required));
        return d;
    },

    build_textarea: function(id, className, name, set_type, placeholder) {
        var t = document.createElement('textarea');
        t.id = set_type + "_" + id + "_" + this.index;
        t.className = "form-control " + className;
        t.name = set_type + "[" + this.index + "][" + name + "]";
        t.rows = 1;
        t.placeholder = placeholder;
        return t;
    },

    build_div: function(type) {
        var d = document.createElement('div');
        var c = document.createElement('div');
        c.className = "clear";
        d.appendChild(c);
        var s = document.createElement('span');
        s.className = "left form_label"
        $(s).text(capitalise(type == 'generic' ? 'set' : type) + " " + (this.index+1)); // for compatibility with older browsers (FF32, IE7/8)
        d.appendChild(s);
        d.className = "form_line"
        return d;
    },

    build_legend: function(text) {
        var l = document.createElement('legend');
        $(l).text(text); // for compatibility with older browsers (FF32, IE7/8)
        return l;
    },

    build_date: function(id, object, name, label, content) {
        if (typeof name === "undefined") {
            name = id;
        }

        if (typeof label === "undefined") {
            label = labelise(id);
        }

        var d = this.build_wrapper();
        var i = this.build_input(id, 'date', name, 'text', object, 'yyyy-mm-dd', content, false);
        i.pattern = "(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))";
        i.title = label;
        d.appendChild(i);
        return d;
    },

    build_info: function(object, keys, label, content) {
        var d = this.build_wrapper();
        var id = 'info';

        var txt = this.build_input('info', "text", 'info', 'text', object, label + ' information (#tags can be used)', content, false);
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
    },

    set_id: function(content) {
        var id = 'id_label';
        var f = this.build_field(id, id, capitalise(this.type)+' ID', content);
        f.firstChild.className += " stringid";
        return f;
    },
}
FormBuilder.prototype = $.extend(Object.create(Closeable.prototype), FormBuilder.prototype)





function PatientFormBuilder() {
    FormBuilder.call(this);
    this.type = 'patient'
}

PatientFormBuilder.prototype = {

    build: function(index, content) {
        this.index = index;
        this.content = content
        if (this.content == undefined) this.content = {}

        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.set_id(this.content.patient_id));
        div.appendChild(this.build_field('first_name', undefined, undefined ,this.content.first_name, true));
        div.appendChild(this.build_field('last_name', undefined, undefined ,this.content.last_name, true));
        div.appendChild(this.build_date('birth', this.type, undefined, undefined, this.content.birth));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'patient', this.content.info));
        return div;
    }
}
PatientFormBuilder.prototype = $.extend(Object.create(FormBuilder.prototype), PatientFormBuilder.prototype)





function RunFormBuilder() {
    FormBuilder.call(this);
    this.type = 'run';
}

RunFormBuilder.prototype = {

    build: function(index, content) {
        this.index = index;
        this.content = content
        if (this.content == undefined) this.content = {}

        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.set_id(this.content.run_id));
        div.appendChild(this.build_field('name', undefined, undefined, this.content.name, true));
        div.appendChild(this.build_date('run_date', this.type, 'run_date', 'Date', this.content.date));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'run', this.content.info));
        // div.appendChild(this.build_field('sequencer'));
        // div.appendChild(this.build_field('pcr', 'pcr', 'PCR'));
        return div;
    }
}
RunFormBuilder.prototype = $.extend(Object.create(FormBuilder.prototype), RunFormBuilder.prototype)






function GenericFormBuilder() {
    FormBuilder.call(this);
    this.type = 'generic';
}

GenericFormBuilder.prototype ={

    build: function(index, content) {
        this.index = index;
        this.content = content
        if (this.content == undefined) this.content = {}

        var div = this.build_div(this.type);
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_input('id', 'text', 'id', 'hidden', this.type));
        div.appendChild(this.build_input('sample_set_id', 'text', 'sample_set_id', 'hidden', this.type));
        div.appendChild(this.build_field('name', undefined, undefined, this.content.name ,true));
        div.appendChild(this.build_info(this.type, [$('#group_select option:selected').val()], 'set', this.content.info));
        return div;
    }
}
GenericFormBuilder.prototype = $.extend(Object.create(FormBuilder.prototype), GenericFormBuilder.prototype)





function FileFormBuilder(group_ids, source, num_files) {
    FormBuilder.call(this);
    this.group_ids = group_ids;
    this.source = source;
    this.num_files = num_files;
    this.type = "file"

}

FileFormBuilder.prototype = {

    build: function(index) {
        this.index = index;
        var div = this.build_div('sample');
        div.appendChild(this.createCloseButton());
        div.appendChild(this.build_hidden_fields());
        div.appendChild(this.build_file_div());
        div.appendChild(this.build_date('sampling_date', this.type, 'sampling_date'));
        div.appendChild(this.build_info('file', this.group_ids, 'sample'));
        div.appendChild(this.build_set_div());
        return div;
    },

    build_file_div: function() {
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
    },

    build_hidden_fields: function() {
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
    },

    build_set_div: function() {
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
    },

    build_file_field: function(id, hidden) {
        var d = this.build_wrapper();
        d.className += " file_" + id;
        if (this.source || hidden) {
            d.style.display = "none";
        }
        var i = this.build_input('upload_' + id, 'upload_field', 'file'+id, 'file', 'file');
        if (this.source) {
            i.disabled = true;
        } else if (! hidden) {
            i.required = true;
        }
        i.title = "(.fa, .fastq, .fa.gz, .fastq.gz, .clntab)";
        d.appendChild(i);
        return d;
    },

    build_jstree: function() {
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
}
FileFormBuilder.prototype = $.extend(Object.create(FormBuilder.prototype), FileFormBuilder.prototype)
