/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2020 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Joao Meidanis <joao.m@boldrini.org.br>
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


/**
 * Adding functionality to the Clone object so that it can display MRD
 * estimates obtained from the .vidjil file as modified by
 * spike-normalization.py in the info box.
 * 
 * The Clone methods added here are new
 * The exception of getHtmlInfo-prevalent is call if needed from 
 * getHTMLInfo function of Clone prototype.
 * Coding conventions and comment styles are borrowed from clone.js.
 */
UNIVERSAL_FAMILY = "UNI"
UNIVERSAL_COEFF  = 'UNI_COEFF'
UNIVERSAL_R2     = 'UNI_R2'

/**
 * @return {string} the family used for fiting at the given time
 */
Clone.prototype.getFittingFamily = function(time) {
    if (this.m.mrd.prevalent[time] == 0) {
        // diagnostic sample
        return "";
    } else if (this.mrd != undefined && 'family' in this.mrd) {
       return this.mrd.family[time];
    } else {
        // negative clone: report UNI
        return UNIVERSAL_FAMILY;
    }
};


/**
 * @return {string} the normalization coefficient at the given time
 */
Clone.prototype.getNormCoeff = function(time) {
    if (this.m.mrd.prevalent[time] == 0) {
        // diagnostic sample
        return "";
    } else if (this.mrd != undefined && 'norm_coeff' in this.mrd) {
        return this.mrd.norm_coeff[time];
    } else if (UNIVERSAL_COEFF in this.m.mrd) {
        // negative clone:report UNI
        return this.m.mrd.UNI_COEFF[time];
    } else {
        return "";
    }
};

/**
 * @return {string} the Pearson R2 value for the spike-in fitting at the given time
 */
Clone.prototype.getR2 = function(time) {
    if (this.m.mrd.prevalent[time] == 0) {
        // diagnostic sample
        return "";
    } else if (this.mrd != undefined && 'R2' in this.mrd) {
       return this.mrd.R2[time]//.toString();
    } else if (UNIVERSAL_R2 in this.m.mrd) {
        // negative clone: report UNI R2
        return this.m.mrd.UNI_R2[time];
    } else {
       return "";
    }
};
    
    
/**
 * @return {string} the prevalent germline at the given time
 */
Clone.prototype.getPrevalent = function(time) {
    if (this.m.mrd.prevalent[time] == 0) {
        // diagnostic sample
        return "";
    } else {
       return this.m.mrd.prevalent[time];
    }
};


/**
 * @return {string} the amplification coefficient at the given time
 * (ampl. coeff. = total prevalent / total spike)
 */
Clone.prototype.getAmplCoeff = function(time) {
    if (this.m.mrd.prevalent[time] == 0) {
        // diagnostic sample
        return "";
    } else if ('ampl_coeff' in this.m.mrd) {
       return this.m.mrd.ampl_coeff[time]//.toString();
    } else {
       return "Please use version 6 or later of spike-normalization";
    }
};


/**
 * Return info about a sequence/clone in html
 */
Clone.prototype.getHtmlInfo_prevalent = function () {
    values = []

    if ('mrd' in this) {
        // this .vidjil file is not all-diagnostic:
        // show R2, etc, fields for follow-up samples
        content_fitting_family = []
        content_norm_coeff     = []
        content_getR2 = []
        content_getPrevalent = []
        content_getAmplCoeff = []
        for (k = 0; k < this.m.samples.order.length; k++) {
            var sample    = this.m.samples.order[k]

            // Get prevalent value
            var prevalent = this.getPrevalent(sample)
            if (prevalent != ""){
                prevalent = this.m.systemBox(prevalent).outerHTML + prevalent
            }
            content_getPrevalent.push(   prevalent )

            // Computed values
            content_fitting_family.push( this.getFittingFamily(sample) )
            content_norm_coeff.push(     this.getNormCoeff(sample))
            content_getR2.push(          this.getR2(sample) )
            content_getAmplCoeff.push(   this.getAmplCoeff(sample) )
        }
        // include values into html
        // name of col, values to show, and DOM id for cells
        values.push(["prevalent germline",             content_getPrevalent,   "mrd_prevalent"])
        values.push(["family used for fitting",        content_fitting_family, "mrd_family"])
        values.push(["normalization coefficient",      content_norm_coeff,     "mrd_norm_coeff"])
        values.push(["Pearson R2",                     content_getR2,          "mrd_pearson"])
        values.push(["total prevalent / total spikes", content_getAmplCoeff,   "mrd_prevalent_on_spike"])
    }

    return values
};
