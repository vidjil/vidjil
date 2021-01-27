ALIGNER_MENU = {
    'highlight': {
        'id': 'align-segment-info',
        'checkbox': [{
            'id': 'VDJ',
            'text': 'VDJ genes',
            'layers': ["V","D","J","D2","D3"],
            'title': 'highlight V/D/J genes',
            'enabled': true
        },
        {
            'id': 'CDR3',
            'text': 'CDR3',
            'layers': ["CDR3"],
            'title': 'highlight CDR3',
            'enabled': false
            
        }]
    },


    'align': {
        'id': 'align-settings',
        'checkbox': [{
            'id': 'insert',
            'text': 'Insertion',
            'layers': ["insertion"],
            'title': 'highlight insertion',
            'enabled': true
        },
        {
            'id': 'subs',
            'text': 'Substitution',
            'layers': ["substitution"],
            'title': 'highlight insertion',
            'enabled': true
        },
        {
            'id': 'del',
            'text': 'Deletion',
            'layers': ["deletion"],
            'title': 'highlight deletion',
            'enabled': true
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