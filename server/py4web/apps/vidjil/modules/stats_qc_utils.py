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
        SETS_COLUMN_NAME: HeaderConfig("Sets", "Sets", sets_decorator, 200, True),
        SAMPLE_COLUMN_NAME: HeaderConfig("Sample", "Analyzed sample", stat_decorator, 200, False),
        CONFIG_NAME_COLUMN_NAME: HeaderConfig(
            "Config name", "Name of the configuration used", stat_decorator, 120, False
        ),
        MAPPED_READS_COLUMN_NAME: HeaderConfig(
            "Mapped reads", "Percentage of mapped reads", stat_decorator, 55, False
        ),
        MAPPED_READS_NUMBER_COLUMN_NAME: HeaderConfig(
            "Mapped reads number", "Number of mapped reads / Total number of reads", stat_decorator, 100, True
        ),
        MEAN_LENGTH_COLUMN_NAME: HeaderConfig("Mean length", "Mean length of the reads", stat_decorator, 50, False),
        READ_LENGTHS_COLUMN_NAME: HeaderConfig(
            "Reads lengths", "Distribution of reads lengths", genescan_decorator, 200, False
        ),
        LOCI_COLUMN_NAME: HeaderConfig("Loci", "Loci found in the analysis", loci_list_decorator, 150, False),
        CLONES_5_COLUMN_NAME: HeaderConfig("clones ≥5%", "Number of clones ≥5% found for each loci", stat_decorator, 50, False),
        INTRA_CONTAMINATION_COLUMN_NAME: HeaderConfig(
            "Conta.", "Intra-contamination", stat_decorator, 50, False
        ),
        MAIN_CLONE_COLUMN_NAME: HeaderConfig("Main clone", "Main clone found", stat_decorator, 400, False),
        MERGED_READS_COLUMN_NAME: HeaderConfig(
            "Merged reads", "Merged reads", stat_decorator, 50, True
        ),
        PRE_PROCESS_COLUMN_NAME: HeaderConfig("Pre process", "Pre process", stat_decorator, 50, True),
        SHANNON_DIVERSITY_COLUMN_NAME: HeaderConfig(
            "Shannon's diversity", "Shannon's diversity", stat_decorator, 70, False
        ),
        PIELOU_EVENNESS_COLUMN_NAME: HeaderConfig(
            "Pielou's evenness", "Pielou's evenness", stat_decorator, 70, True
        ),
        SIMPSON_DIVERSITY_COLUMN_NAME: HeaderConfig(
            "Simpson's diversity", "Pielou's evenness", stat_decorator, 70, True
        ),
    }
    # 'reads' : HeaderConfig('reads', 'parser', stat_decorator, False),
    # HeaderConfig('mapped_percent', 'parser', bar_decorator, False),
    # HeaderConfig('bool', 'parser', boolean_decorator, False),
    # HeaderConfig('bool_true', 'parser', boolean_decorator, False),
    # HeaderConfig('distribution', 'parser', labeled_bar_chart_decorator, False),
    # HeaderConfig('abundance', 'parser', labeled_bar_chart_decorator, False),


def get_stat_data(results_file_ids):
    # Get fuse_data
    fuse_data = get_fuse_data(results_file_ids)

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


def get_fuse_data(results_file_ids: List[int]) -> dict:
    # Get raw data
    query = db(
        (db.results_file.id.belongs(results_file_ids))
        & (db.sequence_file.id == db.results_file.sequence_file_id)
        & (db.config.id == db.results_file.config_id)
        & (db.sample_set_membership.sequence_file_id == db.sequence_file.id)
        & (db.sample_set.id == db.sample_set_membership.sample_set_id)
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
            tmp["sets"] = []
            tmp_fuse["results_files"][tmp["results_file_id"]] = tmp
            tmp.pop("set_id", None)
            tmp.pop(set_type, None)
            tmp.pop("set_info", None)
        else:
            tmp = tmp_fuse["results_files"][result_fuse["results_file_id"]]

        # Create a list of set with this sample
        for sub_pos_set in sample_query_pos[str(result_fuse["results_file"])]:
            sub_res = query[sub_pos_set]
            sample_set = {}
            sample_set["set_type"] = sub_res["sample_type"]
            sample_set["id"] = sub_res["set_id"]
            sample_set["name"] = helpers[sub_res["sample_type"]].get_name(
                sub_res[sub_res["sample_type"]]
            )
            sample_set["info"] = sub_res["set_info"]
            sample_set["type"] = sub_res["sample_type"]
            tmp["sets"].append(sample_set)
        # Reorder set by type
        tmp["sets"] = sorted(
            tmp[SETS_COLUMN_NAME],
            key=lambda _set: set_types.index(_set["set_type"]),
            reverse=False,
        )

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

            result_stats["mapped_reads"] = mapped_reads
            result_stats["total_reads"] = reads

            if "merged" in fuse_data["reads"]:
                result_stats["merged_reads"] = fuse_data["reads"]["merged"][
                    result_index
                ]
            else:
                result_stats["merged_reads"] = NOT_APPLICABLE

            if not fuse_data["reads"]["segmented"][result_index]:
                # Case of file without one read seen segmented
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
            else:
                sorted_clones = sorted(
                    top_clones,
                    key=lambda clone: clone["reads"][result_index],
                    reverse=True,
                )
                if "name" in sorted_clones[0]:
                    result_stats["main_clone"] = sorted_clones[0]["name"]
                else:
                    result_stats["main_clone"] = sorted_clones[0]["germline"]

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
                tmp_list = []
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
                    tmp_list.append((i, display_val, real_val))
                result_stats["read_lengths"] = tmp_list

                result_stats["loci"] = sorted(
                    [
                        str(x)
                        for x in fuse_data["reads"]["germline"]
                        if fuse_data["reads"]["germline"][x][result_index] > 0
                    ]
                )

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
                    result_stats["shannon_diversity"] = (
                        round(
                            (fuse_data["diversity"]["index_H_entropy"][result_index]), 3
                        )
                        if "index_H_entropy" in fuse_data["diversity"]
                        else NOT_APPLICABLE
                    )
                    result_stats["pielou_evenness"] = (
                        round(
                            (
                                fuse_data["diversity"]["index_E_equitability"][
                                    result_index
                                ]
                            ),
                            3,
                        )
                        if "index_E_equitability" in fuse_data["diversity"]
                        else NOT_APPLICABLE
                    )
                    result_stats["simpson_diversity"] = (
                        round(
                            (
                                fuse_data["diversity"]["index_Ds_diversity"][
                                    result_index
                                ]
                            ),
                            3,
                        )
                        if "index_Ds_diversity" in fuse_data["diversity"]
                        else NOT_APPLICABLE
                    )

            result_stats["clones_5"] = sum(
                [
                    fuse_data["reads"]["distribution"][key][result_index]
                    for key in fuse_data["reads"]["germline"]
                    if key in fuse_data["reads"]["distribution"]
                ]
            )

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
        f"{mapped_reads_percent:.2f}% ({result_fused_stats['mapped_reads']} / {result_fused_stats['total_reads']})",
    )
    display_stats_data[MAPPED_READS_NUMBER_COLUMN_NAME] = (
        f"{result_fused_stats['mapped_reads']} / {result_fused_stats['total_reads']}"
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
