/*  hfile.h -- buffered low-level input/output streams.

    Copyright (C) 2013-2015 Genome Research Ltd.

    Author: John Marshall <jm18@sanger.ac.uk>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.  */

#ifndef HTSLIB_HFILE_H
#define HTSLIB_HFILE_H

#include <string.h>

#include <sys/types.h>

#ifdef __clang__
#ifdef __has_attribute
#define HTS_COMPILER_HAS(attribute) __has_attribute(attribute)
#endif

#elif defined __GNUC__
#define HTS_GCC_AT_LEAST(major, minor) \
    (__GNUC__ > (major) || (__GNUC__ == (major) && __GNUC_MINOR__ >= (minor)))
#endif

#ifndef HTS_COMPILER_HAS
#define HTS_COMPILER_HAS(attribute) 0
#endif
#ifndef HTS_GCC_AT_LEAST
#define HTS_GCC_AT_LEAST(major, minor) 0
#endif

#if HTS_COMPILER_HAS(__noreturn__) || HTS_GCC_AT_LEAST(3,0)
#define HTS_NORETURN __attribute__ ((__noreturn__))
#else
#define HTS_NORETURN
#endif

// GCC introduced warn_unused_result in 3.4 but added -Wno-unused-result later
#if HTS_COMPILER_HAS(__warn_unused_result__) || HTS_GCC_AT_LEAST(4,5)
#define HTS_RESULT_USED __attribute__ ((__warn_unused_result__))
#else
#define HTS_RESULT_USED
#endif

#if HTS_COMPILER_HAS(__unused__) || HTS_GCC_AT_LEAST(3,0)
#define HTS_UNUSED __attribute__ ((__unused__))
#else
#define HTS_UNUSED
#endif

#if HTS_COMPILER_HAS(__deprecated__) || HTS_GCC_AT_LEAST(4,5)
#define HTS_DEPRECATED(message) __attribute__ ((__deprecated__ (message)))
#elif HTS_GCC_AT_LEAST(3,1)
#define HTS_DEPRECATED(message) __attribute__ ((__deprecated__))
#else
#define HTS_DEPRECATED(message)
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* These fields are declared here solely for the benefit of the inline functions
   below.  They may change in future releases.  User code should not use them
   directly; you should imagine that hFILE is an opaque incomplete type.  */
struct hFILE_backend;
typedef struct hFILE {
    char *buffer, *begin, *end, *limit;
    const struct hFILE_backend *backend;
    off_t offset;
    unsigned at_eof:1;
    int has_errno;
} hFILE;

/*!
  @abstract  Open the named file or URL as a stream
  @return    An hFILE pointer, or NULL (with errno set) if an error occurred.
*/
hFILE *hopen(const char *filename, const char *mode) HTS_RESULT_USED;

/*!
  @abstract  Associate a stream with an existing open file descriptor
  @return    An hFILE pointer, or NULL (with errno set) if an error occurred.
  @notes     For socket descriptors (on Windows), mode should contain 's'.
*/
hFILE *hdopen(int fd, const char *mode) HTS_RESULT_USED;

/*!
  @abstract  Report whether the file name or URL denotes remote storage
  @return    0 if local, 1 if remote.
  @notes     "Remote" means involving e.g. explicit network access, with the
    implication that callers may wish to cache such files' contents locally.
*/
int hisremote(const char *filename) HTS_RESULT_USED;

/*!
  @abstract  Flush (for output streams) and close the stream
  @return    0 if successful, or EOF (with errno set) if an error occurred.
*/
int hclose(hFILE *fp) HTS_RESULT_USED;

/*!
  @abstract  Close the stream, without flushing or propagating errors
  @notes     For use while cleaning up after an error only.  Preserves errno.
*/
void hclose_abruptly(hFILE *fp);

/*!
  @abstract  Return the stream's error indicator
  @return    Non-zero (in fact, an errno value) if an error has occurred.
  @notes     This would be called herror() and return true/false to parallel
    ferror(3), but a networking-related herror(3) function already exists.  */
static inline int herrno(hFILE *fp)
{
    return fp->has_errno;
}

/*!
  @abstract  Clear the stream's error indicator
*/
static inline void hclearerr(hFILE *fp)
{
    fp->has_errno = 0;
}

/*!
  @abstract  Reposition the read/write stream offset
  @return    The resulting offset within the stream (as per lseek(2)),
    or negative if an error occurred.
*/
off_t hseek(hFILE *fp, off_t offset, int whence) HTS_RESULT_USED;

/*!
  @abstract  Report the current stream offset
  @return    The offset within the stream, starting from zero.
*/
static inline off_t htell(hFILE *fp)
{
    return fp->offset + (fp->begin - fp->buffer);
}

/*!
  @abstract  Read one character from the stream
  @return    The character read, or EOF on end-of-file or error
*/
static inline int hgetc(hFILE *fp)
{
    extern int hgetc2(hFILE *);
    return (fp->end > fp->begin)? (unsigned char) *(fp->begin++) : hgetc2(fp);
}

/*!
  @abstract  Peek at characters to be read without removing them from buffers
  @param fp      The file stream
  @param buffer  The buffer to which the peeked bytes will be written
  @param nbytes  The number of bytes to peek at; limited by the size of the
    internal buffer, which could be as small as 4K.
  @return    The number of bytes peeked, which may be less than nbytes if EOF
    is encountered; or negative, if there was an I/O error.
  @notes  The characters peeked at remain in the stream's internal buffer,
    and will be returned by later hread() etc calls.
*/
ssize_t hpeek(hFILE *fp, void *buffer, size_t nbytes) HTS_RESULT_USED;

/*!
  @abstract  Read a block of characters from the file
  @return    The number of bytes read, or negative if an error occurred.
  @notes     The full nbytes requested will be returned, except as limited
    by EOF or I/O errors.
*/
static inline ssize_t HTS_RESULT_USED
hread(hFILE *fp, void *buffer, size_t nbytes)
{
    extern ssize_t hread2(hFILE *, void *, size_t, size_t);

    size_t n = fp->end - fp->begin;
    if (n > nbytes) n = nbytes;
    memcpy(buffer, fp->begin, n);
    fp->begin += n;
    return (n == nbytes)? (ssize_t) n : hread2(fp, buffer, nbytes, n);
}

/*!
  @abstract  Write a character to the stream
  @return    The character written, or EOF if an error occurred.
*/
static inline int hputc(int c, hFILE *fp)
{
    extern int hputc2(int, hFILE *);
    if (fp->begin < fp->limit) *(fp->begin++) = c;
    else c = hputc2(c, fp);
    return c;
}

/*!
  @abstract  Write a string to the stream
  @return    0 if successful, or EOF if an error occurred.
*/
static inline int hputs(const char *text, hFILE *fp)
{
    extern int hputs2(const char *, size_t, size_t, hFILE *);

    size_t nbytes = strlen(text), n = fp->limit - fp->begin;
    if (n > nbytes) n = nbytes;
    memcpy(fp->begin, text, n);
    fp->begin += n;
    return (n == nbytes)? 0 : hputs2(text, nbytes, n, fp);
}

/*!
  @abstract  Write a block of characters to the file
  @return    Either nbytes, or negative if an error occurred.
  @notes     In the absence of I/O errors, the full nbytes will be written.
*/
static inline ssize_t HTS_RESULT_USED
hwrite(hFILE *fp, const void *buffer, size_t nbytes)
{
    extern ssize_t hwrite2(hFILE *, const void *, size_t, size_t);

    size_t n = fp->limit - fp->begin;
    if (n > nbytes) n = nbytes;
    memcpy(fp->begin, buffer, n);
    fp->begin += n;
    return (n==nbytes)? (ssize_t) n : hwrite2(fp, buffer, nbytes, n);
}

/*!
  @abstract  For writing streams, flush buffered output to the underlying stream
  @return    0 if successful, or EOF if an error occurred.
*/
int hflush(hFILE *fp) HTS_RESULT_USED;

#ifdef __cplusplus
}
#endif

#ifdef __cplusplus
extern "C" {
#endif

struct hFILE_backend {
    /* As per read(2), returning the number of bytes read (possibly 0) or
       negative (and setting errno) on errors.  Front-end code will call this
       repeatedly if necessary to attempt to get the desired byte count.  */
    ssize_t (*read)(hFILE *fp, void *buffer, size_t nbytes) HTS_RESULT_USED;

    /* As per write(2), returning the number of bytes written or negative (and
       setting errno) on errors.  Front-end code will call this repeatedly if
       necessary until the desired block is written or an error occurs.  */
    ssize_t (*write)(hFILE *fp, const void *buffer, size_t nbytes)
        HTS_RESULT_USED;

    /* As per lseek(2), returning the resulting offset within the stream or
       negative (and setting errno) on errors.  */
    off_t (*seek)(hFILE *fp, off_t offset, int whence) HTS_RESULT_USED;

    /* Performs low-level flushing, if any, e.g., fsync(2); for writing streams
       only.  Returns 0 for success or negative (and sets errno) on errors. */
    int (*flush)(hFILE *fp) HTS_RESULT_USED;

    /* Closes the underlying stream (for output streams, the buffer will
       already have been flushed), returning 0 for success or negative (and
       setting errno) on errors, as per close(2).  */
    int (*close)(hFILE *fp) HTS_RESULT_USED;
};

/* These are called from the hopen() dispatcher, and should call hfile_init()
   to malloc a struct "derived" from hFILE and initialise it appropriately,
   including setting base.backend to their own backend vector.  */
hFILE *hopen_irods(const char *filename, const char *mode);
hFILE *hopen_net(const char *filename, const char *mode);

/* May be called by hopen_*() functions to decode a fopen()-style mode into
   open(2)-style flags.  */
int hfile_oflags(const char *mode);

/* Must be called by hopen_*() functions to allocate the hFILE struct and set
   up its base.  Capacity is a suggested buffer size (e.g., via fstat(2))
   or 0 for a default-sized buffer.  */
hFILE *hfile_init(size_t struct_size, const char *mode, size_t capacity);

/* May be called by hopen_*() functions to undo the effects of hfile_init()
   in the event opening the stream subsequently fails.  (This is safe to use
   even if fp is NULL.  This takes care to preserve errno.)  */
void hfile_destroy(hFILE *fp);

#ifdef __cplusplus
}
#endif

#endif
