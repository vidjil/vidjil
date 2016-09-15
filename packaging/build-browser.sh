#!/bin/bash

. ./build-generic.sh

MY_PWD="$PWD"

source_files="../browser ../data"
dest_files="browser/vidjil-browser"
exec_dir="browser"

copy_files -s="$source_files" -d="$dest_files"

cd "$MY_PWD/$exec_dir"
create_version_file "$MY_PWD/$dest-files/browser/"
bash "$MY_PWD/mkdeb"

cd "$MY_PWD"

remove_files -s="$source_files" -d="$dest_files"
exit 0
