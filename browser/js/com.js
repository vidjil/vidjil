/*
 * This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
 * Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr> and the Vidjil Team
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


/* Com object display/store system message
 * 
 * */
function Com(id, id2) {
    this.flash_id = id;
    this.log_id = id2;
    this.min_priority = 1; // minimum required to display message
    this.log_container = document.getElementById(this.log_id);
}

Com.prototype = {
    
    /* display a flash message if priority level is sufficient
     * and print message in log
     * */
    flash: function (str, priority){
        priority = typeof priority !== 'undefined' ? priority : 0;
        
        if (priority >= this.min_priority){
            var div = jQuery('<div/>', {
                text: str,
                style: 'display : none',
                class: 'flash_'+priority ,
                click : function(){$(this).fadeOut(25, function() { $(this).remove();} );}
            }).appendTo("#"+this.flash_id)
            .slideDown(200);
            
            if (priority !=2){
                setTimeout(function(){
                    div.fadeOut('slow', function() { div.remove();});
                }, 8000);
            }
            
        }
        
        this.log(str, priority);
    },
    
    /* print message in log_container if priority level is sufficient (else use javascript default console)
     * 
     * */
    log: function(str, priority){
        priority = typeof priority !== 'undefined' ? priority : 0;
        var self = this;
        
        if (priority >= this.min_priority){
            
            var d = new Date();
            var strDate = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
            while (strDate.length < 8) strDate += " "
                
            var div = jQuery('<div/>', {
                text: strDate+" | "+str,
                class: 'log_'+priority
            }).appendTo("#"+this.log_id)
            .slideDown(200, function(){
                self.log_container.scrollTop = self.log_container.scrollHeight;
            });
            
        }else{
            console.log(str)
        }
        
    },
    
    openLog: function () {
        $("#"+this.log_id).fadeToggle(200)
    },
    
    closeLog: function () {
        $("#"+this.log_id).fadeToggle(200)
    },

    
}