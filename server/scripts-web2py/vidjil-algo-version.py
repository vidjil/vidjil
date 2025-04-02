import settings
import os

com = settings.DIR_VIDJIL + 'vidjil -h 2> /dev/null | grep -E "(# version|# git)"'
os.system(com)

