/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
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

  
  /*ressort une couleur format RGB*/
  function colorGenerator(h,s,v){
    s = typeof s !== 'undefined' ? s : 0.8
    v = typeof v !== 'undefined' ? v : 0.72
    h=h/60;
    var i=Math.floor(h);
    var f=h-i;
    var p =Math.floor(( v * ( 1 - s ) )*255);
    var q =Math.floor(( v * ( 1 - ( s * f) ) )*255);
    var t =Math.floor(( v * ( 1 - ( s * (1-f) ) ) )*255);
    v=Math.floor(v*255);
    
    if (i==0){
      return "rgb("+v+","+t+","+p+")";
    }
    if (i==1){
      return "rgb("+q+","+v+","+p+")";
    }
    if (i==2){
      return "rgb("+p+","+v+","+t+")";
    }
    if (i==3){
      return "rgb("+p+","+q+","+v+")";
    }
    if (i==4){
      return "rgb("+t+","+p+","+v+")";
    }
    if (i==5){
      return "rgb("+v+","+p+","+q+")";
    }
  }

  

