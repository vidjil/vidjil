#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files=../germline
dest_files=germline
exec_dir="$dest_files"

copy_files -s="$source_files" -d="$dest_files" --debug

cd "$MY_PWD/$exec_dir"
bash "$MY_PWD/mkdeb"
cd "$MY_PWD"

remove_files -s="$source_files" -d="$dest_files" --debug
exit 0
