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

function Tokeniser(target, form_input) {
    if (typeof Tokeniser.instance === 'object') {
        if (typeof target !== "undefined") {
            Tokeniser.instance.target = target;
        }

        if (typeof form_input !== "undefined") {
            Tokeniser.instance.form_input = form_input
        }

        return Tokeniser.instance;
    }

    Closeable.call(this);

    this.target = target;
    this.form_input = form_input

    Tokeniser.instance = this;
    return this;
}

Tokeniser.prototype = Object.create(Closeable.prototype);

Tokeniser.prototype.tokenise = function(text) {
        var token = this.createToken(text);
        this.target.appendChild(token);
        var tokens = this.getTokens();
        tokens.children('.icon-cancel').removeClass('disabledClass');
        this.form_input.value = this.readTokens();
    }

Tokeniser.prototype.readTokens = function() {
        var nodes = this.getTokens();
        return nodes.map(function callback() {
            return $(this).data('set-id');
        })
        .get()
        .join('|');
    }

Tokeniser.prototype.createToken = function(set_id) {
        var class_mapping = {
            ":p": "patient_token",
            ":r": "run_token",
            ":s": "generic_token"
        };

        var token = document.createElement('span');
        var text = set_id.substr(3).trim();
        var className = "set_token " + class_mapping[set_id.substr(0, 2)];
        token.className = className;

        var close = this.createCloseButton();
        token.appendChild(close);
        token.appendChild(document.createTextNode(text));

        $(token).data('set-id', set_id);

        return token;
    }

Tokeniser.prototype.removeToken = function(token) {
        var tokens = this.getTokens();
        var len = tokens.length;
        var min = this.target.dataset.minTokens;
        if (typeof min === "undefined" ||
            (typeof this.target.dataset.minTokens !== "undefined" &&
             this.target.dataset.minTokens < len)) {
                this.target.removeChild(token);
                this.form_input.value = this.readTokens();
                return token;
        } else {
            tokens.children('.icon-cancel').addClass('disabledClass');
        }
    }

Tokeniser.prototype.createCloseButton = function() {
        var self = this;
        var close = Object.getPrototypeOf(Tokeniser.prototype).createCloseButton.call(this);
        close.onclick = function() {
            self.removeToken(this.parentNode);
        }
        return close;
    }

Tokeniser.prototype.getTokens = function() {
        return $(this.target).children('.set_token');
    }
