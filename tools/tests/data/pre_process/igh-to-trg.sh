#!/bin/bash

INPUT=$1
OUTPUT=$2

sed 's/IGH/TRG/g' < "$INPUT" > "$OUTPUT"

