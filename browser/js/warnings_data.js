/**
 * Some warnings are not implemented for the moment
 * Some other are sample warnings and need to be better implmeented inside client 
 * For the moment, only clone warning is implemented
 * Warning is no visibility will not be used for the moment inside client warning view
 */
var warnings_data = {
    "Generic errors":
    {
        "W0x":
        {
            "title": "Outdated program",
            "level": 1,
            "visibility": 0
        },
        "W0a":
        {
            "title": "Outdated germlines  ",
            "level": 1,
            "visibility": 0
        },
        "W0b":
        {
            "title": "Strange parameters: xxxx xxxx",
            "level": 0,
            "visibility": 0
        },
        "W0z":
        {
            "title": "Unknown error",
            "level": 2,
            "visibility": 0
        },
        "W09":
        {
            "title": "Program interrupted, output data may be not complete",
            "level": 2,
            "visibility": 0
        }
    },
    "Output of a pre-process ~'server-pre-process'":
    {
        "W10":
        {
            "title": "Few assembled reads  #2243  ",
            "level": 1,
            "visibility": 0
        },
        "W1z":
        {
            "title": "Other pre-processing warning/error",
            "level": 1,
            "visibility": 0
        }
    },
    "Output of an analysis, global warnings":
    {
        "W20":
        {
            "title": "Very few V(D)J recombinations found",
            "level": 1,
            "visibility": 0
        },
        "W21":
        {
            "title": "Doubtful e-value multiplier",
            "level": 0,
            "visibility": 0
        },
        "W2x":
        {
            "title": "Sequences with known adapters #1669",
            "level": 1,
            "visibility": 0
        },
        "W2y":
        {
            "title": "CDR3 detection without gapped germlines   #2187   (ou bien par clone ?)",
            "level": 0,
            "visibility": 0
        }
    },
    "Output of an analysis, warnings on some clones":
    {},
    "Read quality":
    {
        "W40":
        {
            "title": "Low quality  #1544 ",
            "level": 1,
            "visibility": 0
        }
    },
    "Clonotype quality":
    {
        "W50":
        {
            "title": "Short or shifted window in vidjil-algo",
            "level": 1,
            "visibility": 1
        },
        "W51":
        {
            "title": "Low coverage",
            "level": 2,
            "visibility": 1
        },
        "W5a":
        {
            "title": "Bad e-value",
            "level": 1,
            "visibility": 1
        },
        "Wxx":
        {
            "title": "Bad e-value",
            "level": 1,
            "visibility": 0,
            "reference": "W5a"
        },
        "W53":
        {
            "title": "Similar to another clone",
            "level": 2,
            "visibility": 1
        },
        "W5b":
        {
            "title": "Possible strand ambiguity",
            "level": 0,
            "visibility": 0
        }
    },
    "Uncommon recombination":
    {
        "W6a":
        {
            "title": "Potential co-linear genome match",
            "level": 0,
            "visibility": 0
        },
        "W61":
        {
            "title": "Non-recombined D7-27/J1 sequence",
            "level": 2,
            "visibility": 1
        },
        "W6b":
        {
            "title": "Potential di-mer",
            "level": 2,
            "visibility": 0
        },
        "W6c":
        {
            "title": "Very large deletion",
            "level": 0,
            "visibility": 0
        },
        "W6d":
        {
            "title": "Unexpected recombination",
            "level": 0,
            "visibility": 0
        },
        "W6e":
        {
            "title": "High probability clone ?",
            "level": 0,
            "visibility": 0
        },
        "W68":
        {
            "title": "V(D)J designation failed, possibly complex or not recombined sequence #4818",
            "level": 2,
            "visibility": 0
        },
        "W69":
        {
            "title": "Several V/J candidate genes with equal probability #3575",
            "level": 0,
            "visibility": 1
        }
    },
    "Strange recombination (FineSegmenter in vidjil-algo), D gene, N regions*":
    {
        "W7x":
        {
            "title": "Mutations near breakpoint #1412",
            "level": 0,
            "visibility": 0
        },
        "W7a":
        {
            "title": "Palindromic sequence ?",
            "level": 0,
            "visibility": 0
        },
        "W7b":
        {
            "title": "D with bad e-value ?",
            "level": 0,
            "visibility": 0
        }
    },
    "Clonotypes across samples":
    {
        "W8x":
        {
            "title": "Potential contamination or public clone",
            "level": 1,
            "visibility": 0
        },
        "W8a":
        {
            "title": "Known public clone",
            "level": 0,
            "visibility": 0
        },
        "W81":
        {
            "title": "Clonotype with different V(D)J designations in some samples",
            "level": 2,
            "visibility": 1
        },
        "W82":
        {
            "title": "Clonotype with different productivities in some samples",
            "level": 2,
            "visibility": 1
        }
    },
    "Unclassified":
    {}
}

