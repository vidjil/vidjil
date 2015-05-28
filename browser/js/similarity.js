
function Matrix (model) {
    this.m = model;
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
    
    /**
     * multiply 2 matrix
     * @param {number[][]} matrix1 
     * @param {number[][]} matrix2
     * @return {number[][]}
     * */
    multiply : function (matrix1, matrix2){
        var result=[]
        for (var x in matrix1){
            result[x]=[]
            for (var y in matrix2[0]){
                var sum = 0;
                
                for (var i in matrix1[x]){
                    for (var j in matrix2){
                        sum += (matrix1[x][i] * matrix2[j][y])
                    }
                }
                result[x][y]=sum;
            }
        }
        return result
    },
    
    /**
     * compute the mean of each matrix row
     * @param {number[][]} matrix
     * @return {number[]} 
     * */
    mean_vector : function(matrix) {
        var mean = []
        for (var i in matrix) { 
            var sum = 0;
            for (var j in m.similarity.matrix[i]) sum += m.similarity.matrix[i][j]
            mean[i] = sum/m.similarity.matrix[i].length;
        }
        return mean;
    },
    
    /**
     * translate matrix position to be centered on origin
     * @param {number[][]} matrix
     * @return {number[][]}
     * */
    center : function(matrix) {
        var mean = this.mean_vector(matrix);
        
        var deltaMatrix = [];
        for (var i in matrix) { 
            deltaMatrix[i] = []
            for (var j in matrix[i]) deltaMatrix[i][j] =  matrix[i][j] - mean[j]
        }
        return deltaMatrix
    },
    
    /**
     * build the transposed matrix
     * @param {number[][]} matrix
     * @return {number[][]}
     * */
    transpose : function(matrix) {
        var matrixT = []
        
        for (var i in matrix[0]) { 
            matrixT[i] = []
            for (var j in matrix) matrixT[i][j]=0;
        }
        
        for (var i in matrix) { 
            for (var j in matrix[0]) matrixT[i][j] = matrix[j][i]
        }
        
        return matrixT
    },
    
    
    /**
     * build covariance matrix
     * @param {number[][]} matrix
     * @return {number[][]}
     * */
    covariance : function (matrix) {
        var deltaMatrix = this.center(matrix);
        var deltaMatrixT =this.transpose(deltaMatrix);
        
        return this.multiply(deltaMatrix, deltaMatrixT)
    },
    
    /**
     * 
     * */
    diag : function (matrix){
        for (var i in matrix) { 
            for (var j in matrix[i]) if (i != j)  matrixT[i][j]=0;
        }
    },
    
    /**
     * perform principal component analysis
     * @param {number[][]} matrix
     * @return {number[][]}
     * */
    pca : function (matrix) {
        var startTime = new Date().getTime();
        var elapsedTime = 0;

        var cov = this.covariance(matrix)
        
        elapsedTime = new Date().getTime() - startTime;
        console.log("cov(): " + elapsedTime + "ms");
        
        var eigen = numeric.eig(cov)
        
        elapsedTime = new Date().getTime() - startTime;
        console.log("eig(): " + elapsedTime + "ms");
        
        //reduce to 2 dimension
        var dim2 = []
        for (var i in matrix){
            dim2[i] = [];
            dim2[i][0] = eigen.E.x[0][i]
            dim2[i][1] = eigen.E.x[1][i]
        }
        
        var result = this.multiply(matrix, dim2)
        
        for (var i in result){
            m.clone(i).pca = result[i]
        }
        
        return result;
    },
    
    pca2 : function (matrix) {
        var transpose = numeric.transpose(matrix)
        var s = numeric.div(this.multiply(transpose, matrix), matrix.length);
        var eigen = numeric.svd(s);
        
        //reduce to 2 dimension
        var dim2 = []
        for (var i in matrix){
            dim2[i] = [];
            dim2[i][0] = eigen.U[i][0]
            dim2[i][1] = eigen.U[i][1]
        }
        
        var result = this.multiply(matrix, dim2)
        
        for (var i in result){
            m.clone(i).pca = result[i]
        }
        
        return result;
    },
    
    pca3: function (X,npc){
        var USV = numeric.svd(X);
        var U = USV.U;
        var V = USV.V;
        
        var S = []
        for (var i in USV.S){
            S[i] = [];
            for (var j in USV.S) S[i][j]=0
        }
        
        for (var i in USV.S) S[i][i]=USV.S[i]
            
        var pcUdS = this.multiply(U,S);
        
        for (var i in result){
            m.clone(i).pca = pcUdS[i]
        }
        
        return pcUdS;
    },
    
    tsne: function(e,p,pow) {
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




