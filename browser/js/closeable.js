function Closeable() {
}

Closeable.prototype = {

    createCloseButton: function() {
        var x = document.createElement('i');
        x.className = "icon-cancel";
        x.onclick = function() {this.parentNode.parentNode.removeChild(this.parentNode);};

        return x;
    }
}
