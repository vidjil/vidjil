/*
* This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
* Copyright (C) 2014 by Carette Antonin <antonin.carette@etudiant.univ-lille1.fr> and the Vidjil Team
* Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
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

function Shortcut () {
    this.init()
    
}

Shortcut.prototype = {
    
    init : function () {
        var self = this
        
        this.system_shortcuts = {}
        for (var system in germline_data){
            var keycode = germline_data[system].shortcut.charCodeAt(0)
            this.system_shortcuts[keycode] = system
        }
        
        document.onkeydown = function (e) { self.checkKey(e); }
        document.onkeyup = function (e) { sp.active_move = false; }
    },
    
    
    
    checkKey : function (e) {
        e = e || window.event;
        if (document.activeElement.id == ""){
                
            var key = e.keyCode;
            if (key==0) key = e.which

            
            switch(key) {
                case 37 :   //left arrow
                    e.preventDefault()
                    m.previousTime()
                    break;
                case 39 :   //right arrow
                    e.preventDefault()
                    m.nextTime()
                    break;
                case 83 :   //ctrl+s
                    e.preventDefault()
                    if (e.ctrlKey || e.metakey) db.save_analysis()
                    break;
                case 65 :   //ctrl+a
                    e.preventDefault()
                    if (e.ctrlKey || e.metakey){
                        var d_m = $("#debug_menu")
                        if (d_m.css("display") == "none"){
                            $("#debug_menu").css("display", "");
                        }else{
                            $("#debug_menu").css("display", "none");
                        }
                    }
                default:
            }
            
            console.log(key)
            //system shortcuts
            if (typeof this.system_shortcuts[key] != "undefined") {
                console.log("plopppppp : " + this.system_shortcuts[key])
                m.changeGermline(this.system_shortcuts[key])
            }
        }
        
        if (e.altKey && sp.reinit) {
            sp.active_move = true;
        }
        
    }
    
}
