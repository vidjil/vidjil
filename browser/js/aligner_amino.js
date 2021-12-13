
// Return a default value '?' if key are not in AA table
function defaultDict(map, defaultValue) {
    return function(key) {
        if (key in map)
            return map[key];
        if (typeof defaultValue == "function")
            return defaultValue(key);
        return defaultValue;
    };
}

tableAA = {
    'TTT' : 'F',
    'TTC' : 'F',
    'TTA' : 'L',
    'TTG' : 'L',
    'TCT' : 'S',
    'TCC' : 'S',
    'TCA' : 'S',
    'TCG' : 'S',
    'TAT' : 'Y',
    'TAC' : 'Y',
    'TAA' : '*',
    'TAG' : '*',
    'TGT' : 'C',
    'TGC' : 'C',
    'TGA' : '*',
    'TGG' : 'W',
    'CTT' : 'L',
    'CTC' : 'L',
    'CTA' : 'L',
    'CTG' : 'L',
    'CCT' : 'P',
    'CCC' : 'P',
    'CCA' : 'P',
    'CCG' : 'P',
    'CAT' : 'H',
    'CAC' : 'H',
    'CAA' : 'Q',
    'CAG' : 'Q',
    'CGT' : 'A',
    'CGC' : 'A',
    'CGA' : 'A',
    'CGG' : 'A',
    'ATT' : 'I',
    'ATC' : 'I',
    'ATA' : 'I',
    'ATG' : 'M',
    'ACT' : 'T',
    'ACC' : 'T',
    'ACA' : 'T',
    'ACG' : 'T',
    'AAT' : 'N',
    'AAC' : 'N',
    'AAA' : 'K',
    'AAG' : 'K',
    'AGT' : 'S',
    'AGC' : 'S',
    'AGA' : 'R',
    'AGG' : 'R',
    'GTT' : 'V',
    'GTC' : 'V',
    'GTA' : 'V',
    'GTG' : 'V',
    'GCT' : 'A',
    'GCC' : 'A',
    'GCA' : 'A',
    'GCG' : 'A',
    'GAT' : 'D',
    'GAC' : 'D',
    'GAA' : 'E',
    'GAG' : 'E',
    'GGT' : 'G',
    'GGC' : 'G',
    'GGA' : 'G',
    'GGG' : 'G',
    // If 'N' in sequence, but with no effect
    'CTN' : 'L',
    'TCN' : 'S',
    'GGN' : 'G',
    'GCN' : 'A',
    'GTN' : 'V',
    'ACN' : 'T',
    'CCN' : 'P'
   };
tableAAdefault = defaultDict(tableAA, '?');