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

 /* an object that keep track of a specified dom element and his children
  * provide a set of function to update contents/colors/display with minimal dom access
  *
  * the childs of the indexed element can be accessed by their className, the parent by using "main" as className
  * 
  * limit:
  * /!\ don't use native/jquery function to modify indexed element or you will lose sync with indexed content
  * /!\ don't index nested element (or do it but don't use content() on the top element for obvious reason)
  * */
 function IndexedDom(div) {
    this.div = {
        main: {element: div}
    };
}

IndexedDom.prototype = {

    /* return the first child with the given className 
     * save his DOM position for later use if not already done
     */
    getElement: function(className){
        // The first time, stores the DOM element
        if (typeof (this.div[className]) == "undefined")
            this.div[className] = { element : this.div.main.element.getElementsByClassName(className)[0]};
        
        // Returns the stored DOM element
        return this.div[className].element;
    },


    /* Setters
       The setters both stores the updated value in the IndexedDom as well as in the DOM.
       Changes are done only when needed, because updating the DOM is slow... and these
       setters are often called during an .update() without any actual changes.
     */

    content: function(className, newContent){
        var div = this.getElement(className);

        if (this.div[className].content != newContent)
        {
            this.div[className].content = newContent;
            div.innerHTML = newContent;
        }
    }, 

    classname: function(className, newClassName){
        var div = this.getElement(className);

        if (this.div[className].classname != newClassName)
        {
            this.div[className].classname = newClassName
            div.className = newClassName;
        }
    },

    display: function(className, display){
        var div = this.getElement(className);

        if (this.div[className].display != display)
        {
            this.div[className].display = display;
            div.style.display = display;
        }
    },

    color: function(className, color){
        var div = this.getElement(className);

        if (this.div[className].color != color)
        {
            this.div[className].color = color;
            div.style.color = color;
        }
    },

    title: function(className, title){
        var div = this.getElement(className);

        if (this.div[className].title != title)
        {
            this.div[className].title = title;
            div.title = title;
        }
    },

    /* Clear */
    clear: function(className){
        if (className == "main"){
            var tmp = this.getElement(className);
            this.div = {
                main: {element: tmp}
            };
            return;
        }

        this.div[className] = undefined;
    }
}