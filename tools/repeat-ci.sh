#!/bin/bash

if [ $# -lt 3 ]; then
    echo "Usage: $0 <gitlab-ci> <repeats> <main-gitlab-ci> [ <template_names>+ -- <other_gitlab_ci> ]

Take the <gitlab-ci> and repeats its content several times.
If the [ <template_names>+ -- <other_gitlab_ci> ] are provided we get the template jobs, whose names start as in <template_names>, from the <other_gitlab_ci> files and  and copy them in the resulting YML." >&2
    exit 1
fi


CI_FILE="$1"
REPEATS=$2
MAIN="$3"
shift 3

TEMPLATES=$(sed -rn '/^\./,/^$/p' $CI_FILE)
STAGES=$(sed -rn '/^stages:/,/^$/p' $MAIN)
BEFORE_SCRIPT_GLOBAL=$(sed -rn '/^.before_script_global:/,/^$/p' $MAIN)
BEFORE_SCRIPT_DOCKER=$(sed -rn '/^.before_script_global_docker:/,/^$/p' $MAIN)
BEFORE_SCRIPT=$(sed -rn '/^before_script:/,/^$/p' $MAIN)

template_names=()
if [ $# -gt 0 ]; then
    while [ "$1" != "--" ]; do
        template_names+=( "$1" )
        shift
    done
    shift
    for template in ${template_names[@]}; do
        TEMPLATES="$TEMPLATES"$'\n'$(sed -n '/^'$template'/,/^$/p' $*)
    done
fi


NEW_CI=$(mktemp)

sed -r '/^\./,/^$/d' $CI_FILE > $NEW_CI

TEMP=$(mktemp)
for i in `seq 1 $REPEATS`; do
    cp $NEW_CI $NEW_CI.$i

    # Rewrite the job name by appending the job number
    sed -ri 's/^([a-zA-Z].*):\s*$/\1_'$(printf "%03d" $i)':/' $NEW_CI.$i
done
rm -f $NEW_CI

echo "$BEFORE_SCRIPT_GLOBAL"
echo -e "# ======\n"
echo "$BEFORE_SCRIPT_DOCKER"
echo -e "# ======\n"
echo "$BEFORE_SCRIPT" 
echo -e "# ======\n"
echo "$STAGES"
echo -e "# ======\n"
echo "$TEMPLATES"
echo -e "# ======\n"
cat $NEW_CI.*
rm -f $NEW_CI.*



