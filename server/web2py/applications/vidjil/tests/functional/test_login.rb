load 'vidjil_browser.rb'
load 'server_test.rb'

class TestLogin < ServerTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
    $b.logout()
  end

=begin
  def test_00_init_db
    init_button = $b.a(:text => "init database")
    assert(init_button.present?)

    init_button.click
    init_form = $b.form(:id => "data_form")
    init_form.wait_until(&:present?)

    init_form.text_field(:id => "email").set("plop@plop.com")
    init_form.text_field(:id => "password").set("foobartest")
    init_form.text_field(:id => "confirm_password").set("foobartest")

    init_form.input(:type => "submit").click

    login_form = $b.form(:id => 'login_form')
    login_form.wait_until(&:present?)
  end
=end

  def test_failed_login
    $b.login('foo@bar.com', 'foobar')
    assert($b.login_form.present?)
  end

  def test_successful_login
    $b.login('plop@plop.com', 'foobartest')
    assert(!$b.login_form.present?)
  end
end

