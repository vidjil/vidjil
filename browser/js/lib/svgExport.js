/*
  This code is coming from
  http://bl.ocks.org/Rokotyan/0556f8facbaf344507cdc45dc3622177 released under
  the MIT license and has then been slightly modified to better get the CSS
  rules.

  This code can thus be used under the MIT license.
*/

function getSVGString( svgNode ) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    var cssStyleText = getCSSStyles( svgNode );
    appendCSS( cssStyleText, svgNode );

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgNode);
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

    return svgString;

    function getCSSStyles( parentElement ) {
	var selectorTextArr = [];

	// Add Parent element Id and Classes to the list
     	selectorTextArr.push( '#'+parentElement.id.toLowerCase() );
	for (var c = 0; c < parentElement.classList.length; c++)
	    if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
		selectorTextArr.push( '.'+parentElement.classList[c].toLowerCase() );

	// Add Children element Ids and Classes to the list
        var children = $(parentElement).find('*');
        var parents = $(parentElement).parents();

        pushIDAndClasses(children, selectorTextArr);
        pushIDAndClasses(parents, selectorTextArr);

        // Extract CSS Rules
        var extractedCSSText = "";
        for (var i = 0; i < document.styleSheets.length; i++) {
	    var s = document.styleSheets[i];
	    
	    try {
	        if(!s.cssRules) continue;
	    } catch( e ) {
	        if(e.name !== 'SecurityError') throw e; // for Firefox
	        continue;
	    }

	    var cssRules = s.cssRules;
	    for (var r = 0; r < cssRules.length; r++) {
                if (typeof cssRules[r].selectorText !== 'undefined') {
                    var currentRule = cssRules[r].selectorText.split(/\s*,\s*/);
                    for (var q = 0; q < currentRule.length; q++) {
         	        if ( contains( currentRule[q].toLowerCase(), selectorTextArr ) )
		            extractedCSSText += cssRules[r].cssText;
                    }
                }
	    }
        }
        

        return extractedCSSText;

        function contains(str,arr) {
	    return arr.indexOf( str ) === -1 ? false : true;
        }

        function pushIDAndClasses(nodes, selectorTextArr) {
            for (var i = 0; i < nodes.length; i++) {
	        var id = nodes[i].id;
	        if ( !contains('#'+id, selectorTextArr) )
	            selectorTextArr.push( '#'+id.toLowerCase() );

	        var classes = nodes[i].classList;
	        for (var c = 0; c < classes.length; c++)
	            if ( !contains('.'+classes[c], selectorTextArr) )
		        selectorTextArr.push( '.'+classes[c].toLowerCase() );

                selectorTextArr.push(nodes[i].tagName.toLowerCase());
            }
        }
    }


    function appendCSS( cssText, element ) {
	var styleElement = document.createElement("style");
	styleElement.setAttribute("type","text/css"); 
	styleElement.innerHTML = cssText;
	var refNode = element.hasChildNodes() ? element.children[0] : null;
	element.insertBefore( styleElement, refNode );
    }
}


function svgString2Image( svgString, width, height, format, name, callback ) {
    var format = format ? format : 'png';

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    var image = new Image();
    image.onload = function() {
	context.clearRect ( 0, 0, width, height );
	context.drawImage(image, 0, 0, width, height);

	canvas.toBlob( function(blob) {
	    var filesize = Math.round( blob.length/1024 ) + ' KB';
	    if ( callback ) callback( blob, filesize, name );
	});

	
    };

    image.src = imgsrc;
}

function saveD3ToPNG( dataBlob, filesize, filename ){
    saveAs( dataBlob, filename ); // FileSaver.js function
}

function exportD3ToPNG(svgTag, filename) {
    var svgString = getSVGString(svgTag);
    svgString2Image( svgString, 2*svgTag.width.baseVal.value, 2*svgTag.height.baseVal.value, 'png', filename+'.png', saveD3ToPNG ); // passes Blob and filesize String to the callback
}
