#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files=../germline
dest_files=germline
exec_dir="$dest_files"

copy_files -s="$source_files" -d="$dest_files" --debug

cd "$MY_PWD/$exec_dir"
create_version_file "$MY_PWD/$dest_files/germline"
bash "$MY_PWD/mkdeb"
cd "$MY_PWD"

remove_files -s="$source_files" -d="$dest_files" --debug
exit 0
