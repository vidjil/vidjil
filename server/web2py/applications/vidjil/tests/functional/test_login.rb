load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestLogin < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("https://localhost/browser")
    end
  end

  def test_00_failed_login
    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
    login_form.text_field(:id => "auth_user_email").set('foo@bar.com')
    login_form.text_field(:id => "auth_user_password").set('foobar')
    login_form.tr(:id => 'submit_record_row').input(:type => 'submit').click
  end
end

