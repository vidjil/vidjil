from __future__ import print_function
import sys

if len(sys.argv) == 1 or sys.argv[0] == "-h" or sys.argv[0] == "--help":
    print("Usage: %s <filename>\n\nBackup the database in the given file (CSV format)." % sys.argv[0])
    exit(1)

execfile("applications/vidjil/controllers/admin.py", globals())

backup_database(open(sys.argv[1], 'wb'))
