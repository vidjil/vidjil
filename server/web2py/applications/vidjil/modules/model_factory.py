from enum import Enum

class FactoryEnum(Enum):
    sample_set = 'SampleSet'
    patient = 'Patient'
    run = 'Run'

class ModelFactory():

    def __init__(self):
        #filler constructor, do we need a class here ?
        self.id = 0

    def get_instance(self, type, **kwargs):
        module = __import__(type)
        class_ = getattr(module, FactoryEnum[type].value)
        instance = class_(**kwargs)
        return instance
