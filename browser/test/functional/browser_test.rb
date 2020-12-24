require 'rubygems'
gem "minitest"
require 'watir'
require 'test/unit'
require "minitest/autorun"
require 'minitest/ci'
if ENV['HEADLESS']
  require 'headless'
end
load 'vidjil_browser.rb'

include Test::Unit::Assertions
MiniTest.autorun

#browser test suite
class BrowserTest < MiniTest::Test

  def self.test_order
    :alpha
  end

  def setup
    if ENV['HEADLESS'] and not defined? $headless
      $headless = Headless.new
      $headless.start
    end
  end

  # Skip a test on a given browser version
  def skip_on_browser(name, version, message)
    if $b.driver.capabilities.browser_name == name
      if $b.driver.capabilities.version == version
        nameversion = "(" + $b.driver.capabilities.browser_name + "/" + $b.driver.capabilities.version  + ")"
        print nameversion
        skip message + " " + nameversion
      end
    end
  end

  def set_browser(vidjil_file, analysis_file=nil, local_storage=nil, close_tooltip=true)
    folder_path = File.expand_path(File.dirname(__FILE__))
    folder_path.sub! '/browser/test/functional', ''
    index_path = 'file://' + folder_path + '/browser/index.html'
    data_path = folder_path + vidjil_file
    analysis_path = nil
    if analysis_file != nil
      analysis_path = folder_path + analysis_file
    end

    if ENV['LIVE_SERVER']
      index_path = ENV['LIVE_SERVER'] + '/?data='
    end

    if not defined? $b
      print "Open browser\n"
      $b = VidjilBrowser.new
    end
    
    print "Resize\n"
    $b.window.resize_to(1500, 800)

    print "Testing Vidjil client at " + index_path + "\n"
    $b.goto index_path

    if local_storage != nil and $b.driver.respond_to? :local_storage
      $b.driver.execute_script("localStorage.clear();")
      print "Set localStorage :\n"
      local_storage.each do |key, value|
        $b.driver.local_storage[key] = value
        print "       [" + key + "] => " + value+ "\n"
      end
      $b.refresh
    end

    # check that the browser loaded correctly
    if not $b.div(:id => 'logo').present?
      print "Loading of Vidjil client failed. Do not execute remaining tests."
      exit
    end

    print "Vidjil client loaded, launching tests.\n"
    
    # A live server can be configured with a database.
    # The welcome popup should not be tested.
    
    if not ENV['LIVE_SERVER']

      print "Welcome popup.\n"

      # wait for the welcoming popup
      $b.div(:class => 'popup_msg').wait_until(timeout: 2){ |el| el.present? }
    
      # close the welcoming popup
      $b.div(:class => 'popup_msg').button(:text => 'ok').click
      assert (not $b.div(:class => 'popup_msg').present?), "Popup message still present after trying to close it"
    end

    print "Import data.\n"
    
    # check the 'import data' menu element, and click on it
    assert ($b.div(:id => 'demo_file_menu').present?), "File menu is not present"
    $b.div(:id => 'demo_file_menu').hover
    $b.div(:id => 'demo_file_menu').click
    assert ($b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor').present?), "'import data' not present"
    $b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor').click
    
    # select data file
    print "  data:     " + data_path + "\n"
    $b.div(:id => 'file_menu').file_field(name: "json").set(data_path)

    # select analysis file
    if analysis_path != nil
      print "  analysis: " + analysis_path + "\n"
      $b.div(:id => 'file_menu').file_field(name: "pref").set(analysis_path)
    end

    $b.div(:id => 'file_menu').button(:text => 'start').click

    # close tooltip
    if close_tooltip and $b.div(id: 'tip-container').present?
      $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
    end

  end

  def close_everything
    if defined? $b
        if ENV['HEADLESS']
          $headless.destroy
        else
          if ENV['KEEPOPEN'] == "0"
            $b.close
          end
        end
    end
  end

  def teardown
    #Save image if test fails
    unless passed?
      #Where to save the image and the file name
      folder_path = File.expand_path(File.dirname(__FILE__))
      folder_path.sub! '/functional', ''
      screenshot_file = folder_path+"/screenshot_teardown_#{Time.now.strftime('%Y%m%d-%H%M%S')}.png"

      #Save the image
      $b.screenshot.save screenshot_file
    end
  end

end
