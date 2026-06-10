QUnit.module("MRD Normalization", {
});

// Base test data: 1 regular IGH clone + 1 IGH spike clone, 1 sample with full MRD supplementary data.
var mrd_json_data = {
    "vidjil_json_version": "2016b",
    "clones": [
        {
            "germline": "IGH",
            "name": "test MRD",
            "sequence": "real clonotype",
            "top": 1,
            "supplementary_data": {
                "mrd": {
                    "is_spike": [false],
                    "normalized_reads": [2],
                    "normalized_cells": [1],
                    "locus_normalization_factor": [3]
                }
            },
            "warn": [],
            "reads": [634],
            "id": "ACGGCTGTGTATGCCAAGGGACC"
        },
        {
            "germline": "IGH",
            "name": "spike clonotype",
            "sequence": "a sequence",
            "top": 2,
            "supplementary_data": {
                "mrd": {
                    "is_spike": [true],
                    "is_missing": [false],
                    "is_outlier": [false],
                    "spike_normalization_factor": [4],
                    "locus_normalization_factor": [3]
                }
            },
            "warn": [],
            "reads": [634],
            "id": "ACGGCTGTactgatcGGGACC"
        }
    ],
    "germlines": {
        "ref": "http://www.vidjil.org/germlines/germline-59.tar.gz",
        "species": "Homo sapiens",
        "species_taxon_id": 9606
    },
    "reads": {
        "germline": {
            "IGH": [5000]
        },
        "segmented": [5000],
        "total": [5000]
    },
    "samples": {
        "commandline": ["./vidjil-algo -g germline/homo-sapiens.g demo/blabla.fa"],
        "log": ["log content string"],
        "number": 1,
        "original_names": ["demo/blabla.fa"],
        "producer": ["vidjil-algo dev 40034e517 (2024-02-03)"],
        "run_timestamp": ["2024-02-03 16:29:22"],
        "supplementary_data": {
            "mrd": {
                "normalization": [true],
                "total_cells": [300000],
                "sensitivity": [0.00001],
                "sample_cell_count": [100000],
                "total_normalized_reads": [3163],
                "locus_normalization_factor": {
                    "IGH": [
                        {
                            "lower_bound": 0.24,
                            "upper_bound": 3.53,
                            "value": 1.93
                        }
                    ],
                    "IGK": [
                        {
                            "lower_bound": null,
                            "upper_bound": null,
                            "value": null
                        }
                    ]
                }
            }
        }
    }
};


QUnit.test("Clone: getNormalizedReads and getNormalizedCells", function(assert) {
    var m = new Model();
    m.parseJsonData(mrd_json_data);
    m.initClones();
    var c1 = m.clones[0]; // regular clone
    var c2 = m.clones[1]; // spike clone (no normalized_reads/cells fields)

    assert.equal(c1.getNormalizedReads(0), 2, "regular clone: getNormalizedReads returns correct value");
    assert.equal(c1.getNormalizedCells(0), 1, "regular clone: getNormalizedCells returns correct value");
    assert.equal(c2.getNormalizedReads(0), "undefined", "spike clone: getNormalizedReads returns 'undefined'");
    assert.equal(c2.getNormalizedCells(0), "undefined", "spike clone: getNormalizedCells returns 'undefined'");
});

QUnit.test("Clone: getNormalizedReads and getNormalizedCells edge cases", function(assert) {
    var m = new Model();
    m.parseJsonData(mrd_json_data);
    m.initClones();

    // No supplementary_data
    var clone_no_mrd = new Clone({"sequence": "aaaa", "name": "no mrd", "id": "id_no_mrd", "reads": [10], "germline": "IGH"}, m, 0, c_attributes);
    assert.equal(clone_no_mrd.getNormalizedReads(0), 'undefined', "no supplementary_data: getNormalizedReads returns 'undefined'");
    assert.equal(clone_no_mrd.getNormalizedCells(0), 'undefined', "no supplementary_data: getNormalizedCells returns 'undefined'");

    // Out-of-bounds time index
    var c1 = m.clones[0];
    assert.equal(c1.getNormalizedReads(10), 'undefined', "out-of-bounds timeID: getNormalizedReads returns 'undefined'");
    assert.equal(c1.getNormalizedCells(10), 'undefined', "out-of-bounds timeID: getNormalizedCells returns 'undefined'");
});

QUnit.test("Clone: getNormalizedReads and getNormalizedCells with null values", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    // add a clone with null normalized_reads and normalized_cells to cover that edge case
    test_data.clones.push({
        "germline": "IGH",
        "name": "null mrd clone",
        "sequence": "aaaa",
        "top": 3,
        "supplementary_data": {
            "mrd": {
                "is_spike": [false],
                "normalized_reads": [null],
                "normalized_cells": [null],
                "locus_normalization_factor": [null]
            }
        },
        "reads": [100],
        "id": "id_null_mrd"
    });
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();
    var c_null = m.clones[2];

    assert.equal(c_null.getNormalizedReads(0), 'undefined', "null normalized_reads: returns 'undefined'");
    assert.equal(c_null.getNormalizedCells(0), 'undefined', "null normalized_cells: returns 'undefined'");
});

QUnit.test("Clone: getSpikeNormalizationFactor", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    // Add a spike clone with null spike_normalization_factor to cover that edge case
    test_data.clones.push({
        "germline": "IGH",
        "name": "spike with null factor",
        "sequence": "null_spike_seq",
        "top": 3,
        "supplementary_data": {
            "mrd": {
                "is_spike": [true],
                "is_missing": [false],
                "is_outlier": [false],
                "spike_normalization_factor": [null],
                "locus_normalization_factor": [3]
            }
        },
        "warn": [],
        "reads": [634],
        "id": "null_spike_id"
    });
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();
    var c1 = m.clones[0]; // regular clone (no spike_normalization_factor)
    var c2 = m.clones[1]; // spike clone with spike_normalization_factor: [4]
    var c3 = m.clones[2]; // spike clone with spike_normalization_factor: [null]

    assert.equal(c1.getSpikeNormalizationFactor(0), 'undefined', "regular clone: returns 'undefined'");
    assert.equal(c2.getSpikeNormalizationFactor(0), 4, "spike clone: returns correct value");
    assert.equal(c3.getSpikeNormalizationFactor(0), 'undefined', "spike clone with null factor: returns 'undefined'");
});

QUnit.test("Model: getSampleMRDTotal and have_mrd_normalization", function(assert) {
    var m = new Model();
    m.parseJsonData(mrd_json_data);
    m.initClones();

    assert.equal(m.getSampleMRDTotal(0), 3163, "getSampleMRDTotal returns correct value");
    assert.equal(m.have_mrd_normalization, true, "have_mrd_normalization is true when MRD data is available");
});

QUnit.test("Model: getSampleMRDTotal and have_mrd_normalization without MRD data", function(assert) {
    var test_data = {
        "vidjil_json_version": "2016b",
        "clones": [],
        "reads": {"germline": {"IGH": [500]}, "segmented": [500], "total": [500]},
        "samples": {
            "commandline": ["./vidjil-algo -g germline/homo-sapiens.g demo/blabla.fa"],
            "log": ["log content string"],
            "number": 1,
            "original_names": ["demo/blabla.fa"],
            "producer": ["vidjil-algo dev 40034e517 (2024-02-03)"],
            "run_timestamp": ["2024-02-03 16:29:22"]
        }
    };
    var m = new Model();
    m.parseJsonData(test_data);

    assert.equal(m.getSampleMRDTotal(0), undefined, "getSampleMRDTotal returns undefined when no MRD data");
    assert.equal(m.have_mrd_normalization, false, "have_mrd_normalization is false when no MRD data");
});

QUnit.test("Clone: getSize with NORM_MRD_READS mode", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();
    m.set_normalization(m.NORM_MRD_READS);
    var c1 = m.clones[0]; // regular clone: normalized_reads=[2], total_normalized_reads=3163
    var c2 = m.clones[1]; // spike clone: no normalized_reads, fallback to reads / segmented_reads

    // c1: uses normalized_reads / total_normalized_reads
    assert.equal(c1.getSize(0), 2 / 3163, "regular clone: getSize returns normalized_reads / total_normalized_reads");

    // c2: no normalized_reads → fallback to reads[0] / reads.segmented[0] = 634 / 5000
    assert.equal(c2.getSize(0), 634 / 5000, "spike clone: getSize falls back to reads / total_segmented_reads");
});

QUnit.test("Model: normalization mode constants and set_normalization", function(assert) {
    var m = new Model();
    m.parseJsonData(mrd_json_data);

    assert.equal(m.NORM_MRD_READS, "mrd_normalized_reads", "NORM_MRD_READS constant has correct value");
    m.set_normalization(m.NORM_MRD_READS);
    assert.equal(m.normalization_mode, m.NORM_MRD_READS, "valid mode: normalization_mode is updated");
    m.set_normalization("invalid_mode");
    assert.equal(m.normalization_mode, m.NORM_FALSE, "invalid mode: normalization_mode reverts to NORM_FALSE");
});

QUnit.test("Clone: getHtmlInfo with MRD normalization data", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();
    var c1 = m.clones[0]; // regular clone
    var c2 = m.clones[1]; // spike clone

    var html_c1 = c1.getHtmlInfo();
    assert.includes(html_c1, "MRD normalization", "regular clone: MRD normalization header is present");
    assert.includes(html_c1, "normalized cells", "regular clone: 'normalized cells' row is present");
    assert.includes(html_c1, "normalized reads", "regular clone: 'normalized reads' row is present");
    assert.includes(html_c1, "locus normalization factor", "regular clone: 'locus normalization factor' row is present");
    // normalized_cells=[1], normalized_reads=[2], locus_normalization_factor=[3] all formatted to 3 decimals (4 significant digits)
    assert.includes(html_c1, "1.000", "regular clone: normalized_cells value formatted correctly");
    assert.includes(html_c1, "2.000", "regular clone: normalized_reads value formatted correctly");
    assert.includes(html_c1, "3.000", "regular clone: locus_normalization_factor value formatted correctly");

    var html_c2 = c2.getHtmlInfo();
    assert.includes(html_c2, "MRD normalization", "spike clone: MRD normalization header is present");
    assert.includes(html_c2, "spike normalization factor", "spike clone: 'spike normalization factor' row is present");
    assert.includes(html_c2, "4.000", "spike clone: spike_normalization_factor value formatted correctly");
});

QUnit.test("Clone: getHtmlInfo without MRD normalization data", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    test_data.clones.push({
        "germline": "IGH",
        "name": "clone without MRD",
        "sequence": "aaaa",
        "top": 3,
        "reads": [100],
        "id": "id_no_mrd"
    });
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();
    var html = m.clones[2].getHtmlInfo();

    assert.notIncludes(html, "MRD normalization", "MRD normalization header is absent");
    assert.notIncludes(html, "normalized cells", "'normalized cells' row is absent");
    assert.notIncludes(html, "normalized reads", "'normalized reads' row is absent");
    assert.notIncludes(html, "locus normalization factor", "'locus normalization factor' row is absent");
});

QUnit.test("Axis: Normalized cells", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();
    var c1 = m.clones[0]; // regular clone with normalized_cells: [1]
    var c2 = m.clones[1]; // spike clone without normalized_cells

    assert.equal(AXIS_DEFAULT["Normalized cells"].fct(c1, 0), 1, "regular clone: returns correct value (1)");
    assert.equal(AXIS_DEFAULT["Normalized cells"].fct(c2, 0), undefined, "spike clone: returns undefined (no normalized_cells)");
});

QUnit.test("Axis: Normalized reads", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();
    var c1 = m.clones[0]; // regular clone with normalized_reads: [2]
    var c2 = m.clones[1]; // spike clone without normalized_reads

    assert.equal(AXIS_DEFAULT["Normalized reads"].fct(c1, 0), 2, "regular clone: returns correct value (2)");
    assert.equal(AXIS_DEFAULT["Normalized reads"].fct(c2, 0), undefined, "spike clone: returns undefined (no normalized_reads)");
});

QUnit.test("Axis: Spike factors", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();
    var c1 = m.clones[0]; // regular clone without spike_normalization_factor
    var c2 = m.clones[1]; // spike clone with spike_normalization_factor: [4]

    assert.equal(AXIS_DEFAULT["Spike factors"].fct(c1, 0), undefined, "regular clone: returns undefined (no spike factor)");
    assert.equal(AXIS_DEFAULT["Spike factors"].fct(c2, 0), "4.00", "spike clone: returns value formatted to 2 decimals");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - full structure", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();

    // Base data: sensitivity=[0.00001], sample_cell_count=[100000], IGH (non-null), IGK (all-null)
    var data = m.getPointHtmlInfoDataMRD(0);

    // Expected order: MRD header | Sensitivity | Sample cell count | norm-factors header | col-header | IGH | IGK
    assert.equal(data.length, 7, "returns 7 entries");

    assert.equal(data[0][0], header, "data[0] uses header function");
    assert.equal(data[0][1], "MRD", "data[0] is the 'MRD' header");

    assert.equal(data[1][0], row_from_list, "data[1] uses row_from_list");
    assert.equal(data[1][1], "Sensitivity", "data[1] is the Sensitivity row");
    assert.equal(data[1][2][0], 0.00001, "data[1] sensitivity value is 0.00001");
    assert.equal(data[1][3], "mrd_sensitivity", "data[1] id is 'mrd_sensitivity'");

    assert.equal(data[2][0], row_from_list, "data[2] uses row_from_list");
    assert.equal(data[2][1], "Sample cell count", "data[2] is the Sample cell count row");
    assert.equal(data[2][2][0], 100000, "data[2] sample_cell_count value is 100000");
    assert.equal(data[2][3], "mrd_sample_cell_count", "data[2] id is 'mrd_sample_cell_count'");

    assert.equal(data[3][0], header, "data[3] uses header function");
    assert.equal(data[3][1], "MRD normalization factors", "data[3] is the 'MRD normalization factors' header");

    assert.equal(data[4][0], row_from_list, "data[4] uses row_from_list");
    assert.deepEqual(data[4][2], ["value", "lower bound", "individual spike normalization factors", "upper bound"],
        "data[4] column header values are correct");

    assert.equal(data[5][0], row_from_list, "data[5] uses row_from_list");
    assert.equal(data[5][1], "IGH", "data[5] is the IGH locus row");
    assert.equal(data[5][3], "mrd_locus_norm_factor_IGH", "data[5] id is correct");
    assert.equal(data[5][2][0], 1.93, "data[5] IGH value is 1.93");
    assert.equal(data[5][2][1], 0.24, "data[5] IGH lower_bound is 0.24");
    assert.equal(data[5][2][3], 3.53, "data[5] IGH upper_bound is 3.53");

    assert.equal(data[6][1], "IGK", "data[6] is the IGK locus row");
    assert.equal(data[6][3], "mrd_locus_norm_factor_IGK", "data[6] id is correct");
    assert.deepEqual(data[6][2], [null, null, null, null], "data[6] IGK values are all null");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - spike factor in IGH locus row", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();

    var data = m.getPointHtmlInfoDataMRD(0);
    var ighRow = data.find(function(row) { return row[1] === "IGH"; });
    assert.ok(ighRow !== null && ighRow !== undefined, "IGH row found in data");

    // spike_val is at position [2][2]: a <span> wrapping the formatted spike factor
    var spikeVal = ighRow[2][2];
    assert.ok(spikeVal !== null && spikeVal !== undefined, "IGH spike factor is not null (spike clone exists)");
    assert.ok(typeof spikeVal === 'string' && spikeVal.indexOf("<span>") !== -1, "IGH spike factor is wrapped in <span>");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - spike_val is null when no spike clone", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    test_data.clones[1].supplementary_data.mrd.is_spike = [false];
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var data = m.getPointHtmlInfoDataMRD(0);
    var ighRow = data.find(function(row) { return row[1] === "IGH"; });
    assert.ok(ighRow !== null && ighRow !== undefined, "IGH row found in data");
    assert.equal(ighRow[2][2], null, "spike_val is null when no spike clone exists for IGH");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - null sensitivity row is skipped", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    test_data.samples.supplementary_data.mrd.sensitivity = [null];
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var data = m.getPointHtmlInfoDataMRD(0);

    // The 'MRD' header is always present; only the Sensitivity row is skipped
    assert.ok(data.some(function(row) { return row[0] === header && row[1] === "MRD"; }),
        "'MRD' header is always present even when sensitivity is null");
    assert.ok(!data.some(function(row) { return row[1] === "Sensitivity"; }),
        "Sensitivity row is absent when sensitivity is null");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - null sample_cell_count row is skipped", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    test_data.samples.supplementary_data.mrd.sample_cell_count = [null];
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var data = m.getPointHtmlInfoDataMRD(0);
    assert.ok(!data.some(function(row) { return row[1] === "Sample cell count"; }),
        "Sample cell count row is absent when sample_cell_count is null");
});

QUnit.test("Model: getPointHtmlInfoDataMRD - normalization-factors section absent when all locus data is null", function(assert) {
    var test_data = JSON.parse(JSON.stringify(mrd_json_data));
    test_data.samples.supplementary_data.mrd.locus_normalization_factor = {
        "IGH": [{"value": null, "lower_bound": null, "upper_bound": null}],
        "IGK": [{"value": null, "lower_bound": null, "upper_bound": null}]
    };
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var data = m.getPointHtmlInfoDataMRD(0);

    // MRD header + Sensitivity row + Sample cell count row; no normalization-factors section
    assert.equal(data.length, 3, "returns 3 entries (MRD header + sensitivity + sample_cell_count)");
    assert.ok(!data.some(function(row) { return row[1] === "MRD normalization factors"; }),
        "normalization-factors header is absent");
});

QUnit.test("Model: getPointHtmlInfo - no MRD section when supplementary_data is absent", function(assert) {
    var test_data = {
        "vidjil_json_version": "2016b",
        "clones": [],
        "reads": {"germline": {"IGH": [500]}, "segmented": [500], "total": [500]},
        "samples": {
            "commandline": ["cmd"], "number": 1, "original_names": ["demo.fa"],
            "producer": ["vidjil-algo"], "run_timestamp": ["2024-01-01 00:00:00"]
        }
    };
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var html = m.getPointHtmlInfo(0);
    assert.notIncludes(html, "info_mrd", "no info_mrd div when supplementary_data is absent");
    assert.notIncludes(html, "MRD normalization", "no MRD content when supplementary_data is absent");
});

QUnit.test("Model: getPointHtmlInfo - no MRD section when mrd key is absent from supplementary_data", function(assert) {
    var test_data = {
        "vidjil_json_version": "2016b",
        "clones": [],
        "reads": {"germline": {"IGH": [500]}, "segmented": [500], "total": [500]},
        "samples": {
            "commandline": ["cmd"], "number": 1, "original_names": ["demo.fa"],
            "producer": ["vidjil-algo"], "run_timestamp": ["2024-01-01 00:00:00"],
            "supplementary_data": {}
        }
    };
    var m = new Model();
    m.parseJsonData(test_data);
    m.initClones();

    var html = m.getPointHtmlInfo(0);
    assert.notIncludes(html, "info_mrd", "no info_mrd div when mrd key is absent from supplementary_data");
    assert.notIncludes(html, "MRD normalization", "no MRD content when mrd key is absent from supplementary_data");
});

QUnit.test("Model: getPointHtmlInfo - sensitivity formatted in exponential notation", function(assert) {
    var m = new Model();
    m.parseJsonData(JSON.parse(JSON.stringify(mrd_json_data)));
    m.initClones();

    var html = m.getPointHtmlInfo(0);

    // sensitivity=0.00001: nice_number_digits(1e-5, 4)=8, nice_display(1e-5, 8) => toExponential(3) = "1.000e-5"
    assert.includes(html, "1.000e-5", "sensitivity value 0.00001 is rendered as '1.000e-5' in exponential notation");
});
