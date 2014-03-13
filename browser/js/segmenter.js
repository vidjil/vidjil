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

/* 
 *
 * segmenter.js
 * 
 * segmenter tools
 * 
 * content:
 * 
 * 
 */

var CGI_ADRESS ="http://127.0.1.1/cgi-bin/";
var memTab=[];
 
/* segment constructor
 * 
 * */   
function Segment(id, model){
  this.id=id;			//ID de la div contenant le segmenteur
  this.m=model;			//Model utilisé
  this.m.view.push(this);	//synchronisation au Model
  this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
}

Segment.prototype = {
  
/* 
 * 
 * */ 
    init : function(){
        var self = this;
        
        $('#toClipBoard').zclip({
            path:'js/lib/ZeroClipboard.swf',
            copy: function(){return self.toFasta()}
        });
        
    },
  
/*
 * 
 * */   
  resize : function(){
  },
  
/*
 * 
 * */   
  update : function(){
    for (var i=0; i< this.m.n_windows; i++){
      this.updateElem([i]);
    }
  },
  
/*
 * 
 * */   
  updateElem : function(list){
    
    for (var i=0; i< list.length; i++){
      
        if (this.m.windows[list[i]].select){
            if ( document.getElementById("seq"+list[i]) ){
                var spanF=document.getElementById("f"+list[i]);
                this.div_elem(spanF, list[i]);
            }else{
                this.addToSegmenter(list[i]);
                this.show();
            }
            
        }else{
            if ( document.getElementById("seq"+list[i]) ){
                var element = document.getElementById("seq"+list[i]);
                element.parentNode.removeChild(element);
            }
        }
    }
    
  },

/* genere le code HTML des infos d'un clone
 * @div_elem : element HTML a remplir
 * @cloneID : identifiant du clone a décrire
 * */   
  div_elem : function(div_elem, cloneID){
    var self=this;
    
    div_elem.innerHTML='';
    div_elem.className="seq-fixed";
    div_elem.style.display="block";
    
    var seq_name = document.createElement('span');
    seq_name.className = "nameBox";
    seq_name.onclick = function(){ self.m.select(cloneID); }
    seq_name.appendChild(document.createTextNode(this.m.getName(cloneID)));
    seq_name.title = this.m.getName(cloneID);
    seq_name.style.color=this.m.windows[cloneID].color;
      
    var svg_star=document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg_star.setAttribute('class','starBox'); 
    svg_star.onclick=function(){ changeTag(cloneID); }
    
    var path=document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('d', this.starPath);
    path.setAttribute('id','color'+cloneID); 
    if (typeof this.m.windows[cloneID].tag != 'undefined') path.setAttribute("fill", tagColor[this.m.windows[cloneID].tag]);
    else path.setAttribute("fill", color['@default']);
    
    svg_star.appendChild(path);
      
    var seq_size=document.createElement('span')
    seq_size.className = "sizeBox";
    seq_size.id="size"+cloneID;
    seq_size.onclick=function(){ this.m.select(cloneID); }
    seq_size.style.color=this.m.windows[cloneID].color;
    seq_size.appendChild(document.createTextNode(this.m.getStrSize(cloneID)));
      
    div_elem.appendChild(seq_name);
    div_elem.appendChild(svg_star);
    div_elem.appendChild(seq_size);
  },
  
  addToSegmenter : function (cloneID){
    var self=this;
    
    var divParent = document.getElementById("listSeq");
    var li = document.createElement('li');
    li.id="seq"+cloneID;
    li.className="sequence-line";
    li.onmouseover = function(){ self.m.focusIn(cloneID); }
    
    var spanF = document.createElement('span');
    spanF.id = "f"+cloneID;
    this.div_elem(spanF, cloneID);

    var spanM = document.createElement('span');
    spanM.id = "m"+cloneID;
    spanM.className="seq-mobil";
    
    if(typeof this.m.windows[cloneID].sequence !='undefined' && this.m.windows[cloneID].sequence!=0){
    
    var spanV = document.createElement('span');
    spanV.className="V";
    spanV.style.color=this.m.windows[cloneID].colorV;

    var v_seq=this.m.windows[cloneID].sequence.substr(0, this.m.windows[cloneID].Vend+1);
    var size_marge=200-v_seq.length;
    if (size_marge>0){
      var marge="";
      for (var i=0; i<size_marge; i++) marge+="&nbsp";
      spanV.innerHTML=marge+v_seq;
    }else{
      spanV.innerHTML=v_seq;
    }

    spanM.appendChild(spanV);
      
    if ( (this.m.windows[cloneID].Vend+1 -this.m.windows[cloneID].Jstart)!=0){
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=this.m.windows[cloneID].sequence.substring(this.m.windows[cloneID].Vend+1, this.m.windows[cloneID].Jstart);
      spanM.appendChild(spanN);
    }
    
    var spanJ = document.createElement('span');
    spanJ.className="J";
    spanJ.style.color=this.m.windows[cloneID].colorJ;
    spanJ.innerHTML=this.m.windows[cloneID].sequence.substr(this.m.windows[cloneID].Jstart);
    spanM.appendChild(spanJ);
    }else{
      var size_marge=220-this.m.windows[cloneID].window.length;
      var marge="";
      for (var i=0; i<size_marge; i++) marge+="&nbsp";
      var spanJunc=document.createElement('span');

      spanJunc.innerHTML=marge+this.m.windows[cloneID].window;

      spanM.appendChild(spanJunc);
    }
    
    li.appendChild(spanF);
    li.appendChild(spanM);
    divParent.appendChild(li);
      
  },
  
  sendTo : function(adress){
    
    var list =this.m.getSelected()
    var request = "";

    for (var i = 0; i<list.length; i++){
      if ( typeof(this.m.windows[list[i]].sequence) != 'undefined' && this.m.windows[list[i]].sequence!=0)
	request += ">" +this.m.getName(list[i])+"\n"+ this.m.windows[list[i]].sequence+"\n";
      else
	request += ">" +this.m.getName(list[i])+"\n"+ this.m.windows[list[i]].window+"\n";
    }

    if (adress=='IMGT') imgtPost(request, this.m.system);
    if (adress=='igBlast') igBlastPost(request, this.m.system);
    
  },
  
  show : function(){
    var li =document.getElementById("listSeq").getElementsByTagName("li");
    if (li.length >0){
      var id=li[0].id.substr(3);
      var mid=$("#m"+id+" span:first-child").width()-250;
      $("#bot-container").animate({scrollLeft: mid}, 0);
    }
  },
  
  align : function(){
   
    var list =this.m.getSelected()
    var request = "";
    memTab=list;
    
    if (list.length==0) return ;
      
    for (var i = 0; i<list.length; i++){
      if ( typeof(this.m.windows[list[i]].sequence) != 'undefined' && this.m.windows[list[i]].sequence!=0)
	request += ">" +list[i]+"\n"+ this.m.windows[list[i]].sequence+"\n";
      else
	request += ">" +list[i]+"\n"+ this.m.windows[list[i]].window+"\n";
    }
    
    
    $.ajax({
	type: "POST",
	data : request,
	url: CGI_ADRESS+"align.cgi",
	success: function(result) {
	    displayAjaxResult(result);
	}
    });
  },
  
    clipBoard : function () {
            
        var div = document.getElementById('clipBoard');
        div.innerHTML = "";
        div.appendChild(document.createTextNode(""));
        
        /*
        if (document.createRange && window.getSelection) {
            var range = document.createRange();
            range.selectNode(div);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        } 
        */
        
    },
    
    toFasta : function () {
        var selected = this.m.getSelected();
        var result = "";
        
        for (var i=0; i < selected.length; i++){
            result += "> "+this.m.getName(selected[i]) + " // " + this.m.getStrSize(selected[i]) + "\n";
            result += this.m.windows[selected[i]].sequence + "\n";
        }
        return result
    }
    


}//fin prototype


  
  function displayAjaxResult(file){
    
    var json=JSON.parse(file)
    
    for (var i = 0 ; i< json.seq.length; i++ ){
        
        // global container
        var spanM = document.getElementById("m"+memTab[i]);
        spanM.innerHTML="";
        // V gene container
        var spanV = document.createElement('span');
        spanV.className="V";
        spanV.style.color=m.windows[memTab[i]].colorV;
        // N region container
        var spanN = document.createElement('span');
        spanN.className="N";
        // J gene container
        var spanJ = document.createElement('span');
        spanJ.className="J";
        spanJ.style.color=m.windows[memTab[i]].colorJ;
        
        if(typeof m.windows[memTab[i]].sequence !='undefined' && m.windows[memTab[i]].sequence!=0){
            var newVend=getNewPosition(json.seq[i],m.windows[memTab[i]].Vend)
            var newJstart=getNewPosition(json.seq[i],m.windows[memTab[i]].Jstart)
            
            console.log(m.windows[memTab[i]].Vend+"/"+m.windows[memTab[i]].Jstart+"//"
                        +newVend+"/"+newJstart+"//"+ memTab[i]
            )

            var str = "";
            for (var k=0; k<json.seq[i].length; k++){
                if (json.seq[i][k] == json.seq[0][k] ){
                    str += json.seq[i][k]
                }else{
                    str += "<span class='substitution'>"+json.seq[i][k]+"</span>"
                }
                
                if (k==newVend+1){
                    spanV.innerHTML=str
                    str=""
                }
                
                if (k==newJstart){
                    spanN.innerHTML=str
                    str=""
                }
                
            }
            spanJ.innerHTML=str
            
            spanM.appendChild(spanV);
            spanM.appendChild(spanN);
            spanM.appendChild(spanJ);
        }else{
            var spanJunc=document.createElement('span');
            spanJunc.innerHTML=json.seq[i];
            spanM.appendChild(spanJunc);
        }
    }
    
  }
  
  function getNewPosition(seq, oldPos){
    var k=0;
    
    for (var i = 0 ; i < seq.length ; i++){
      if (seq[i]!='-') k++;
      if (k==oldPos) return i;
    }
    
  }
  
