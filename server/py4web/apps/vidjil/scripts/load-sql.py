#!/usr/bin/python3
# -*- coding: utf-8 -*-

import sys
import argparse
sys.path.append("../")
sys.path.append("../modules")

from py4web import *
import settings
import defs
# from models import db
# #######################################################
# connect to db
# #######################################################
db = DAL(
    defs.DB_ADDRESS,
    folder=settings.DB_FOLDER,
    pool_size=settings.DB_POOL_SIZE,
    migrate=settings.DB_MIGRATE,
    fake_migrate=settings.DB_FAKE_MIGRATE,
)

if  __name__ =='__main__':
    print("#", ' '.join(sys.argv))
    DESCRIPTION = 'Py4web; script to execute SQL on empty database'
    
    #### Argument parser (argparse)
    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
  python3 %(prog)s --input file.sql\nLoad <file.sql> in the database.''',
                                    formatter_class=argparse.RawTextHelpFormatter)

    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('--input', '-i', type=str, default=False, help='Path of file that contain sql to execute')
    group_options.add_argument('--new', '-n', action="store_true", default=False, help='Tell if the database should be empty')
    args = parser.parse_args()

    if not args.input:
        raise Exception("Missing file to executesql")
    check_empty = args.new
    filename = args.input
    
    if check_empty and db(db.auth_user).count() > 0:
        print ("Database is not empty. Not executing the SQL")
        exit(0)
        
    with open(filename, "r") as sql:
        print ("Reading file {}".format(filename))


        queries = sql.read().split("\n")
        print( f"Queries: {len(queries)}" )

        res = db.executesql("SET FOREIGN_KEY_CHECKS = 0;")

        for sql_cmd in queries:
            if sql_cmd == "":
                continue
            print( sql_cmd[:40])
            db.executesql(sql_cmd)
        db.commit()
