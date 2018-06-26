#!/bin/sh
# Create a file with the current sha1

# sh create-git-sha1.sh ../algo/git-version.h     "#define GIT_VERSION"
# sh create-git-sha1.sh ../browser/js/git-sha1.js "git_sha1 ="

GITV_H=$1
GITV_H_TMP=${GITV_H}.tmp
PRETTY_PREFIX=$2

git log -1 --pretty=format:"${PRETTY_PREFIX} \"%h (%cd)\"" --date=short --abbrev-commit > ${GITV_H_TMP} 2> /dev/null

# Replace the file only when the new file is different
diff ${GITV_H} ${GITV_H_TMP} 2> /dev/null || mv ${GITV_H_TMP} ${GITV_H}
