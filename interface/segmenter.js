  function displayAlign(){
    $('#align').animate({ height: "show", display: "show"}, 200 ); 
  }
  
  function hideAlign(){
    $('#align').stop();
    $('#align').animate({ height: "hide", display: "none"}, 200 ); 
  }
  
  function showlog(){
    $('#log').animate({height: "toggle"}, 200 ); 
  }
  
  function focus(){
    $('#log').animate({height: "toggle"}, 200 ); 
  }
  
  function addToSegmenter(cloneID){
    var divParent = document.getElementById("listSeq");
      var li = document.createElement('li');
      li.id="seq"+cloneID;
      li.className="sequence-line";
      
      var spanV = document.createElement('span');
      spanV.className="V";
      spanV.style.color=colorV(cloneID);
      spanV.innerHTML=junctions[cloneID].seg.sequence.substr(0, junctions[cloneID].seg.l1+1);
      li.appendChild(spanV);
      
      var spanN = document.createElement('span');
      spanN.className="N";
      spanN.innerHTML=junctions[cloneID].seg.sequence.substring(junctions[cloneID].seg.l1+1, junctions[cloneID].seg.r1);
      li.appendChild(spanN);
      
      var spanJ = document.createElement('span');
      spanJ.className="J";
      spanJ.style.color=colorJ(cloneID);
      spanJ.innerHTML=junctions[cloneID].seg.sequence.substr(junctions[cloneID].seg.r1);
      li.appendChild(spanJ);
      divParent.appendChild(li);
      
      document.getElementById("log").innerHTML+="<br>[element id "+cloneID+"] >> segmenter";
      $("#log").scrollTop(100000000000000);
      
      /*
      var li2 = document.createElement('li');
      li2.id="seq"+cloneID;
      li2.className="sequence-line";
      li2.innerHTML=jsonData[cloneID].seg.sequence;
      divParent.appendChild(li2);
      */
  }
