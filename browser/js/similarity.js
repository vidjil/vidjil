
function Matrix (model) {
    this.m = model;
    this.system = {}
}

Matrix.prototype = {
    
    get_similarity: function () {
        var self = this
        var request = "";

        for (var i = 0; i < this.m.clones.length-1; i++) {
            request += ">" + i + "\n" + this.m.clone(i).id + "\n";
        }

        $.ajax({
            type: "POST",
            timeout: 120000,
            data: request,
            url: segment.cgi_address + "similarity.cgi",
            beforeSend: function () {
                self.m.wait();
            },
            complete: function () {
                self.m.resume();
            },
            success: function (result) {
                console.log(result)
                self.matrix = JSON.parse(result)
            },
            error: function () {
                console.log({"type": "flash", "msg": "cgi error : impossible to connect", "priority": 2});
            }
        })
    },
    
    
    compute_tsne: function(e,p,po) {
        var opt = {
            epsilon: e,
            perplexity: p
        }; 
        var tsne = new tsnejs.tSNE(opt); 

        var dists = []
        for (var i in this.matrix[0]) dists[i] = []
            
        for (var i in this.matrix) {
            for (var j in this.matrix) {
                dists[i][j]= Math.pow( (100-this.matrix[i][j]) ,po)
            }
        }
            
        tsne.initDataDist(dists);

        for(var k = 0; k < 2000; k++) {
            tsne.step(); 
        }

        var result = tsne.getSolution(); 
        
        for (var i in result){
            m.clone(i).tsne = result[i]
        }
        
        return dists
    },
    
    compute_locus_tsne: function(e,p,po) {
        
        for (var l in this.m.system_available){
            var locus = this.m.system_available[l]
            var opt = {
                epsilon: e,
                perplexity: p
            }; 
            var tsne = new tsnejs.tSNE(opt); 

            var list = []
            for (var i=0; i<this.m.clones.length; i++) if (this.m.clone(i).get("germline") == locus) list.push(i)
            
            var dists = []
            for (var i in list) dists[i] = []
                
            for (var i in list) {
                for (var j in list) {
                    dists[i][j]= Math.pow( (100-this.matrix[list[i]][list[j]]) ,po)
                }
            }
                
            tsne.initDataRaw(dists);

            for(var k = 0; k < 2000; k++) {
                tsne.step(); 
            }

            var result = tsne.getSolution(); 
            
            //compute min/max range
            var xMax=0;
            var xMin=0;
            var yMax=0;
            var yMin=0;
            
            for (var i in result){
                if (result[i][0] > xMax) xMax=result[i][0];
                if (result[i][0] < xMin) xMin=result[i][0];
                if (result[i][1] > yMax) yMax=result[i][1];
                if (result[i][1] < yMin) yMin=result[i][1];
            }
            
            var deltaX = xMax-xMin;
            var deltaY = yMax-yMin;
            
            //replace origin on 0/0
            for (var i in result){
                result[i][0] = result[i][0] - xMin;
                result[i][1] = result[i][1] - yMin;
            }
            
            //rotate result 
            if (deltaY > deltaX) {
                for (var i in result){
                    var tmp = result[i][0];
                    result[i][0] = result[i][1];
                    result[i][1] = tmp;
                }
                var tmp = deltaX;
                deltaX = deltaY;
                deltaY = tmp;
            }
            
            //rescale
            for (var i in result){
                result[i][0] = result[i][0]/deltaX
                result[i][1] = result[i][1]/deltaX
            }
            
            this.system[locus]={}
            this.system[locus].yMax = deltaY/deltaX;
            
            for (var i in result){
                m.clone(list[i]).tsne_system = result[i]
            }
            
        }
        
    }

}




