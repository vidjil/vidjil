#!/bin/sh

git log -1 --pretty=format:'#define GIT_VERSION "%h (%cd)"' --date=short --abbrev-commit > git-version.h 2> /dev/null 

