#!/usr/bin/env python
import sys

sys.path.append("../../../../")

from db_initialiser import DBInitialiser

from apps.vidjil.common import db

initialiser = DBInitialiser(db)
initialiser.run()
