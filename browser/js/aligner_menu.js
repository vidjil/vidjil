ALIGNER_MENU = {
    'highlight': {
        'id': 'align-segment-info',
        'checkbox': [{
            'id': 'VDJ',
            'text': 'V/D/J genes',
            'layers': ["V","D","J","D2","D3"],
            'title': 'Highlight V/D/J genes',
            'enabled': true
        },
        {
            'id': 'CDR3',
            'text': 'CDR3',
            'layers': ["CDR3"],
            'title': 'Highlight CDR3',
            'enabled': false
            
        },
        {
            'id': 'Quality',
            'text': 'Quality',
            'layers': ["quality"],
            'title': 'Quality score of representative sequence',
            'enabled': false
            
        }]
    },


    'align': {
        'id': 'align-settings',
        'checkbox': [{
            'id': 'mutation',
            'text': 'Highlight mutations',
            'layers': ["insertion", "substitution", "deletion"],
            'title': 'Highlight substitutions, insertions, and deletions',
            'enabled': true
        },{
            'id': 'amino_split',
            'text': 'AA separator',
            'layers': ["amino_separator"],
            'title': 'Show a separator between codons (AA positions based on CDR3)',
            'enabled': true
        },{
            'id': 'amino',
            'text': 'Use AA sequence',
            'layers': ["amino"],
            'title': 'Show Amino Acid sequences (AA positions based on CDR3)',
            'enabled': false
        }]
    },


    'align-imgt': {
        'id': 'align-imgt',
        'checkbox': [{
            'id': 'IMGT_VDJ',
            'text': 'V/D/J genes',
            'layers': ["IMGT_V", "IMGT_D", "IMGT_J", "IMGT_D1", "IMGT_D2", "IMGT_D3"],
            'title': 'V, D, J genes [as computed by IMGT/V-QUEST]',
            'enabled': true
        },
        {
            'id': 'IMGT_CDR',
            'text': 'CDR 1/2/3',
            'layers': ["IMGT_CDR1","IMGT_CDR2","IMGT_CDR3"],
            'title': 'CDR1, CDR2, CDR3 [as computed by IMGT/V-QUEST]',
            'enabled': false
        },
        {
            'id': 'IMGT_FR',
            'text': 'FR 1/2/3',
            'layers': ["IMGT_FR1","IMGT_FR2","IMGT_FR3"],
            'title': 'FR1, FR2, FR3 [as computed by IMGT/V-QUEST]',
            'enabled': false
        }]
    }
};