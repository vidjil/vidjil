#!/usr/bin/env bash

# This script also parse a file .should_get
# In the .should_get format, every line starting with a # is a comment
# every line starting with a $ is a description of the test
# non empty lines, must be of the following form:
# <info>:<regexp>
# where <regexp> is a regular expression passed to grep 
# (beware to escape backslashes).
# info is the number of times this regular expression should occur in the file.
# the info can be prefixed by a letter either s or f:
# s: if the test fails, we skip it
# f: even if the test fails, the script will not exit with an error code.

DATA_DIR=$(dirname $0)

FILES=($DATA_DIR/result.sam)    # For each such file, a file with the same
                                # name, suffixed by .should_get must exist
COMMENT=("Testing SNPs")

{
nb_tests=0
# Count number of tests to be performed
for file in ${FILES[*]}; do
    nb_tests=$((nb_tests+`grep -Pc '^[^$#]' $file.should_get`))
done

echo "1.."$nb_tests
test_nb=1
for (( i = 0; $i < ${#FILES[*]}; i++ )); do
    error=0
    file=${FILES[$i]}
    not_ok=$?
    line_nb=1
    failed_lines=()
    while read line; do
        if [ ! -z "$line" ]; then
            if [ ${line:0:1} == '$' ]; then
                msg=${line:1}
            else
                # This is not a comment
                if [ ${line:0:1} != '#' ]; then
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
                    if [ $(grep -cE "$pattern" $file) -eq $nb_hits -o $skip -eq 1 ]; then
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
    done < ${file}.should_get
done
} > $0.tap


exit $error