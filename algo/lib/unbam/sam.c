/*  sam.c -- SAM and BAM file I/O and manipulation.

    Copyright (C) 2008-2010, 2012-2014 Genome Research Ltd.
    Copyright (C) 2010, 2012, 2013 Broad Institute.

    Author: Heng Li <lh3@sanger.ac.uk>

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

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <ctype.h>
#include <zlib.h>
#include "sam.h"
//#include "bgzf.h"
#include "hfile.h"



bam_hdr_t *bam_hdr_init()
{
    return (bam_hdr_t*)calloc(1, sizeof(bam_hdr_t));
}

void bam_hdr_destroy(bam_hdr_t *h)
{
    int32_t i;
    if (h == NULL) return;
    if (h->target_name) {
        for (i = 0; i < h->n_targets; ++i)
            free(h->target_name[i]);
        free(h->target_name);
        free(h->target_len);
    }
    free(h->text); free(h->cigar_tab);
    //if (h->sdict) kh_destroy(s2i, (sdict_t*)h->sdict);
    free(h);
}


bam_hdr_t *bam_hdr_read(BGZF *fp)
{
    bam_hdr_t *h;
    char buf[4];
    int magic_len, has_EOF;
    int32_t i, name_len, num_names = 0;
    size_t bufsize;
    ssize_t bytes;
    // check EOF
    has_EOF = bgzf_check_EOF(fp);
    if (has_EOF < 0) {
        perror("[W::bam_hdr_read] bgzf_check_EOF");
    } else if (has_EOF == 0)
        fprintf(stderr, "[W::%s] EOF marker is absent. The input is probably truncated.\n", __func__);
    // read "BAM1"
    magic_len = bgzf_read(fp, buf, 4);
    if (magic_len != 4 || strncmp(buf, "BAM\1", 4)) {
        return 0;
    }
    h = bam_hdr_init();
    if (!h) goto nomem;

    // read plain text and the number of reference sequences
    bytes = bgzf_read(fp, &h->l_text, 4);
    if (bytes != 4) goto read_err;
    if (fp->is_be) ed_swap_4p(&h->l_text);

    bufsize = ((size_t) h->l_text) + 1;
    if (bufsize < h->l_text) goto nomem; // so large that adding 1 overflowed
    h->text = (char*)malloc(bufsize);
    if (!h->text) goto nomem;
    h->text[h->l_text] = 0; // make sure it is NULL terminated
    bytes = bgzf_read(fp, h->text, h->l_text);
    if (bytes != h->l_text) goto read_err;

    bytes = bgzf_read(fp, &h->n_targets, 4);
    if (bytes != 4) goto read_err;
    if (fp->is_be) ed_swap_4p(&h->n_targets);

    if (h->n_targets < 0) goto invalid;

    // read reference sequence names and lengths
    h->target_name = (char**)calloc(h->n_targets, sizeof(char*));
    if (!h->target_name) goto nomem;
    h->target_len = (uint32_t*)calloc(h->n_targets, sizeof(uint32_t));
    if (!h->target_len) goto nomem;

    for (i = 0; i != h->n_targets; ++i) {
        bytes = bgzf_read(fp, &name_len, 4);
        if (bytes != 4) goto read_err;
        if (fp->is_be) ed_swap_4p(&name_len);
        if (name_len <= 0) goto invalid;

        h->target_name[i] = (char*)malloc(name_len);
        if (!h->target_name[i]) goto nomem;
        num_names++;

        bytes = bgzf_read(fp, h->target_name[i], name_len);
        if (bytes != name_len) goto read_err;

        if (h->target_name[i][name_len - 1] != '\0') {
            /* Fix missing NUL-termination.  Is this being too nice?
               We could alternatively bail out with an error. */
            char *new_name;
            if (name_len == INT32_MAX) goto invalid;
            new_name = realloc(h->target_name[i], name_len + 1);
            if (new_name == NULL) goto nomem;
            h->target_name[i] = new_name;
            h->target_name[i][name_len] = '\0';
        }

        bytes = bgzf_read(fp, &h->target_len[i], 4);
        if (bytes != 4) goto read_err;
        if (fp->is_be) ed_swap_4p(&h->target_len[i]);
    }
    return h;

 nomem:
    goto clean;

 read_err:
    goto clean;

 invalid:

 clean:
    if (h != NULL) {
        h->n_targets = num_names; // ensure we free only allocated target_names
        bam_hdr_destroy(h);
    }
    return NULL;
}

/*************************
 *** BAM alignment I/O ***
 *************************/

bam1_t *bam_init1()
{
    return (bam1_t*)calloc(1, sizeof(bam1_t));
}

void bam_destroy1(bam1_t *b)
{
    if (b == 0) return;
    free(b->data); free(b);
}

static inline int aux_type2size(uint8_t type)
{
    switch (type) {
    case 'A': case 'c': case 'C':
        return 1;
    case 's': case 'S':
        return 2;
    case 'i': case 'I': case 'f':
        return 4;
    case 'd':
        return 8;
    case 'Z': case 'H': case 'B':
        return type;
    default:
        return 0;
    }
}

static void swap_data(const bam1_core_t *c, int l_data, uint8_t *data, int is_host)
{
    uint8_t *s;
    uint32_t *cigar = (uint32_t*)(data + c->l_qname);
    uint32_t i, n;
    s = data + c->n_cigar*4 + c->l_qname + c->l_qseq + (c->l_qseq + 1)/2;
    for (i = 0; i < c->n_cigar; ++i) ed_swap_4p(&cigar[i]);
    while (s < data + l_data) {
        int size;
        s += 2; // skip key
        size = aux_type2size(*s); ++s; // skip type
        switch (size) {
        case 1: ++s; break;
        case 2: ed_swap_2p(s); s += 2; break;
        case 4: ed_swap_4p(s); s += 4; break;
        case 8: ed_swap_8p(s); s += 8; break;
        case 'Z':
        case 'H':
            while (*s) ++s;
            ++s;
            break;
        case 'B':
            size = aux_type2size(*s); ++s;
            if (is_host) memcpy(&n, s, 4), ed_swap_4p(s);
            else ed_swap_4p(s), memcpy(&n, s, 4);
            s += 4;
            switch (size) {
            case 1: s += n; break;
            case 2: for (i = 0; i < n; ++i, s += 2) ed_swap_2p(s); break;
            case 4: for (i = 0; i < n; ++i, s += 4) ed_swap_4p(s); break;
            case 8: for (i = 0; i < n; ++i, s += 8) ed_swap_8p(s); break;
            }
            break;
        }
    }
}

int bam_read1(BGZF *fp, bam1_t *b)
{
    bam1_core_t *c = &b->core;
    int32_t block_len, ret, i;
    uint32_t x[8];
    if ((ret = bgzf_read(fp, &block_len, 4)) != 4) {
        if (ret == 0) return -1; // normal end-of-file
        else return -2; // truncated
    }
    if (bgzf_read(fp, x, 32) != 32) return -3;
    if (fp->is_be) {
        ed_swap_4p(&block_len);
        for (i = 0; i < 8; ++i) ed_swap_4p(x + i);
    }
    c->tid = x[0]; c->pos = x[1];
    c->bin = x[2]>>16; c->qual = x[2]>>8&0xff; c->l_qname = x[2]&0xff;
    c->flag = x[3]>>16; c->n_cigar = x[3]&0xffff;
    c->l_qseq = x[4];
    c->mtid = x[5]; c->mpos = x[6]; c->isize = x[7];
    b->l_data = block_len - 32;
    if (b->l_data < 0 || c->l_qseq < 0) return -4;
    if ((char *)bam_get_aux(b) - (char *)b->data > b->l_data)
        return -4;
    if (b->m_data < b->l_data) {
        b->m_data = b->l_data;
        kroundup32(b->m_data);
        b->data = (uint8_t*)realloc(b->data, b->m_data);
        if (!b->data)
            return -4;
    }
    if (bgzf_read(fp, b->data, b->l_data) != b->l_data) return -4;
    //b->l_aux = b->l_data - c->n_cigar * 4 - c->l_qname - c->l_qseq - (c->l_qseq+1)/2;
    if (fp->is_be) swap_data(c, b->l_data, b->data, 0);
    return 4 + block_len;
}
