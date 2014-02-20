/* 
 * Vidjil, V(D)J repertoire browsing and analysis
 * http://bioinfo.lifl.fr/vidjil
 * (c) 2013, Marc Duez and the Vidjil Team, Bonsai bioinfomatics (LIFL, UMR 8022 CNRS, Univ. Lille 1)
 * =====
 * This is a beta version, please use it only for test purposes.
 * This file is a part of Vidjil, and can not be copied, modified and/or distributed 
 * without the express permission of the Vidjil Team.
 *
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
	  spanF.innerHTML="";
	  this.div_elem(spanF, list[i]);
	  spanF.className="seq-fixed";
	  spanF.firstChild.nextSibling.class="nameBox2";
	  spanF.lastChild.firstChild.id="scolor"+list[i];
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
    div_elem.className="listElem";
    div_elem.style.display="block";
    
    var span0 = document.createElement('span');
    span0.className = "nameBox2";
    span0.ondblclick = function(){ self.editName(cloneID, this); }
    span0.onclick = function(){ self.m.select(cloneID); }
    span0.appendChild(document.createTextNode(this.m.getName(cloneID)));
    span0.title = this.m.getName(cloneID);
    span0.style.color=this.m.windows[cloneID].color;
      
    var svg=document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class','starBox'); 
    svg.onclick=function(){ changeTag(cloneID); }
    var path=document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('d', this.starPath);
    path.setAttribute('id','color'+cloneID); 
    if (typeof this.m.windows[cloneID].tag != 'undefined') path.setAttribute("fill", tagColor[this.m.windows[cloneID].tag]);
    else path.setAttribute("fill", color['@default']);
	
    svg.appendChild(path);
      
    var span2=document.createElement('span')
    span2.className = "sizeBox";
    span2.id="size"+cloneID;
    span2.onclick=function(){ this.m.select(cloneID); }
    span2.style.color=this.m.windows[cloneID].color;
      
    span2.appendChild(document.createTextNode(this.m.getStrSize(cloneID)));
      
    div_elem.appendChild(span0);
    div_elem.appendChild(svg);
    div_elem.appendChild(span2);
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
    spanF.className="seq-fixed";
    spanF.firstChild.nextSibling.class="nameBox2";
    spanF.lastChild.firstChild.id="scolor"+cloneID;

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
  
