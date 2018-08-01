load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestPreProcess < BrowserTest

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
      Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    end
  end

  def go_to_list
    $b.a(:class => "button", :text => "pre-process").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until_present
    table
  end

  def test_pre_process_001_list
    table = go_to_list

    assert(table.tbody.present?)
  end

  def test_pre_process_002_add
    table = go_to_list
    count = table.tbody.rows.count

    # go to form
    $b.span(:class => "button2", :text => "+ new pre-process").click
    form = $b.form(:id => "data_form")
    form.wait_until_present

    form.text_field(:id => "pre_process_name").set('cat')
    form.textarea(:id => "pre_process_command").set('cat &file1& &file2& > &result&')
    form.textarea(:id => "pre_process_name").set('concatenate two files using cat')
    form.input(:type => "submit").click

    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until_present
    lines = table.tbody.rows
    assert(lines.count == count+1)
  end

  def test_zz_close
    close_everything
  end
end
