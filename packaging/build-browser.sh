#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files="../browser ../data"
dest_files="browser/vidjil-browser"
exec_dir="browser"

copy_files -s="$source_files" -d="$dest_files"

cd "$MY_PWD/$dest_files/germline"
make

cd "$MY_PWD/$dest_files/data"
make

cd "$MY_PWD/$exec_dir"
bash "$MY_PWD/mkdeb"

cd "$MY_PWD"

remove_files -s="$source_files" -d="$dest_files"
exit 0
