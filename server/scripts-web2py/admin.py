from __future__ import print_function
import sys

execfile("applications/vidjil/controllers/admin.py", globals())

def admin(function, args):
    auth.user = db.auth_user[1]
    auth.user.first_name = 'CLI'
    auth.user.last_name = 'admin.py'
    auth.admin = 'admin'
    
    session.auth = []
    function = sys.argv[1]

    if len(args) == 0:
        params = ''
    else:
        params = ', '.join(args)
    
    exec('{}({})'.format(function,params))

if __name__ == '__main__':
    if len(sys.argv) == 1 or sys.argv[0] == "-h" or sys.argv[0] == "--help":
        print("Usage: %s <admin_function> [parameters]\n\nExec a function from the admin controller)." % sys.argv[0])
        exit(1)
    admin(sys.argv[1], sys.argv[2:])
