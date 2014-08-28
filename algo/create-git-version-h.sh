#!/bin/sh

git log -1 --pretty=format:'#define GIT_VERSION "%h (%ci)"' --abbrev-commit > git-version.h 2> /dev/null 

