#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files="../browser ../data ../doc ../README.org ../reports ../server ../tools"
dest_files="server/vidjil-server"
exec_dir="server"

copy_files -s="$source_files" -d="$dest_files"

cd "$MY_PWD/$dest_files/germline"
make
cd "$MY_PWD/$dest_files/data"

cd "$MY_PWD/$exec_dir"
bash "$MY_PWD/mkdeb"

remove_files -s="$source_files" -d="$dest_files"
exit 0
