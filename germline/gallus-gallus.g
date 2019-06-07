{
    "ref": "http://www.vidjil.org/germlines/germline-xxx.tar.gz",

    "species": "Gallus gallus; including red junglefowl",
    "species_taxon_id": 9031,

    "path": "gallus-gallus",
    
    "systems": {

        "IGH": {
            "shortcut": "H",
            "color" : "#6c71c4",
            "description": "Gallus immunoglobulin, heavy locus",
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
            "color" : "#8c91e4",
            "description": "Gallus immunoglobulin, heavy locus, incomplete Dh-Jh recombinations",
            "follows": "IGH",
            "recombinations": [ {
                "5": ["IGHD+up.fa"],
                "3": ["IGHJ+down.fa"]
            } ],
            "parameters": {
                "seed": "12s"
            }
        },

        "IGL": {
            "shortcut": "L",
            "color" : "#d33682",
            "description": "Gallus immunoglobulin, lambda locus",
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
