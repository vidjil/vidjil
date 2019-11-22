var modelRef;

/**
 * Sets the model reference for the cross domain functions to use.
 * @param {object} model - the model reference to pass to the cross domain functions.
 */
function setCrossDomainModel(model) {
  modelRef = model;
}

//parametre IMGT par defaut
function initImgtInput(species) {
    var imgtInput = {};
    imgtInput.species = getSpeciesCommonName(species);
    imgtInput.receptorOrLocusType = "TR";
    imgtInput.inputType = "inline";
    imgtInput.resultType = "synthesis";
    imgtInput.outputType = "html";
    imgtInput.nbNtPerLine = "60";
    imgtInput.sv_V_GENEordertable = "1";
    imgtInput.sv_V_GENEalignment = "true";
    imgtInput.sv_V_REGIONalignment = "true";
    imgtInput.sv_V_REGIONtranslation = "true";
    imgtInput.sv_V_REGIONprotdisplay = "true";
    imgtInput.sv_V_REGIONprotdisplay2 = "true";
    imgtInput.sv_V_REGIONprotdisplay3 = "true";
    imgtInput.sv_V_REGIONfrequentAA = "true";
    imgtInput.sv_IMGTjctaResults = "true";

    // part for the version where we asynchronously get results from V-QUEST
    imgtInput.xv_IMGTgappedNt = "false";
    imgtInput.xv_summary = "false";
    imgtInput.xv_ntseq = "true"; // nt-sequences
    imgtInput.xv_IMGTgappedAA = "false";
    imgtInput.xv_AAseq = "false";
    imgtInput.xv_JUNCTION = "false"; // Junction
    imgtInput.xv_V_REGIONmuttable = "false";
    imgtInput.xv_V_REGIONmutstatsNt = "false";
    imgtInput.xv_V_REGIONmutstatsAA = "false";
    imgtInput.xv_V_REGIONhotspots = "false";
    // end of part
    
    imgtInput.IMGTrefdirSet = "1"; // "F+ORF+ in-frame P";
    imgtInput.IMGTrefdirAlleles = "true";
    imgtInput.V_REGIONsearchIndel = "true";
    imgtInput.nbD_GENE = "";    // Default value: 1 for IGH, 1 for TRB, 3 for TRD
    imgtInput.sequences = "";
    return imgtInput;
}

//parametre igBlast par defaut
function initIgBlastInput() {
    var igBlastInput = {};
    igBlastInput.queryseq = "GAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTTCTGACATAAGAAACCCTTTGGCAGTGGAACAACAC"
    igBlastInput.organism = "human"
    igBlastInput.germline_db_V = "IG_DB/imgt.TR.Homo_sapiens.V.f.orf.p";
    igBlastInput.germline_db_D = "IG_DB/imgt.TR.Homo_sapiens.D.f.orf";
    igBlastInput.germline_db_J = "IG_DB/imgt.TR.Homo_sapiens.J.f.orf.p";
    igBlastInput.program = "blastn";
    igBlastInput.min_D_match = 5;
    igBlastInput.D_penalty = -4;
    igBlastInput.num_alignments_V = 3;
    igBlastInput.num_alignments_D = 3;
    igBlastInput.num_alignments_J = 3;
    igBlastInput.translation = true;
    igBlastInput.domain = "imgt";
    igBlastInput.outfmt = 3;
    igBlastInput.additional_db = "";
    igBlastInput.v_focus = true;
    igBlastInput.num_alignments_additional = 10;
    igBlastInput.evalue = 1;
    igBlastInput.LINK_LOC = "";
    igBlastInput.SEARCH_TYPE = "TCR";
    igBlastInput.igsource = "new";
    igBlastInput.analyze = "on";
    igBlastInput.CMD = "request";
    igBlastInput.seqtype = "TCR";
    return igBlastInput;
}


function imgtPost(species, data, system) {
    var imgtInput = initImgtInput(species);
    imgtInput.sequences = data;
    if (system[0] == "I") {
        imgtInput.receptorOrLocusType = "IG";
    }
    if (system[0] == "T") {
        imgtInput.receptorOrLocusType = "TR";
    }
    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "_blank";
    form.action = "http://www.imgt.org/IMGT_vquest/analysis";
    form.method = "POST";

    for (var k in imgtInput) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = imgtInput[k];
        form.appendChild(input);
    }

    form.submit();

}
/**
 * Send of form to imgt to get valuable information from genes like
 * operativeness, CDR3 sequence ....
 * Process the information received
 * display it in the segmenter div of the browser.
 *
 * @param data
 * @param system
 */
function imgtPostForSegmenter(species, data, system, segmenter, override_imgt_options) {
    var imgtInput = initImgtInput(species);
    if (typeof override_imgt_options != 'undefined') {
        append_to_object(override_imgt_options, imgtInput)
    }
    var imgt4segButton= document.getElementById("toIMGTSeg");
    //limit #request to #
    var pos, nb = 1;
    pos = 0;
    while ((pos = data.indexOf(">", pos + 1)) > 0) {
        nb++;
    }

    //update imgt button according to request processing
    if (typeof imgt4segButton != "undefined"){
        imgt4segButton.removeAllChildren();
        imgt4segButton.appendChild(icon('icon-spin4 animate-spin', 'Sequences sent to IMGT/V-QUEST'));
    }

    //process to first 10 sequences then alert user about the remaining part
    if (nb > 10) {
        data = getNFirstSequences(data, 10);
        var msg = "The first 10 sequences were sent to IMGT/V-QUEST."

        console.log({
            "type": "flash",
            "msg": msg ,
            "priority": 1
        });
    }

    imgtInput.resultType = "excel";
    imgtInput.sequences = data;
    imgtInput.xv_outputtype = 2;

    if (system[0] == "I") {
        imgtInput.receptorOrLocusType = "IG";
    }
    if (system[0] == "T") {
        imgtInput.receptorOrLocusType = "TR";
    }
    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "";
    //disabled due to security concerns
    //form.action = "http://www.imgt.org/IMGT_vquest/vquest";
    //using proxy on server to allow requests on other site than vidjil one's in JS.
    if (typeof config != 'undefined' && typeof config.proxy != 'undefined') {
        form.action = config.proxy+"/imgt"
    } else {
        console.log({
            "type": "flash",
            "msg": "Your installation doesn't seem to have an associated proxy.",
            "priority": 2
        });
    }
    form.method = "POST";

    for (var k in imgtInput) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = imgtInput[k];
        form.appendChild(input);
    }

    /*due to browser's security limitations, a proxy had to be settled. */
    var httpRequest = new XMLHttpRequest();
    var imgtArray;
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
            console.log({
                "type": "log",
                "msg": "imgtPostForSegmenter: Loading results from Imgt Form ",
                "priority": 1
            });
            imgtArray = processImgtContents(httpRequest.responseText, "pre");
            var logmsg = "IMGT: processing clone idx(";
            var cloneIdx;
            for (var i = 0; i < imgtArray.length; i++) {
                //merge clone from segmenter and imgtinfo
                //loop through the model maintained selection list
                seq_id = imgtArray[i]["Sequence ID"]
                cloneIdx= seq_id.substr(0,seq_id.indexOf('#'))
                logmsg += cloneIdx + ",";
                //remove unneeded info coz relative to # of selected items
                delete  imgtArray[i]["Sequence number"];
                if (typeof modelRef.clones[cloneIdx].seg.imgt == 'undefined') {
                    modelRef.clones[cloneIdx].seg.imgt = {}
                    modelRef.clones[cloneIdx].seg.imgt2display = {}
                }
                correctIMGTPositionsForInsertions(imgtArray[i]);
                append_to_object(imgtArray[i], modelRef.clones[cloneIdx].seg.imgt);
                append_to_object(computeStartStop(imgtArray[i],modelRef.clones[cloneIdx].getSequence()),
                                 modelRef.clones[cloneIdx].seg.imgt2display);
                //toggle save in analysis file
                modelRef.clones[cloneIdx].segEdited = true;
            }
            modelRef.updateElemStyle(modelRef.getSelected());

            var imgt4segButton= document.getElementById("toIMGTSeg");
            if (typeof imgt4segButton != "undefined"){
                imgt4segButton.innerHTML = '▼';
            }
            console.log({
                "type": "log",
                "msg": logmsg+ ")" + httpRequest.statusText
            });

            // sai : segmenter axis inputs ; activate productivity-IMGT and VIdentity-IMGT
            var sai = document.getElementById('segmenter_axis_select').getElementsByTagName('input');
            for (var index in sai) {
                if (!sai[index].checked && (sai[index].value == "productivity-IMGT" || sai[index].value == "VIdentity-IMGT"))
                    sai[index].click();
            }

            var span = document.getElementById('highlightCheckboxes');
            span.removeAllChildren();
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.id = 'imgt_cdr3_input_check';
            input.checked = false;
            $(input).on("click", function() {
                if(this.checked) {
                    segmenter.highlight[1].field = "CDR3-IMGT";
                    segmenter.highlight[1].color = "red";

                } else {
                    segmenter.highlight[1].field = "";
                }
                    segmenter.update();

            });
            var label = document.createElement('label');
            label.setAttribute("for", 'imgt_cdr3_input_check');
            label.innerHTML = 'CDR3-IMGT';

            input.setAttribute("title", 'Display CDR3 computed by IMGT/V-QUEST');
            label.setAttribute("title", 'Display CDR3 computed by IMGT/V-QUEST');

            span.appendChild(input);
            span.appendChild(label);

            input = document.createElement('input');
            input.type = 'checkbox';
            input.id = 'imgt_vdj_input_check';
            input.checked = false;
            $(input).on("click", function() {
                if(this.checked) {
                    segmenter.highlight[2].field = "V-REGION";
                    segmenter.highlight[2].color = "#4b4";
                    segmenter.highlight[3].field = "D-REGION";
                    segmenter.highlight[3].color = "#b44";
                    segmenter.highlight[4].field = "J-REGION";
                    segmenter.highlight[4].color = "#aa2";
                } else {
                    segmenter.highlight[2].field = "";
                    segmenter.highlight[3].field = "";
                    segmenter.highlight[4].field = "";

                }
                    segmenter.update();

            });
            label = document.createElement('label');
            label.setAttribute("for", 'imgt_vdj_input_check');
            label.innerHTML = "V/D/J-IMGT";
            input.setAttribute("title", "Display 5'V-REGION, D-REGION and 3'J-REGION computed by IMGT/V-QUEST");
            label.setAttribute("title", "Display 5'V-REGION, D-REGION and 3'J-REGION computed by IMGT/V-QUEST");

            span.appendChild(input);
            span.appendChild(label);
        }
    };
    httpRequest.onerror = function () {
        console.log({
            "type": "flash",
            "msg": "imgtPostForSegmenter: error while requesting IMGT website: " + httpRequest.statusText,
            "priority": 2
        });
        var imgt4segButton= document.getElementById("toIMGTSeg");
        if (typeof imgt4segButton != "undefined"){
            imgt4segButton.removeAttribute("style");
            imgt4segButton.textContent=imgt4segButton.textContent.replace(" (loading)","");
        }
    };

    //test with a local file
    //httpRequest.open('GET', '/vidjil/data/vquest.data');
    httpRequest.open(form.method, form.action, true);
    httpRequest.send(new FormData(form));
}


function igBlastPost(species, data, system) {
    var igBlastInput = initIgBlastInput();
    igBlastInput.queryseq = data;
    if (system[0] == "I") {
        igBlastInput.germline_db_V = "IG_DB/imgt.Homo_sapiens.V.f.orf.p";
        igBlastInput.germline_db_D = "IG_DB/imgt.Homo_sapiens.D.f.orf";
        igBlastInput.germline_db_J = "IG_DB/imgt.Homo_sapiens.J.f.orf";
        igBlastInput.SEARCH_TYPE = "IG";
        igBlastInput.seqtype = "Ig";
    } else if (system[0] == "T") {
        igBlastInput.germline_db_V = "IG_DB/imgt.TR.Homo_sapiens.V.f.orf.p";
        igBlastInput.germline_db_D = "IG_DB/imgt.TR.Homo_sapiens.D.f.orf";
        igBlastInput.germline_db_J = "IG_DB/imgt.TR.Homo_sapiens.J.f.orf.p";
        igBlastInput.SEARCH_TYPE = "TCR";
        igBlastInput.seqtype = "TCR";
    }


    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "_blank";
    form.action = "https://www.ncbi.nlm.nih.gov/igblast/igblast.cgi";
    form.method = "POST";

    for (var k in igBlastInput) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = igBlastInput[k];
        form.appendChild(input);
    }

    form.submit();

}


// ARReST / CompileJunction

var arrestInput = {};
arrestInput.fname = "exported_func" ;
arrestInput.pjxrand = ".0033328778554" ;
arrestInput.elite = "" ;

function arrestPost(species, data, system) {

    arrestInput.args = data;

    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "_blank";
    form.action = "http://tools.bat.infspire.org/cgi-bin/arrest/compile.junctions.online.pl";
    form.method = "POST";

    for (var k in arrestInput) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = arrestInput[k];
        form.appendChild(input);
    }

    form.submit();

}


//parametre blast par defaut
var blastInput = {};
blastInput.query_sequence          = "";
blastInput.query_type              = "dna";
blastInput["filterable-dropdown-tag"] = "Human (Homo sapiens)";
blastInput.db_type                 = "dna";
blastInput.source_dna              = "LATESTGP";
blastInput.search_type             = "NCBIBLAST_BLASTN";
blastInput.config_set_NCBIBLAST_BLASTN       = "normal";
blastInput.description                       = "";
blastInput.NCBIBLAST_BLASTN__max_target_seqs = "100";
blastInput.NCBIBLAST_BLASTN__culling_limit   = "5";
blastInput.NCBIBLAST_BLASTN__evalue          = "10";
blastInput.NCBIBLAST_BLASTN__word_size       = "11";
blastInput.NCBIBLAST_BLASTN__score           = "1_3";
blastInput.NCBIBLAST_BLASTN__gap_dna         = "5n2";
blastInput.NCBIBLAST_BLASTN__ungapped        = 0;
blastInput.NCBIBLAST_BLASTN__dust            = 1;
blastInput.NCBIBLAST_BLASTN__repeat_mask     = 1;

function blastPost(species, data, system) {
    if (self.m.getSelected().length > 30) {
        data = getNFirstSequences(data, 30);
        console.log({"type": "flash", "msg": "A maximum of 30 clones are allowed by Blast. Only the first 30 sequences will be sent" , "priority": 1});
        
    }

    blastInput.query_sequence = data;

    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "_blank";
    form.action = "http://www.ensembl.org/Multi/Tools/Blast?db=core";
    form.method = "POST";

    for (var k in blastInput) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = blastInput[k];
        form.appendChild(input);
    }

    form.submit();

}

function assignSubsetsPost(species, data, system) {
    if (system != "IGH") {
        console.log({"type": "flash",
                     "msg": "Subsets are only defined for IGH sequences. Thus you cannot launch it on other sequences",
                     "priority": 1});
    } else {
        var form = document.getElementById("form");
        form.removeAllChildren();
        form.target = "_blank";
        form.enctype = 'multipart/form-data';
        form.name = 'assignsubsets';
        if (typeof config != 'undefined' && typeof config.proxy != 'undefined') {
            form.action = config.proxy+"/assign_subsets"
        } else {
            console.log({
                "type": "flash",
                "msg": "Your installation doesn't seem to have an associated proxy.",
                "priority": 2
            });
        }
        form.method = "POST";
        var formData = {};
        formData.fastatext = data;
        formData.elite = null;
        for (var k in formData) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            if (formData[k] != null)
                input.value = formData[k];
            form.appendChild(input);
        }
        form.submit();
    }
}

/**
 * Creates and returns a sendTo button (in a span)
 * @param {id}: id of the span
 * @param {name}: name of the sendTo function ({name}Post) [useless if
 *                {onclick} is provided
 * @param {label}: Label of the button
 * @param {title}: Title when hovering the button
 * @param {onclick}: (optional) Function to be called when clicking the button.
 *                   By default will call {name}Post()
 *
 */
function createSendToButton(id, name, label, title, segmenter, onclick) {
    var span = document.createElement('span');
    span.id = id;
    span.setAttribute('title', 'title')
    span.className = "button";
    if (typeof onclick !== "undefined") {
        span.onclick = onclick;
    } else {
        span.onclick = function () {
            segmenter.sendTo(name);
        };
    }
    span.appendChild(document.createTextNode(label));
    return span;
}
