#!/bin/sh

GITV_H=git-version.h
GITV_H_TMP=git-version.h.tmp

git log -1 --pretty=format:'#define GIT_VERSION "%h (%cd)"' --date=short --abbrev-commit > ${GITV_H_TMP} 2> /dev/null

# Replace the file only when the new file is different
diff ${GITV_H} ${GITV_H_TMP} || mv ${GITV_H_TMP} ${GITV_H}

