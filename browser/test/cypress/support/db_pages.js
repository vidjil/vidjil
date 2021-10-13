Cypress.Commands.add('initDatabase', (host) => {
  // init database if button is present at opening of page
  if (host=="local"){
    if (Cypress.env('initiated_database') === false){ // allow to bypass waiting

      cy.visit('http://localhost/browser')
      cy.get('#db_content > h2', { timeout: 10000 })
        .should('contain', 'Login')

      cy.get('body').then(($body) => {
        var init_button = $body.find(":contains('init database')").length > 0
        cy.log( "find init database button: " + init_button)

        if (init_button) {
          cy.log( "FOUND init database")
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
    console.log( val )
    if (val == false){
      cy.get('#db_menu').trigger('mouseover')
        .contains('open list')
        .should('be.visible')
        .click()

      cy.get('.db_div')
        .should('be.visible')
      }
  })

})


Cypress.Commands.add('closeDBPage', () => {
  cy.isDbPageVisible()
  .then((val) => {
      console.log( val )
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
  cy.fillPatient(0, id, firstname, lastname, birthday, informations)

  cy.get('.btn').click()
  cy.update_icon()

  cy.get('.db_div')
      .should('contain', ' + add samples')

  cy.get('.set_token')
    .should('contain', lastname+" "+firstname)

})


Cypress.Commands.add('fillPatient', (index, id, firstname, lastname, birthday, informations) => {
  if (id != ""){
    cy.get('#patient_id_label_'  + index.toString()).type(id)
  }
  cy.get('#patient_first_name_'+ index.toString()).type(firstname)
  cy.get('#patient_last_name_' + index.toString()).type(lastname)
  cy.get('#patient_birth_'     + index.toString()).type(birthday)
  if (informations != ""){
    cy.get('#patient_info_'      + index.toString()).type(informations)
  }
  cy.update_icon()
})


/**
 * Add a sample; should be called from an open set (patient/run/set)
 * Only load file from a directory and not from an nfs mounted volume
 * For the moment it is not able to specify commun sets
 */
Cypress.Commands.add('addSample', (preprocess, storage, filename1, filename2, samplingdate, informations) => {
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

    cy.get('#file_sampling_date_0').type(samplingdate)
    cy.get('#file_info_0').type(informations)


    if (preprocess != undefined){
      cy.selectPreprocess('#pre_process')
    }

    if (storage == "computer"){
      cy.get('#source_computer')
        .click()
      // Upload vidjil file
      cy.get('#file_upload_1_0').uploadFile(filename1)

      if (filename2 != undefined){
        cy.get('#file_upload_2_0').uploadFile(filename2)
      }
    } else if (storage == "nfs"){
      cy.get('#jstree_field_1_0').click()
      cy.get('.jstree-ocl').click()
      cy.wait(1000)

      cy.get('.jstree-anchor').contains(filename1)
        .click( { force: true} )

      cy.get('#jstree_button')
        .contains('ok')
        .should('be.visible')
        .click()

    }


    cy.get('#submit_samples_btn')
      .click()
    cy.update_icon()

    cy.get('.set_token')
      .invoke('text')
      .then((text1) => {
        assert.equal(settedname, text1, "Return to patient page")
      })

    cy.get('#db_table_container')
      .should("contain", filename1)

    // Work only if one file given (else filename will be changed)
    // Allow to get curent number if case of upload position modification
    if (filename2 == undefined){
      cy.get('td')
        .contains(filename1)
        .invoke('text')
        .then( (filename) => {
          cy.log( `sample added number: ${filename.split("(")[1].split(")")[0]}` )
        })
    }

})


Cypress.Commands.add('selectPreprocess', (preprocess) => {
  cy.get('#pre_process')
    .select(preprocess)
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
    .select(config)
    .should('have.value', config)
  
  cy.wait(['@getActivities'])
  cy.update_icon(100)
})



Cypress.Commands.add('sampleStatus', (sequence_file_id) => {
  return cy.get('#row_sequence_file_'+sequence_file_id+' > :nth-child(12)')
})

/**
 * Get status text value of a sample
 */
Cypress.Commands.add('sampleStatusValue', (sequence_file_id) => {
  cy.sampleStatus(sequence_file_id)
    .text()
    .then(status => {
      return status
    })
})



Cypress.Commands.add('sampleLauncher', (sequence_file_id) => {
  return cy.get('#row_sequence_file_'+sequence_file_id+' > :nth-child(16)')
})

Cypress.Commands.add('deleteProcessButton', (sequence_file_id) => {
  return cy.get('#delete_process_'+sequence_file_id+' > .icon-erase')
})



/**
 * Select the correct configuration and launch an analysis on it
 * TODO: be able to relaunch analysis
 */
Cypress.Commands.add('launchProcess', (config, sequence_file_id) => {
  cy.log( `launchProcess(${config}, ${sequence_file_id})`)
      cy.selectConfig(config)

      cy.get('#sequence_file_'+sequence_file_id)
        .should('exist')

      cy.get('.icon-cog-2')
        .should('be.visible')

      cy.sampleStatus(sequence_file_id)
        .should('have.text', '')

      cy.sampleLauncher(sequence_file_id)
        // .should('be.visible')
        .click()

      cy.update_icon()
      cy.sampleStatus(sequence_file_id)
        .should('not.have.text', '')
})


/**
 * Delete result of an analysis; even if not complete
 */
Cypress.Commands.add('deleteProcess', (config, sequence_file_id) => {
    cy.log( `deleteProcess(${config}, ${sequence_file_id})`)
      cy.selectConfig(config)

      cy.sampleStatus(sequence_file_id)
        .should('not.have.text', '')


      cy.deleteProcessButton(sequence_file_id)
        .should('exist')
        .should('be.visible')
        .click()
      cy.update_icon()

      cy.get('#delete_button')
        .click()

      cy.deleteProcessButton(sequence_file_id)
        .should('not.exist')
      cy.sampleStatus(sequence_file_id)
        .should('have.text', '')
})


/**
 * Wait for an analysis to be completed.
 * Make a recursive call from himself while status is not 'COMPLETED', in limit of given number of retry
 * Unfortunatly, last control will be called X times at the end, X as the depth of the recusive iteration
 */
Cypress.Commands.add('waitAnalysisCompleted', (config, sequence_file_id, start, nb_retry=90, iter=0) => {
  if (start == undefined){
    var start = new Date().getTime();
  }

  cy.log( `waitAnalysisCompleted: step ${iter}`)
  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#db_reload')
    .trigger("click")

  cy.wait(['@getActivities'])
  cy.update_icon(100)

  // Check status
  cy.sampleStatusValue(sequence_file_id)
    .then($status => {
      var now = new Date().getTime()

      // Add a wait if needed between recursive call
      if ( (now - start) < (iter*1000) ){
        cy.log( ` wait ... ${(iter*1000) - (now - start)} `)
        cy.wait( (iter*1000) - (now - start) )
      }


      if ($status == " COMPLETED ") {
        return true
      } else if ( (now - start)/1000 > nb_retry){
          throw new Error("waitAnalysisCompleted; Timeout without COMPLETED status")
          return false
      } else if ( iter > nb_retry){
          throw new Error("waitAnalysisCompleted; Number of retry reached")
          return false
      }
      cy.waitAnalysisCompleted(config, sequence_file_id, start, nb_retry, iter=iter+1)
    })

  if (!iter){
    cy.sampleStatus(sequence_file_id)
      .should('have.text', ' COMPLETED ')
  }

})
