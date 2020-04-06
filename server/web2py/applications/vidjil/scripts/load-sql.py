import sys

if len(sys.argv) > 1:
    if sys.argv[1] == "-h":
        print ('Usage: {} [-n] <file.sql>\n\nLoad <file.sql> in the database. If -n do it only when database is empty.'.format(sys.argv[0]))
    else:
        i=1
        check_empty = False
        if sys.argv[1] == "-n":
            check_empty = True
            i += 1
        filename = sys.argv[i]
        
        if check_empty and db(db.auth_user).count() > 0:
            print ("Database is not empty. Not executing the SQL")
            exit(0)
            
        with open(filename, "r") as sql:
            print ("Reading file {}".format(filename))
            queries = sql.read()
            db.executesql(queries)
