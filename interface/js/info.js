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
    var divParent = document.getElementById("info");
    divParent.innerHTML="";
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
    div_fav.appendChild(document.createTextNode("^  ajouter aux favoris ^"));
    div.appendChild(div_fav);
    
    var div_edit=document.createElement('div');
    div_edit.onclick = function(){ editName(cloneID); }
    div_edit.className="button";
    div_edit.appendChild(document.createTextNode(" modifier le nom "));
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
    
  }
  
  //met a jour les % dans les listes
  function updateList(){
    for (var i=0; i<totalClones; i++){
      document.getElementById("size"+i).innerHTML=(100*getSize(i)).toFixed(2)+"%";
    }   
  }
  
  /*pure manipulation du dom, deplace un element du container listClone vers favoris*/
  function addToFavorites(cloneID){
    favorites.push(cloneID);
    var clone = document.getElementById(cloneID);
    document.getElementById("listFav").appendChild(clone);
  }

  
  /*operation inverse*/
  function addToList(cloneID){
    var index = favorites.indexOf(cloneID);
    favorites.splice(index, 1);
    var clone = document.getElementById(cloneID);
    document.getElementById("listClones").appendChild(clone);
  }

  