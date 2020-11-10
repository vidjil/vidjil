#!/bin/bash


LOCUS=TRG

while getopts ":i:o:l:" arg; do
  case $arg in
    i) INPUT=$OPTARG;;
    o) OUTPUT=$OPTARG;;
    l) LOCUS=$OPTARG;;
  esac
done

# echo  "s/IGH/$LOCUS/g < $INPUT > $OUTPUT"
sed "s/IGH/$LOCUS/g" < "$INPUT" > "$OUTPUT"
exit 0;