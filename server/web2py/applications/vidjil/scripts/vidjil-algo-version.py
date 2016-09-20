import defs
import os

com = defs.DIR_VIDJIL + 'vidjil -h 2> /dev/null | grep -E "(# version|# git)"'
os.system(com)

