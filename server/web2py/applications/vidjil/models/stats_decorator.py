import vidjil_utils

class StatDecorator(object):

    def __init__(self):
        pass

    def decorate(self, data):
        return data if data is not None else ""

class BooleanDecorator(StatDecorator):

    def __init__(self):
        super(BooleanDecorator, self).__init__()

    def decorate(self, data):
        if data:
            myclass = "icon-ok"
        else:
            myclass = "icon-cancel"
        return I(_class=myclass)

class BarDecorator(StatDecorator):

    def __init__(self):
        super(BarDecorator, self).__init__()

    def decorate(self, data):
        return DIV(SPAN(_style="width: %d%%" % data), _class="meter", _title="%d%%" % data)
