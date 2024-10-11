{
    "ref": "https://www.vidjil.org/germlines/germline-2021-01-21.tar.gz",

    "species": "Rattus norvegicus",
    "species_taxon_id": 10116,

    "path": "rattus-norvegicus",
    
    "systems": {

        "IGH": {
            "shortcut": "H",
            "color" : "#6c71c4",
            "description": "Rat immunoglobulin, heavy locus",
            "recombinations": [ {
                "5": ["IGHV.fa"],
                "4": ["IGHD.fa"],
                "3": ["IGHJ.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "IGK": {
            "shortcut": "K",
            "color" : "#2aa198",
            "description": "Rat immunoglobulin, kappa locus",
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
            "description": "Rat immunoglobulin, lambda locus)",
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
