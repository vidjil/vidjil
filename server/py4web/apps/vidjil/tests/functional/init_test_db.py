#!/usr/bin/env python
import sys
sys.path.append("../../../../")

from apps.vidjil.common import db
from db_initialiser import DBInitialiser

initialiser = DBInitialiser(db)
initialiser.run()
