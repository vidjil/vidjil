#!/usr/bin/env python
import sys
sys.path.append("../../../../")

from apps.vidjil.modules.vidjil_utils import *
from apps.vidjil.common import *
from db_initialiser import DBInitialiser

initialiser = DBInitialiser(db)
initialiser.run()
