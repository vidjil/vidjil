Cypress.Commands.add('initDatabase', (host) => {
  // init database if button is present at opening of page
  if (host=="local"){
    if (Cypress.env('initiated_database') === false){ // allow to bypass waiting

      cy.visit('http://localhost/browser')
      cy.get('#db_content > h2', { timeout: 10000 })
        .should('contain', 'Login')

      cy.get('body').then(($body) => {
        var init_button = $body.find(":contains('init database')").length > 0

        if (init_button) {
          cy.contains('init database').click()

          cy.get('#email', { timeout: 10000 })
            .should('exist')
            .should('be.visible')
            .type('plop@plop.com')
          cy.get('#password')
            .type('foobartest')
          cy.get('#confirm_password')
            .type('foobartest')
          cy.get('#data_form')
            .contains('save').click()
          cy.update_icon()
          cy.get('#auth_user_email', { timeout: 10000 })
            .should('exist')
            .should('be.visible')
        }
        cy.exec('export initiated_database="true"')
      })
    } else {
      cy.log( "Init database already done")
    }
  }
})

Cypress.Commands.add('isDbPageVisible', () => { 
  cy.get('.db_div').then($button => {
    if ($button.is(':visible')){
      return true
    } else {
      return false
    }
  })
})


Cypress.Commands.add('openDBPage', () => {
  cy.isDbPageVisible().then((val) => {
    if (val == false){
      cy.get('#db_menu div')
        .first()
        .invoke('show')
        .contains('open list')
        .should('be.visible')
        .click({ force: true })

      cy.get('.db_div')
        .should('be.visible')
      }
  })

})


Cypress.Commands.add('closeDBPage', () => {
  cy.isDbPageVisible()
  .then((val) => {
      if (val == true){
        cy.get('.db_div > .closeButton > .icon-cancel')
          .click()
          .should("not.visible")
      }
  })

})


/**
 * Allow to openDBpage if needed and to go to the correct token (patient/run/set)
 * Use an intercept on GET method to fire event after recept of request
 * Allow to not get error if db table is render again between multiple call
 * @param  {[type]} 'goToTokenPage' Name of function
 * @param  {[type]} (token)         Token to call (patient, run or set)
 * @return {[type]}
 */
Cypress.Commands.add('goToTokenPage', (token) => {
  cy.openDBPage().then(() => {
    cy.intercept({
        method: 'GET', // Route all GET requests
        url: 'get_active_notifications*',
      }).as('getActivities')

    cy.get('#db_menu > .'+token+'_token')
      .contains(''+token+'s')
      .should('be.visible')
      .click()

    cy.wait(['@getActivities'])
    cy.update_icon(100)

    cy.get('.db_div')
      .should('contain', ' + new '+token+'s ')
  })
})

/**
 * Go to db patient page; open db if needed and call patient page
 */
Cypress.Commands.add('goToPatientPage', () => {
  cy.goToTokenPage("patient")
})


/**
 * Go to db run page; open db if needed and call patient page
 */
Cypress.Commands.add('goToRunPage', () => { 
  cy.goToTokenPage("run")
})

/**
 * Go to db set page; open db if needed and call patient page
 */
Cypress.Commands.add('goToSetPage', () => {
  cy.goToTokenPage("set")
})


/**
 * Create a patient and fill it informations
 */
Cypress.Commands.add('createPatient', (id, firstname, lastname, birthday, informations) => {
  cy.goToTokenPage("patient")

  cy.get('[onclick="db.call(\'sample_set/form\', {\'type\': \'patient\'})"]')
    .click()
  cy.update_icon()
  cy.get('h3').should("contain", "Add patients, runs, or sets")
  cy.fillPatient(0, id, firstname, lastname, birthday, informations)

  cy.get('.btn').click()
  cy.update_icon()

  cy.get('.db_div')
      .should('contain', ' + add samples')

  cy.get('.set_token')
    .should('contain', lastname+" "+firstname)

})
/**
 * Edit informations of a patient
 * Take same parameter as create, except a first parameter set_id to update
 */
Cypress.Commands.add('editPatient', (set_id, id, firstname, lastname, birthday, informations) => {
  cy.goToTokenPage("patient")

  cy.get(`[onclick="db.call('sample_set/form', {'id' :'${set_id}'} )"] > .icon-pencil-2`)
    .click()
  cy.update_icon()
  cy.get('h3').should("contain", "Edit patient, run, or set")

  cy.fillPatient(0, id, firstname, lastname, birthday, informations)

  cy.get('.btn').click()
  cy.update_icon()

  cy.get('.db_div')
      .should('contain', ' + add samples')

  cy.get('.set_token')
    .should('contain', lastname+" "+firstname)

})


Cypress.Commands.add('controlPatientInfos', (index, id, firstname, lastname, birthday, informations) => {

  cy.get('h3 > .set_token').should("contain", lastname+" "+firstname)

  if (id != ""){cy.get(':nth-child(1) > .db_block > .db_block_left').should("contain", id)}
  if (birthday != ""){cy.get(':nth-child(1) > .db_block > .db_block_left').should("contain", "("+birthday+")")}

  if (informations != ""){
    cy.get('#db_table_container').should("contain", informations)
  }

})



Cypress.Commands.add('fillPatient', (index, id, firstname, lastname, birthday, informations) => {
  if (id != ""){
    cy.get('#patient_id_label_'  + index.toString()).clear().type(id)
  }
  cy.get('#patient_first_name_'+ index.toString()).clear().type(firstname)
  cy.get('#patient_last_name_' + index.toString()).clear().type(lastname)
  cy.get('#patient_birth_'     + index.toString()).clear().type(birthday)
  if (informations != ""){
    cy.get('#patient_info_'      + index.toString()).clear().type(informations)
  }
  cy.update_icon()
})



/**
 * Create a run and fill it informations
 */
Cypress.Commands.add('createRun', (id, run_name, date, informations) => {
  cy.goToTokenPage("run")

  cy.get('[onclick="db.call(\'sample_set/form\', {\'type\': \'run\'})"]')
    .click()
  cy.update_icon()
  cy.fillRun(0, id, run_name, date, informations)

  cy.get('.btn').click()
  cy.update_icon()

  cy.get('.db_div')
      .should('contain', ' + add samples')

  cy.get('.set_token')
    .should('contain', run_name)

})


Cypress.Commands.add('fillRun', (index, id, run_name, date, informations) => {
  if (id != ""){
    cy.get('#run_id_label_'  + index.toString()).clear().type(id)
  }
  cy.get('#run_name_'+ index.toString()).clear().type(run_name)
  cy.get('#run_date_' + index.toString()).clear().type(date)
  if (informations != ""){
    cy.get('#run_info_'      + index.toString()).clear().type(informations)
  }
  cy.update_icon()
})


/**
 * Alias of multiSamplesAdd for only one sample
 * Add a sample; should be called from an open set (patient/run/set)
 */
Cypress.Commands.add('addSample', (preprocess, storage, filename1, filename2, samplingdate, informations, common_set) => {
    cy.multiSamplesAdd([[preprocess, storage, filename1, filename2, samplingdate, informations, common_set]])

})


/**
 * Open a sample addition form
 * To be called from an openend set
 */
Cypress.Commands.add('openSampleAddPage', () => {
    var settedname;
    cy.get('.set_token')
      .invoke('text')
      .then((text1) => { settedname = text1})

    cy.get('#add_sample_button')
      .should('contain', ' + add samples')
      .click()
    cy.update_icon()

    cy.get('#upload_sample_form > :nth-child(1)')
      .should('contain', 'Add samples')
      .click()

    cy.update_icon()
    cy.get('#submit_samples_btn')
      .click()
    return settedname
})

/**
 * Take a list of sample to add and will make it. 
 * Will create new form line of needed, will fill informations and check avec submit that each row is present
 * Parameter is an array of array herited from fillSampleLine function (see below)
 * Example: [[preprocess, storage, filename1, filename2, samplingdate, informations, common_set), ...]
 **/
Cypress.Commands.add('multiSamplesAdd', (array_samples) => {
    var settedname = cy.openSampleAddPage()

    var pos_sample = 0;
    array_samples.forEach( (sample, index) => {
      cy.log(`multiSamplesAdd; iter ${pos_sample}; index ${index}; ${sample}`)
      var preprocess   = sample[0]
      var storage      = sample[1]
      var filename1    = sample[2]
      var filename2    = sample[3]
      var samplingdate = sample[4]
      var informations = sample[5]
      var common_set   = sample[6]
      cy.fillSampleLine(pos_sample, preprocess, storage, filename1, filename2, samplingdate, informations, common_set)
      pos_sample += 1
    })


    cy.get('#submit_samples_btn')
      .click()
    cy.update_icon()


    array_samples.reverse().forEach( (sample, index) => {
      var last_id = cy.get('#db_table_container')
        .find('tbody')
        .find("tr").last()
        .invoke('text')
        .then( (filename) => {
          // Get current id for given sample
          var last_id    = Number( filename.split("(")[1].split(")")[0] )
          var current_id = last_id - index
          cy.log( `Sample number: ${current_id}` )

          // Control values
          var filename1    = sample[2]
          var filename2    = sample[3]
          var common_set   = sample[6]

          cy.get('#db_table_container')
              .find(`#row_sequence_file_${current_id}`)
              .should("contain", filename1)

          if (common_set != undefined){
            cy.get('#db_table_container')
              .find(`#row_sequence_file_${current_id}`)
              .should("contain", common_set)
          }

          // Work only if one file given (else filename will be changed)
          // Allow to get curent number if case of upload position modification
          if (filename2 == undefined){
            cy.get('#db_table_container')
              .find(`#row_sequence_file_${current_id}`)
              .contains(filename1)
              .invoke('text')
              .then( (filename) => {
                cy.log( `sample added number: ${filename.split("(")[1].split(")")[0]}` )
              })
          }
        })
    })

})

/**
 * Will create a new sample line in the sample addition form
 * Will control the current iteration if given
 */
Cypress.Commands.add('createNewSampleLine', (iter) => {
      cy.get("#add_sample_line").click()
      if (iter != undefined){
        cy.get("#fieldset_container").find(".form_line").should('have.length', 1+iter)
      }
})

/**
 * Fill a sample form line
 * 
 */
Cypress.Commands.add('fillSampleLine', (iter, preprocess, storage, filename1, filename2, samplingdate, informations, common_set) => {
    cy.log(`iter: ${iter}\n preprocess: ${preprocess}\n storage: ${storage}\n filename1: ${filename1}\n filename2: ${filename2}\n samplingdate: ${samplingdate}\n informations: ${informations}\n common_set: ${common_set}\n`)
    if (iter > 0) { // Create a new sample line
      cy.createNewSampleLine(iter)
    }

    cy.get(`#file_sampling_date_${iter}`)
      .should("exist") // first field, control that correct line exist
      .type(samplingdate) 
    cy.get(`#file_info_${iter}`).type(informations)


    if (preprocess != undefined){
      cy.selectPreprocess(pre_process)
    }

    if (storage == "computer"){
      cy.get('#source_computer')
        .click({force: true})
      // Upload vidjil file
      cy.get(`#file_upload_1_${iter}`).uploadFile(filename1)

      if (filename2 != undefined){
        cy.get(`#file_upload_2_${iter}`).uploadFile(filename2)
      }
    } else if (storage == "nfs"){
      cy.addNfsSample(iter, 1, filename1)
      if (filename2 != undefined){
        cy.addNfsSample(iter, 2, filename2)
      }
    }

    if (common_set != undefined){
      cy.fillCommonSet(iter, common_set) // a value to search a common set
    }


})


/**
 * Open NFS loader panel and select correct file
 */
Cypress.Commands.add('addNfsSample', (iter, position, filename) => {
    // don't click to change storage to nfs, that should be already seleted
    cy.get(`#jstree_field_${position}_${iter}`).click()

    cy.get('body').then(($body) => {
      if ($body.find('[id="\/"][aria-expanded="false"]').length) {
        cy.get('.jstree-ocl').click()
        cy.wait(1000)
      }
    })

    cy.get('.jstree-anchor').contains(filename)
      .click( { force: true} )

    cy.get('#jstree_button')
      .contains('ok')
      .should('be.visible')
      .click()
})


/**
 * remove a common sets link
 * Call it from an opened set page (patient/run/generic)
 */
Cypress.Commands.add('removeCommonSet', (sample_id, set_type, common_set) => {
    // Open modification for sample line
    cy.get('[onclick="db.call(\'file/form\', {\'file_id\' :\''+sample_id+'\', \'sample_type\': \''+set_type+'\'} )"] > .icon-pencil-2')
      .click()
    
    cy.get('#set_div')
      .children()

    cy.get('.patient_token > .icon-cancel')
      .click()
      .should("not.exist")

    cy.get('#submit_samples_btn')
      .click()
    cy.update_icon()

    cy.get('#db_table_container')
          .find(`#row_sequence_file_${sample_id}`)
          .should("not.contain", common_set)

})

/**
 * Fill a sets field, for example at a sample creation
 * iter: position of the line to fill
 * common_set: value of common_set call (to launch search/selection)
 */
Cypress.Commands.add('fillCommonSet', (iter, common_set) => {
    // if (common_set == undefined ) { common_set = 0} // For old tests call

    if (common_set != undefined){
      cy.get(`#token_input_${iter}`)
        .type(common_set) // a value to search a common set
        .wait(500) // server answer
        .type("{enter}")
    }

})


Cypress.Commands.add('selectPreprocess', (preprocess) => {
  cy.get('#pre_process')
    .select(preprocess, { force: true })
    .should('have.value', preprocess)
})


Cypress.Commands.add('selectConfig', (config) => {
  // After config change, a request is send to server
  // Wait for reply from the server
  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#choose_config')
    .select(config, { force: true })
    .should('have.value', config)
  
  cy.wait(['@getActivities'])
  cy.update_icon(100)
})



Cypress.Commands.add('sampleStatus', (sequence_file_id, config_id) => {
  return cy.get(`#status_${sequence_file_id}_${config_id}`)
})

/**
 * Get status text value of a sample
 */
Cypress.Commands.add('sampleStatusValue', (sequence_file_id, config_id) => {
  cy.sampleStatus(sequence_file_id, config_id)
    .text()
    .then(status => {
      return status
    })
})



Cypress.Commands.add('sampleLauncher', (sequence_file_id, config_id) => {
  cy.log( `sampleLauncher(config ${config_id}, sequence file ${sequence_file_id})`)
  return cy.get(`#launch_${sequence_file_id}_${config_id} > .icon-cog-2`)
})

Cypress.Commands.add('deleteProcessButton', (sequence_file_id) => {
  return cy.get('#delete_process_'+sequence_file_id+' > .icon-erase')
})



/**
 * Select the correct configuration and launch an analysis on it
 * TODO: be able to relaunch analysis
 */
Cypress.Commands.add('launchProcess', (config_id, sequence_file_id) => {
  cy.log( `launchProcess(config ${config_id}, sequence file ${sequence_file_id})`)
      cy.selectConfig(config_id)

      cy.get('#sequence_file_'+sequence_file_id)
        .should('exist')

      cy.get('#sequence_file_'+sequence_file_id)
        .get('.icon-cog-2')
        .should('be.visible')
        // .as("@launcherProcess")

      cy.get('#choose_config') // Do it before prelaunch control, else status is not present
        .select(config_id, { force: true })
        .should('have.value', config_id)

      cy.sampleStatus(sequence_file_id, config_id)
        .should('have.text', '')

      cy.sampleLauncher(sequence_file_id, config_id)
        // .should('be.visible')
        .click({force: true})

      cy.update_icon()
      cy.sampleStatus(sequence_file_id, config_id)
        .should('not.have.text', '')
})


/**
 * Delete result of an analysis; even if not complete
 */
Cypress.Commands.add('deleteProcess', (config_id, sequence_file_id) => {
    cy.log( `deleteProcess(${config_id}, ${sequence_file_id})`)
    cy.deleteProcessButton(sequence_file_id)
        .click()

    cy.get('#delete_button').click()

    cy.deleteProcessButton(sequence_file_id)
      .should('not.exist')
    cy.sampleStatus(sequence_file_id, config_id)
      .should('have.text', '')
})

/**
 * Delete a set
 */
Cypress.Commands.add('deleteSet', (set_type, set_id, name) => {
    cy.log( `delete set (${set_type}, ${set_id})`)
    cy.intercept({
      method: 'GET', // Route all GET requests
      url: 'get_active_notifications*',
    }).as('getActivities')

    cy.get('[onclick="db.call(\'sample_set/confirm\', {\'id\' :\''+set_id+'\'} )"] > .icon-erase')
      .click({force: true})

    cy.wait(['@getActivities'])
    cy.get('.set_token')
      .should("contain", name)

    cy.get('[onclick="db.call(\'sample_set/delete\', {\'id\' :\''+set_id+'\'} )"]')
      .click()
})


/**
 * Wait for an analysis to be completed.
 * Make a recursive call from himself while status is not 'COMPLETED', in limit of given number of retry
 * Unfortunatly, last control will be called X times at the end, X as the depth of the recusive iteration
 */
Cypress.Commands.add('waitAnalysisCompleted', (config_id, sequence_file_id, start, nb_retry=120, iter=0) => {
  if (start == undefined){
    var start = new Date().getTime();
  }

  cy.log( `**waitAnalysisCompleted**: step ${iter} -- ${(new Date().getTime()-start)/1000} seconds`)
  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#db_reload')
    .trigger("click")

  cy.wait(['@getActivities'])
  cy.update_icon(100)

  // Check status
  cy.sampleStatusValue(sequence_file_id, config_id).then($status => {
        cy.log(`status: '**${$status.trimRight().trimLeft()}**'`);
        var now = new Date().getTime()
        if ($status.trimRight().trimLeft() != 'COMPLETED') {
         if ( (now - start)/1000 > nb_retry){
            cy.log("waitAnalysisCompleted; Timeout without COMPLETED status").then(() => {
                throw new Error("waitAnalysisCompleted; Timeout without COMPLETED status");});
         } else if ( iter > nb_retry){
            cy.log("waitAnalysisCompleted; Number of retry reached").then(() => {
                throw new Error("waitAnalysisCompleted; Number of retry reached");})
         } else {
            cy.log( ` wait ... `).then(() => {
                cy.wait( 1000).then(() => {
                    cy.waitAnalysisCompleted(config_id, sequence_file_id, start, nb_retry, iter=iter+1);
                })});
         }
        }
    });

  if (!iter){
    cy.sampleStatus(sequence_file_id, config_id)
      .should('contain', 'COMPLETED')
  }

})


Cypress.Commands.add('saveAnalysis', () => {
    cy.get('body', { timeout: 10000 })
      .type('{ctrl}s')
    cy.get('.flash_1')
      .should("be.visible")
      .contains("analysis saved")

})



Cypress.Commands.add('newSet', (set_type) => {
  // Availalble types: patient, run, generic
  cy.get(`#create_new_set_type_${set_type}`).click()
    .should("exist")
    .click({force: true})
  cy.update_icon()
})


Cypress.Commands.add('openSet', (sample_set_id) => {
  cy.get(`#sample_set_open_${sample_set_id}_config_id_-1`)
    .should("exist")
    .click({force: true})
  cy.update_icon()
})

/**
 * Open an analysis by direct link inside DB pages (patient/run/set)
 */
Cypress.Commands.add('openAnalysisFromDbPage', (sample_set_id, config_id) => {
  cy.get(`#result_sample_set_${sample_set_id}_config_${config_id}`)
    .should("exist")
    .click({force: true})
  cy.update_icon()
})

/**
 * Open an analysis by direct link inside set page
 */
Cypress.Commands.add('openAnalysisFromSetPage', (sample_set_id, config_id) => {
  cy.get(`#result_sample_set_id_${sample_set_id}_config_${config_id}`)
    .should("exist")
    .click({force: true})
  cy.update_icon()
})


/**
 * Open an analysis by direct link inside set page
 */
Cypress.Commands.add('dbPageFilter', (value) => {
  cy.get('#db_filter_input')
    .should("exist")
    .type(value)
    .type("{enter}")
  cy.update_icon()
})