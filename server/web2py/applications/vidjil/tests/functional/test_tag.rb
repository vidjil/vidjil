load 'vidjil_browser.rb'
load 'server_test.rb'

class TestTag < ServerTest

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
      Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    end
  end

  def go_to_list
    #$b.a(:class => ["button", "button_token", "patient_token"], :text => "patients").click
    $b.a(:class => "button button_token patient_token", :text => "patients").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    table
  end

  def test_click_sample_set
    table = go_to_list

    table.a(:text => /#test2/).click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    $b.table(:id => "table").tbody.rows.each do |row|
      assert(row.a(:text => /#test2/).present?)
    end
  end

  def test_click_sample
    table = go_to_list

    table.td(:text => /test patient 2/).click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table.tbody.a(:text => "#test2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    table = $b.table(:id => "table")
    table.tbody.a(:text => "#test2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    $b.table(:id => "table").tbody.rows.each do |row|
      assert(row.a(:text => /#test2/).present?)
    end
  end

  def test_search_sample_set
    table = go_to_list

    search = $b.text_field(:id => "db_filter_input")
    search.set("#test2")
    search.fire_event('onchange')
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    $b.table(:id => "table").tbody.rows.each do |row|
      assert(row.a(:text => "#test2").present?)
    end
  end

  def test_search_sample
    table = go_to_list

    $b.span(:class => "button2", :text => "compare samples/patients").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    search = $b.text_field(:id => "db_filter_input")
    search.set("#test2")
    search.fire_event('onchange')
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    $b.table(:id => "table").tbody.rows.each do |row|
      assert(row.a(:text => /#test2/).present?)
    end
  end
end
