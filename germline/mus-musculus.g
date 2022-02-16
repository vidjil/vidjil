{
    "ref": "https://www.vidjil.org/germlines/germline-2021-01-21.tar.gz",

    "species": "Mus musculus",
    "species_taxon_id": 10090,

    "path": "mus-musculus",
    
    "systems": {

        "TRA": {
            "shortcut": "A",
            "color" : "#268bd2",
            "description": "Mouse T-cell receptor, alpha locus (14C2)",
            "recombinations": [ {
                "5": ["TRAV.fa"],
                "3": ["TRAJ.fa"]
            } ],
            "parameters": {
                "seed": "13s"
            }
        },

        "TRB": {
            "shortcut": "B",
            "color" : "#cb4b16",
            "description": "Mouse T-cell receptor, beta locus (6B1)",
            "recombinations": [ {
                "5": ["TRBV.fa"],
                "4": ["TRBD.fa"],
                "3": ["TRBJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "TRG": {
            "shortcut": "G",
            "color" : "#dc322f",
            "description": "Mouse T-cell receptor, gamma locus (13A2)",
            "recombinations": [ {
                "5": ["TRGV.fa"],
                "3": ["TRGJ.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "TRD": {
            "shortcut": "D",
            "color" : "#b58900",
            "description": "Mouse T-cell receptor, delta locus (14q11.2)",
            "recombinations": [ {
                "5": ["TRDV.fa"],
                "4": ["TRDD.fa"],
                "3": ["TRDJ.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },
        "TRA+D": {
            "shortcut": "a",
            "color" : "#46abf2",
            "description": "Mouse T-cell receptor, alpha/delta locus (14C2)",
            "recombinations": [ {
                "5": ["TRDV.fa"],
                "4": ["TRDD.fa"],
                "3": ["TRAJ.fa"]
            } ],
            "parameters": {
                "seed": "13s"
            }
        },

        "IGH": {
            "shortcut": "H",
            "color" : "#6c71c4",
            "description": "Mouse immunoglobulin, heavy locus (12F2)",
            "recombinations": [ {
                "5": ["IGHV.fa"],
                "4": ["IGHD.fa"],
                "3": ["IGHJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "IGH+": {
            "shortcut": "h",
            "color" : "#6c71c4",
            "description": "Mouse immunoglobulin, heavy locus (12F2),  incomplete Dh-Jh recombinations",
            "follows": "IGH",
            "recombinations": [ {
                "5": ["IGHD.fa"],
                "3": ["IGHJ.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "IGK": {
            "shortcut": "K",
            "color" : "#2aa198",
            "description": "Mouse immunoglobulin, kappa locus (6C1)",
            "recombinations": [ {
                "5": ["IGKV.fa"],
                "3": ["IGKJ.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "IGL": {
            "shortcut": "L",
            "color" : "#d33682",
            "description": "Mouse immunoglobulin, lambda locus (16A3)",
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
