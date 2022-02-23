{
    "ref": "https://www.vidjil.org/germlines/germline-2021-01-21.tar.gz",

    "species": "Homo sapiens",
    "species_taxon_id": 9606,

    "path": "homo-sapiens",
    
    "systems": {

        "TRA": {
            "shortcut": "A",
            "color" : "#268bd2",
            "description": "Human T-cell receptor, alpha locus (14q11.2)",
            "recombinations": [ {
                "5": ["TRAV.fa"],
                "3": ["TRAJ+down.fa"]
            } ],
            "parameters": {
                "seed": "13s"
            }
        },

        "TRB": {
            "shortcut": "B",
            "color" : "#cb4b16",
            "description": "Human T-cell receptor, beta locus (7q34)",
            "recombinations": [ {
                "5": ["TRBV.fa"],
                "4": ["TRBD.fa"],
                "3": ["TRBJ+down.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },
        "TRB+": {
            "shortcut": "b",
            "color" : "#eb6b36",
            "description": "Human T-cell receptor, beta locus (7q34), incomplete Db-Jb recombinations",
            "follows": "TRB",
            "recombinations": [ {
                "5": ["TRBD+up.fa"],
                "3": ["TRBJ+down.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "TRG": {
            "shortcut": "G",
            "color" : "#dc322f",
            "description": "Human T-cell receptor, gamma locus (7p14)",
            "recombinations": [ {
                "5": ["TRGV.fa"],
                "3": ["TRGJ+down.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "TRD": {
            "shortcut": "D",
            "color" : "#b58900",
            "description": "Human T-cell receptor, delta locus (14q11.2)",
            "recombinations": [ {
                "5": ["TRDV.fa"],
                "4": ["TRDD.fa"],
                "3": ["TRDJ+down.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },
        "TRA+D": {
            "shortcut": "a",
            "color" : "#46abf2",
            "description": "Human T-cell receptor, alpha/delta locus (14q11.2)",
            "recombinations": [ {
                "5": ["TRDV.fa"],
                "4": ["TRDD.fa"],
                "3": ["TRAJ+down.fa"]
            }, {
                "5": ["TRDD+up.fa"],
                "3": ["TRAJ+down.fa"]
            } ],
            "parameters": {
                "seed": "13s"
            }
        },
        "TRD+": {
            "shortcut": "d",
            "color" : "#d5a920",
            "description": "Human T-cell receptor, delta locus (14q11.2), incomplete Dd2-Dd3 recombinations",
            "follows": "TRD",
            "recombinations": [ {
                "5": ["TRDV.fa"],
                "3": ["TRDD3+down.fa"]
            }, {
                "5": ["TRDD2+up.fa"],
                "4": ["TRDD.fa"],
                "3": ["TRDJ+down.fa"]
            }, {
                "5": ["TRDD2+up.fa"],
                "3": ["TRDD3+down.fa"]
            } ],
            "parameters": {
                "seed": "9c"
            }
        },

        "IGH": {
            "shortcut": "H",
            "color" : "#6c71c4",
            "description": "Human immunoglobulin, heavy locus (14q32.33)",
            "recombinations": [ {
                "5": ["IGHV.fa"],
                "4": ["IGHD.fa"],
                "3": ["IGHJ+down.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },
        "IGH+": {
            "shortcut": "h",
            "color" : "#8c91e4",
            "description": "Human immunoglobulin, heavy locus (14q32.33), incomplete Dh-Jh recombinations",
            "follows": "IGH",
            "recombinations": [ {
                "5": ["IGHD+up.fa"],
                "3": ["IGHJ+down.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "IGK": {
            "shortcut": "K",
            "color" : "#2aa198",
            "description": "Human immunoglobulin, kappa locus (2p11.2)",
            "recombinations": [ {
                "5": ["IGKV.fa"],
                "3": ["IGKJ+down.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },
        "IGK+": {
            "shortcut": "k",
            "color" : "#4ac1a8",
            "description": "Human immunoglobulin, kappa locus (2p11.2), Vk-KDE and Intron-KDE recombinations",
            "follows": "IGK",
            "recombinations": [ {
                "5": ["IGKV.fa", "IGK-INTRON.fa"],
                "3": ["IGK-KDE.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "IGL": {
            "shortcut": "L",
            "color" : "#d33682",
            "description": "Human immunoglobulin, lambda locus (22q11.2)",
            "recombinations": [ {
                "5": ["IGLV.fa"],
                "3": ["IGLJ+down.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        }
    }
}
