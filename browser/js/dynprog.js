function distanceLevenshtein (sequence, pattern){

	if(sequence.length == 0) return sequence.length; 
	if(pattern.length == 0) return pattern.length; 

	var mat = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= sequence.length; i++){
  	mat[i] = [0];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= pattern.length; j++){
  	mat[0][j] = j;
  }

  var bool;
  for (i=1; i<sequence; i++){
  	for (j=1; j<pattern; j++){
  		if (pattern.charAt(i-1) == sequence.charAt(j-1))
  			bool = 0;
  		else
  			bool = 1
  		 mat[i][j] = Math.min(mat[i-1][j-1] + bool, // substitution
                                Math.min(mat[i][j-1] + 1, // insertion
                                	mat[i-1][j] + 1));
  		}
  	}

  	var min = sequence.length;
  	for (i=0; i<sequence.length; i++){
  		if (mat[i][pattern.length]<min)
  			min = mat[i][pattern.length];
  	}


  	return min;
}