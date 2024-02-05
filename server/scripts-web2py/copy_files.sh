#!/bin/bash

while IFS=, read col1
do
    if [[ $col1 != "N" ]]
    then
        cp $1/$col1 $2
    fi
done < $3
