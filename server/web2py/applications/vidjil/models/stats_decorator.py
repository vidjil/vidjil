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

class BarChartDecorator(StatDecorator):

    def __init__(self):
        super(BarChartDecorator, self).__init__()

    def decorate(self, data):
        bars = []
        for val in data:
            bar_span = SPAN(_style="height: %d%%; width: %d%%" % (val, (1.0/len(data))*100), _title="%d%%" % val, _class="bar")
            bars.append(bar_span)
        return DIV(*bars, _class="bar_chart")

class SetsDecorator(StatDecorator):

    def __init__(self):
        super(SetsDecorator, self).__init__()

    def decorate(self, data):
        ssets = []
        for sample_set in data:
            d = DIV("(%d) %s" % (sample_set['id'], sample_set['name']))
            ssets.append(d)
        return DIV(*ssets)

class LociListDecorator(StatDecorator):

    def __init__(self):
        super(LociListDecorator, self).__init__()

    def decorate(self, data):
        loci = []
        for locus in data:
            span = SPAN(locus)
            loci.append(span)
        return DIV(*loci)
