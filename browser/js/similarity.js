
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
                dists[i][j]= Math.pow( (100-this.matrix[i][j]) ,pow)
            }
        }
            
        tsne.initDataDist(dists);

        for(var k = 0; k < 2000; k++) {
            tsne.step(); 
        }

        var result = tsne.getSolution(); 
        
        for (var i in result){
            m.clone(i).pca = result[i]
        }
        
        return dists
    },
    
    /**
     * 
     * */
    mds : function (matrix) {
        var startTime = new Date().getTime();
        var elapsedTime = 0;
        
        var pca = this.pca(matrix)
        
        elapsedTime = new Date().getTime() - startTime;
        console.log("pca(): " + elapsedTime + "ms");
        
        var minX=0;
        var maxX=0;
        var minY=0;
        var maxY=0;
        
        for (var i in pca) {
            if (pca[i][0] > maxX) maxX = pca[i][0]
            if (pca[i][0] < minX) minX = pca[i][0]
            if (pca[i][1] > maxY) maxY = pca[i][1]
            if (pca[i][1] < minY) minY = pca[i][1]
        }
        
        var deltaX = maxX-minX;
        var deltaY = maxY-minY;
        
        for (var i in pca) {
            pca[i][0] = (pca[i][0]-minX)/deltaX
            pca[i][1] = (pca[i][1]-minY)/deltaY
        }
        
        return pca
    }
}




