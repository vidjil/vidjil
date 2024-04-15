from dataclasses import dataclass
from yatl.helpers import I, DIV, SPAN


@dataclass(frozen=True)
class DataWithTitle:
    data: object
    title: str


class StatDecorator(object):
    def __init__(self):
        pass

    def decorate(self, data):
        # Text to display
        txt = data
        if data is None:
            txt = ""
        elif isinstance(data, DataWithTitle):
            txt = data.data

        # Title
        title = txt
        if isinstance(data, DataWithTitle):
            title = data.title
        elif isinstance(data, dict):
            title = "\n".join([f"\t{key}: {data[key]}" for key in sorted(data.keys())])

        return DIV(txt, _title=title)


class BooleanDecorator(StatDecorator):
    def __init__(self):
        super(BooleanDecorator, self).__init__()

    def decorate(self, data):
        if data:
            my_class = "icon-ok"
        else:
            my_class = "icon-cancel"
        return I(_class=my_class)


class BarDecorator(StatDecorator):
    def __init__(self):
        super(BarDecorator, self).__init__()

    def decorate(self, data):
        return DIV(
            SPAN(_class="meter_bar", _style=f"width: {data}%"),
            SPAN(SPAN(f"{data}%", _class="meter_value"), _class="value_container"),
            _class="meter",
            _title=f"{data}%",
        )


class BarChartDecorator(StatDecorator):
    def __init__(self):
        super(BarChartDecorator, self).__init__()

    def decorate(self, data):
        bars = []
        for val in data:
            bar_span = SPAN(
                _style=f"height: {val}%; width: {(1.0/len(data))*100}%",
                _title=f"{val}%",
                _class="bar",
            )
            bars.append(bar_span)
        return DIV(*bars, _class="bar_chart")


class LabeledBarChartDecorator(BarChartDecorator):
    def __init__(self):
        super(LabeledBarChartDecorator, self).__init__()

    def decorate(self, data):
        bars = []
        percentage_per_item = (1.0 / len(data)) * 100
        for t in data:
            # We want larger bars to better see them. However we may not want that with wide labeled bar charts
            style = f"height: {t[1]}%; width: {percentage_per_item * 2}%; margin-right: -{percentage_per_item}%"
            if t[1]:
                style += ";min-height: 1px"
            bar_span = SPAN(_style=style, _title=t[0], _class="bar")
            bars.append(bar_span)

        # Last bar, to have a full height
        bars.append(SPAN(_style="height: 100%; visibility: hidden;", _class="bar"))

        return DIV(*bars, _class="bar_chart")


class GenescanDecorator(LabeledBarChartDecorator):
    def __init__(self):
        super(GenescanDecorator, self).__init__()

    def decorate(self, data):
        new_values = []
        for t in data:
            new_key = "%.1f%% at %dbp" % (t[2], t[0])
            new_values.append((new_key, t[1]))
        return super(GenescanDecorator, self).decorate(new_values)


class SetsDecorator(StatDecorator):
    def __init__(self):
        super(SetsDecorator, self).__init__()

    def decorate(self, data):
        sample_sets = []
        for sample_set in data:
            s = SPAN(f"{sample_set['id']} ", _style="font-size:70%")
            d = DIV(
                s,
                sample_set["name"],
                _onclick=f"db.call('sample_set/index', {{'id': '{sample_set['id']}'}})",
                _style="",
                _class=f"pointer set_token {sample_set['type']}_token",
            )
            sample_sets.append(d)
        return DIV(*sample_sets)


class LociListDecorator(StatDecorator):
    def __init__(self):
        super(LociListDecorator, self).__init__()

    def decorate(self, data):
        loci = []
        for locus in data:
            span = SPAN(locus, _class="stats_locus")
            loci.append(span)
        return DIV(*loci)
