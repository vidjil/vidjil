#ifndef MKDIR_H
#define MKDIR_H

#include <sys/stat.h>

/**
 * Create a whole directory path (if it does not exist)
 * @return status, which is -1 in case of error.
 */
int mkpath(const char *path, mode_t mode);

#endif
