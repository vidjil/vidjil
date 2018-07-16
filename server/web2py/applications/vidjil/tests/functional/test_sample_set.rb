load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSampleSet < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
    login_form = $b.form(:id => 'login_form')
    if login_form.present?
      login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
      login_form.text_field(:id => "auth_user_password").set('foobartest')
      login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    end
  end

  def go_to_list
    $b.a(:class => "button button_token patient_token", :text => "patients").click
    table = $b.table(:id => "table")
    table.wait_until_present
    table
  end

  def test_patient_001_list
    table = go_to_list

    # should be no patients
    assert(!table.tbody.present?)
  end

  def test_patient_002_add
    table = go_to_list

    # go to form
    $b.span(:class => "button2", :text => "+ new patients").click
    form = $b.form(:id => "object_form")
    form.wait_until_present

    assert($b.select(:id => "group_select").present?)

    # add more elements to form
    for i in 0..3 do
      $b.span(:id => "patient_button").click
    end

    # fill in form
    for i in 0..4 do
      form.text_field(:id => "patient_id_label_%d" % i).set("test_label %d" % i)
      form.text_field(:id => "patient_first_name_%d"% i).set("first %d" % i)
      form.text_field(:id => "patient_last_name_%d" % i).set("last %d" % i)
      form.text_field(:id => "patient_birth_%d" % i).set("2010-10-10")
      form.text_field(:id => "patient_info_%d" % i).set("patient %d #test #mytag%d" % [i, i])
    end

    form.input(:type => "submit").click

    # ensure patients were added
    table.wait_until_present
    lines = table.tbody.rows
    assert(lines.count == 5)
    lines.each do |line|
      #assert(line.cell(:index => 1).text.match("first %d last %d" % [i, i]))
      assert(line.cell(:index => 2).text == "2010-10-10")
      #assert(line.cell(:index => 3).text == "patient %d #test" % i)
    end
  end

  def test_patient_003_edit
    table = go_to_list

    # click edit button for first line in table
    table.i(:class => "icon-pencil-2", :index => 0).click
    form = $b.form(:id => "object_form")
    form.wait_until_present

    # check form data
    info = form.text_field(:id => "patient_info_0")
    assert(form.text_field(:id => "patient_id_label_0").value == "test_label 4")
    assert(form.text_field(:id => "patient_first_name_0").value == "first 4")
    assert(form.text_field(:id => "patient_last_name_0").value == "last 4")
    assert(form.text_field(:id => "patient_birth_0").value == "2010-10-10")
    assert(info.value == "patient 4 #test #mytag4")

    info.set("#edited")

    form.input(:type => "submit").click
    table = $b.table(:id => 'table')
    table.wait_until_present
    table = go_to_list
    lines = table.tbody.rows
    lines[0].wait_until_present
    assert(lines[0].cell(:index => 3).text == "#edited")
  end

  def test_patient_004_delete
    table = go_to_list

    # click delete button for first line in table
    table.i(:class => "icon-erase", :index => 1).click

    delete_button = $b.button(:text => "delete")
    delete_button.wait_until_present
    delete_button.click

    table.wait_until_present
    lines = table.tbody.rows
    assert(lines.count == 4)
  end

  def test_patient_005_search
    table = go_to_list

    filter = $b.text_field(:id => "db_filter_input")
    filter.set('edited')
    filter.fire_event('onchange')
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => 'table')
    lines = table.tbody.rows
    assert(lines.count == 1)
  end

  def test_patient_006_autocomplete
    table = go_to_list

    $b.execute_script("new VidjilAutoComplete().clearCache()")
    filter = $b.text_field(:id => "db_filter_input")
    filter.set('#myt')
    autocomplete = $b.div(:id => 'at-view-tags').ul
    puts autocomplete.html
    autocomplete.wait_until_present
    assert(autocomplete.visible?)
    puts autcomplete.ul.count
    assert(autocomplete.ul.count == 5)
  end

  def test_zz_close
    close_everything
  end
end
