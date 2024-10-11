{
    "ref": "https://www.vidjil.org/germlines/germline-2021-01-21.tar.gz",

    "species": "Sus Scrofa",
    "species_taxon_id": 1758,

    "path": "sus-scrofa",
    
    "systems": {

        "TRB": {
            "shortcut": "B",
            "color" : "#cb4b16",
            "description": "Sus Scrofa T-cell receptor, beta locus",
            "recombinations": [ {
                "5": ["TRBV.fa"],
                "4": ["TRBD.fa"],
                "3": ["TRBJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },
        "TRB+": {
            "shortcut": "b",
            "color" : "#eb6b36",
            "description": "Sus Scrofa T-cell receptor, beta locus, incomplete Db-Jb recombinations",
            "follows": "TRB",
            "recombinations": [ {
                "5": ["TRBD.fa"],
                "3": ["TRBJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },
        "IGH": {
            "shortcut": "H",
            "color" : "#6c71c4",
            "description": "Sus Scrofa immunoglobulin, heavy locus",
            "recombinations": [ {
                "5": ["IGHV.fa"],
                "4": ["IGHD.fa"],
                "3": ["IGHJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },     
        "IGHC": {
            "shortcut": "C",
            "color" : "#6c71c4",
            "description": "Sus Scrofa immunoglobulin, heavy locus, with constant heavy chains",
            "recombinations": [ {
                "5": ["IGHV.fa"],
                "4": ["IGHJ.fa"],
                "3": ["IGHC=A.fa", 
                 "IGHC=D.fa", 
                 "IGHC=E.fa", 
                 "IGHC=G1.fa", 
                 "IGHC=G2.fa", 
                 "IGHC=G3.fa", 
                 "IGHC=G4.fa", 
                 "IGHC=G5-1.fa", 
                 "IGHC=G5-2.fa", 
                 "IGHC=G6-1.fa", 
                 "IGHC=G6-2.fa", 
                 "IGHC=M.fa"
                ]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },
        "IGH+": {
            "shortcut": "h",
            "color" : "#8c91e4",
            "description": "Sus Scrofa immunoglobulin, heavy locus, incomplete Dh-Jh recombinations",
            "follows": "IGH",
            "recombinations": [ {
                "5": ["IGHD.fa"],
                "3": ["IGHJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },


        "IGL": {
            "shortcut": "L",
            "color" : "#d33682",
            "description": "Sus Scrofa immunoglobulin, lambda locus",
            "recombinations": [ {
                "5": ["IGLV.fa"],
                "3": ["IGLJ.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        }
    }
}
