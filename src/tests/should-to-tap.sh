#!/bin/bash

if [ $# -eq 0 -o "$1" == "-h" -o "$1" == "--help" ]; then
    echo "Usage: $0 <file.should_get>

This script takes as input a .should_get file. Don't know what it is? Read this!
In the .should_get format, every line starting with a # is a comment
every line starting with a $ is a description of the test
non empty lines, must be of the following form:
<info>:<regexp>
where <regexp> is a regular expression passed to grep 
(beware to escape backslashes).
info is the number of times this regular expression should occur in the file.
the info can be prefixed by a letter either s or f:
s: if the test fails, we skip it
f: even if the test fails, the script will not exit with an error code.

The script must contain a !LAUNCH: line stating what command line to be
launched (the working directory is the directory where the input file is).  A
line starting with !LOG: is the filename used for redirecting STDOUT from the
command line. By default it is the input filename where the extension is
replaced by .log. If !OUTPUT_FILE: is provided then the program is assumed to
produce a file whose filename is given after !OUTPUT_FILE:. This file will be
parsed by the script. The !LOG: file won't be used. By default, output files
are produced in the working directory, to change this behavior, specify an
option after the option !OUTPUT_DIR:

The output is in TAP format and consists of a file whose name is the same
as the input file, where .should_get is replaced by .tap
" >&2
    exit 1
fi

file=$1
DIR=$(dirname $file)
BASE=$(basename $file)
cd "$DIR"

OUTPUT_DIR=.
TAP_FILE=${BASE%.*}.tap
LOG_FILE=${BASE%.*}.log
OUTPUT_FILE=
FILE_TO_GREP=

TMP_TAP_FILE=$(mktemp tap.XXXX)

{
nb_tests=0
# Count number of tests to be performed
nb_tests=`grep -c '^[^$#!]' $BASE`

echo "1.."$nb_tests
test_nb=1
error=0
not_ok=$?
line_nb=1
failed_lines=()
launched=0                      # Did we launch the program yet?
cmd=
while read line; do
    if [ ! -z "$line" ]; then
        if  [ ${line:0:1} == "!" ]; then
            line=${line:1}
            type=${line%%:*}
            if [ "$type" == "LAUNCH" ]; then
                eval cmd=\"${line#*:}\"
            elif [ "$type" == "LOG" ]; then
                eval LOG_FILE=\"${line#*:}\"
            elif [ "$type" == "OUTPUT_FILE" ]; then
                eval OUTPUT_FILE=\"${line#*:}\"
            elif [ "$type" == "OUTPUT_DIR" ]; then
                eval OUTPUT_DIR=\"${line#*:}\"
            fi
        elif [ ${line:0:1} == '$' ]; then
            msg=${line:1}
        else
                # This is not a comment
            if [ ${line:0:1} != '#' ]; then
                if [ $launched -eq 0 ]; then
                    if [ -z "$cmd" ]; then
                        echo "Error: you must specify a !LAUNCH: line in $file" >&2
                        exit 2
                    fi
                    echo "Launching $cmd" >&2
                    if [ -z "$OUTPUT_FILE" ]; then
                        eval $cmd > $LOG_FILE
                        FILE_TO_GREP=$LOG_FILE
                    else
                        eval $cmd > /dev/null
                        FILE_TO_GREP=$OUTPUT_FILE
                    fi
                    launched=1

                    TAP_FILE=$OUTPUT_DIR/$TAP_FILE
                    LOG_FILE=$OUTPUT_DIR/$LOG_FILE
                    echo "==>" $TAP_FILE >&2
                fi

                skip=0
                know_to_fail=0

                pattern=$(cut -d: -f2- <<< $line)
                nb_hits=$(cut -d: -f1 <<< $line)

                if [ ${nb_hits:0:1} == "s" ]; then
                    skip=1  # We skip the test if it fails
                    nb_hits=${nb_hits:1}
                elif [ ${nb_hits:0:1} == "f" ]; then
                    know_to_fail=1 # We know the test fails, but don't fail globally
                    nb_hits=${nb_hits:1}
                fi
                if [ ! -z "$DEBUG" ]; then
                    echo "Grepping \"$pattern\" in $FILE_TO_GREP" >&2
                fi
                if [ $(grep -cE "$pattern" $FILE_TO_GREP) -eq $nb_hits -o $skip -eq 1 ]; then
                    if [ $know_to_fail -eq 1 ]; then
                        echo "Warning: test $test_nb should have failed, but has not!" >&2
                    fi
                    echo -n "ok"
                else
                    echo -n "not ok"
                    if [ $know_to_fail -eq 0 ]; then
                        error=1
                    fi
                fi
                echo -n " "$test_nb" "
                if [ $skip -eq 1 ]; then
                    echo -n "# SKIP "
                fi
                echo "- " $msg
                test_nb=$((test_nb+1))
            fi
        fi
    fi
    line_nb=$((line_nb+1))
done < $BASE
} > $TMP_TAP_FILE

mv $TMP_TAP_FILE $TAP_FILE
echo >&2
exit $error
