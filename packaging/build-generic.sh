#!/bin/bash

copy_files() {
    MY_PWD="$PWD"

    for var in "$@"
    do
        case $var in
            -s=*|--source=*)
                SRC="${var#*=}"
                ;;
            -d=*|--destination=*)
                DEST="$(pwd)/${var#*=}"
                ;;
            *)
                echo "unknown arg: $var"
                ;;
        esac
    done

    for src in $SRC
    do
        cp -R "$src" "$DEST"
        #echo "copy $(pwd)/$src into $DEST"
    done
}

remove_files() {
    for var in "$@"
    do
        case $var in
            -s=*|--source=*)
                SRC="${var#*=}"
                ;;
            -d=*|--destination=*)
                DEST="$(pwd)/${var#*=}"
                ;;
            *)
                echo "unknown arg: $var"
                ;;
        esac
    done

    for src in $SRC
    do
        rm -rf "$DEST/${src#*/}"
        #echo "remove $DEST/${src#*/}"
    done
}
