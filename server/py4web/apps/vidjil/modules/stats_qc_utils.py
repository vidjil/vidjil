from collections import defaultdict
import json
import math
import os
import pathlib
from .. import defs
from ..common import db
from . import zmodel_factory
from . import stats_decorator


def get_stat_headers():
    """ 
    Returns a list of headers/columns to use for stats
    Each header also has a decorator function that allows to correctly interpret the values
    """

    stat_decorator = stats_decorator.StatDecorator()
    sets_decorator = stats_decorator.SetsDecorator()
    # boolean_decorator = stats_decorator.BooleanDecorator()
    # bar_decorator = stats_decorator.BarDecorator()
    # bar_chart_decorator = stats_decorator.BarChartDecorator()
    # labeled_bar_chart_decorator = stats_decorator.LabeledBarChartDecorator()
    genescan_decorator = stats_decorator.GenescanDecorator()
    loci_list_decorator = stats_decorator.LociListDecorator()
    return [('sets', 'db', sets_decorator),
            ('samples', 'parser', stat_decorator),
            ('config names', 'parser', stat_decorator),
            # ('reads', 'parser', stat_decorator),
            ('mapped reads', 'parser', stat_decorator),
            # ('mapped_percent', 'parser', bar_decorator),
            ('mean length', 'parser', stat_decorator),
            ('read lengths', 'parser', genescan_decorator),
            # ('bool', 'parser', boolean_decorator),
            # ('bool_true', 'parser', boolean_decorator),
            ('loci', 'parser', loci_list_decorator),
            # ('distribution', 'parser', labeled_bar_chart_decorator),
            ('clones 5%', 'parser', stat_decorator),
            ('clones 5% locus', 'parser', stat_decorator),
            ('intra-contamination', 'parser', stat_decorator),
            ('main clone', 'parser', stat_decorator),
            ('merged reads', 'parser', stat_decorator),
            ('pre process', 'parser', stat_decorator),
            ("Shannon\'s diversity", 'parser', stat_decorator),
            ("Pielou\'s evenness", 'parser', stat_decorator),
            ("Simpson\'s diversity", 'parser', stat_decorator),
            # ('abundance', 'parser', labeled_bar_chart_decorator)
            ]


def get_fused_stats(fuse):
    """ 
    Returns data of a fused file
    Computes some extra data
    """

    file_path = pathlib.Path(defs.DIR_RESULTS, fuse['fused_file_name'])
    results_files = fuse['results_files']
    d = {}
    with open(file_path, 'r') as json_file:
        data = json.load(json_file)
        top_clones = data['clones'][:data['samples']['number']]

        for results_file_id in results_files:
            dest = {}
            res = results_files[results_file_id]
            result_index = -1
            if "results_file_id" in data['samples']:
                result_index = data['samples']['results_file_id'].index(
                    results_file_id)
            elif "original_names" in data['samples']:
                basenames = [os.path.basename(
                    x) for x in data['samples']['original_names']]
                result_basename = os.path.basename(
                    res['sequence_file']) if res['sequence_file'] else None
                if result_basename in basenames:
                    result_index = basenames.index(result_basename)
                else:
                    # No corresponding data (old file ?), we skip this result_file
                    continue

            reads = data['reads']['total'][result_index]
            mapped_reads = data['reads']['segmented'][result_index]
            dest['mapped reads'] = "%.2f %% (%d / %d)" % (
                100.0 * mapped_reads / reads if reads else 0, mapped_reads, reads)
            dest['mapped_percent'] = 100.0 * \
                (float(data['reads']['segmented']
                 [result_index]) / float(reads))
            if 'merged' in data['reads']:
                dest['merged reads'] = data['reads']['merged'][result_index]
            else:
                dest['merged reads'] = None

            if not data["reads"]["segmented"][result_index]:
                # Case of file without one reads seen segmented
                dest['abundance'] = "na"
                dest['main clone'] = "na"
                dest['mean length'] = "na"
                dest['read lengths'] = []
                dest['intra-contamination'] = "na"
                dest['loci'] = ["na"]
                dest['clones 5%'] = "na"
                dest['clones 5% locus'] = "na"
                dest['Shannon\'s diversity'] = "na"
                dest["Pielou\'s evenness"] = "na"
                dest["Simpson\'s diversity"] = "na"
            else:
                sorted_clones = sorted(
                    top_clones, key=lambda clone: clone['reads'][result_index], reverse=True)
                if 'name' in sorted_clones[0]:
                    dest['main clone'] = str(sorted_clones[0]['name'])
                else:
                    dest['main clone'] = str(sorted_clones[0]['germline'])

                dest['abundance'] = [[str(key), 100.0 * data['reads']['germline'][key][result_index] /
                                      data['reads']["segmented"][result_index]] for key in data['reads']['germline']]

                # Allow to count reads length; not perfect as based on present clonotype only
                mean_length = {"reads": 0, "sum_length": 0}

                tmp = {}
                for clone in data['clones']:
                    try:
                        arl = int(
                            math.ceil(float(clone['_average_read_length'][result_index])))
                        mean_length["reads"] += clone["reads"][result_index]
                        mean_length["sum_length"] += clone["reads"][result_index] * \
                            float(clone['_average_read_length'][result_index])
                    except:
                        continue
                    if arl > 0:
                        if arl not in tmp:
                            tmp[arl] = 0.0
                        tmp[arl] += float(clone['reads'][result_index])
                if mean_length["reads"]:
                    dest['mean length'] = round(
                        (mean_length["sum_length"] / mean_length["reads"]), 2)
                else:
                    dest['mean length'] = "na"
                min_len = 100  # int(min(tmp.keys()))
                max_len = 600  # int(max(tmp.keys()))
                tmp_list = []

                if mapped_reads == 0:
                    mapped_reads = 1
                for i in range(min_len, max_len):
                    if i in tmp:
                        if tmp[i]:
                            scaled_val = (
                                2.5 + math.log10(tmp[i] / mapped_reads)) / 2
                            display_val = max(0.01, min(1, scaled_val)) * 100
                        else:
                            display_val = 0
                        real_val = 100.0 * (tmp[i] / mapped_reads)
                    else:
                        display_val = 0
                        real_val = 0
                    tmp_list.append((i, display_val, real_val))
                dest['read lengths'] = tmp_list

                dest['loci'] = sorted(
                    [str(x) for x in data['reads']['germline'] if data['reads']['germline'][x][result_index] > 0])

                dest['clones 5%'] = len([c for c in data['clones'] if (float(
                    c["reads"][result_index]) / data["reads"]["segmented"][result_index]) > 0.05])

                dest['clones 5% locus'] = {}
                for locus in data["reads"]["germline"].keys():
                    dest['clones 5% locus'][locus] = len([c for c in data['clones'] if (c["germline"] == locus and data["reads"]["germline"][locus][result_index] and float(
                        c["reads"][result_index]) / data["reads"]["germline"][locus][result_index]) > 0.05])

                # !!! Contamination definition  : if pos != result_index, C present more than 0,01% and C bigger in result_index sample
                # !!! WARNING, contamination is computed only on current fused file ! So available for ONE shared set and ONE shared config
                dest['intra-contamination'] = len([c for c in data['clones'] if len([pos for pos in range(len(c["reads"])) if
                                                                                     pos != result_index and
                                                                                     data["reads"]["segmented"][pos] and
                                                                                     (float(c["reads"][pos]) / data["reads"]["segmented"][pos]) > 0.0001 and
                                                                                     (float(c["reads"][result_index]) / data["reads"]["segmented"][result_index]) > (float(c["reads"][pos]) / data["reads"]["segmented"][pos])])
                                                   ])

                if "diversity" in data:
                    dest['Shannon\'s diversity'] = round(
                        (data["diversity"]["index_H_entropy"][result_index]), 3) if "index_H_entropy" in data["diversity"] else "na"
                    dest["Pielou\'s evenness"] = round(
                        (data["diversity"]["index_E_equitability"][result_index]), 3) if "index_E_equitability" in data["diversity"] else "na"
                    dest["Simpson\'s diversity"] = round(
                        (data["diversity"]["index_Ds_diversity"][result_index]), 3) if "index_Ds_diversity" in data["diversity"] else "na"

            dest['clones 5%'] = sum([data['reads']['distribution'][key][result_index]
                                              for key in data['reads']['germline'] if key in data['reads']['distribution']])
            if 'pre_process' in data['samples']:
                dest['pre process'] = data['samples']['pre_process']['producer'][result_index]
            d[results_file_id] = dest
            
    return d


def get_results_stats(file_name, dest):
    import ijson.backends.yajl2_cffi as ijson
    file_path = pathlib.Path(defs.DIR_RESULTS, file_name)
    distributions = []
    with open(file_path, 'rb') as results:
        i = "1"
        while True:
            results.seek(0, 0)
            tmp = [d for d in ijson.items(
                results, f"reads-distribution-{i}.item")]
            if len(tmp) == 0:
                break
            else:
                distributions.append((i, tmp[0]))
                i += "0"
    dest['distribution'] = distributions
    return dest


def get_stat_data(results_file_ids):
    model_factory = zmodel_factory.ModelFactory()
    set_types = [defs.SET_TYPE_PATIENT,
                 defs.SET_TYPE_RUN,
                 defs.SET_TYPE_GENERIC]
    helpers = {}
    for set_type in set_types:
        helpers[set_type] = model_factory.get_instance(set_type)

    query = db(
        (db.results_file.id.belongs(results_file_ids)) &
        (db.sequence_file.id == db.results_file.sequence_file_id) &
        (db.config.id == db.results_file.config_id) &
        (db.sample_set_membership.sequence_file_id == db.sequence_file.id) &
        (db.sample_set.id == db.sample_set_membership.sample_set_id) &
        (db.fused_file.sample_set_id == db.sample_set.id) &
        (db.fused_file.config_id == db.config.id)
    ).select(
        db.results_file.sequence_file_id, db.results_file.config_id,
        db.results_file.data_file.with_alias("data_file"),
        db.results_file.id.with_alias("results_file_id"),
        db.sequence_file.data_file.with_alias("sequence_file"),
        db.sequence_file.filename.with_alias("filename"),
        db.sample_set.id.with_alias("set_id"),
        db.sample_set.sample_type.with_alias("sample_type"),
        db.fused_file.fused_file.with_alias("fused_file"),
        db.fused_file.fused_file.with_alias("fused_file_id"),
        db.patient.first_name,
        db.patient.last_name,
        db.patient.info.with_alias('set_info'),
        db.patient.sample_set_id,
        db.run.name,
        db.generic.name,
        db.config.name,
        # use generic name as failsafe for set name
        db.generic.name.with_alias("set_name"),
        left=[
            db.patient.on(db.patient.sample_set_id == db.sample_set.id),
            db.run.on(db.run.sample_set_id == db.sample_set.id),
            db.generic.on(db.generic.sample_set_id == db.sample_set.id)
        ]
    )

    # Create a hash of position in query for each sample file
    sample_query_pos = defaultdict(lambda: [])
    for position in range(len(query)):
        res = query[position]
        sample_query_pos[str(res["results_file"])].append(position)

    tmp_data = {}
    for res in query:
        set_type = res['sample_type']
        if res.fused_file_id not in tmp_data:
            tmp_fuse = {}
            tmp_fuse['results_files'] = {}
            tmp_fuse['fused_file_name'] = res.fused_file
            tmp_data[res.fused_file_id] = tmp_fuse
        else:
            tmp_fuse = tmp_data[res.fused_file_id]

        if res.results_file_id not in tmp_fuse['results_files']:
            tmp = res.copy()
            tmp['sets'] = []
            tmp_fuse['results_files'][tmp['results_file_id']] = tmp
            tmp.pop('set_id', None)
            tmp.pop(set_type, None)
            tmp.pop('set_info', None)
        else:
            tmp = tmp_fuse['results_files'][res['results_file_id']]

        # Create a list of set with this sample
        for sub_pos_set in sample_query_pos[str(res["results_file"])]:
            sub_res = query[sub_pos_set]
            sample_set = {}
            sample_set['set_type'] = sub_res['sample_type']
            sample_set['id'] = sub_res['set_id']
            sample_set['name'] = helpers[sub_res['sample_type']
                                         ].get_name(sub_res[sub_res['sample_type']])
            sample_set['info'] = sub_res['set_info']
            sample_set['type'] = sub_res['sample_type']
            tmp['sets'].append(sample_set)

        # Reorder set by type
        tmp['sets'] = sorted(tmp['sets'],
                             key=lambda _set: set_types.index(
                                 _set['set_type']),
                             reverse=False)

    data = []
    data_json = []
    for fuse_id in tmp_data:
        fuse = tmp_data[fuse_id]
        fused_stats = get_fused_stats(fuse)
        headers = get_stat_headers()
        for results_file_id in fused_stats:
            res = fuse['results_files'][results_file_id]
            r = fused_stats[results_file_id]
            data_json.append(r.copy())

            for head, htype, model in headers:
                if htype == 'db':
                    r[head] = res[head]
                if head in r.keys():
                    r[head] = model.decorate(r[head])
                else:
                    r[head] = ""
            r['sequence_file_id'] = res['results_file']['sequence_file_id']
            r['samples'] = [x for x in headers if x[0] ==
                            "samples"][0][2].decorate(res['filename'])
            r['config names'] = [x for x in headers if x[0] ==
                                 "config names"][0][2].decorate(res['config']["name"])
            r['config_id'] = res['results_file']['config_id']
            data.append(r)

            # Data in pure json for TSV export from client
            data_json[-1]["sequence_file_id"] = res['results_file']['sequence_file_id']
            data_json[-1]["samples"] = res['filename']
            data_json[-1]["config names"] = res['config']["name"]
            data_json[-1]["config_id"] = res['results_file']['config_id']
            data_json[-1]["sets"] = [str("%s (%s, id %s)" %
                                         (x["name"], x["type"], x["id"])) for x in res['sets']]

            data_json[-1]["Shannon diversity"] = data_json[-1].pop(
                'Shannon\'s diversity')
            data_json[-1]["Pielou evenness"] = data_json[-1].pop(
                'Pielou\'s evenness')
            data_json[-1]["Simpson diversity"] = data_json[-1].pop(
                'Simpson\'s diversity')
            del data_json[-1]['read lengths']

    return data, data_json
