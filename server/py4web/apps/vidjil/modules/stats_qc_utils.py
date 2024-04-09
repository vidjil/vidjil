from collections import defaultdict
from dataclasses import dataclass
import json
import math
import os
import pathlib
from typing import Dict
from .. import defs
from ..common import db
from . import zmodel_factory
from . import stats_decorator


@dataclass(frozen=True)
class HeaderConfig:
    display_name: str
    type: str
    decorator: stats_decorator.StatDecorator
    hidden_by_default: bool


def get_stat_headers() -> Dict[str, HeaderConfig]:
    """ 
    Returns a list of headers/columns to use for stats
    Each header also has a decorator function that allows to correctly display the values
    """

    stat_decorator = stats_decorator.StatDecorator()
    sets_decorator = stats_decorator.SetsDecorator()
    # boolean_decorator = stats_decorator.BooleanDecorator()
    # bar_decorator = stats_decorator.BarDecorator()
    # bar_chart_decorator = stats_decorator.BarChartDecorator()
    # labeled_bar_chart_decorator = stats_decorator.LabeledBarChartDecorator()
    genescan_decorator = stats_decorator.GenescanDecorator()
    loci_list_decorator = stats_decorator.LociListDecorator()
    return {
        'sets': HeaderConfig('sets', 'db', sets_decorator, True),
        'samples': HeaderConfig('samples', 'parser', stat_decorator, False),
        'config_names': HeaderConfig('config names', 'parser', stat_decorator, False),
        'mapped_reads': HeaderConfig('mapped reads', 'parser', stat_decorator, False),
        'mean_length': HeaderConfig('mean length', 'parser', stat_decorator, False),
        'read_lengths': HeaderConfig('read lengths', 'parser', genescan_decorator, False),
        'loci': HeaderConfig('loci', 'parser', loci_list_decorator, False),
        'clones_5': HeaderConfig('clones 5%', 'parser', stat_decorator, False),
        'intra-contamination': HeaderConfig('intra-contamination', 'parser', stat_decorator, False),
        'main_clone': HeaderConfig('main clone', 'parser', stat_decorator, False),
        'merged_reads': HeaderConfig('merged reads', 'parser', stat_decorator, True),
        'pre_process': HeaderConfig('pre process', 'parser', stat_decorator, True),
        "shannon_diversity": HeaderConfig("Shannon\'s diversity", 'parser', stat_decorator, False),
        "pielou_evenness": HeaderConfig("Pielou\'s evenness", 'parser', stat_decorator, True),
        "simpson_diversity": HeaderConfig("Simpson\'s diversity", 'parser', stat_decorator, True),
    }
    # 'reads' : HeaderConfig('reads', 'parser', stat_decorator, False),
    # HeaderConfig('mapped_percent', 'parser', bar_decorator, False),
    # HeaderConfig('bool', 'parser', boolean_decorator, False),
    # HeaderConfig('bool_true', 'parser', boolean_decorator, False),
    # HeaderConfig('distribution', 'parser', labeled_bar_chart_decorator, False),
    # HeaderConfig('abundance', 'parser', labeled_bar_chart_decorator, False),


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
                base_names = [os.path.basename(
                    x) for x in data['samples']['original_names']]
                result_basename = os.path.basename(
                    res['sequence_file']) if res['sequence_file'] else None
                if result_basename in base_names:
                    result_index = base_names.index(result_basename)
                else:
                    # No corresponding data (old file ?), we skip this result_file
                    continue

            reads = data['reads']['total'][result_index]
            mapped_reads = data['reads']['segmented'][result_index]
            dest['mapped_reads'] = "%.2f %% (%d / %d)" % (
                100.0 * mapped_reads / reads if reads else 0, mapped_reads, reads)
            dest['mapped_percent'] = 100.0 * \
                (float(data['reads']['segmented']
                 [result_index]) / float(reads))
            if 'merged' in data['reads']:
                dest['merged_reads'] = data['reads']['merged'][result_index]
            else:
                dest['merged_reads'] = None

            clones_5_title = None
            if not data["reads"]["segmented"][result_index]:
                # Case of file without one read seen segmented
                dest['abundance'] = "na"
                dest['main_clone'] = "na"
                dest['mean_length'] = "na"
                dest['read_lengths'] = []
                dest['intra-contamination'] = "na"
                dest['loci'] = ["na"]
                dest['clones_5'] = "na"
                dest['shannon_diversity'] = "na"
                dest["pielou_evenness"] = "na"
                dest["simpson_diversity"] = "na"
            else:
                sorted_clones = sorted(
                    top_clones, key=lambda clone: clone['reads'][result_index], reverse=True)
                if 'name' in sorted_clones[0]:
                    dest['main_clone'] = str(sorted_clones[0]['name'])
                else:
                    dest['main_clone'] = str(sorted_clones[0]['germline'])

                dest['abundance'] = [[str(key), 100.0 * data['reads']['germline'][key][result_index] /
                                      data['reads']["segmented"][result_index]] for key in data['reads']['germline']]

                # Allow to count reads length; not perfect as based on present clonotype only
                mean_length = {"reads": 0, "sum_length": 0}
                reads_per_length = {}
                for clone in data['clones']:
                    try:
                        average_read_length = int(
                            math.ceil(float(clone['_average_read_length'][result_index])))
                        mean_length["reads"] += clone["reads"][result_index]
                        mean_length["sum_length"] += clone["reads"][result_index] * \
                            float(clone['_average_read_length'][result_index])
                    except:
                        continue
                    if average_read_length > 0:
                        if average_read_length not in reads_per_length:
                            reads_per_length[average_read_length] = 0.0
                        reads_per_length[average_read_length] += float(
                            clone['reads'][result_index])
                if mean_length["reads"]:
                    dest['mean_length'] = round(
                        (mean_length["sum_length"] / mean_length["reads"]), 2)
                else:
                    dest['mean_length'] = "na"

                min_len = 100  # int(min(tmp.keys()))
                max_len = 600  # int(max(tmp.keys()))
                tmp_list = []
                if mapped_reads == 0:
                    mapped_reads = 1
                for i in range(min_len, max_len):
                    if i in reads_per_length:
                        if reads_per_length[i]:
                            scaled_val = (
                                2.5 + math.log10(reads_per_length[i] / mapped_reads)) / 2
                            display_val = max(0.01, min(1, scaled_val)) * 100
                        else:
                            display_val = 0
                        real_val = 100.0 * (reads_per_length[i] / mapped_reads)
                    else:
                        display_val = 0
                        real_val = 0
                    tmp_list.append((i, display_val, real_val))
                dest['read_lengths'] = tmp_list

                dest['loci'] = sorted(
                    [str(x) for x in data['reads']['germline'] if data['reads']['germline'][x][result_index] > 0])

                clones_5_title = {}
                for locus in data["reads"]["germline"].keys():
                    clones_5_title[locus] = len([c for c in data['clones'] if (c["germline"] == locus and data["reads"]["germline"][locus][result_index] and float(
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
                    dest['shannon_diversity'] = round(
                        (data["diversity"]["index_H_entropy"][result_index]), 3) if "index_H_entropy" in data["diversity"] else "na"
                    dest["pielou_evenness"] = round(
                        (data["diversity"]["index_E_equitability"][result_index]), 3) if "index_E_equitability" in data["diversity"] else "na"
                    dest["simpson_diversity"] = round(
                        (data["diversity"]["index_Ds_diversity"][result_index]), 3) if "index_Ds_diversity" in data["diversity"] else "na"

            clones_5_txt = sum([data['reads']['distribution'][key][result_index]
                                     for key in data['reads']['germline'] if key in data['reads']['distribution']])
            if clones_5_title is not None:
                dest['clones_5'] = stats_decorator.DataWithTitle(clones_5_txt, clones_5_title)
            else:
                dest['clones_5'] = clones_5_txt            
            
            if 'pre_process' in data['samples']:
                dest['pre_process'] = data['samples']['pre_process']['producer'][result_index]
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
        result_fuse = query[position]
        sample_query_pos[str(result_fuse["results_file"])].append(position)

    fuse_data = {}
    for result_fuse in query:
        set_type = result_fuse['sample_type']
        if result_fuse.fused_file_id not in fuse_data:
            tmp_fuse = {}
            tmp_fuse['results_files'] = {}
            tmp_fuse['fused_file_name'] = result_fuse.fused_file
            fuse_data[result_fuse.fused_file_id] = tmp_fuse
        else:
            tmp_fuse = fuse_data[result_fuse.fused_file_id]

        if result_fuse.results_file_id not in tmp_fuse['results_files']:
            tmp = result_fuse.copy()
            tmp['sets'] = []
            tmp_fuse['results_files'][tmp['results_file_id']] = tmp
            tmp.pop('set_id', None)
            tmp.pop(set_type, None)
            tmp.pop('set_info', None)
        else:
            tmp = tmp_fuse['results_files'][result_fuse['results_file_id']]

        # Create a list of set with this sample
        for sub_pos_set in sample_query_pos[str(result_fuse["results_file"])]:
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
    for fuse_id in fuse_data:
        fuse = fuse_data[fuse_id]
        fused_stats = get_fused_stats(fuse)
        headers = get_stat_headers()
        for results_file_id in fused_stats:
            result_fuse = fuse['results_files'][results_file_id]
            result_fused_stats = fused_stats[results_file_id]
            data_json.append(result_fused_stats.copy())

            for name, header in headers.items():
                if header.type == 'db':
                    result_fused_stats[name] = result_fuse[name]
                if name in result_fused_stats.keys():
                    result_fused_stats[name] = header.decorator.decorate(
                        result_fused_stats[name])
                else:
                    result_fused_stats[name] = ""
            result_fused_stats['sequence_file_id'] = result_fuse['results_file']['sequence_file_id']
            result_fused_stats['samples'] = headers['samples'].decorator.decorate(
                result_fuse['filename'])
            result_fused_stats['config_names'] = headers['config_names'].decorator.decorate(
                result_fuse['config']["name"])
            result_fused_stats['config_id'] = result_fuse['results_file']['config_id']
            data.append(result_fused_stats)

            # Data in pure json for TSV export from client
            data_json[-1]["sequence_file_id"] = result_fuse['results_file']['sequence_file_id']
            data_json[-1]["samples"] = result_fuse['filename']
            data_json[-1]["config_names"] = result_fuse['config']["name"]
            data_json[-1]["config_id"] = result_fuse['results_file']['config_id']
            data_json[-1]["sets"] = [str("%s (%s, id %s)" %
                                         (x["name"], x["type"], x["id"])) for x in result_fuse['sets']]

            data_json[-1]["Shannon diversity"] = data_json[-1].pop(
                'shannon_diversity')
            data_json[-1]["Pielou evenness"] = data_json[-1].pop(
                'pielou_evenness')
            data_json[-1]["Simpson diversity"] = data_json[-1].pop(
                'simpson_diversity')
            del data_json[-1]['read_lengths']

    return data, data_json
