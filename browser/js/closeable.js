function Closeable() {
}

Closeable.prototype = {

    createCloseButton: function() {
        var x = document.createElement('i');
        x.className = "icon-cancel";
        x.onclick = function() {
            var elem = this.parentNode;
            $(elem).slideUp({
                'duration': 150,
                'complete': function() {
                    elem.parentNode.removeChild(elem);
                }
            });
        }

        return x;
    }
}
