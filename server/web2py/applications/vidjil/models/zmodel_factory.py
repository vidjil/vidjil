from enum import Enum

class FactoryEnum(Enum):
    sample_set = SampleSet
    patient = Patient
    run = Run

class ModelFactory():

    def __init__(self):
        #filler constructor, do we need a class here ?
        self.id = 0

    def get_instance(self, type):
        return FactoryEnum[type].value(type)
