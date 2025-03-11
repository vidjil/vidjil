
import glob
import os

from subprocess import Popen, PIPE, STDOUT

UPLOADS = '/mnt/upload/uploads/'

for f in glob.glob(UPLOADS + '/*.gz'):

    print "<==", f

    ### Quick check
    cmd = 'gunzip -l "%s"' % f
    p = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=PIPE) #STDOUT, stderr=STDOUT, close_fds=True)
    (stdoutdata, stderrdata) = p.communicate()
    if 'not in gzip format' in stderrdata:
        print stderrdata
        continue

    ### Unzip, then link to original name to fool the DB
    f_base = f.replace('.gz', '')
    cmd = 'gunzip "%s" ; ln -s "%s" "%s"' % (f, f_base, f)
    print cmd
    os.system(cmd)


