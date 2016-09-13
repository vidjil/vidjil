#!/bin/bash

copy_files() {
    DEBUG=false
    for var in "$@"
    do
        case $var in
            -s=*|--source=*)
                SRC="${var#*=}"
                ;;
            -d=*|--destination=*)
                DEST="$(pwd)/${var#*=}"
                ;;
            --debug)
                DEBUG=true
                ;;
            *)
                echo "unknown arg: $var"
                ;;
        esac
    done

    for src in $SRC
    do
        cp -R "$src" "$DEST"
        if [ "$DEBUG" = true ] ; then
            echo "copy $(pwd)/$src into $DEST"
        fi
    done
}

remove_files() {
    DEBUG=false
    for var in "$@"
    do
        case $var in
            -s=*|--source=*)
                SRC="${var#*=}"
                ;;
            -d=*|--destination=*)
                DEST="$(pwd)/${var#*=}"
                ;;
            --debug)
                DEBUG=true
                ;;
            *)
                echo "unknown arg: $var"
                ;;
        esac
    done

    for src in $SRC
    do
        rm -rf "$DEST/${src#*/}"
        if [ "$DEBUG" = true ] ; then
            echo "remove $DEST/${src#*/}"
        fi
    done
}

create_version_file() {
    changelog="`dpkg-parsechangelog`"
    name="`echo "$changelog" | grep '^Source: ' | cut -b9-`"
    fullversion="`echo "$changelog" | grep '^Version: ' | cut -b10-`"
    version="${fullversion%-*}"

    echo "$version" > "$1/VERSION"
}
