load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSampleSet < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
  end

  def test_patient_001_list
    $b.a(:class => "button button_token patient_token", :text => "patient").click
    table = $b.table(:id => "table")
    table.wait_until_present

    # should be no patients
    assert(!table.tbody.present?)
  end

  def test_patient_002_add
    $b.a(:class => "button button_token patient_token", :text => "patient").click
    table = $b.table(:id => "table")
    table.wait_until_present

    # go to form
    $b.span(:class => "button2", :text => " + new patients ").click
    form = $b.form(:id => "object_form")
    form.wait_until_present

    assert($b.select(:id => "group_select").present?)

    # add more elements to form
    for i in 0..3 do
      $b.span(:id => "patient_button").click
    end

    # fill in form
    for i in 0..4 do
      form.text_field(:id => "patient_id_label_"+i).set("test_label " + i)
      form.text_field(:id => "patient_first_name_"+i).set("first " + i)
      form.text_field(:id => "patient_last_name_"+i).set("last " + i)
      form.text_field(:id => "patient_birth_"+i).set("2010-10-10")
      form.text_field(:id => "patient_info_"+i).set("patient " + i + " #test")
    end

    form.input(:type => "submit").click

    # ensure patients were added
    table.wait_until_present
    lines = table.tbody.tr(:class => "pointer")
    assert(lines.size == 5)
    for i in 0..4 do
      #assert(lines[i].td[1].text.match"first " + i + " last " + i)
      assert(lines[i].td[2].text == "2010-10-10")
      assert(lines[i].td[3].text == "patient " + i + " #test")
    end
  end

  def test_patient_003_edit
    $b.a(:class => "button button_token patient_token", :text => "patient").click
    table = $b.table(:id => "table")
    table.wait_until_present

    # click edit button for first line in table
    table.i(:class => "icon-pencil-2")[0].click
    form = $b.form(:id => "object_form")
    form.wait_until_present

    # check form data
    info = form.text_field(:id => "patient_info_0")
    assert(form.text_field(:id => "patient_id_label_0").value == "test_label 0")
    assert(form.text_field(:id => "patient_first_name_0").value == "first 0")
    assert(form.text_field(:id => "patient_last_name_0").value == "last 0")
    assert(form.text_field(:id => "patient_birth_0").value == "2010-10-10")
    assert(info.value == "patient 0 #test")

    info.set("#edited")

    form.input(:type => "submit").click
    table.wait_until_present
    lines = table.tbody.tr(:class => "pointer")
    assert(lines[0].td[3].text == "#edited")
  end

  def test_patient_004_delete
    $b.a(:class => "button button_token patient_token", :text => "patient").click
    table = $b.table(:id => "table")
    table.wait_until_present

    # click delete button for first line in table
    table.i(:class => "icon-erase")[0].click

    delete_button = $b.button(:text => "delete")
    delete_button.wait_until_present
    delete_button.click

    table.wait_until_present
    lines = table.tbody.tr(:class => "pointer")
    assert(lines.size == 4)
  end

  def test_zz_close
    close_everything
  end
end
