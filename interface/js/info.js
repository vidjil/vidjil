/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
 * 
 * info.js
 * 
 * contains tools to manipulate element of the left-container :
 * favorites list
 * clone list
 * info panel
 * 
 * 
 * content:
 * 
 * displayInfo(cloneID)
 * addToFavorites(cloneID)
 * addToList(cloneID)
 * 
 * TODO manipulation sur les listes
 * -trie par nom / par size
 * -voir par jonction/ par clone
 * -maj des % affiché en fonction du point de suivi
 */
  
  
  /*genere le contenu du panel d'information avec les données d'un clone */
  function displayInfo(cloneID){
    if (cloneID==-1) return;
    info = cloneID;
    
    var divParent = document.getElementById("info");
    divParent.innerHTML="";
    
      var div = document.createElement('div');
      div.id2=cloneID;
      div.id="info"+cloneID;
      div.className="listElem";
      div.onmouseover = function(){ focusIn(this.id2, 0); }
      div.onmouseout= function(){ focusOut(this.id2); }
      
      var span0 = document.createElement('span');
      span0.className = "nameBox";
      span0.ondblclick = function(){ editName(cloneID, this); }
      span0.appendChild(document.createTextNode(getname(cloneID)));
      
      var span1 = document.createElement('span');
      span1.className = "colorBox";
      span1.onclick=function(){ changeColor(this.parentNode.id2); }
      
      var fav=document.createElement('img')
      fav.className = "favBox";
      if (favorites.indexOf(cloneID) != -1 ){
	fav.src="images/icon_fav_on.png";
	fav.onclick=function(){ 
	  addToList(cloneID); 
	  displayInfo(cloneID);
	}
      }else{
	fav.src="images/icon_fav_off.png";
	fav.onclick=function(){ 
	  addToFavorites(cloneID);
	  displayInfo(cloneID);
	}
      }
      
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="size"+cloneID;
      span2.appendChild(document.createTextNode((100*getSize(cloneID)).toFixed(4)+"%"));
      
      var img=document.createElement('img')
      img.className="delBox";
      img.onclick=function(){ document.getElementById("info").innerHTML=""; }
      img.src="images/delete.png";
      
       
      div.appendChild(span0);
      div.appendChild(img);
      div.appendChild(span1);
      div.appendChild(fav);
      div.appendChild(span2);
      div.style.background=color(cloneID);
      divParent.appendChild(div);
    
    if (clones[cloneID].length>1){
      
      var div_cluster=document.createElement('div');
      div_cluster.id="cluster";
      div_cluster.appendChild(document.createTextNode("composition"));
      
    var clusterSize=0;
    for(var j=0 ;j<clones[cloneID].length; j++){
      clusterSize += junctions[clones[cloneID][j]].size[t];
    }
      
      for (var i=0; i<clones[cloneID].length; i++){
	
	var div_clone=document.createElement('div');
	div_clone.id2=clones[cloneID][i];
	div_clone.className="listElem";
	div_clone.style.background=color(clones[cloneID][i]);
	
	var span_name = document.createElement('span');
        span_name.className = "nameBox";
        span_name.appendChild(document.createTextNode( getcode(clones[cloneID][i]) ) );
	div_clone.appendChild(span_name);
	
	var img=document.createElement('img');
	img.onclick=function(){ split(cloneID, this.parentNode.id2);
				displayInfo(cloneID);
	}
	img.src="images/delete.png";
	img.className="delBox";
	div_clone.appendChild(img);
	
	var span_stat=document.createElement('span');
	span_stat.className="sizeBox";
	span_stat.appendChild(document.createTextNode( (junctions[clones[cloneID][i]].size[t]*100/clusterSize).toFixed(2)+"%"));
	div_clone.appendChild(span_stat);
	
	div_cluster.appendChild(div_clone);
      }
      divParent.appendChild(div_cluster);
    }
    
      /*
    
    var div = document.createElement('div');
    div.id="infoClone";
    
    var clone = document.getElementById(cloneID).cloneNode(true);
    clone.id2=clone.id;
    clone.id="info"+clone.id;
    clone.onmouseover = function(){ focusIn(this.id2, 0); }
    clone.onmouseout= function(){ focusOut(this.id2); }
    var colorbox = clone.lastChild.previousSibling.onclick=function(){ changeColor(this.parentNode.id2); };
    var delBox = clone.firstChild.nextSibling.onclick=function(){ document.getElementById("info").innerHTML=""; };
    document.getElementById("listSelect").appendChild(clone);
    div.appendChild(clone);
    
    var div_fav=document.createElement('div');
    div_fav.onclick = function(){ addToFavorites(cloneID); }
    div_fav.className="button";
    div_fav.appendChild(document.createTextNode("^  add to favorite ^"));
    div.appendChild(div_fav);
    
    var div_edit=document.createElement('div');
    div_edit.onclick = function(){ editName(cloneID); }
    div_edit.className="button";
    div_edit.appendChild(document.createTextNode(" rename "));
    div.appendChild(div_edit);
    
    var div_cluster=document.createElement('div');
    for (var i=0; i<clones[cloneID].length; i++){
      var div_clone=document.createElement('div');
      div_clone.appendChild(document.createTextNode(getname(clones[cloneID][i])));
      var span_free=document.createElement('span');
      span_free.appendChild(document.createTextNode( "free" ));

      div_cluster.appendChild(div_clone);
    }
    
    div.appendChild(div_cluster);
    
    divParent.appendChild(div);
    */
  }
  
  //met a jour les % dans les listes
  function updateList(){
    for (var i=0; i<totalClones; i++){
      document.getElementById("size"+i).innerHTML=(100*getSize(i)).toFixed(4)+"%";
    }  
    for (var i=0; i<select.length; i++){
      document.getElementById("selectsize"+select[i]).innerHTML=(100*getSize(select[i])).toFixed(4)+"%";
    }  
  }
  
  /*pure manipulation du dom, deplace un element du container listClone vers favoris*/
  function addToFavorites(cloneID){
    favorites.push(cloneID);
    
    document.getElementById("fav"+cloneID).src="images/icon_fav_on.png";
    document.getElementById("fav"+cloneID).onclick=function(){  
      addToList(this.parentNode.id);
      displayInfo(this.parentNode.id);
    };
    
    if ( document.getElementById("selectfav"+cloneID) ){
      document.getElementById("selectfav"+cloneID).src="images/icon_fav_on.png";
      document.getElementById("selectfav"+cloneID).onclick=function(){  
	addToList(this.parentNode.id2);
	displayInfo(this.parentNode.id2);
      };
    }
  }

  
  /*operation inverse*/
  function addToList(cloneID){
    var index = favorites.indexOf(cloneID);
    favorites.splice(index, 1);
    
    document.getElementById("fav"+cloneID).src="images/icon_fav_off.png";
    document.getElementById("fav"+cloneID).onclick= function(){
      addToFavorites(this.parentNode.id);
      displayInfo(this.parentNode.ID);
    };
    
    if ( document.getElementById("selectfav"+cloneID) ){
      document.getElementById("selectfav"+cloneID).src="images/icon_fav_off.png";
      document.getElementById("selectfav"+cloneID).onclick= function(){
      addToFavorites(this.parentNode.id2);
      displayInfo(this.parentNode.id2);
      };
    }
  }
  
  function displayFavoris(){

    for (var i = 0; i < totalClones; i++){       
      
      var fav=false;
      
      for (var j=0; j<favorites.length; j++){
	if (favorites[j]==i) fav=true;
      }
      
      if (clones[i].length!=0 && fav){
	document.getElementById(i).style.display="";
      }else{
	document.getElementById(i).style.display="none";
      }      
    }   
  }

  function displayAll(){

    for (var i = 0; i < totalClones; i++){    
      if (clones[i].length!=0){
	document.getElementById(i).style.display="";
      }else{
	document.getElementById(i).style.display="none";
      }     
    }
  }
  
  function displayTop(top){

    for (var i = 0; i < totalClones; i++){      
      if (clones[i].length!=0 && junctions[i].top <= top){
	document.getElementById(i).style.display="";
      }else{
	document.getElementById(i).style.display="none";
      }      
    }   
  }
