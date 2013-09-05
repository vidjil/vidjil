/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
 * 
 * segmenter.js
 * 
 * segmenter tools
 * TODO all
 * 
 * content:
 * 
 * displayAlign()
 * hideAlign()
 * addToSegmenter()
 * showlog()
 * 
 */
 
  /*affiche le segmenteur/comparateur*/
 function displayAlign(){
    $('#align').animate({ width: "show", display: "show"}, 200 ); 
  }
  
  /*masque le segmenteur/comparateur ( */
  function hideAlign(){
    $('#align').stop();
    $('#align').animate({ width: "hide", display: "none"}, 200 ); 
    hideSelector();
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
    
    if(typeof junctions[cloneID].seg !='undefined' && junctions[cloneID].seg!=0){
    
    var spanV = document.createElement('span');
    spanV.className="V";
    spanV.style.color=colorV(cloneID);
    spanV.innerHTML=junctions[cloneID].seg.sequence.substr(0, junctions[cloneID].seg.l1+1);
    li.appendChild(spanV);
      
    if ( (junctions[cloneID].seg.l1+1 -junctions[cloneID].seg.r1)!=0){
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=junctions[cloneID].seg.sequence.substring(junctions[cloneID].seg.l1+1, junctions[cloneID].seg.r1);
      li.appendChild(spanN);
    }
    
    var spanJ = document.createElement('span');
    spanJ.className="J";
    spanJ.style.color=colorJ(cloneID);
    spanJ.innerHTML=junctions[cloneID].seg.sequence.substr(junctions[cloneID].seg.r1);
    li.appendChild(spanJ);
    }else{
      var spanJunc=document.createElement('span');
      spanJunc.innerHTML=junctions[cloneID].junction;
      li.appendChild(spanJunc);
    }
    
    divParent.appendChild(li);
      
    /*
      var li2 = document.createElement('li');
      li2.id="seq"+cloneID;
      li2.className="sequence-line";
      li2.innerHTML=jsonData[cloneID].seg.sequence;
      divParent.appendChild(li2);
    */
  }
  
  function showlog(){
    $('#log').animate({height: "toggle"}, 200 ); 
  }

  function align(){
    var request;
    
    var li =document.getElementById("listSeq").getElementsByTagName("li")
    
    request = li.length+"";
    
    for (var i = 0; i<li.length; i++){
      var id =li[i].id.substr(3);
      if ( typeof(jsonData.junctions[id].seg) != 'undefined')
	request += "," +id+";"+ jsonData.junctions[id].seg.sequence;
      else
	request += "," +id+";"+ jsonData.junctions[id].junction;
    }
    
        $.ajax({
            type: "Get",
	    data : request,
            url: "http://127.0.0.1/cgi-bin/test_lazy_msa.cgi",
            success: function(result) {
                displayAjaxResult(result);
	    }
        });
  }
  
  function displayAjaxResult(file){
    
    displayAlign();
    
    var json=JSON.parse(file)
    
    document.getElementById("listSeq").innerHTML="";
    
    for (var i = 0 ; i< json.seq.length-1; i++ ){
      colorSeq(json.seq[i][0], json.seq[i][1]);
    }
  }
  
  function colorSeq(cloneID, seq){
    
    var divParent = document.getElementById("listSeq");
    var li = document.createElement('li');
    li.id="seq"+cloneID;
    li.className="sequence-line";
    
    if(typeof junctions[cloneID].seg !='undefined' && junctions[cloneID].seg!=0){
      
      var newl1=getNewPosition(seq,junctions[cloneID].seg.l1)
      var newr1=getNewPosition(seq,junctions[cloneID].seg.r1)
    
    var spanV = document.createElement('span');
    spanV.className="V";
    spanV.style.color=colorV(cloneID);
    
    spanV.innerHTML=seq.substr(0, newl1+1);
    li.appendChild(spanV);
      
    if ( (newl1 - newr1)!=0){
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=seq.substring(newl1+1, newr1);
      li.appendChild(spanN);
    }
    
    var spanJ = document.createElement('span');
    spanJ.className="J";
    spanJ.style.color=colorJ(cloneID);
    spanJ.innerHTML=seq.substr(newr1);
    li.appendChild(spanJ);
    }else{
      var spanJunc=document.createElement('span');
      spanJunc.innerHTML=seq;
      li.appendChild(spanJunc);
    }
    
    divParent.appendChild(li);
  }
  
  function getNewPosition(seq, oldPos){
    
    var k=0;
    
    for (var i = 0 ; i < seq.length ; i++){

      if (seq[i]!='-') k++;
      if (k==oldPos) return i;
    }
    
  }
  
  
  
  