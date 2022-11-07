#!/usr/bin/python
"""
require: 
apt-get install python-pip
pip install unittest2
pip install unittest-xml-reporting
pip install mock

"""

from __future__ import print_function
import unittest
import xmlrunner
import glob
import sys
import doctest
import os
import traceback
from copy import copy

from test_sample_set import TestSampleSet

suite = unittest.TestSuite()

suite.addTest(unittest.makeSuite(TestSampleSet))

result = xmlrunner.XMLTestRunner(output='test-reports', verbosity=1).run(suite)

sys.exit(not result.wasSuccessful())
