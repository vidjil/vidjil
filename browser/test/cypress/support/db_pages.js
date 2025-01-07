Cypress.Commands.add("initDatabase", (host) => {

  // init database if button is present at opening of page
  if (host == "local") {
    cy.log(`initiated_database: ${Cypress.env("initiated_database")}`);
    if (Cypress.env("initiated_database") === false) {
      // allow to bypass waiting

      cy.visit("http://localhost/browser");
      cy.get("#db_content > h2", { timeout: 10000 }).should("contain", "Login");

      cy.get("body").then(($body) => {
        var init_button = $body.find(":contains('init database')").length > 0;

        if (init_button) {
          cy.contains("init database").click();

          cy.get("#email", { timeout: 10000 })
            .should("exist")
            .should("be.visible")
            .type("plop@plop.com");
          cy.get("#password").type("foobartest");
          cy.get("#confirm_password").type("foobartest");
          cy.get("#data_form").contains("save").click();
          cy.wait("@getActivities");

          cy.get("#auth_user_email", { timeout: 10000 })
            .should("exist")
            .should("be.visible");
        }
        cy.exec('export initiated_database="true"');
      });
    } else {
      cy.log("Init database already done");
    }
  }
});

// Cypress.Commands.add("initTestDb", (host) => {
//   if (host == "local") {
//     cy.request("http://localhost/vidjil/test/init_test_db");
//   }
// });

Cypress.Commands.add("isDbPageVisible", () => {
  cy.get('[data-cy="db_div"]').then(($db_div) => {
    if ($db_div.is(":visible")) {
      return true;
    } else {
      return false;
    }
  });
});

Cypress.Commands.add("openDBPage", () => {
  cy.isDbPageVisible().then((val) => {
    if (val == false) {
      cy.get("#db_menu div")
        .first()
        .invoke("show")
        .contains("open list")
        .should("be.visible")
        .click({ force: true });
      cy.wait("@getActivities");

      cy.get('[data-cy="db_div"]').should("be.visible");
    }
  });
});

Cypress.Commands.add("closeDBPage", () => {
  cy.isDbPageVisible().then((val) => {
    if (val == true) {
      cy.get(".db_div > .closeButton > .icon-cancel").click();
      cy.wait("@getActivities");

      cy.get('[data-cy="db_div"]').should("not.visible");
    }
  });
});

/**
 * Allow to openDBpage if needed and to go to the correct token (patient/run/set)
 * Use an intercept on GET method to fire event after recept of request
 * Allow to not get error if db table is render again between multiple call
 * @param  {[type]} 'goToTokenPage' Name of function
 * @param  {[type]} (token)         Token to call (patient, run or set)
 * @return {[type]}
 */
Cypress.Commands.add("goToTokenPage", (token) => {
  cy.log("goToTokenPage " + token);

  cy.openDBPage().then(() => {
    cy.get("#db_menu > ." + token + "_token")
      .contains("" + token + "s")
      .click({ force: true });
    cy.wait(["@postAllSampleSets", "@getActivities"]);

    cy.get('[data-cy="db_div"]').should("contain", " + new " + token + "s ");
  });
});

/**
 * Go to db patient page; open db if needed and call patient page
 */
Cypress.Commands.add("goToPatientPage", () => {
  cy.goToTokenPage("patient");
});

/**
 * Go to db run page; open db if needed and call patient page
 */
Cypress.Commands.add("goToRunPage", () => {
  cy.goToTokenPage("run");
});

/**
 * Go to db set page; open db if needed and call patient page
 */
Cypress.Commands.add("goToSetPage", () => {
  cy.goToTokenPage("set");
});

/**
 * Allow to openDBpage if needed and to go to the correct token (patient/run/set)
 * Use an intercept on GET method to fire event after recept of request
 * Allow to not get error if db table is render again between multiple call
 * @param  {[type]} 'goToTokenPage' Name of function
 * @param  {[type]} (token)         Token to call (patient, run or set)
 * @return {[type]}
 */
Cypress.Commands.add('goToDbPage', (dbPage, page, page_header) => {
  cy.openDBPage().then(() => {
    cy.get(dbPage)
      .should('be.visible')
      .click( { force: true} )
    cy.wait("@getActivities")

    cy.get(page)
      .should('exist')
      .should('contain', page_header)
  })
})

/**
 * Go to db page
 */

Cypress.Commands.add('goToUsagePage', () => {
  cy.goToDbPage("#db_page_usage", "#page_usage", "Usage")
})
Cypress.Commands.add('goToProcessPage', () => {
  cy.goToDbPage("#db_page_processes", "#page_jobs", "")
})

Cypress.Commands.add('goToNewsPage', () => {
  cy.goToDbPage("#db_page_news", "#page_news", "News")
})
Cypress.Commands.add('goToLogsPage', () => {
  cy.goToDbPage("#db_page_logs", "#page_user_logs", "Logs")
})

Cypress.Commands.add('goToLogsPage', () => {
  cy.goToDbPage("#db_page_logs", "#page_user_logs", "Logs")
})

/////////////////
// Admin db page
/////////////////

Cypress.Commands.add('goToPreprocessPage', () => {
  cy.goToDbPage("#db_page_preprocess", "#page_preprocess", "Pre-process list")
})
Cypress.Commands.add('goToConfigsPage', () => {
  cy.goToDbPage("#db_page_configs", "#page_process", "Configs")
})

Cypress.Commands.add('goToGroupsPage', () => {
  cy.goToDbPage("#db_page_groups", "#page_group", "Groups")
})
Cypress.Commands.add('goToUsersPage', () => {
  cy.goToDbPage("#db_page_users", "#page_user", "Users")
})
Cypress.Commands.add('goToAdminPage', () => {
  cy.goToDbPage("#db_page_admin", "#page_admin", "Admin")
})

/**
 * Create a patient and fill its information
 */
Cypress.Commands.add(
  "createPatient",
  (
    id,
    first_name,
    last_name,
    birthday,
    information,
    owner,
    expected_display_name = ""
  ) => {
    cy.goToPatientPage();

    cy.get(`#create_new_set_type_patient`).click();
    cy.wait("@getActivities");

    cy.get("h3").should("contain", "Add patients, runs, or sets");
    cy.fillPatient(0, id, first_name, last_name, birthday, information, owner);

    cy.get(".btn").click();
    cy.wait("@getActivities");

    cy.get(".db_div").as("db_div");

    cy.get("@db_div").should("contain", " + add samples");

    if (expected_display_name == "") {
      expected_display_name = last_name + " " + first_name;
    }
    cy.get(".set_token").should("contain", expected_display_name);

    var uid_value = 0;
    cy.get("@db_div")
      .find(".uid")
      .then(($uid) => {
        uid_value = $uid[0].innerText;
        return cy.wrap(uid_value);
      });
  }
);
/**
 * Edit a patient
 * Take same parameter as create, except a first parameter set_id to update
 */
Cypress.Commands.add(
  "editPatient",
  (set_id, id, first_name, last_name, birthday, info) => {
    cy.goToTokenPage("patient");

    cy.get(
      `[onclick="db.call('sample_set/form', {'id' :'${set_id}'} )"] > .icon-pencil-2`
    ).click();
    cy.wait("@getActivities");

    cy.get("h3").should("contain", "Edit patient, run, or set");

    cy.fillPatient(
      0,
      id,
      first_name,
      last_name,
      birthday,
      info,
      null,
      true
    );

    cy.get(".btn").click();
    cy.wait("@getActivities");

    cy.get(".db_div").should("contain", " + add samples");

    cy.get(".set_token").should("contain", last_name + " " + first_name);
  }
);

Cypress.Commands.add(
  "controlPatientInfos",
  (index, id, first_name, last_name, birthday, info, owner = "") => {
    cy.get("h3 > .set_token").should("contain", last_name + " " + first_name);

    if (id != "") {
      cy.get(":nth-child(1) > .db_block > .db_block_left").should(
        "contain",
        id
      );
    }
    if (birthday != "") {
      cy.get(":nth-child(1) > .db_block > .db_block_left").should(
        "contain",
        "(" + birthday + ")"
      );
    }

    if (info != "") {
      cy.get("#db_table_container").should("contain", info);
    }
    if (owner != null) {
      // For the moment, test only one owner, but a sample can belong to multiple owner.
      // In this case; launch multiple time this function
      cy.get(".owner").should("contain", owner);
    }
  }
);

Cypress.Commands.add(
  "fillPatient",
  (
    index,
    id,
    first_name,
    last_name,
    birthday,
    info,
    owner,
    clear = false
  ) => {
    if (owner != null) {
      cy.get("#group_select").select(owner);
    }
    if (id != "") {
      cy.clearAndType("#patient_id_label_" + index.toString(), id, clear);
    } else {
      if (clear) {
        cy.get("#patient_id_label_" + index.toString()).clear();
      }
    }
    cy.clearAndType(
      "#patient_first_name_" + index.toString(),
      first_name,
      clear
    );
    cy.clearAndType("#patient_last_name_" + index.toString(), last_name, clear);
    if (birthday != "") {
    cy.clearAndType("#patient_birth_" + index.toString(), birthday, clear);
    } else {
      if (clear) {
        cy.get("#patient_birth_" + index.toString()).clear();
      }
    }
    if (info != "") {
      cy.clearAndType("#patient_info_" + index.toString(), info, clear);
    } else {
      if (clear) {
        cy.get("#patient_info_" + index.toString()).clear();
      }
    }
  }
);

Cypress.Commands.add(
  "clearAndType",
  (input_get_pattern, value_to_type, clear = false) => {
    cy.get(input_get_pattern).then(($input) => {
      if (clear) {
        cy.wrap($input).clear();
      }
      cy.wrap($input).type(value_to_type);
    });
  }
);

/**
 * Create a run
 */
Cypress.Commands.add("createRun", (id, run_name, date, info, owner) => {
  cy.goToRunPage();

  cy.get(`#create_new_set_type_run`).click();
  cy.wait("@getActivities");

  if (owner != null) {
    cy.get("#group_select").select(owner);
  }
  cy.fillRun(0, id, run_name, date, info);

  cy.get(".btn").click();
  cy.wait("@getActivities");

  cy.get(".db_div").should("contain", " + add samples");

  cy.get(".set_token").should("contain", run_name);
});

Cypress.Commands.add("fillRun", (index, id, run_name, date, info) => {
  if (id != "") {
    cy.get("#run_id_label_" + index.toString()).type(id);
  }
  cy.get("#run_name_" + index.toString()).type(run_name);
  cy.get("#run_date_" + index.toString()).type(date);
  if (info != "") {
    cy.get("#run_info_" + index.toString()).type(info);
  }
});

/**
 * Alias of multiSamplesAdd for only one sample
 * Add a sample; should be called from an open set (patient/run/set)
 */
Cypress.Commands.add(
  "addSample",
  (
    preprocess,
    storage,
    filename1,
    filename2,
    sampling_date,
    info,
    common_set
  ) => {
    cy.multiSamplesAdd([
      [
        preprocess,
        storage,
        filename1,
        filename2,
        sampling_date,
        info,
        common_set,
      ],
    ]).then((sample_ids) => {
      return cy.wrap(sample_ids[0]);
    });
  }
);

/**
 * Open a sample addition form
 * To be called from an opened set
 */
Cypress.Commands.add("openSampleAddPage", () => {
  // Open add sample page
  cy.get("#add_sample_button").should("contain", " + add samples").click();
  cy.wait("@getActivities");

  // Check page title
  cy.get("#upload_sample_form > :nth-child(1)").should(
    "contain",
    "Add samples"
  );
});

/**
 * Take a list of sample to add and will make it.
 * Will create new form line of needed, will fill information and check with submit that each row is present
 * Parameter is an array of array inherited from fillSampleLine function (see below)
 * Example: [[preprocess, storage, filename1, filename2, sampling_date, info, common_set), ...]
 **/
Cypress.Commands.add("multiSamplesAdd", (array_samples) => {
  cy.openSampleAddPage();

  var pos_sample = 0;
  array_samples.forEach((sample, index) => {
    cy.log(`multiSamplesAdd; iter ${pos_sample}; index ${index}; ${sample}`);
    var preprocess = sample[0];
    var storage = sample[1];
    var filename1 = sample[2];
    var filename2 = sample[3];
    var sampling_date = sample[4];
    var info = sample[5];
    var common_set = sample[6];
    cy.fillSampleLine(
      pos_sample,
      preprocess,
      storage,
      filename1,
      filename2,
      sampling_date,
      info,
      common_set
    );
    pos_sample += 1;
  });

  cy.get("#submit_samples_btn").click();
  cy.wait("@getActivities");

  cy.get("#db_table_container")
    .find("tbody")
    .find("tr")
    .last()
    .invoke("text")
    .then((filename) => {
      var last_id = Number(filename.split("(")[1].split(")")[0]);
      const sample_ids = [];
      array_samples.reverse().forEach((sample, index) => {
        // Get current id for given sample
        var current_id = last_id - index;
        cy.log(`Sample number: ${current_id}`);
        sample_ids.push(current_id);

        // Control values
        var filename1 = sample[2];
        var filename2 = sample[3];
        var sampling_date = sample[4];
        var info = sample[5];
        var common_set = sample[6];

        cy.get("#db_table_container")
          .find(`#row_sequence_file_${current_id}`)
          .should("contain", filename1);

        if (common_set != undefined) {
          cy.get("#db_table_container")
            .find(`#row_sequence_file_${current_id}`)
            .should("contain", common_set);
        }

        // Work only if one file given (else filename will be changed)
        // Allow to get current number if case of upload position modification
        if (filename2 == undefined) {
          cy.get("#db_table_container")
            .find(`#row_sequence_file_${current_id}`)
            .contains(filename1)
            .invoke("text")
            .then((filename) => {
              cy.log(
                `sample added number: ${filename.split("(")[1].split(")")[0]}`
              );
            });
          cy.get("#db_table_container")
            .find(`#row_sequence_file_${current_id}`)
            .contains(sampling_date);
          cy.get("#db_table_container")
            .find(`#row_sequence_file_${current_id}`)
            .contains(info);
        }
      });

      return cy.wrap(sample_ids);
    });
});

/**
 * Will create a new sample line in the sample addition form
 * Will control the current iteration if given
 */
Cypress.Commands.add("createNewSampleLine", (iter) => {
  cy.get("#add_sample_line").click();
  if (iter != undefined) {
    cy.get("#fieldset_container")
      .find(".form_line")
      .should("have.length", 1 + iter);
  }
});

/**
 * Fill a sample form line
 *
 */
Cypress.Commands.add(
  "fillSampleLine",
  (
    iter,
    preprocess,
    storage,
    filename1,
    filename2,
    sampling_date,
    info,
    common_set
  ) => {
    cy.log(
      `iter: ${iter}\n preprocess: ${preprocess}\n storage: ${storage}\n filename1: ${filename1}\n filename2: ${filename2}\n sampling_date: ${sampling_date}\n info: ${info}\n common_set: ${common_set}\n`
    );
    if (iter > 0) {
      // Create a new sample line
      cy.createNewSampleLine(iter);
    }

    cy.get(`#file_sampling_date_${iter}`)
      .should("exist") // first field, control that correct line exist
      .type(sampling_date);
    cy.get(`#file_info_${iter}`).type(info);

    if (preprocess != undefined) {
      cy.selectPreprocess(preprocess);
    }

    if (storage == "computer") {
      cy.get("#source_computer").click({ force: true });
      // Upload vidjil file
      cy.get(`#file_upload_1_${iter}`).selectFile(filename1);

      if (filename2 != undefined) {
        cy.get(`#file_upload_2_${iter}`).selectFile(filename2);
      }
    } else if (storage == "nfs") {
      cy.addNfsSample(iter, 1, filename1);
      if (filename2 != undefined) {
        cy.addNfsSample(iter, 2, filename2);
      }
    }

    if (common_set != undefined) {
      cy.fillCommonSet(iter, common_set); // a value to search a common set
    }
  }
);

/**
 * Open NFS loader panel and select correct file
 */
Cypress.Commands.add("addNfsSample", (iter, position, filename) => {
  // don't click to change storage to nfs, that should be already selected
  cy.get(`#jstree_field_${position}_${iter}`).click();

  cy.get("body").then(($body) => {
    if ($body.find('[id="/"][aria-expanded="false"]').length) {
      cy.get(".jstree-ocl").click();
    }
  });

  cy.get(".jstree-anchor").contains(filename).click({ force: true });

  cy.get("#jstree_button").contains("ok").click({ force: true });
});

/**
 * remove a common sets link
 * Call it from an opened set page (patient/run/generic)
 */
Cypress.Commands.add("removeCommonSet", (sample_id, set_type, common_set) => {
  // Open modification for sample line
  cy.get(
    "[onclick=\"db.call('file/form', {'file_id' :'" +
      sample_id +
      "', 'sample_type': '" +
      set_type +
      "'} )\"] > .icon-pencil-2"
  ).click();

  cy.get("#set_div").children();

  cy.get(".patient_token > .icon-cancel").click().should("not.exist");

  cy.get("#submit_samples_btn").click();
  cy.wait("@getActivities");

  cy.get("#db_table_container")
    .find(`#row_sequence_file_${sample_id}`)
    .should("not.contain", common_set);
});

/**
 * Fill a sets field, for example at a sample creation
 * iter: position of the line to fill
 * common_set: value of common_set call (to launch search/selection)
 */
Cypress.Commands.add("fillCommonSet", (iter, common_set) => {
  if (common_set != undefined) {
    // function waitForRequestBodyContain(alias, expected, maxRequests, level = 0) {
    //   if (level === maxRequests) {
    //     throw `${maxRequests} requests exceeded`
    //   }
    //   cy.wait(alias).then(interception => {
    //     cy.log("interception.request.body " + interception.request.body + " expected " + expected)
    //     cy.get("#at-view-samples > ul > li").then(list => {
    //       cy.log("listingCount: " + list.length)
    //     })
    //     if (interception.request.body.includes(expected)) {
    //       // Wait a bit longer to let the front end update
    //       cy.wait(100)
    //     } else {
    //       // Not found, wait again
    //       waitForRequestBodyContain(alias, expected, maxRequests, level+1)
    //     }
    //   })
    // }

    // cy.intercept({
    //   method: "POST",
    //   url: "auto_complete*",
    // }).as("postAutoComplete");

    // Did not manage to work with wait for post as there seems to be a sort of cache and autocomplete is sometimes not called...
    cy.get(`#token_input_${iter}`)
      .type(common_set) // a value to search a common set
      .wait(500);
    // waitForRequestBodyContain("@postAutoComplete", common_set, 20)
    cy.get(`#token_input_${iter}`).type("{enter}");
  }
});

Cypress.Commands.add("selectPreprocess", (preprocess) => {
  cy.get("#pre_process")
    .select(preprocess, { force: true })
    .should("have.value", preprocess);
});

Cypress.Commands.add("selectConfig", (config) => {
  // After config change, a request is send to server
  // Wait for reply from the server
  cy.get("#choose_config")
    .select(config, { force: true })
    .should("have.value", config);

  cy.wait("@getActivities");
});

Cypress.Commands.add("sampleStatus", (sequence_file_id, config_id) => {
  return cy.get(`#status_${sequence_file_id}_${config_id}`);
});

/**
 * Get status text value of a sample
 */
Cypress.Commands.add("sampleStatusValue", (sequence_file_id, config_id) => {
  cy.sampleStatus(sequence_file_id, config_id)
    .text()
    .then((status) => {
      return status;
    });
});

Cypress.Commands.add("sampleLauncher", (sequence_file_id, config_id) => {
  cy.log(
    `sampleLauncher(config ${config_id}, sequence file ${sequence_file_id})`
  );
  return cy.get(`#launch_${sequence_file_id}_${config_id} > .icon-cog-2`);
});

Cypress.Commands.add("deleteProcessButton", (sequence_file_id) => {
  return cy.get("#delete_process_" + sequence_file_id + " > .icon-erase");
});

Cypress.Commands.add("openSampleResultButton", (sequence_file_id) => {
  return cy.get("#open_sample_result_" + sequence_file_id);
});

/**
 * Select the correct configuration and launch an analysis on it
 * TODO: be able to relaunch analysis
 */
Cypress.Commands.add("launchProcess", (config_id, sequence_file_id) => {
  cy.log(
    `launchProcess(config ${config_id}, sequence file ${sequence_file_id})`
  );
  cy.selectConfig(config_id);

  cy.sampleStatus(sequence_file_id, config_id).should("have.text", "");

  cy.sampleLauncher(sequence_file_id, config_id)
    .click({ force: true });
  cy.wait("@getActivities");

  cy.sampleStatus(sequence_file_id, config_id).should("not.have.text", "");
});

/**
 * Delete result of an analysis; even if not complete
 */
Cypress.Commands.add("deleteProcess", (config_id, sequence_file_id) => {
  cy.log(`deleteProcess(${config_id}, ${sequence_file_id})`);
  cy.deleteProcessButton(sequence_file_id).click();
  cy.wait("@getActivities");

  cy.get("#delete_button").click();
  cy.wait("@getActivities");

  cy.deleteProcessButton(sequence_file_id).should("not.exist");
  cy.sampleStatus(sequence_file_id, config_id).should("have.text", "");
});

/**
 * Open sample result
 */
Cypress.Commands.add("openSampleResult", (sequence_file_id) => {
  cy.log(`openSampleResult(${sequence_file_id})`);
  cy.openSampleResultButton(sequence_file_id).click();
});

/**
 * Delete a set
 */
Cypress.Commands.add("deleteSet", (set_type, set_id, name) => {
  cy.log(`delete set (${set_type}, ${set_id})`);

  cy.get(
    "[onclick=\"db.call('sample_set/confirm', {'id' :'" +
      set_id +
      "'} )\"] > .icon-erase"
  ).click({ force: true });
  cy.wait("@getActivities");
  cy.get(".set_token").should("contain", name);

  cy.get(
    "[onclick=\"db.call('sample_set/delete', {'id' :'" + set_id + "'} )\"]"
  ).click();
  cy.wait("@getActivities");

  cy.get("#db_menu > ." + set_type + "_token")
    .contains("" + set_type + "s")
    .should("be.visible");
});

/**
 * Wait for an analysis to be completed.
 * Make a recursive call from himself while status is not 'COMPLETED', in limit of given number of retry
 * Unfortunately, last control will be called X times at the end, X as the depth of the recursive iteration
 */
Cypress.Commands.add(
  "waitAnalysisCompleted",
  (config_id, sequence_file_id, start, nb_retry = 120, iter = 0) => {
    if (start == undefined) {
      var start = new Date().getTime();
    }

    cy.log(
      `**waitAnalysisCompleted**: step ${iter} -- ${
        (new Date().getTime() - start) / 1000
      } seconds`
    );

    cy.get("#db_reload").trigger("click");

    cy.wait("@getActivities");

    // Check status
    cy.sampleStatusValue(sequence_file_id, config_id).then(($status) => {
      cy.log(`status: '**${$status.trimRight().trimLeft()}**'`);
      var now = new Date().getTime();
      if ($status.trimRight().trimLeft() == "FAILED") {
        cy.log("waitAnalysisCompleted; Process have FAILED").then(() => {
          throw new Error("waitAnalysisCompleted; Process have FAILED");
        });
      } else if ($status.trimRight().trimLeft() != "COMPLETED") {
        if ((now - start) / 1000 > nb_retry) {
          cy.log(
            "waitAnalysisCompleted; Timeout without COMPLETED status"
          ).then(() => {
            throw new Error(
              "waitAnalysisCompleted; Timeout without COMPLETED status"
            );
          });
        } else if (iter > nb_retry) {
          cy.log("waitAnalysisCompleted; Number of retry reached").then(() => {
            throw new Error("waitAnalysisCompleted; Number of retry reached");
          });
        } else {
          cy.log(` wait ... `).then(() => {
            cy.wait(200).then(() => {
              cy.waitAnalysisCompleted(
                config_id,
                sequence_file_id,
                start,
                nb_retry,
                (iter = iter + 1)
              );
            });
          });
        }
      }
    });

    if (!iter) {
      cy.sampleStatus(sequence_file_id, config_id).should(
        "contain",
        "COMPLETED"
      );
    }
  }
);

Cypress.Commands.add("saveAnalysis", () => {
  cy.get("body", { timeout: 10000 }).type("{ctrl}s");
  cy.get(".flash_1").should("be.visible").contains("analysis saved");
});

Cypress.Commands.add("newSet", (set_type) => {
  // Available types: patient, run, generic
  cy.get(`#create_new_set_type_${set_type}`)
    .should("exist")
    .click({ force: true });
  cy.wait("@getActivities");
});

Cypress.Commands.add("openSet", (sample_set_id) => {
  cy.get(`#sample_set_open_${sample_set_id}_config_id_-1`)
    .should("exist")
    .click({ force: true });
  cy.wait("@getActivities");
});

/**
 * Open an analysis by direct link inside DB pages (patient/run/set)
 */
Cypress.Commands.add("openAnalysisFromDbPage", (sample_set_id, config_id) => {
  cy.get(`#result_sample_set_${sample_set_id}_config_${config_id}`)
    .should("exist")
    .click({ force: true });
  cy.update_icon();
});

/**
 * Open an analysis by direct link inside set page
 */
Cypress.Commands.add("openAnalysisFromSetPage", (sample_set_id, config_id) => {
  cy.get(`#result_sample_set_id_${sample_set_id}_config_${config_id}`)
    .should("exist")
    .click({ force: true });
  cy.update_icon();
});

Cypress.Commands.add("dbPageFilter", (value) => {
  cy.get("#db_filter_input")
    .should("exist")
    .clear()
    .type(value)
    .type("{enter}");
  cy.wait(["@postAllSampleSets", "@getActivities"]);
});
