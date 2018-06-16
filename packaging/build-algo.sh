#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files="../src ../demo ../doc ../germline ../Makefile ../tools"
dest_files="vidjil"
exec_dir="$dest_files"

copy_files -s="$source_files" -d="$dest_files"

cd "$MY_PWD/$dest_files/germline"
make

cd "$MY_PWD/$exec_dir"
bash "$MY_PWD/mkdeb"

cd "$MY_PWD"

remove_files -s="$source_files" -d="$dest_files"
exit 0
