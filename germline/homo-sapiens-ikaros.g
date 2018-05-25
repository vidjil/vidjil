{
    "ref": "http://www.vidjil.org/germlines/germline-49.tar.gz",

    "species": "Homo sapiens",
    "species_taxon_id": 9606,

    "path": "homo-sapiens",
    
    "systems": {

        "IKAZOS": {
            "shortcut": "I",
            "color" : "#d63a19",
            "description": "IKAROS Trsl locus",
            "recombinations": [ {
                "5": ["IKAROS-as-V.fa"],
                "3": ["IKAROS-as-J.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        },

        "ERG": {
            "shortcut": "E",
            "color" : "#d63a19",
            "description": "ERG mediated recombinaions",
            "recombinations": [ {
                "5": ["ERG-as-V.fa"],
                "3": ["ERG-as-J.fa"]
            } ],
            "parameters": {
                "seed": "10s"
            }
        }
    }
}
