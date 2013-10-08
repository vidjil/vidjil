 
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
  
  var listF;
  
  function testPDF2(){
    changeStyle(pdfStyle);
    
    var doc = new jsPDF();
    for (var i=0; i<6 ; i++){
      d3.select("#polyline"+i).attr('stroke', tagColor[i]);
      d3.select("#polyline"+i).style('stroke-width', '6px');
    }
    var elem =document.getElementById("svg2").cloneNode(true);
    changeStyle(solarizeD);
    var opt={};
    
    listF=doc.getFontList();
    
    opt.scaleX=180/document.getElementById("svg2").getAttribute("width");
    opt.scaleY=60/document.getElementById("svg2").getAttribute("height");
    opt.x_offset=15;
    opt.y_offset=80;
    
    doc.text(100, 20, 'Vidjil pdf test');
    doc.setFontSize(12);
    doc.text(20, 30, 'info patient : ...');
    doc.rect(15,25, 180, 20);
    doc.text(20, 50, 'date : '+jsonData.timestamp.split(' ')[0]);
    doc.text(20, 55, 'system : '+system);
    
    svgElementToPdf(elem, doc, opt)
    doc.setFillColor(255, 255, 255);
    doc.rect(0,140, 210, 140, 'F');

    doc.setFont('courier', 'normal');
    var y=145
    for (var i=0; i<6 ; i++){
      doc.setTextColor(tagColor[i]);
      doc.text(20, y, getname(i));
      y=y+5;
      doc.setTextColor('black');
      doc.text(20, y, jsonData.windows[i].window);
      y=y+10;
    }
    
    
    /*
    doc.setTextColor(50, 190, 100);
    doc.setFont('courier', 'normal');
    doc.text(20, 180, 'ATGCTGCAGTAGCATAGCAT');
    doc.text(90, 180, 'ATGCTGCAGTAGCATAGCAT');
    doc.setFont('courier', 'bold');
    doc.setTextColor(50, 190, 100); 
    doc.text(20, 185, 'ATGCTGCAGGAGCA-AGCAT');
    doc.setFont('courier', 'italic');
    doc.setTextColor(50, 190, 100); 
    doc.text(20, 190, 'ATGCTGCATTAGCA-AGCAT');
    
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(12);
    doc.text(20,200, 'plop');
    doc.setFontSize(18);
    doc.text(50,200, 'plop');
    doc.setFontSize(24);
    doc.text(80,200, 'plop');
    doc.setFontSize(30);
    doc.text(110,200, 'plop');
    doc.setFontSize(36);
    doc.text(140,200, 'plop');
    
    doc.setFontSize(12);
    doc.text(20,220, ['aaaaaaaaaaaa','bbbbbbbbbbbbbbb','cccccccccccccccccc','dddddd']);
    */
    doc.output('dataurlnewwindow')
    //doc.save('Test.pdf');
    changeStyle(solarizeD);
    
  }
  