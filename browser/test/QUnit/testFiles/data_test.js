json_data_raw = {
  "vidjil_json_version": ["2014.09"],
  "reads": {
    "segmented": [200,100,200,100],
    "total": [200,100,200,100],
    "germline": {
      "TRG": [100,50,100,50],
      "IGH": [100,50,100,50]
    }
  },
  "samples": {
    "timestamp": ["2014-10-20 13:59:02", "2014-10-25 14:00:32", "2014-11-20 14:03:13", "2014-12-20 14:04:48"],
    "commandline": [
      "./vidjil -c clones -g germline/ -r 1 -o ./out0 -z 200 -n 5 Diag.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out1 -z 200 -n 5 Fu-1.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out2 -z 200 -n 5 Fu-2.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out3 -z 200 -n 5 Fu-3.fa "
    ],
    "number": 4,
    "original_names": [
      "Diag.fa",
      "Fu-1.fa",
      "Fu-2.fa",
      "Fu-3.fa"
    ],
    "log": [
      "  ==> segmented 362296 reads (38.7%)\n  ==> found 11526 40-windows in 335725 segments (35.8%) inside 937164 sequences\n ",
      "  ==> segmented 407095 reads (56.5%)\n  ==> found 35801 40-windows in 396776 segments (55.1%) inside 720531 sequences\n ",
      "  ==> segmented 419506 reads (46.2%)\n  ==> found 19567 40-windows in 400435 segments (44.1%) inside 908909 sequences\n ",
      "  ==> segmented 448435 reads (48.2%)\n  ==> found 43444 40-windows in 418595 segments (45%) inside 929901 sequences\n "
    ],
    "producer": ["ha","hi","ho","hu"],
    "run_timestamp": ["2015-10-20 13:59:02", "2015-10-25 14:00:32", "2015-11-20 14:03:13", "2015-12-20 14:04:48"]
  },
  "data": {
    "dataTest1" : [45,60,52,60],
    "dataTest2" : [2,1,2,20]
  },
  "clones": [
  ]
};


json_data = JSON.parse(JSON.stringify(json_data_raw));
json_data.clones = [
    {
        "sequence" : "aaaaaaaaaaaaaaaaaaaAG",
        "name" : "test1",
        "id" : "id1",
        "reads" : [10,10,15,15] ,
        "top" : 1,
        "germline" : "TRG",
        "seg" : {
            "5" : "TRGV4*01",
            "3" : "TRGJ2*01",
            "3start" : 6,
            "5end" : 5,
            "cdr3" : {"start": 5, "stop": 6, aa: "AG"},
            "clonedb": {
                "clones_names": {
                    "A": [2, 0.25],
                    "B": [124, 0.01]
                }
            }
        },
        "_average_read_length": [
            21
        ], 
        "_coverage": [
            1
        ]
    },
    {
        "sequence" : "cccccgtcccccccatca",
        "name" : "test2",
        "id" : "id2",
        "reads" : [20,20,10,10] ,
        "top" : 2,
        "germline" : "TRG",
        "seg" : {
            "5" : "TRGV5*01",
            "3" : "TRGJ1*01",
            "3start" : 15,
            "5end" : 5,
            "fr1" : {"start" :2, "stop":5}
        },
        "_average_read_length": [
            18
        ], 
        "_coverage": [
            1
        ]
    },
    {
        "sequence" : "cccccccccccccccccccc",
        "name" : "test3",
        "id" : "id3",
        "reads" : [25,25,50,3],
        "top" : 3,
        "germline" : "IGH",
        "seg" : {
            "5" : "IGHV1-2*01",
            "4" : "IGHD2-2*02",
            "3" : "IGHJ6*01",
            "3start" : 15,
            "5end" : 5
        },
        "_average_read_length": [
            20
        ], 
        "_coverage": [
            1
        ]
    },
    {
        "id": "id4",
        "sequence": "GGAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGACAGGCTGAAGGATTGGATCAAGACGTTTGCAAAAGGGACTAGGCTCATAGTAACTTCGCCTGGTAA",
        "name": "test4",
        "germline": "TRG",
        "top": 4,
        "reads": [5, 5, 5, 50],
        "seg": {
            "3": "TRGJ1*01",
            "5": "TRGV4*01",
            "3del": 5,
            "3start": 183,
            "5del": 0,
            "5end": 178,
            "5start": 0,
            "N": 4,
            "imgt": {
                "Sequence ID": "TRGV3*01_-0/4/-5_TRGJP2*01",
                "Functionality": "productive",
                "V-GENE and allele": "Homsap TRGV3*01 F",
                "J-GENE and allele": "Homsap TRGJP2*01 F",
                "D-GENE and allele": "",
                "JUNCTION frame": "in-frame",
                "JUNCTION": "tgtgccacctgggacaggctgaaggattggatcaagacgttt",
                "JUNCTION (with frameshift)": "",
                "V-REGION": "tgtgccacctgggacagg",
                "P3'V": "c",
                "N-REGION": "tgaag",
                "N1-REGION": "",
                "P5'D": "",
                "D-REGION": "",
                "P3'D": "",
                "P5'D1": "",
                "D1-REGION": "",
                "P3'D1": "",
                "N2-REGION": "",
                "P5'D2": "",
                "D2-REGION": "",
                "P3'D2": "",
                "N3-REGION": "",
                "P5'D3": "",
                "D3-REGION": "",
                "P3'D3": "",
                "N4-REGION": "",
                "P5'J": "",
                "J-REGION": "gattggatcaagacgttt",
                "JUNCTION-nt nb": "42",
                "3'V-REGION-nt nb": "18",
                "P3'V-nt nb": "1",
                "N-REGION-nt nb": "5",
                "N1-REGION-nt nb": "0",
                "P5'D-nt nb": "0",
                "D-REGION-nt nb": "0",
                "P3'D-nt nb": "0",
                "P5'D1-nt nb": "0",
                "D1-REGION-nt nb": "0",
                "P3'D1-nt nb": "0",
                "N2-REGION-nt nb": "0",
                "P5'D2-nt nb": "0",
                "D2-REGION-nt nb": "0",
                "P3'D2-nt nb": "0",
                "N3-REGION-nt nb": "0",
                "P5'D3-nt nb": "0",
                "D3-REGION-nt nb": "0",
                "N4-REGION-nt nb": "0",
                "P5'J-nt nb": "0",
                "5'J-REGION-nt nb": "18",
                "3'V-REGION trimmed-nt nb": "0",
                "5'D-REGION trimmed-nt nb": "0",
                "3'D-REGION trimmed-nt nb": "0",
                "5'D1-REGION trimmed-nt nb": "0",
                "3'D1-REGION trimmed-nt nb": "0",
                "5'D2-REGION trimmed-nt nb": "0",
                "3'D2-REGION trimmed-nt nb": "0",
                "5'D3-REGION trimmed-nt nb": "0",
                "3'D3-REGION trimmed-nt nb": "0",
                "5'J-REGION trimmed-nt nb": "8",
                "3'V-REGION mut-nt nb": "0",
                "D-REGION mut-nt nb": "0",
                "D1-REGION mut-nt nb": "0",
                "D2-REGION mut-nt nb": "0",
                "D3-REGION mut-nt nb": "0",
                "5'J-REGION mut-nt nb": "0",
                "D-REGION reading frame": "",
                "Ngc": "2/5",
                "CDR3-IMGT length": "12",
                "Molecular mass": "1783.0844800000002",
                "pI": "8.2191162109375",
                "3'V-REGION accepted mut nb": "0",
                "D-REGION accepted mut nb": "0",
                "5'J-REGION accepted mut nb": "0",
                "Accepted D-GENE nb": "0",
                "CDR3-IMGT": "gccacctgggacaggctgaaggattggatcaagacg",
                "CDR3-IMGT start": "112",
                "CDR3-IMGT end": "125",
                "CDR3-IMGT-nt nb": "36",
                "CDR3-IMGT (with frameshift)": "",
                "CDR3-IMGT (AA)": "ATWDRLKDWIKT",
                "CDR3-IMGT (AA) (with frameshift)": "",
                "JUNCTION (AA)": "CATWDRLKDWIKTF",
                "JUNCTION (AA) (with frameshift)": ""
            },
        },
        "_average_read_length": [
            241
        ], 
        "_coverage": [
            1
        ]
    },
    {
        "sequence" : "catcatcatgatgctacgatcttac",
        "id" : "id5",
        "reads" : [4,4,4,40],
        "top" : 5,
        "name": "test5; unseg sequence",
        "germline" : "IGH",
        "seg" : {
            "cdr3" : {"start": 2, "stop": 12, "aa": "W#WA", "seq": "atcatgatgcta"},
            "f1" : {"start": 4, "stop": 7},
            "f2" : {"seq": "tacgat"}, // 15 -> 20
        },
         "_average_read_length": [
            undefined
        ],
    }
  ]

json_data_align = JSON.parse(JSON.stringify(json_data_raw));
json_data_align.clones = [
      {
          "sequence" : "ATCCATGTATGCATGCCCCCCCCCCCCCAAATTTTTTTTTTTTTTTTTTTGATCGATCCGATCGATGAT",
          "name" : "testalign1",
          "id" : "id0",
          "reads" : [20] ,
          "top" : 1,
          "germline" : "TRG",
          "seg" : {
            "cdr3" : {"start": 1, "stop": 11, "aa": "W#WA", "seq": "atcatgatgcta"}
          }
      },
      {
          "sequence" : "ATTCATGCATGCATGCCCCCCCCCCCCCCCCCCAAATTTTTTTTGATCGATCGATCGATCGAT",
          "name" : "testalign2",
          "id" : "id1",
          "reads" : [25],
          "top" : 2,
          "germline" : "IGH",          
          "seg" : {
            "cdr3" : {"start": 1, "stop": 11, "aa": "W#WA", "seq": "atcatgatgcta"}
          }
      }
    ]




data_distributions =    {
    "keys": ["clones", "reads"],
    "repertoires": {
        "Diag.fa": [
            {
                "axes": ["lenSeqAverage"],
                "values": { "18": [1, 20], "20": [11, 125], "21": [11, 46], "241": [1, 5], "?": [1, 4] }
            }],
        "Fu-1.fa": [
            {
                "axes": ["lenSeqAverage"],
                "values": { "18": [1, 20], "20": [1, 25], "21": [6, 46], "241": [1, 5], "?": [1, 4] }
            }],
        "Fu-2.fa": [
            {
                "axes": ["lenSeqAverage"],
                "values": { "18": [5, 26], "20": [1, 50], "21": [10, 115], "241": [1, 5], "?": [1, 4] }
            }],
        "Fu-3.fa": [
            {
                "axes": ["lenSeqAverage"],
                "values": { "18": [1, 10], "20": [1, 3], "21": [7, 27], "241": [1, 50], "?": [1, 20] }
            }]
        }
   }




analysis_data_stock_order = {
  "producer": "browser",
  "timestamp": "2017-2-13 10:41:25",
  "vidjil_json_version": "2014.09",
  "samples": {
    "id": [
      "Diag.fa",
      "Fu-0.fa",
      "Fu-1.fa",
      "Fu-2.fa"
    ],
    "timestamp": [
      "2014-10-20 13:59:02",
      "2014-10-22 11:00:32",
      "2014-10-22 11:00:32",
      "2014-10-25 14:00:32"
    ],
    "commandline": [
      "./vidjil -c clones -g germline/ -r 1 -o ./out0 -z 200 -n 5 Diag.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out1 -z 200 -n 5 Fu-0.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out1 -z 200 -n 5 Fu-0.fa ",
      "./vidjil -c clones -g germline/ -r 1 -o ./out2 -z 200 -n 5 Fu-1.fa "
    ],
    "number": 4,
    "order": [
      3,
      0,
      1
    ],
    "stock_order": [
      2,
      3, 
      0,
      1
    ],
    "names": [
      "diag",
      "fu0",
      "fu1",
      "fu2"
    ]
  },
  "clones": [
  ],
  "clusters": [],
  "tags": {
    "names": {
      "0": "clone 1",
      "1": "clone 2",
      "2": "clone 3",
      "3": "standard",
      "4": "standard (noise)",
      "5": "custom 1",
      "6": "custom 2",
      "7": "custom 3",
      "8": "-/-"
    },
    "hide": []
  },
  "normalization": {
    "A": [],
    "B": 0,
    "id": -1
  }
}


analysis_data_clusters = {
  "producer": "browser",
  "timestamp": "2017-2-13 10:41:25",
  "vidjil_json_version": "2014.09",
  "clones": [
  ],
  "clusters": [
    [ // 3 real seq ID; top order: 2, 3, 1
      "id2",
      "id3",
      "id1"
    ],
    [ // 2 fake seq ID
      "id_fake_1",
      "id_fake_2"
    ],
    [ // 2 fake + 1 real seq ID
      "id_fake_1b",
      "id_fake_2b",
      "id4"
    ]
  ]
}


// Test qunits
primersSetData = {};
primersSetData.primer_test = {};
primersSetData.primer_test.IGH = {};
primersSetData.primer_test.IGH.primer5 = [] // IGH seq from model_test.js
primersSetData.primer_test.IGH.primer3 = []
primersSetData.primer_test.TRG = {};
primersSetData.primer_test.TRG.primer5 = ["GGAAGGCCCCACAGCG"] // TRG seq from model_test.js
primersSetData.primer_test.TRG.primer3 = ["AACTTCGCCTGGTAA"]

json_data_productivity = JSON.parse(JSON.stringify(json_data_raw));
json_data_productivity.clones = [
    {
      "name": "clone out-of-frame",
      "germline": "IGH",
      "id": "id1",
      "reads": [10,10,15,15],
      "seg": {
        "junction": {
            "productive": false,
            "unproductive": "out-of-frame"
        },
      },
      "top": 1
    },
    {
      "name": "clone stop-codon",
      "germline": "IGH",
      "id": "id2",
      "reads": [10,10,15,15],
      "seg": {
        "junction": {
            "productive": false,
            "unproductive": "stop-codon"
        },
      },
      "top": 2
    },
    {
      "name": "clone unproductive simple",
      "germline": "IGH",
      "id": "id3",
      "reads": [10,10,15,15],
      "seg": {
        "junction": {
            "productive": false
        },
      },
      "top": 3
    },
    {
      "name": "clone without junction",
      "germline": "IGH",
      "id": "id4",
      "reads": [10,10,15,15],
      "seg": {},
      "top": 4
    },
    {
      "name": "clone productive",
      "germline": "IGH",
      "id": "id5",
      "reads": [10,10,15,15],
      "seg": {
        "junction": {
            "productive": true
        },
      },
      "top": 5
    },
    {
      "name": "clone stop-codon",
      "germline": "IGH",
      "id": "id6",
      "reads": [10,10,15,15],
      "seg": {
        "junction": {
            "productive": false,
            "unproductive": "no-WPGxG-pattern"
        },
      },
      "top": 6
    }
]

