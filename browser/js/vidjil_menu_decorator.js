/*
 * Class to decorate the vmi menu in the same manner as the vidjil menus
 **/
function VidjilMenuDecorator() {

}

VidjilMenuDecorator.prototype = {
    decorate: function(view) {
        var div = document.createElement('div');
        div.className = "menu_box buttonSelector";
        div.textContent = view.id;

        return div
    }
}
