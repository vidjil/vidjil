

import sys

PY_REQUIRED = (3, 7)
if sys.version_info < PY_REQUIRED:
    print("This script requires Python >= %d.%d." % (PY_REQUIRED))
    sys.exit(1)
