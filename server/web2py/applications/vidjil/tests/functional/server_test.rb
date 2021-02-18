load 'browser_test.rb'
class ServerTest < BrowserTest

  def datapath filename
    File.expand_path(File.join(File.dirname(__FILE__), filename))
  end


  def logins(user, field)
    data = { "admin" => {"user" => "plop@plop.com",    "password" => "foobartest"},
             "user0" => {"user" => "email0@local.org", "password" => "password0", "first" => "first_name0", "last" => "last_name0", "new_password" => "password0mod"},
             "user1" => {"user" => "email1@local.org", "password" => "password1", "first" => "first_name1", "last" => "last_name1"},
             "user2" => {"user" => "email2@local.org", "password" => "password2", "first" => "first_name2", "last" => "last_name2"}
           }
    return data.fetch(user).fetch(field)
  end


end

