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
 function extractSVG(id){
    
    var html = d3.select("#"+id)
      .attr("title", "test")
      .attr("version", 1.1)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .node().parentNode.innerHTML;

    d3.select("#popup-msg").append("div")
      .append("img")
      .attr("src", "data:image/svg+xml;base64,"+ btoa(html));
	
    popupMsg("plop");
	
  }

  function testPDF(){

    //récupération du node du graphique
    var node = d3.select("#svg2")
    .attr("title", "test")
    .attr("version", 1.1)
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .node();
    
    //extraction du code SVG 
    var s = new XMLSerializer();
    var xmlString = s.serializeToString(node);
    
    //calcul du rescale a effectuer
    var width=document.getElementById("svg2").getAttribute("width");
    var height=document.getElementById("svg2").getAttribute("height");
    var nWidth=3000;
    var nHeight=1500;
    var dWidth = nWidth/width;
    var dHeight = nHeight/height;
    
    //application du rescale
    xmlString = xmlString.replace(width, nWidth);   
    xmlString = xmlString.replace(height, nHeight);   
    xmlString = xmlString.replace('<svg ', '<svg transform="scale(' + dWidth + ' ' + dHeight + ')" ');   
    
    //TODO changement de style pour la version PDF
    // + gestion non-scaling-stroke vector effect + font
    xmlString = xmlString.replace(new RegExp(colorStyle.c01, 'g'), pdfStyle.c01);
    xmlString = xmlString.replace(new RegExp(colorStyle.c02, 'g'), pdfStyle.c02);
    xmlString = xmlString.replace(new RegExp(colorStyle.c03, 'g'), pdfStyle.c03);
    xmlString = xmlString.replace(new RegExp(colorStyle.c04, 'g'), pdfStyle.c04);
    xmlString = xmlString.replace(new RegExp(colorStyle.c05, 'g'), pdfStyle.c05);
    xmlString = xmlString.replace(new RegExp(colorStyle.c06, 'g'), pdfStyle.c06);
    
    //conversion canvas
    var canvas = document.createElement("canvas");
    canvg(canvas,xmlString);
    
    //conversion jpeg
    var imgData = canvas.toDataURL("image/jpeg", 1.0);
    
    //génération pdf
    var doc = new jsPDF();
    doc.text(20, 20, 'Vidjil pdf test');
    doc.text(20, 30, 'hi!');
    doc.addImage(imgData, 'JPEG', 5, 40, 200, 100);
    doc.save('Test.pdf');
  }
  */
  var listF;
  
  function testPDF2(){
    m.focusOut();
    
    var list=m.getSelected()
    
    if (list.length==0){
      var flag=5;
      for (var i = 0; i<m.n_windows; i++){
	if (m.clones[i].cluster.length !=0 && flag!=0){
	  list.push(i);
	  flag--;
	}
      }
    }
    
    var elem = document.getElementById("visu2_svg").cloneNode(true);
    var opt={};
    var doc = new jsPDF();

    // The clones should have their natural (tag) color, even if two have the same color...
      
    for (var i = 0; i<m.n_windows; i++){
      var polyline = elem.getElementById("polyline"+i)
      polyline.setAttribute("style","stroke-width:1px; stroke:"+ tagColor[m.windows[i].tag]);
      polyline.setAttribute("stroke", tagColor[m.windows[i].tag]);
      // polyline.setAttribute("style","stroke-width:1px; stroke: #dddddd");
      // polyline.setAttribute("stroke","#dddddd");


      // Hide 'other' line (TODO: really remove this line !)
      if (m.windows[i].window == "other")
	  {
	      polyline.setAttribute("style","stroke-width:0px; stroke: #ffffff");
	      polyline.setAttribute("stroke", "#ffffff");
	  }
    }
    
    
    for (var i = 0; i<list.length; i++){
      var polyline = elem.getElementById("polyline"+list[i])
      polyline.setAttribute("style","stroke-width:6px; stroke:"+tagColor[m.windows[i].tag]);
      polyline.setAttribute("stroke", tagColor[m.windows[i].tag]);
      elem.getElementById("polyline_container").appendChild(polyline);
    }
    
    var textElem = elem.getElementsByTagName("text");
    
    for (var i = 0; i<textElem.length; i++){
      textElem[i].setAttribute("text-anchor","middle");
    }
    
    elem.getElementById("resolution1").firstChild.setAttribute("fill","#eeeeee");
    var timebar=elem.getElementById("timebar");
    elem.getElementById("timebar").parentNode.removeChild(timebar);
    var visu2_back=elem.getElementById("visu2_back");
    elem.getElementById("visu2_back").parentNode.removeChild(visu2_back);
    var visu2_back2=elem.getElementById("visu2_back2");
    elem.getElementById("visu2_back2").parentNode.removeChild(visu2_back2);
    var reso5=elem.getElementById("resolution5");
    elem.getElementById("resolution5").parentNode.removeChild(reso5);

    opt.scaleX=180/document.getElementById("visu2_svg").getAttribute("width");
    opt.scaleY=80/document.getElementById("visu2_svg").getAttribute("height");
    opt.x_offset=15;
    opt.y_offset=60;

    doc.setFontSize(12);
    doc.text(130, 20, 'Vidjil -- http://bioinfo.lifl.fr/vidjil');
    doc.rect(15, 15, 60, 23);
    doc.text(20, 20, document.getElementById("upload_json").files[0].name);
    doc.text(20, 25, 'run: 2014-xx-xx');
    doc.text(20, 30, 'analysis: '+m.timestamp[0].split(' ')[0]);
    doc.text(20, 35, 'germline: '+m.system);
    doc.text(20, 45, 'reads: ' + m.reads_segmented_total + ' / ' + m.reads_total_total 
	     + ' (' + (100 * m.reads_segmented_total / m.reads_total_total).toFixed(3) + '%)');

    doc.text(130, 25, '**beta** PDF export');

    svgElementToPdf(elem, doc, opt)
    doc.setFillColor(255, 255, 255);
    doc.rect(0,140, 210, 140, 'F');
    
    var y=150

    // Detailed output by clone
    for (var i = 0; i<list.length; i++){
      var id=list[i];
      
      var polyline = document.getElementById("polyline"+id).cloneNode(true);
      polyline.setAttribute("style","stroke-width:40px");
      polyline.setAttribute("stroke",tagColor[m.windows[i].tag]);
      var res =elem.getElementById("resolution1").cloneNode(true);
      res.firstChild.setAttribute("fill","white");
      var icon=document.createElement("svg");
            
      icon.appendChild(polyline)
      icon.appendChild(res)
      var opt_icon={};
      opt_icon.scaleX=18/document.getElementById("visu2_svg").getAttribute("width");
      opt_icon.scaleY=8/document.getElementById("visu2_svg").getAttribute("height");
      opt_icon.x_offset=10;
      opt_icon.y_offset=y-2;
      svgElementToPdf(icon, doc, opt_icon)
      doc.setDrawColor(150,150,150);
      doc.rect(10, y-2, 18, 8);
      /*
      polyline.setAttribute("stroke",tagColor[m.windows[i].tag]);
      polyline.setAttribute("style","stroke-width:6px");
      opt_icon.scaleX=180/document.getElementById("visu2_svg").getAttribute("width");
      opt_icon.scaleY=30/document.getElementById("visu2_svg").getAttribute("height");
      opt_icon.x_offset=15;
      opt_icon.y_offset=y-5;
      svgElementToPdf(icon, doc, opt_icon)
      */
      
      doc.setFont('courier', 'bold');
      doc.setTextColor(tagColor[m.windows[i].tag]);
      doc.text(30, y, m.getName(id));
      doc.setFont('courier', 'normal');
      doc.setTextColor(0,0,0);
      var r=0;
      for(var j=0 ;j<m.clones[id].cluster.length; j++){
				r += m.windows[m.clones[id].cluster[j]].size;}
      var s;
      var size=m.getSize(id);
      if (size<0.0001){
	    s=(size).toExponential(1); 
      }else{
	    s=(100*size).toFixed(3)+"%";
      }
      doc.text(120, y, 'reads (point 0): '+r+' -- '+s);
      
      y=y+5;
      if (typeof(m.windows[id].sequence) !='number'){
	//var v_seq=windows[id].sequence.substr(0, windows[id].Vend+1);
	//var n_seq=windows[id].sequence.substr(windows[id].Vend+1, windows[id].Jstart);
	//var j_seq=windows[id].sequence.substr(windows[id].Jstart);

	var seq=m.windows[id].sequence;
	var seq=seq.insert(m.windows[id].Jstart, "     ");
	var seq=seq.insert(m.windows[id].Vend+1, "     ");

	for(j=0 ; j<(Math.floor(seq.length/80)+1) ; j++){
	  doc.text(30, y, seq.substring(j*80, (j+1)*80 ));
	  y=y+5;
	}

	y=y+10;
      }else{
	doc.text(30, y, "segment fail :"+m.windows[id].window);
	y=y+10;
      }
      
    }
    
    doc.output('dataurlnewwindow')
    //doc.save('Test.pdf');
    m.update();

  }
  
String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};
