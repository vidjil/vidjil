from collections import defaultdict
from dataclasses import dataclass
import json
import math
import os
import pathlib
from typing import Dict, List
from .. import defs
from ..common import db
from . import zmodel_factory
from . import stats_decorator

SETS_COLUMN_NAME = "sets"
SAMPLE_COLUMN_NAME = "sample"
CONFIG_NAME_COLUMN_NAME = "config_name"
MAPPED_READS_COLUMN_NAME = "mapped_reads"
MAPPED_READS_NUMBER_COLUMN_NAME = "mapped_reads_number"
MEAN_LENGTH_COLUMN_NAME = "mean_length"
READ_LENGTHS_COLUMN_NAME = "read_lengths"
LOCI_COLUMN_NAME = "loci"
CLONES_5_COLUMN_NAME = "clones_5"
INTRA_CONTAMINATION_COLUMN_NAME = "intra_contamination"
MAIN_CLONE_COLUMN_NAME = "main_clone"
MERGED_READS_COLUMN_NAME = "merged_reads"
PRE_PROCESS_COLUMN_NAME = "pre_process"
SHANNON_DIVERSITY_COLUMN_NAME = "shannon_diversity"
PIELOU_EVENNESS_COLUMN_NAME = "pielou_evenness"
SIMPSON_DIVERSITY_COLUMN_NAME = "simpson_diversity"

NOT_APPLICABLE = "N/A"


@dataclass(frozen=True)
class HeaderConfig:
    display_name: str
    display_tooltip: str
    decorator: stats_decorator.StatDecorator
    column_size: int
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
        SETS_COLUMN_NAME: HeaderConfig("Sets", "Patients, runs, sets", sets_decorator, 120, True),
        SAMPLE_COLUMN_NAME: HeaderConfig(
            "Sample name", "Sample name", stat_decorator, 120, False
        ),
        CONFIG_NAME_COLUMN_NAME: HeaderConfig(
            "Config name", "Analysis configuration", stat_decorator, 120, False
        ),
        MAPPED_READS_COLUMN_NAME: HeaderConfig(
            "Reads (%)", "Percentage of analyzed reads", stat_decorator, 50, False
        ),
        MAPPED_READS_NUMBER_COLUMN_NAME: HeaderConfig(
            "Reads",
            "Number of analyzed reads / Total number of reads",
            stat_decorator,
            100,
            True,
        ),
        MEAN_LENGTH_COLUMN_NAME: HeaderConfig(
            "Mean length", "Mean length of the reads", stat_decorator, 40, False
        ),
        READ_LENGTHS_COLUMN_NAME: HeaderConfig(
            "Read length distribution",
            "Read length distribution (between 100bp and 600bp)",
            genescan_decorator,
            200,
            False,
        ),
        LOCI_COLUMN_NAME: HeaderConfig(
            "Recombinations", "Recombinations / loci", loci_list_decorator, 140, False
        ),
        CLONES_5_COLUMN_NAME: HeaderConfig(
            "Clonotypes ≥5%",
            "Number of clonotypes above 5% in their recombination/locus",
            stat_decorator,
            60,
            False,
        ),
        INTRA_CONTAMINATION_COLUMN_NAME: HeaderConfig(
            "Common", "Common clonotypes ≥0.01% with other samples of this set.\nNB: These are the common clonotypes with all samples of the set, even if they are not displayed.", stat_decorator, 50, False
        ),
        MAIN_CLONE_COLUMN_NAME: HeaderConfig(
            "Main clonotype", "Main clonotype", stat_decorator, 180, False
        ),
        MERGED_READS_COLUMN_NAME: HeaderConfig(
            "Reads (merged)", "Number of merged reads", stat_decorator, 50, True
        ),
        PRE_PROCESS_COLUMN_NAME: HeaderConfig(
            "Pre-process", "Pre-process", stat_decorator, 45, True
        ),
        SHANNON_DIVERSITY_COLUMN_NAME: HeaderConfig(
            "Shannon", "Shannon's diversity (0: no diversity, 3-5+: full diversity)", stat_decorator, 45, False
        ),
        PIELOU_EVENNESS_COLUMN_NAME: HeaderConfig(
            "Pielou", "Pielou's evenness (0: no diversity, 1: full diversity)", stat_decorator, 45, True
        ),
        SIMPSON_DIVERSITY_COLUMN_NAME: HeaderConfig(
            "Simpson", "Simpson's diversity (0: no diversity, 1: full diversity)", stat_decorator, 45, True
        ),
    }
    # 'reads' : HeaderConfig('reads', 'parser', stat_decorator, False),
    # HeaderConfig('mapped_percent', 'parser', bar_decorator, False),
    # HeaderConfig('bool', 'parser', boolean_decorator, False),
    # HeaderConfig('bool_true', 'parser', boolean_decorator, False),
    # HeaderConfig('distribution', 'parser', labeled_bar_chart_decorator, False),
    # HeaderConfig('abundance', 'parser', labeled_bar_chart_decorator, False),


def get_stat_data(sample_set_id, results_file_ids: List[int]):
    # Get fuse_data
    if isinstance(sample_set_id, str):
        sample_set_id = int(sample_set_id)
    fuse_data = get_fuse_data(sample_set_id, results_file_ids)

    # Prepare stats
    display_stats_data = []
    json_stats_data = []
    for fuse in fuse_data.values():
        fused_stats = get_fused_stats(fuse)
        for results_file_id in fused_stats:
            result_fuse = fuse["results_files"][results_file_id]
            result_fused_stats = fused_stats[results_file_id]

            display_fused_stats = format_display_stats(result_fuse, result_fused_stats)
            display_stats_data.append(display_fused_stats)

            json_fused_stats = format_tsv_stats(result_fuse, result_fused_stats)
            json_stats_data.append(json_fused_stats)

    return display_stats_data, json_stats_data


def get_fuse_data(sample_set_id: int, results_file_ids: List[int]) -> dict:
    # Get raw data
    query = db(
        (db.results_file.id.belongs(results_file_ids))
        & (db.sequence_file.id == db.results_file.sequence_file_id)
        & (db.config.id == db.results_file.config_id)
        & (db.sample_set.id == sample_set_id)
        & (db.fused_file.sample_set_id == db.sample_set.id)
        & (db.fused_file.config_id == db.config.id)
    ).select(
        db.results_file.sequence_file_id,
        db.results_file.config_id,
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
        db.patient.info.with_alias("set_info"),
        db.patient.sample_set_id,
        db.run.name,
        db.generic.name,
        db.config.name,
        # use generic name as failsafe for set name
        db.generic.name.with_alias("set_name"),
        left=[
            db.patient.on(db.patient.sample_set_id == db.sample_set.id),
            db.run.on(db.run.sample_set_id == db.sample_set.id),
            db.generic.on(db.generic.sample_set_id == db.sample_set.id),
        ],
    )

    # Create a hash of position in query for each sample file
    sample_query_pos = defaultdict(lambda: [])
    for position in range(len(query)):
        result_fuse = query[position]
        sample_query_pos[str(result_fuse["results_file"])].append(position)

    model_factory = zmodel_factory.ModelFactory()
    set_types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
    helpers = {}
    for set_type in set_types:
        helpers[set_type] = model_factory.get_instance(set_type)
        
    # Get set infos
    sample_set = {}
    print(f"{sample_set_id=} - {query[0]['set_id']=} - {query[0]['set_id'] == sample_set_id}")
    if len(query) > 0 and query[0]["set_id"] == sample_set_id:
        first_result_fuse = query[0]
        sample_set["set_type"] = first_result_fuse["sample_type"]
        sample_set["id"] = first_result_fuse["set_id"]
        sample_set["name"] = helpers[first_result_fuse["sample_type"]].get_name(
            first_result_fuse[first_result_fuse["sample_type"]]
        )
        sample_set["info"] = first_result_fuse["set_info"]
        sample_set["type"] = first_result_fuse["sample_type"]
        
    fuse_data = {}
    for result_fuse in query:
        set_type = result_fuse["sample_type"]
        if result_fuse.fused_file_id not in fuse_data:
            tmp_fuse = {}
            tmp_fuse["results_files"] = {}
            tmp_fuse["fused_file_name"] = result_fuse.fused_file
            fuse_data[result_fuse.fused_file_id] = tmp_fuse
        else:
            tmp_fuse = fuse_data[result_fuse.fused_file_id]

        if result_fuse.results_file_id not in tmp_fuse["results_files"]:
            tmp = result_fuse.copy()
            tmp_fuse["results_files"][tmp["results_file_id"]] = tmp
            tmp.pop("set_id", None)
            tmp.pop(set_type, None)
            tmp.pop("set_info", None)
        else:
            tmp = tmp_fuse["results_files"][result_fuse["results_file_id"]]

        tmp["sets"] = [sample_set]

    return fuse_data


def get_fused_stats(fuse):
    """
    Returns data of a fused file
    Computes some extra data
    """

    fuse_file_path = pathlib.Path(defs.DIR_RESULTS, fuse["fused_file_name"])
    fuse_results_files = fuse["results_files"]
    fused_stats = {}
    with open(fuse_file_path, "r") as fuse_file:
        fuse_data = json.load(fuse_file)
        top_clones = fuse_data["clones"][: fuse_data["samples"]["number"]]

        for results_file_id in fuse_results_files:
            result_stats = {}
            fuse_result = fuse_results_files[results_file_id]
            result_index = -1
            if "results_file_id" in fuse_data["samples"]:
                result_index = fuse_data["samples"]["results_file_id"].index(
                    results_file_id
                )
            elif "original_names" in fuse_data["samples"]:
                base_names = [
                    os.path.basename(x) for x in fuse_data["samples"]["original_names"]
                ]
                result_basename = (
                    os.path.basename(fuse_result["sequence_file"])
                    if fuse_result["sequence_file"]
                    else None
                )
                if result_basename in base_names:
                    result_index = base_names.index(result_basename)
                else:
                    # No corresponding data (old file ?), we skip this result_file
                    continue

            reads = fuse_data["reads"]["total"][result_index]
            mapped_reads = fuse_data["reads"]["segmented"][result_index]

            result_stats["mapped_reads"] = int(mapped_reads)
            result_stats["total_reads"] = int(reads)

            if "merged" in fuse_data["reads"]:
                result_stats["merged_reads"] = fuse_data["reads"]["merged"][
                    result_index
                ]
            else:
                result_stats["merged_reads"] = NOT_APPLICABLE

            # Init default values
            result_stats["main_clone"] = NOT_APPLICABLE
            result_stats["abundance"] = NOT_APPLICABLE
            result_stats["mean_length"] = NOT_APPLICABLE
            result_stats["read_lengths"] = []
            result_stats["loci"] = [NOT_APPLICABLE]
            result_stats["clones_5"] = NOT_APPLICABLE
            result_stats["clones_5_details"] = NOT_APPLICABLE
            result_stats["intra_contamination"] = NOT_APPLICABLE
            result_stats["shannon_diversity"] = NOT_APPLICABLE
            result_stats["pielou_evenness"] = NOT_APPLICABLE
            result_stats["simpson_diversity"] = NOT_APPLICABLE
                
            if fuse_data["reads"]["segmented"][result_index]:
                sorted_clones = sorted(
                    top_clones,
                    key=lambda clone: clone["reads"][result_index],
                    reverse=True,
                )
                if "name" in sorted_clones[0]:
                    result_stats["main_clone"] = sorted_clones[0]["name"]
                else:
                    result_stats["main_clone"] = sorted_clones[0]["germline"]

                # Note that `fuse_data["reads"]["segmented"][result_index]` is already tested above
                result_stats["abundance"] = {
                    str(key): 100.0
                    * fuse_data["reads"]["germline"][key][result_index]
                    / fuse_data["reads"]["segmented"][result_index]
                    for key in fuse_data["reads"]["germline"]
                }

                # Allow to count reads length; not perfect as based on present clonotype only
                mean_length = {"reads": 0, "sum_length": 0}
                reads_per_length = {}
                for clone in fuse_data["clones"]:
                    try:
                        average_read_length = int(
                            math.ceil(
                                float(clone["_average_read_length"][result_index])
                            )
                        )
                        mean_length["reads"] += clone["reads"][result_index]
                        mean_length["sum_length"] += clone["reads"][
                            result_index
                        ] * float(clone["_average_read_length"][result_index])
                    except Exception:
                        continue
                    if average_read_length > 0:
                        if average_read_length not in reads_per_length:
                            reads_per_length[average_read_length] = 0.0
                        reads_per_length[average_read_length] += float(
                            clone["reads"][result_index]
                        )
                if mean_length["reads"]:
                    result_stats["mean_length"] = round(
                        (mean_length["sum_length"] / mean_length["reads"]), 2
                    )
                else:
                    result_stats["mean_length"] = NOT_APPLICABLE

                min_len = 100  # int(min(tmp.keys()))
                max_len = 600  # int(max(tmp.keys()))
                read_lengths = []
                if mapped_reads == 0:
                    mapped_reads = 1
                for i in range(min_len, max_len):
                    if i in reads_per_length:
                        if reads_per_length[i]:
                            scaled_val = (
                                2.5 + math.log10(reads_per_length[i] / mapped_reads)
                            ) / 2
                            display_val = max(0.01, min(1, scaled_val)) * 100
                        else:
                            display_val = 0
                        real_val = 100.0 * (reads_per_length[i] / mapped_reads)
                    else:
                        display_val = 0
                        real_val = 0
                    read_lengths.append((i, display_val, real_val))
                result_stats["read_lengths"] = read_lengths

                result_stats["loci"] = sorted(
                    [
                        str(x)
                        for x in fuse_data["reads"]["germline"]
                        if fuse_data["reads"]["germline"][x][result_index] > 0
                    ]
                )

                result_stats["clones_5"] = 0
                result_stats["clones_5_details"] = {}
                for locus in fuse_data["reads"]["germline"].keys():
                    result_stats["clones_5_details"][locus] = len(
                        [
                            c
                            for c in fuse_data["clones"]
                            if (
                                c["germline"] == locus
                                and fuse_data["reads"]["germline"][locus][result_index]
                                and float(c["reads"][result_index])
                                / fuse_data["reads"]["germline"][locus][result_index]
                            )
                            > 0.05
                        ]
                    )
                    result_stats["clones_5"] += result_stats["clones_5_details"][locus]

                # !!! Contamination definition  : if pos != result_index, C present more than 0,01% and C bigger in result_index sample
                # !!! WARNING, contamination is computed only on current fused file ! So available for ONE shared set and ONE shared config
                result_stats["intra_contamination"] = len(
                    [
                        c
                        for c in fuse_data["clones"]
                        if len(
                            [
                                pos
                                for pos in range(len(c["reads"]))
                                if pos != result_index
                                and fuse_data["reads"]["segmented"][pos]
                                and fuse_data["reads"]["segmented"][result_index]
                                and (
                                    float(c["reads"][pos])
                                    / fuse_data["reads"]["segmented"][pos]
                                )
                                > 0.0001
                                and (
                                    float(c["reads"][result_index])
                                    / fuse_data["reads"]["segmented"][result_index]
                                )
                                > (
                                    float(c["reads"][pos])
                                    / fuse_data["reads"]["segmented"][pos]
                                )
                            ]
                        )
                    ]
                )

                if "diversity" in fuse_data:
                    # isinstance needed for old fused data. 
                    # New format use a dict with value by locus+global, old have only a direct global float value

                    shannon_diversity = NOT_APPLICABLE
                    if "index_H_entropy" in fuse_data["diversity"]:
                        if isinstance(fuse_data["diversity"]["index_H_entropy"][result_index], dict):
                            shannon_diversity = round(float(fuse_data["diversity"]["index_H_entropy"][result_index]["all"]), 3)
                        else:
                            shannon_diversity = round(float(fuse_data["diversity"]["index_H_entropy"][result_index]), 3)
                    result_stats["shannon_diversity"] = shannon_diversity
                    
                    pielou_evenness = NOT_APPLICABLE
                    if "index_E_equitability" in fuse_data["diversity"]:
                        if isinstance(fuse_data["diversity"]["index_E_equitability"][result_index], dict):
                            pielou_evenness = round(float(fuse_data["diversity"]["index_E_equitability"][result_index]["all"]), 3)
                        else:
                            pielou_evenness = round(float(fuse_data["diversity"]["index_E_equitability"][result_index]), 3)
                    result_stats["pielou_evenness"] = pielou_evenness
                    
                    simpson_diversity = NOT_APPLICABLE
                    if "index_E_equitability" in fuse_data["diversity"]:
                        if isinstance(fuse_data["diversity"]["index_Ds_diversity"][result_index], dict):
                            simpson_diversity = round(float(fuse_data["diversity"]["index_Ds_diversity"][result_index]["all"]), 3)
                        else:
                            simpson_diversity = round(float(fuse_data["diversity"]["index_Ds_diversity"][result_index]), 3)
                    result_stats["simpson_diversity"] = simpson_diversity

            if "pre_process" in fuse_data["samples"]:
                result_stats["pre_process"] = fuse_data["samples"]["pre_process"][
                    "producer"
                ][result_index]
            else:
                result_stats["pre_process"] = NOT_APPLICABLE
            fused_stats[results_file_id] = result_stats

    return fused_stats


def format_display_stats(result_fuse: dict, result_fused_stats: dict) -> None:
    display_stats_data = {}
    display_stats_data[SETS_COLUMN_NAME] = result_fuse["sets"]
    display_stats_data[SAMPLE_COLUMN_NAME] = result_fuse["filename"]
    display_stats_data[CONFIG_NAME_COLUMN_NAME] = result_fuse["config"]["name"]

    mapped_reads_percent = (
        100.0 * result_fused_stats["mapped_reads"] / result_fused_stats["total_reads"]
        if result_fused_stats["total_reads"]
        else 0
    )
    display_stats_data[MAPPED_READS_COLUMN_NAME] = stats_decorator.DataWithTitle(
        f"{mapped_reads_percent:.2f}%",
        f"{mapped_reads_percent:.2f}% ({result_fused_stats['mapped_reads']} / {result_fused_stats['total_reads']})"
        if result_fused_stats['total_reads']
        else f"{mapped_reads_percent:.2f}%",
    )
    display_stats_data[MAPPED_READS_NUMBER_COLUMN_NAME] = (
        f"{result_fused_stats['mapped_reads']} / {result_fused_stats['total_reads']}"
        if result_fused_stats['total_reads']
        else NOT_APPLICABLE
    )

    display_stats_data[MEAN_LENGTH_COLUMN_NAME] = result_fused_stats["mean_length"]
    display_stats_data[READ_LENGTHS_COLUMN_NAME] = result_fused_stats["read_lengths"]
    display_stats_data[LOCI_COLUMN_NAME] = result_fused_stats["loci"]

    if result_fused_stats["clones_5_details"] is not None:
        display_stats_data[CLONES_5_COLUMN_NAME] = stats_decorator.DataWithTitle(
            result_fused_stats["clones_5"], result_fused_stats["clones_5_details"]
        )
    else:
        display_stats_data[CLONES_5_COLUMN_NAME] = result_fused_stats["clones_5"]

    display_stats_data[INTRA_CONTAMINATION_COLUMN_NAME] = result_fused_stats[
        "intra_contamination"
    ]
    display_stats_data[MAIN_CLONE_COLUMN_NAME] = result_fused_stats["main_clone"]
    display_stats_data[MERGED_READS_COLUMN_NAME] = result_fused_stats["merged_reads"]
    display_stats_data[PRE_PROCESS_COLUMN_NAME] = result_fused_stats["pre_process"]
    display_stats_data[SHANNON_DIVERSITY_COLUMN_NAME] = result_fused_stats[
        "shannon_diversity"
    ]
    display_stats_data[PIELOU_EVENNESS_COLUMN_NAME] = result_fused_stats[
        "pielou_evenness"
    ]
    display_stats_data[SIMPSON_DIVERSITY_COLUMN_NAME] = result_fused_stats[
        "simpson_diversity"
    ]

    return display_stats_data


def format_tsv_stats(result_fuse: dict, result_fused_stats: dict) -> None:
    json_fused_stats = {}

    json_fused_stats["sets_ids"] = [
        format_json_data(set["id"]) for set in result_fuse["sets"]
    ]
    json_fused_stats["sets_names"] = [
        format_json_data(set["name"]) for set in result_fuse["sets"]
    ]
    json_fused_stats["sets_types"] = [
        format_json_data(set["type"]) for set in result_fuse["sets"]
    ]
    json_fused_stats["sequence_file_id"] = format_json_data(
        result_fuse["results_file"]["sequence_file_id"]
    )
    json_fused_stats["samples"] = format_json_data(result_fuse["filename"])
    json_fused_stats["config_id"] = format_json_data(
        result_fuse["results_file"]["config_id"]
    )
    json_fused_stats["config_name"] = format_json_data(result_fuse["config"]["name"])
    json_fused_stats["mapped_reads"] = format_json_data(
        result_fused_stats["mapped_reads"]
    )
    json_fused_stats["total_reads"] = format_json_data(
        result_fused_stats["total_reads"]
    )
    json_fused_stats["mean_length"] = format_json_data(
        result_fused_stats["mean_length"]
    )
    json_fused_stats["loci"] = format_json_data(result_fused_stats["loci"])
    json_fused_stats["clones_5"] = format_json_data(result_fused_stats["clones_5"])
    json_fused_stats["clones_5_details"] = format_json_data(
        result_fused_stats["clones_5_details"]
    )
    json_fused_stats["intra_contamination"] = format_json_data(
        result_fused_stats["intra_contamination"]
    )
    json_fused_stats["main_clone"] = format_json_data(result_fused_stats["main_clone"])
    json_fused_stats["merged_reads"] = format_json_data(
        result_fused_stats["merged_reads"]
    )
    json_fused_stats["pre_process"] = format_json_data(
        result_fused_stats["pre_process"]
    )
    json_fused_stats["shannon_diversity"] = format_json_data(
        result_fused_stats["shannon_diversity"]
    )
    json_fused_stats["pielou_evenness"] = format_json_data(
        result_fused_stats["pielou_evenness"]
    )
    json_fused_stats["simpson_diversity"] = format_json_data(
        result_fused_stats["simpson_diversity"]
    )
    json_fused_stats["abundance"] = format_json_data(result_fused_stats["abundance"])

    return json_fused_stats


def format_json_data(data_to_format):
    formatted_data = data_to_format
    if isinstance(data_to_format, dict):
        formatted_data = "; ".join(
            [f"{key}: {data_to_format[key]}" for key in sorted(data_to_format.keys())]
        )
    return formatted_data
