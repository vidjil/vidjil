import vidjil_utils

class StatDecorator():

    def __init__(self):
        pass

    def decorate(self, data):
        return data if data is not None else ""
