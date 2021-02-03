LAYERS = {
    'nuc':
    {
        'className': "seq_layer_text",
        'condition': function (s,c) { return !LAYERS.amino.enabled; },
        'text': function (s,c) { return s.nucleoString(); },
        'enabled': true
    },

    'amino':
    {
        'className': "seq_layer_text",
        'text': function (s,c) { return s.aminoString(); },
        'enabled': true
    },

    'amino_separator':
    {
        'className': "seq_layer_text",
        'text': function (s,c) { return s.aminoSplitString(); },
        'style': { 'margin-left': (CHAR_WIDTH/2)+"px", 'opacity': "0.35" },
        'enabled': true
    },

    'quality':
    {
        'title': 'fastq_quality',
        'text': function (s,c) { return s.qualityString(); },
        'className': "seq_layer_quality",
        'enabled': true
    },

    'V':
    {
        'title': function (s,c) { return c.seg["5"].name;},
        'start': function (s,c) { return c.getSegStart("5"); },
        'stop': function (s,c) { return c.getSegStop("5"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#4c4" },
        'enabled': true
    },
    'D':
    {
        'title': function (s,c) { return c.seg["4"].name;},
        'start': function (s,c) { return c.getSegStart("4"); },
        'stop': function (s,c) { return c.getSegStop("4"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#c44" },
        'enabled': true
    },
    'J':
    {
        'title': function (s,c) { return c.seg["3"].name;},
        'start': function (s,c) { return c.getSegStart("3"); },
        'stop': function (s,c) { return c.getSegStop("3"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#cc0" },
        'enabled': true
    },
    'D2':
    {
        'title': 'gene D-2',
        'start': function (s,c) { return c.getSegStart("4a"); },
        'stop': function (s,c) { return c.getSegStop("4a"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#f44" },
        'enabled': true
    },
    'D3':
    {
        'title': 'gene D-3',
        'start': function (s,c) { return c.getSegStart("4b"); },
        'stop': function (s,c) { return c.getSegStop("4b"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#c44" },
        'enabled': true
    },
    'CDR3':
    {
        'title': 'CDR3',
        'start': function (s,c) { return c.getSegStart("cdr3"); },
        'stop': function (s,c) { return c.getSegStop("cdr3"); },
        'className': "seq_layer_bracket",
        'style': { 'borderColor': "#444" },
        'enabled': false
    },
    

    'substitution':
    {
        'className': "seq_layer_text",
        'condition': function (s,c) { return s.is_aligned; },
        'text': function (s,c) { return s.substitutionString(); },
        'style': { 'color': "blue", 'fontWeight': "bold" },
        'enabled': true
    },
    'insertion':
    {
        'className': "seq_layer_text",
        'condition': function (s,c) { return s.is_aligned; },
        'text': function (s,c) { return s.insertionString(); },
        'style': { 'color': "green", 'fontWeight': "bold" },
        'enabled': true
    },
    'deletion':
    {
        'className': "seq_layer_text",
        'condition': function (s,c) { return s.is_aligned; },
        'text': function (s,c) { return s.deletionString(); },
        'style': { 'color': "red", 'fontWeight': "bold" },
        'enabled': true
    },


    'search':
    {
        'className': "seq_layer_text",
        'condition': function (s,c) { return !s.segmenter.amino; },
        'text': function (s,c) { return s.searchString(); },
        'style': { 'color': "pink", 'fontWeight': "bold" },
        'enabled': true
    },

    'IMGT_V':
    {
        'title': function (s,c) { return "IMGT - " + c.seg.imgt["V-GENE and allele"]; },
        'start': function (s,c) { return c.seg.imgt["V-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["V-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "#484" },
        'enabled': true
    },
    'IMGT_J':
    {
        'title': function (s,c) { return "IMGT - " + c.seg.imgt["J-GENE and allele"]; },
        'start': function (s,c) { return c.seg.imgt["J-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["J-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "#bb0" },
        'enabled': true
    },
    'IMGT_D':
    {
        'title': function (s,c) { return "IMGT - " + c.seg.imgt["D-GENE and allele"]; },
        'start': function (s,c) { return c.seg.imgt["D-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["D-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "#f66" },
        'enabled': true
    },
    'IMGT_D1':
    {
        'title': 'IMGT - D1',
        'start': function (s,c) { return c.seg.imgt["D1-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["D1-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "orange" },
        'enabled': true
    },
    'IMGT_D2':
    {
        'title': 'IMGT - D2',
        'start': function (s,c) { return c.seg.imgt["D2-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["D2-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "red" },
        'enabled': true
    },
    'IMGT_D3':
    {
        'title': 'IMGT - D3',
        'start': function (s,c) { return c.seg.imgt["D3-REGION start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["D3-REGION end"] - 1; },
        'className': "seq_layer_underline",
        'style': { 'background': "orange" },
        'enabled': true
    },
    'IMGT_CDR1':
    {
        'title': 'IMGT - CDR1',
        'start': function (s,c) { return c.seg.imgt["CDR1-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["CDR1-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#888" },
        'enabled': false
    },
    'IMGT_CDR2':
    {
        'title': 'IMGT - CDR2',
        'start': function (s,c) { return c.seg.imgt["CDR2-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["CDR2-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#444" },
        'enabled': false
    },
    'IMGT_CDR3':
    {
        'title': 'IMGT - CDR3',
        'start': function (s,c) { return c.seg.imgt["CDR3-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["CDR3-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#444" },
        'enabled': false
    },
    'IMGT_FR1':
    {
        'title': 'IMGT - FR1',
        'start': function (s,c) { return c.seg.imgt["FR1-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["FR1-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#aaa" },
        'enabled': false
    },
    'IMGT_FR2':
    {
        'title': 'IMGT - FR2',
        'start': function (s,c) { return c.seg.imgt["FR2-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["FR2-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#aaa" },
        'enabled': false
    },
    'IMGT_FR3':
    {
        'title': 'IMGT - FR3',
        'start': function (s,c) { return c.seg.imgt["FR3-IMGT start"] - 1; },
        'stop': function (s,c) { return c.seg.imgt["FR3-IMGT end"] - 1; },
        'className': "seq_layer_bracket_top",
        'style': { 'borderColor': "#aaa" },
        'enabled': false
    }

};
