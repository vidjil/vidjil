

function TipsOfTheDay(data, decorator, ids) {
    this.storage_key = "vidjil.tips.seen";
    this.tips = this.load(data, ids);
    this.seen = this.get_seen_ids();
    this.cur_unseen = -1;
    this.unseen = this.get_unseen_ids();
    this.path = typeof config !== 'undefined' ? config.doc_address : 'doctips/';

    this.decorator = decorator;
}

TipsOfTheDay.prototype =  {

    load: function(data, ids) {
        if (typeof ids === "undefined") {
            return data;
        }
        var tips = {};
        for (var i = 0; i < ids.length; i++) {
            tips[ids[i]] = data[ids[i]];
        }
        return tips;
    },

    get_seen_ids: function() {
        var storage = window.localStorage;
        var seen_string = storage.getItem(this.storage_key);
        if (seen_string === null || typeof seen_string === "undefined") {
            seen_string = "[]";
        }
        return JSON.parse(seen_string);
    },

    get_unseen_ids: function() {
        var self = this;
        return Object.keys(this.tips).filter(function(elem) {
            return self.seen.indexOf(elem) < 0;
        });
    },

    load_unseen: function(index) {
        var tip_id = this.unseen[index];
        if (typeof tip_id === "undefined") {
            return null;
        }
        var tip = this.tips[tip_id];
        this.set_seen(tip_id);
        return {id: tip_id, content: tip};
    },

    load_next_unseen: function() {
        this.cur_unseen = ++this.cur_unseen % this.unseen.length;
        return this.load_unseen(this.cur_unseen);
    },

    load_previous_unseen: function() {
        if (this.cur_unseen > 0) {
            this.cur_unseen--;
        } else {
            this.cur_unseen = this.unseen.length - 1;
        }
        return this.load_unseen(this.cur_unseen);
    },

    set_seen: function(id) {
        if (this.seen.indexOf(id) < 0) {
            this.seen.push(id);
            var storage = window.localStorage;
            storage.setItem(this.storage_key, JSON.stringify(this.seen));
        }
    },

    reset: function() {
        this.seen = []
        var storage = window.localStorage
        storage.removeItem(this.storage_key)
    },
    
    is_unseen: function(id) {
        return this.seen.indexOf(id) < 0;
    },

    set_container: function(container) {
        this.container = container
    },

    display: function(previous) {
        if (typeof previous === "undefined") {
            previous = false;
        }

        var self = this;

        var tip = null;
        if (previous) {
            tip = this.load_previous_unseen();
        } else {
            tip = this.load_next_unseen();
        }

        if (tip !== null) {
            var tip_div = this.decorator.decorate(tip);

            var nav_div = document.createElement('div');
            nav_div.className = "right";

            var prev = document.createElement('i');
            prev.className = "icon-left-open-1";
            prev.onclick = function() {
                self.display(this.container, true);
            }
            nav_div.appendChild(prev);

            var next = document.createElement('i');
            next.className = "icon-right-open-1";
            next.onclick = function() {
                self.display(this.container, false);
            }
            nav_div.appendChild(next);

            tip_div.appendChild(nav_div);

            // clear the container and insert tip
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            this.container.appendChild(tip_div);
        }
    }
}

function TipDecorator() {

}

TipDecorator.prototype = {

    decorate: function(elem) {
        var self = this;
        var div = document.createElement('div');
        div.className = "tip_1 right";
        var close = document.createElement('i');
        close.className = "icon-cancel right clear";
        close.onclick = function() {
            self.clear_parent(div);
        }
        div.appendChild(close);

        var title = document.createElement('div');
        title.style.fontWeight = "bold";
        title.appendChild(document.createTextNode('Tip:'));
        div.appendChild(title);

        var tip_div = document.createElement('div');
        tip_div.className = "left";
        var tmp = elem.content;

        tmp += "<br><img class=\"tip_img\" src=\"" + this.path + "/tips/" + elem.id + ".png\" onerror=\"this.src='images/transparent_back.png';\" />";
        tip_div.innerHTML = tmp;

        div.appendChild(tip_div);

        return div;
    },

    clear_parent: function(div) {
        var par = div.parentNode;
        while (par.firstChild) {
            par.removeChild(par.firstChild);
        }
    }
}
