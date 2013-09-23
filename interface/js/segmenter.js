/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
 * 
 * segmenter.js
 * 
 * segmenter tools
 * 
 * content:
 * 
 * displayAlign()
 * hideAlign()
 * addToSegmenter()
 * showlog()
 * 
 */

var CGI_ADRESS ="http://127.0.0.1/cgi-bin/";
 
  /*affiche le segmenteur/comparateur*/
 function displayAlign(){
    $('#bot-container').animate({ width: "100%"}, 200 ); 
    
    var li =document.getElementById("listSeq").getElementsByTagName("li");
    if (li.length >0){
      var id=li[0].id.substr(3);
      var mid=$("#m"+id+" span:first-child").width();
      $("#bot-container").animate({scrollLeft: mid}, 500);
    }
  }
  
  /*masque le segmenteur/comparateur ( */
  function hideAlign(){
    hideSelector();
    $('#bot-container').stop();
    $('#bot-container').animate({ width: "400px"}, 200 ); 
  }

  function hideSelector(){
    $('.selector').stop();
    $('.selector').animate({ height: "hide", display: "none"}, 100 ); 
  }
  
  function addToSegmenter(cloneID){
    var divParent = document.getElementById("listSeq");
    var li = document.createElement('li');
    li.id="seq"+cloneID;
    li.className="sequence-line";
    li.onmouseover = function(){ focusIn(this.id); }
    li.onmouseout= function(){ focusOut(this.id); }
    
    var spanF = document.createElement('span');
    spanF.id = "f"+cloneID;
    div_elem(spanF, cloneID);
    spanF.className="seq-fixed";
    spanF.lastChild.firstChild.id="scolor"+cloneID;
    
    var spanM = document.createElement('span');
    spanM.id = "m"+cloneID;
    spanM.className="seq-mobil";
    
    if(typeof junctions[cloneID].seg !='undefined' && junctions[cloneID].seg!=0){
    
    var spanV = document.createElement('span');
    spanV.className="V";
    spanV.style.color=colorV(cloneID);
    var v_seq=junctions[cloneID].seg.sequence.substr(0, junctions[cloneID].seg.l1+1);
    var size_marge=200-v_seq.length;
    if (size_marge>0){
      var marge="";
      for (var i=0; i<size_marge; i++) marge+="&nbsp";
      spanV.innerHTML=marge+v_seq;
    }else{
      spanV.innerHTML=v_seq;
    }
    spanM.appendChild(spanV);
      
    if ( (junctions[cloneID].seg.l1+1 -junctions[cloneID].seg.r1)!=0){
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=junctions[cloneID].seg.sequence.substring(junctions[cloneID].seg.l1+1, junctions[cloneID].seg.r1);
      spanM.appendChild(spanN);
    }
    
    var spanJ = document.createElement('span');
    spanJ.className="J";
    spanJ.style.color=colorJ(cloneID);
    spanJ.innerHTML=junctions[cloneID].seg.sequence.substr(junctions[cloneID].seg.r1);
    spanM.appendChild(spanJ);
    }else{
      var spanJunc=document.createElement('span');
      spanJunc.innerHTML=junctions[cloneID].junction;
      spanM.appendChild(spanJunc);
    }
    
    li.appendChild(spanF);
    li.appendChild(spanM);
    divParent.appendChild(li);
    displayAlign();
      
  }
  
  function showlog(){
    $('#log').animate({height: "toggle"}, 200 ); 
  }
  
      //TODO repasser en local
      var memTab=[];
  function align(){
   
    var li =document.getElementById("listSeq").getElementsByTagName("li");
    var request = "";
    memTab=[];
    
    for (var i = 0; i<li.length; i++){
      var id =li[i].id.substr(3);
      memTab[i]=id;
      if ( typeof(jsonData.junctions[id].seg) != 'undefined' && jsonData.junctions[id].seg!=0)
	request += ">" +id+"\n"+ jsonData.junctions[id].seg.sequence+"\n";
      else
	request += ">" +id+"\n"+ jsonData.junctions[id].junction+"\n";
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
  
  function displayAjaxResult(file){
    

    var json=JSON.parse(file)
    
    for (var i = 0 ; i< json.seq.length; i++ ){
      colorSeq(memTab[i], json.seq[i]);
    }
    
    displayAlign();
    
  }
  
  function colorSeq(cloneID, seq){
    
    var spanM = document.getElementById("m"+cloneID);
    spanM.innerHTML="";
    
    if(typeof junctions[cloneID].seg !='undefined' && junctions[cloneID].seg!=0){
      
      var newl1=getNewPosition(seq,junctions[cloneID].seg.l1)
      var newr1=getNewPosition(seq,junctions[cloneID].seg.r1)
    
    var spanV = document.createElement('span');
    spanV.className="V";
    spanV.style.color=colorV(cloneID);
    
    spanV.innerHTML=seq.substr(0, newl1+1);
    spanM.appendChild(spanV);
      
    if ( (newl1 - newr1)!=0){
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=seq.substring(newl1+1, newr1);
      spanM.appendChild(spanN);
    }
    
    var spanJ = document.createElement('span');
    spanJ.className="J";
    spanJ.style.color=colorJ(cloneID);
    spanJ.innerHTML=seq.substr(newr1);
    spanM.appendChild(spanJ);
    }else{
      var spanJunc=document.createElement('span');
      spanJunc.innerHTML=seq;
      spanM.appendChild(spanJunc);
    }
    
  }
  
  function getNewPosition(seq, oldPos){
    
    var k=0;
    
    for (var i = 0 ; i < seq.length ; i++){
      if (seq[i]!='-') k++;
      if (k==oldPos) return i;
    }
    
  }
  
  function sendTo(adress){
    
    var li =document.getElementById("listSeq").getElementsByTagName("li")
    var request = "";

    for (var i = 0; i<li.length; i++){
      var id =li[i].id.substr(3);
      if ( typeof(jsonData.junctions[id].seg) != 'undefined' && jsonData.junctions[id].seg!=0)
	request += ">" +getname(id)+"\n"+ jsonData.junctions[id].seg.sequence+"\n";
      else
	request += ">" +getname(id)+"\n"+ jsonData.junctions[id].junction+"\n";
    }
    if (adress=='IMGT') imgtPost(request);
    if (adress=='igBlast') igBlastPost(request);

    
  }
  
  