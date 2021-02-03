ALIGNER_MENU = {
    'highlight': {
        'id': 'align-segment-info',
        'checkbox': [{
            'id': 'VDJ',
            'text': 'V/D/J genes',
            'layers': ["V","D","J","D2","D3"],
            'title': 'Highlight V/D/J genes computed by analysis software',
            'enabled': true
        },
        {
            'id': 'CDR3',
            'text': 'CDR3',
            'layers': ["CDR3"],
            'title': 'Highlight CDR3 computed by analysis software',
            'enabled': false
            
        },
        {
            'id': 'Quality',
            'text': 'Q-score',
            'layers': ["quality"],
            'title': 'Quality score of representative sequence',
            'enabled': false
            
        }]
    },


    'align': {
        'id': 'align-settings',
        'checkbox': [{
            'id': 'mutation',
            'text': 'Highlight differences',
            'layers': ["insertion", "substitution", "deletion"],
            'title': 'Color insertion, deletion and mutation',
            'enabled': true
        },{
            'id': 'amino_split',
            'text': 'AA separator',
            'layers': ["amino_separator"],
            'title': 'Display a separator between AA (AA positions based on cdr3)',
            'enabled': false
        },{
            'id': 'amino',
            'text': 'Use AA sequence',
            'layers': ["amino"],
            'title': 'Display Amino Acid sequence instead of nucleotids (AA positions based on cdr3)',
            'enabled': false
        }]
    },


    'align-imgt': {
        'id': 'align-imgt',
        'checkbox': [{
            'id': 'IMGT_VDJ',
            'text': 'V/D/J genes',
            'layers': ["IMGT_V", "IMGT_D", "IMGT_J", "IMGT_D1", "IMGT_D2", "IMGT_D3"],
            'title': 'VDJ genes detected by IMGT',
            'enabled': true
        },
        {
            'id': 'IMGT_CDR',
            'text': 'CDR 1/2/3',
            'layers': ["IMGT_CDR1","IMGT_CDR2","IMGT_CDR3"],
            'title': 'CDR 1/2/3 detected by IMGT',
            'enabled': false
        },
        {
            'id': 'IMGT_FR',
            'text': 'FR 1/2/3',
            'layers': ["IMGT_FR1","IMGT_FR2","IMGT_FR3"],
            'title': 'FR 1/2/3 detected by IMGT',
            'enabled': false
        }]
    }
};