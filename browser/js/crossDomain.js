var PROXY_ADDRESS = "https://db.vidjil.org/vidjil/proxy/imgt"
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
    imgtInput.callback = "jQuery17106713638880755752_1378825832820";
    imgtInput.livret = "1";
    imgtInput.Session = "&lt;session code=Â¤0Â¤ appliName=Â¤IMGTvquestÂ¤ time=Â¤3625396897Â¤/&gt;";
    imgtInput.l01p01c02 = species;
    imgtInput.l01p01c04 = "TR";
    imgtInput.l01p01c03 = "inline";
    imgtInput.l01p01c10 = "";
    imgtInput.l01p01c07 = "2. Synthesis";
    imgtInput.l01p01c05 = "HTML";
    imgtInput.l01p01c09 = "60";
    imgtInput.l01p01c60 = "5";
    imgtInput.l01p01c12 = "Y";
    imgtInput.l01p01c13 = "Y";
    imgtInput.l01p01c06 = "Y";
    imgtInput.l01p01c24 = "N";
    imgtInput.l01p01c14 = "Y";
    imgtInput.l01p01c15 = "Y";
    imgtInput.l01p01c16 = "Y";
    imgtInput.l01p01c41 = "Y";
    imgtInput.l01p01c22 = "Y";
    imgtInput.l01p01c17 = "Y";
    imgtInput.l01p01c23 = "Y";
    imgtInput.l01p01c19 = "Y";
    imgtInput.l01p01c18 = "Y";
    imgtInput.l01p01c20 = "Y";
    imgtInput.l01p01c27 = "Y";
    imgtInput.l01p01c28 = "Y";
    imgtInput.l01p01c29 = "Y";
    imgtInput.l01p01c30 = "Y";
    imgtInput.l01p01c31 = "Y";
    imgtInput.l01p01c32 = "Y";
    imgtInput.l01p01c33 = "Y";
    imgtInput.l01p01c34 = "Y";
    imgtInput.l01p01c46 = "N";
    imgtInput.l01p01c47 = "Y"; // nt-sequences
    imgtInput.l01p01c48 = "N";
    imgtInput.l01p01c49 = "N";
    imgtInput.l01p01c50 = "N"; // Junction
    imgtInput.l01p01c51 = "N";
    imgtInput.l01p01c52 = "N";
    imgtInput.l01p01c53 = "N";
    imgtInput.l01p01c54 = "N";
    imgtInput.l01p01c55 = "NO";
    imgtInput.l01p01c35 = "F+ORF+ in-frame P";
    imgtInput.l01p01c36 = "0";
    imgtInput.l01p01c40 = "1";
    imgtInput.l01p01c25 = "default";
    imgtInput.l01p01c37 = "default";
    imgtInput.l01p01c38 = "default";
    imgtInput.l01p01c39 = "default";
    imgtInput.l01p01c08 = "";
    imgtInput.l01p01c26 = "";
    imgtInput.l01p01c10 = ">a\nATGCGCAGATGC\n";
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
    imgtInput.l01p01c10 = data;
    if (system[0] == "I") {
        imgtInput.l01p01c04 = "IG";
    }
    if (system[0] == "T") {
        imgtInput.l01p01c04 = "TR";
    }
    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "_blank";
    form.action = "http://www.imgt.org/IMGT_vquest/vquest";
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
        pos = nth_ocurrence(data, '>', 11);
        var newdata = data.substr(pos);
        data = data.substr(0, pos - 1);
        var msg = "The first 10 sequences were sent to IMGT/V-QUEST."

        console.log({
            "type": "flash",
            "msg": msg ,
            "priority": 1
        });
    }

    imgtInput.l01p01c07 = "3. Excel";
    imgtInput.l01p01c10 = data;
    imgtInput.l01p01c62 = 2;

    if (system[0] == "I") {
        imgtInput.l01p01c04 = "IG";
    }
    if (system[0] == "T") {
        imgtInput.l01p01c04 = "TR";
    }
    var form = document.getElementById("form");
    form.removeAllChildren();
    form.target = "";
    //disabled due to security concerns
    //form.action = "http://www.imgt.org/IMGT_vquest/vquest";
    //using proxy on server to allow requests on other site than vidjil one's in JS.
    if (typeof config != 'undefined' && typeof config.proxy != 'undefined') {
        form.action = config.proxy
    } else {
        form.action = PROXY_ADDRESS;
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


function igBlastPost(data, system) {
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

function arrestPost(data, system) {

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

function blastPost(data, system) {

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
