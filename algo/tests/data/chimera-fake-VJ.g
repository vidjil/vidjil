{
"ref": "Fake",
"species": "Fake",
"species_taxon_id": 123,
"path": "../../../germline/homo-sapiens",
"systems": {

    "Y-Vb/Jg": {
        "shortcut": "y",
        "description": "Fake chimera locus",
        "recombinations": [ {
            "5": ["TRBV.fa"],
            "3": ["TRGJ.fa"]
        } ],
        "parameters": {
            "seed": "13s"
        }
    },

    "Z-Vd/Jh-or-Vk/Jl": {
        "shortcut": "z",
        "description": "Fake chimera locus, with two different recombinations",
        "recombinations": [ {
            "5": ["TRDV.fa"],
            "3": ["IGHJ.fa"]
        },
        {
            "5": ["IGKV.fa"],
            "3": ["IGLJ.fa"]
        } ],
        "parameters": {
            "seed": "12s"
        }
    }
    }
 }
