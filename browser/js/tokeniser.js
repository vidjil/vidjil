 /* This file is part of Vidjil <http://www.vidjil.org>,
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

function Tokeniser() {
    if (typeof Tokeniser.instance === 'object') {
        return Tokeniser.instance;
    }

    Tokeniser.instance = this;
    return this;
}

Tokeniser.prototype = {

    setup: function(input, target) {
        var self = this;
        if ($(input).data('needs-tokeniser')) {
            $(input).on("keydown", function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    self.tokenise(this, target);
                }
            });
            $(input).data('needs-tokeniser', false);
        }
    },

    tokenise: function(input, target) {
        var class_mapping = {
            ":p": "patient_token",
            ":r": "run_token",
            ":s": "generic_token"
        };

        var token = document.createElement('span');
        var text = $(input).val().trim();
        var set_id = $(input).data('set-id');
        var className = "set_token " + class_mapping[set_id.substr(0, 2)];
        token.className = className;
        token.innerText = text;
        $(token).data('set-id', set_id);
        $(input).val("");
        $(input).data('set-id');
        target.appendChild(token);
    },

    readTokens: function(target) {
        var nodes = $(target).children('.set_token');
        return nodes.map(function callback() {
            return $(this).data('set-id');
        })
        .get()
        .join();
    }
}
