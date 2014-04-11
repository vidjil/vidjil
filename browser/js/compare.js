/* Fonction permettant de créer une fonction de comparaison, selon le schéma donné par celle ci-dessous
 * @param tab: Le tableau que l'on veut trier 
 * Ne renvoie rien - l'ancien tableau est écrasé par le tri que l'on vient de faire
 */
function mySortedArray(tab) {
    tab.sort(function(a,b){return compare(a,b);});
    //tab.sort(function(a,b){return compareString(a,b);});
}

//Caractère permettant de comparer/séparer les différents allèles; par défaut '*'
var term = "*";

/* Fonction permettant de comparer directement 2 chaînes entre elles (lettres/nombres)
 * @param string1: Une première chaîne de caractères
 * @param string2: Une deuxième chaîne de caractères
 * Renvoie -1 si la première chaîne doit être classée avant la deuxième
 * Renvoie 0 si les deux chaînes sont strictement équivalentes
 * Renvoie 1 si la deuxième chaîne doit être classée avant la première
 */
function compare(string1, string2) {
    //Variable permettant l'incrémentation dans le TantQue
    var i = 0;
    //Vérification de la présence de l'étoile (pour la comparaison d'allèles)
    var boolTerm = false;
    //On réduit tout en minuscule, afin de faciliter la comparaison caractère par caractère...
    var string1_lower = string1.toLowerCase();
    var string2_lower = string2.toLowerCase();
    //On sauvegarde le premier caractère de la phrase en minuscule
    var charS1 = string1_lower.charAt(0);
    var charS2 = string2_lower.charAt(0);
    if (charS1 == term) {
	charS1 = string1_lower.charAt(1);
	boolTerm = true;
    }
    if (charS2 == term) {
	charS2 = string2_lower.charAt(1);
	boolTerm = true;
    }
    if (boolTerm == true) i = 1;
    //On va trier les noms qui, pour l'instant, ne contiennent aucun nombre
    var value_compare_ascii = 0;
    while (value_compare_ascii == 0 && isNaN(charS1) && isNaN(charS2) && i<string1.length && i<string2.length) {
	value_compare_ascii = compare_ascii(charS1, charS2);
	i++;
	charS1 = string1_lower.charAt(i);
	charS2 = string2_lower.charAt(i);
    }
    if (value_compare_ascii != 0)
      return value_compare_ascii;
    //Si l'on arrive ici, c'est qu'il n'y avait rien à comparer sur les chaînes de caractères précédemment données
    //Vérification si l'un ou/et l'autre est/sont nul(s)
    var value_compare_length = compare_length(string1_lower, string2_lower, i);
    if (value_compare_length == undefined)
	return compare_numbers(string1_lower.substring(i,string1.length), string2_lower.substring(i, string2.length));
    else return value_compare_length;
}

/* Fonction permettant la comparaison entre 2 caractères ascii
 * @param char1: Un premier caractère
 * @param char2: Un second caractère
 * Renvoie -1 si le 1er caractère se positionne avant le second dans la table ASCII
 * Renvoie 0 si les 2 caractères sont égaux (non-supérieur/inférieur à...)
 * Renvoie 1 si le 1er caractère se positionne après le second dans la table ASCII
 */
function compare_ascii(char1, char2) {
    var charInt1 = char1.charCodeAt(0);
    var charInt2 = char2.charCodeAt(0);
    //Vérification si le caractère est bien "normal" -> lettre
    if (((charInt1 > 64 && charInt1 < 91) || (charInt1 > 96 && charInt1 < 123)) && ((charInt2 > 64 && charInt2 < 91) || (charInt2 > 96 && charInt2 < 123))) {
	//Si le caractère ascii a un charCode inférieur au deuxième, on renvoie -1
	if (char1.charCodeAt(0) < char2.charCodeAt(0))
	    return -1;
	//Si le caractère ascii a un charCode supérieur au deuxième, on renvoie 1
	if (char1.charCodeAt(0) > char2.charCodeAt(0))
	    return 1;
	//Sinon, on renvoie 0 -> Cas d'égalité
	return 0;
    }
    //Si le caractère n'est pas "normal"
    else {
	if ((charInt1 <= 64 || charInt1 >= 91) && (charInt1 < 96 || charInt1 >= 123) && (charInt2 <= 64 || charInt2 >= 91) && (charInt2 < 96 || charInt2 >= 123))
	    return 0;
	//Vérification pour le 1er paramètre
	if ((charInt1 <= 64 || charInt1 >= 91) && (charInt1 < 96 ||  charInt1 >= 123))
	    return 1;
	//Si résultat négatif au-dessus, c'est le second paramètre qui ne vas pas - on choisira donc le 1er -> Renvoie de -1
	else
	    return -1;
    }
}

/* Fonction permettant la comparaison de deux chaînes en fonction de leurs tailles ainsi que d'un incrément (i), donné dans la fonction de comparaison générale (compare)
 * @param string1: Une première chaîne de caractères
 * @param string2: Une seconde chaîne de caractères
 * Renvoie -1 si la première chaîne est vide
 * Renvoie 0 si les deux chaînes sont vides
 * Renvoie 1 si la seconde chaîne est vide
 */
function compare_length(string1, string2, i) {
    //Si les deux chaînes sont équivalentes en longueur, on renvoie 0
    if (i == string1.length && string1.length == string2.length)
	return 0;
    //Si le i ne correspond seulement qu'à la longueur de la première chaîne, on renvoie -1
    if ((i == string1.length && string2.length != 0) || string1.length == 0)
	return -1;
    //Si le i ne correspond seulement qu'à la longueur de la deuxième chaîne, on renvoie 1
    if ((i == string2.length && string1.length != 0) || string2.length == 0)
	return 1;
}

/* Fonction permettant la comparaison de deux chaînes de caractères (sensés être une suite de chiffres)
 * @param nbr1: Un premier 'grand' nombre
 * @param nbr2: Un second 'grand' nombre
 * Renvoie -1 si, à un caractère donné, le nombre de la 1ère chaîne est inférieur à celui de la 2ème chaîne à la même place, et que la longueur de la première chaîne est inférieure ou égale à la deuxième OU si la deuxième n'est pas considérée comme un nombre
 * Renvoie 0 si les deux chaînes sont équivalentes OU si les deux chaînes ne sont pas considérées comme deux nombres
 * Renvoie 1 si, à un caractère donné, le nombre de la 2ème chaîne est supérieur à celui de la 2ème chaîne à la même place, et que la longueur de la seconde chaîne est inférieure ou égale à la deuxième OU si la première chaîne n'est pas considérée comme un nombre
 */
function compare_numbers(nbr1, nbr2) {
    //Si les deux paramètres sont des nombres ("123", "45")
    if (!isNaN(nbr1) && !isNaN(nbr2)) {
	var i;
	var nbr1Int;
	var nbr2Int;
	//Pour chaque nombre, on va vouloir les différencier le plus rapidement possible, par une lecture de chaque caractère numérique de gauche à droite
	for (i=0; i<Math.min(nbr1.length, nbr2.length); i++) {
	    //Transformation des caractères en entier
	    nbr1Int = parseInt(nbr1.charAt(i));
	    nbr2Int = parseInt(nbr2.charAt(i));
	    //Cas pour "3" et "33"
	    if ((nbr1Int == nbr2Int) && (nbr1.length < nbr2.length))
		return -1;
	    //Cas pour "1" et "2", ou "01" et "11"
	    if ((nbr1Int < nbr2Int) && (nbr1.length <= nbr2.length))
		return -1;
	    //Cas pour "2" et "10"
	    if ((nbr1Int > nbr2Int) && (nbr1.length < nbr2.length))
		return -1;
	    //Cas pour "2" et "1", ou "60" et "5"
	    if ((nbr1Int > nbr2Int) && (nbr1.length >= nbr2.length))
		return 1;
	    //Cas pour "33" et "3"
	    if ((nbr1Int == nbr2Int) && (nbr1.length > nbr2.length))
		return 1;
	    //Cas pour "10" et "2" 
	    if ((nbr1Int < nbr2Int) && (nbr1.length >= nbr2.length))
		return 1;
	}
	//Cas d'égalité
	if (nbr1.length == nbr2.length)
	    return 0;
    }
    //Si les deux ne sont pas des nombres ("123", "456A" ; "123A", "456" ; "123A", "456B")
    else {
	var i = 0;
	var boolnbr1 = false;
	var subnbr1 = nbr1;
	var j = 0;
	var boolnbr2 = false;
	var subnbr2 = nbr2;
	if (isNaN(nbr1[0]) && !isNaN(nbr2[0]) && nbr1.length >= nbr2.length)
	    return 1;
	if (!isNaN(nbr1[0]) && isNaN(nbr2[0]) && nbr1.length <= nbr2.length) 
	    return -1;
	//Si nbr1 n'est pas un nombre, alors on avance dans la chaîne jusqu'à temps que nous rattrapons un caaractère QUI N'EST PAS un nombre
	if (isNaN(nbr1)) {
	    while (i < nbr1.length && !boolnbr1) {
		if (isNaN(nbr1.charAt(i))) boolnbr1 = true;
		i++;
	    }
	    //Substring pour nbr1
	    subnbr1 = nbr1.substring(0, i-1);
	}
	//Même chose pour nbr2
	if (isNaN(nbr2)) {
	    while (j < nbr2.length && !boolnbr2) {
		if (isNaN(nbr2.charAt(j))) boolnbr2 = true;
		j++;
	    }
	    subnbr2 = nbr2.substring(0, j-1);
	}
	//Si les chaînes ne sont pas vides, alors on va comparer ces deux sous-nombres entre eux
	if (subnbr1.length != 0 && subnbr2.length != 0) {
	    var result = compare_numbers(subnbr1, subnbr2);
	    //S'il y a cas d'égalité
	    if (result == 0)
		//On refait une comparaison afin de comparer les chaînes par ce qui suivait le nombre contenu dans la sous-chaîne comparée de chacune
		return compare(nbr1.substring(i-1, nbr1.length), nbr2.substring(i-1, nbr2.length));
	    //Sinon, on retourne directement result, qui vaut -1 ou 1 selon le retour de la fonction compare_numbers sur les sous-chaînes
	    else
		return result;
	}
    }
}


//transforme une chaine de caractere en tableau
// hi80-540  >>>> ["h", "i", 80, "-", 540]
function parseString(str){
    var result = []
    
    var j = 0
    for (var i=0; i<str.length; i++){
        if ( isFinite(parseInt(str[i])) ) {     //le char est un chiffre
            var c=0
            while( str[i] && isFinite(parseInt(str[i])) ){
                c=c*10 + parseInt(str[i])
                i++
            }
            i--
            result[j]=c
        }else{                                  //le char est une lettre
            result[j]=str[i]
        }
        j++
    }
    return result
}

function compareString(str1, str2) {
    str1 = parseString(str1)
    str2 = parseString(str2)
    
    var minLength = str1.length
    if (str2.length < str1.length) minLength = str2.length
    
    for (var i=0; i<minLength; i++) {
        var type1 = typeof(str1[i])
        var type2 = typeof(str2[i])
        
        var result=0
        
        if (type1=="number" && type2=="number") result = str1[i]-str2[i]
        if (type1=="string" && type2=="string") result = str1[i].charCodeAt(0)-str2[i].charCodeAt(0);
        if (type1=="string" && type2=="number") return 1
        if (type1=="number" && type2=="string") return -1
        
        if (result !=0) return result
    }
    return 0
}
