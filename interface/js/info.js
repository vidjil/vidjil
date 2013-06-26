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
  

      
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="size"+cloneID;
      span2.appendChild(document.createTextNode((100*getSize(cloneID)).toFixed(4)+"%"));
      
      var img=document.createElement('img')
      img.className="delBox";
      img.src="images/delete.png";
      
       
      div.appendChild(span0);
      div.appendChild(img);
      div.appendChild(span1);
      div.appendChild(fav);
      div.appendChild(span2);
      div.style.color=color(cloneID);
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
	div_clone.style.color=color(clones[cloneID][i]);
	
	var span_name = document.createElement('span');
        span_name.className = "nameBox";
        span_name.appendChild(document.createTextNode( getcode(clones[cloneID][i]) ) );
	div_clone.appendChild(span_name);
	
	var img=document.createElement('img');
	img.onclick=function(){ split(cloneID, this.parentNode.id2);
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
   
  }
  */
  
  function initList(data){
  var divParent = document.getElementById("listClones");
  divParent.innerHTML="";
  for(var i=0 ;i<totalClones; i++){
      var div = document.createElement('div');
      div.className="list";
      div.id=i;
      div.onmouseover = function(){ focusIn(this.id, 0); }
      div.onmouseout= function(){ focusOut(this.id); }
      
      var div2 = document.createElement('div');
      div_elem(div2,i);
      div.appendChild(div2);
      
      var div3=document.createElement('div');
      div_cluster(div3, i, false);
      div.appendChild(div3);
      
      document.getElementById("listClones").appendChild(div);
  }
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
  
  function showCluster(cloneID){
    $("#cluster"+cloneID).toggle("fast");
  }
  
  function div_elem(div_elem, cloneID){
    
      div_elem.innerHTML='';
      
      div_elem.className="listElem";
      
      var span0 = document.createElement('span');
      span0.className = "nameBox";
      span0.ondblclick = function(){ editName(this.parentNode.parentNode.id, this); }
      span0.onclick=function(){ 
	selectClone(this.parentNode.parentNode.id); }
      span0.appendChild(document.createTextNode(getname(cloneID)));

      var span1 = document.createElement('span');
      span1.className = "colorBox";
      span1.id="color"+cloneID;
      span1.onclick=function(){ changeColor(this.parentNode.parentNode.id); }
      
      var fav=document.createElement('img')
      fav.className = "favBox";
      fav.id="fav"+cloneID;
      if (favorites.indexOf(cloneID) != -1 ){
	fav.src="images/icon_fav_on.png";
	fav.onclick=function(){ 
	  addToList(this.parentNode.parentNode.id); 
	}
      }else{
	fav.src="images/icon_fav_off.png";
	fav.onclick=function(){ 
	  addToFavorites(this.parentNode.parentNode.id);
	}
      }
      
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="size"+cloneID;
      span2.appendChild(document.createTextNode((100*getSize(cloneID)).toFixed(4)+"%"));
      
      var span3=document.createElement('span')
      span3.className = "clusterBox";
      span3.onclick=function(){ showCluster( this.parentNode.parentNode.id )}
      span3.appendChild(document.createTextNode("+"));
      
      div_elem.appendChild(span3);
      div_elem.appendChild(span0);
      div_elem.appendChild(span1);
      div_elem.appendChild(fav);
      div_elem.appendChild(span2);
      div_elem.style.color=color(cloneID);
    
  }
  
  function updateListElem(cloneID, display){
    
    var div = document.getElementById(cloneID);
    div.innerHTML='';
    
      var div2 = document.createElement('div');
      div_elem(div2,cloneID);
      div.appendChild(div2);
      
      var div3=document.createElement('div');
      div_cluster(div3, cloneID, display);
      div.appendChild(div3);
    
  }
  
  function div_cluster(div_cluster, cloneID, display){
    
      div_cluster.innerHTML='';
      
      div_cluster.id="cluster"+cloneID;
      div_cluster.id2=cloneID;
      if (!display) div_cluster.style.display="none";
      
      var clusterSize=0;
      for(var j=0 ;j<clones[cloneID].length; j++){
	clusterSize += junctions[clones[cloneID][j]].size[t];
      }
      
      for (var i=0; i<clones[cloneID].length; i++){
	
	var div_clone=document.createElement('div');
	div_clone.id2=clones[cloneID][i];
	div_clone.className="listElem";
	div_clone.style.color=color(clones[cloneID][i]);
	
	var span_name = document.createElement('span');
        span_name.className = "nameBox";
        span_name.appendChild(document.createTextNode( getcode(clones[cloneID][i]) ) );
	
	var img=document.createElement('img');
	img.onclick=function(){ split(cloneID, this.parentNode.id2);
	}
	img.src="images/delete.png";
	img.className="delBox";
	
	var span_stat=document.createElement('span');
	span_stat.className="sizeBox";
	span_stat.style.float="left";
	span_stat.appendChild(document.createTextNode( (junctions[clones[cloneID][i]].size[t]*100/clusterSize).toFixed(2)+"%"));
	
	div_clone.appendChild(img);
	div_clone.appendChild(span_name);
	div_clone.appendChild(span_stat);
	div_cluster.appendChild(div_clone);
      }
  }
  
  
  
  
  /*pure manipulation du dom, deplace un element du container listClone vers favoris*/
  function addToFavorites(cloneID){
    favorites.push(cloneID);
    
    document.getElementById("fav"+cloneID).src="images/icon_fav_on.png";
    document.getElementById("fav"+cloneID).onclick=function(){  
      addToList(this.parentNode.parentNode.id);
    };
    
    if ( document.getElementById("selectfav"+cloneID) ){
      document.getElementById("selectfav"+cloneID).src="images/icon_fav_on.png";
      document.getElementById("selectfav"+cloneID).onclick=function(){  
	addToList(this.parentNode.parentNode.id2);
      };
    }
  }

  
  /*operation inverse*/
  function addToList(cloneID){
    var index = favorites.indexOf(cloneID);
    favorites.splice(index, 1);
    
    document.getElementById("fav"+cloneID).src="images/icon_fav_off.png";
    document.getElementById("fav"+cloneID).onclick= function(){
      addToFavorites(this.parentNode.parentNode.id);
    };
    
    if ( document.getElementById("selectfav"+cloneID) ){
      document.getElementById("selectfav"+cloneID).src="images/icon_fav_off.png";
      document.getElementById("selectfav"+cloneID).onclick= function(){
      addToFavorites(this.parentNode.parentNode.id2);
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
