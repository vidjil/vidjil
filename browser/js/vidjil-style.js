/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */


function hashString(str) {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
};

/*ressort une couleur format RGB*/
function colorGenerator(h, s, v) {
    s = typeof s !== 'undefined' ? s : 0.8
    v = typeof v !== 'undefined' ? v : 0.72
    h = h / 60;
    var i = Math.floor(h);
    var f = h - i;
    var p = Math.floor((v * (1 - s)) * 255);
    var q = Math.floor((v * (1 - (s * f))) * 255);
    var t = Math.floor((v * (1 - (s * (1 - f)))) * 255);
    v = Math.floor(v * 255);

    if (i === 0) {
        return "rgb(" + v + "," + t + "," + p + ")";
    }
    if (i === 1) {
        return "rgb(" + q + "," + v + "," + p + ")";
    }
    if (i === 2) {
        return "rgb(" + p + "," + v + "," + t + ")";
    }
    if (i === 3) {
        return "rgb(" + p + "," + q + "," + v + ")";
    }
    if (i === 4) {
        return "rgb(" + t + "," + p + "," + v + ")";
    }
    if (i === 5) {
        return "rgb(" + v + "," + p + "," + q + ")";
    }
}
function oldColorGenerator(t) {
    return colorGenerator((t * 300))
}

function colorGeneratorIndex(i) {
    var z = 6
    var h = (i % z) / (z - 1)
    var s = [0.6, 0.9, 0.75, 0.45][Math.floor(i / z) % 4]
    var vv = [1.0, 1.1, 0.9][Math.floor(i / (z * z)) % 3]

    return colorGenerator(h * 300, s, s * vv)
}

function colorGeneratorString(str) {
    if (typeof str == "undefined")
        return '';
    if (str.length == 0)
        return '';

    return colorGeneratorIndex(hashString(str));
};


function colorGeneratorBool(bool) {
    if (typeof bool == 'undefined') {
        return '';
    } else if (bool === true || bool == 'true' ||
        bool == 'TRUE') {
        return '#2aa198';
    } else if (bool === false || bool == 'false' ||
        bool == 'FALSE') {
        return '#d33682';
    }
    return '';
}
// Get the color for a productive or non productive clone
function colorProductivity(is_productive) {
    if (typeof is_productive == 'undefined') {
        return '';
    } else if (is_productive === true || is_productive == 'true' ||
        is_productive == 'TRUE') {
        return '#2aa198';
    } else if (is_productive === false || is_productive == 'false' ||
        is_productive == 'FALSE') {
        return '#d33682';
    }
    return '';
}

/* Get an icon */

function icon(name, title) {
    i = document.createElement('i')
    i.className = name
    i.setAttribute('title', title)
    return i
}

/* Get a positive/negative/neutral icon, according to the value */

function icon_pm(val, plus, minus) {
    if (val === plus) return icon('icon-plus-squared', val)
    if (val === minus) return icon('icon-minus-squared', val)
    return icon('icon-dot', val)
}
