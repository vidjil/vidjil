require 'rubygems'
gem "minitest"
require 'watir-webdriver'
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

  def set_browser(vidjil_file, analysis_file=nil)
    folder_path = Dir.pwd
    folder_path.sub! '/browser/test', ''
    index_path = 'file://' + folder_path + '/browser/index.html'
    data_path = folder_path + vidjil_file
    analysis_path = nil
    if analysis_file != nil
      analysis_path = folder_path + analysis_file
    end

    if ENV['LIVE_SERVER']
      index_path = ENV['LIVE_SERVER'] + '/?data='
    end
      
    print "Testing Vidjil browser at " + index_path + "\n"

    $b = VidjilBrowser.new :firefox
    #$b = VidjilBrowser.new :chrome
    $b.window.resize_to(1500, 800)
    $b.goto index_path

    # check that the browser loaded correctly
    if not $b.div(:id => 'logo').present?
      print "Loading of Vidjil browser failed. Do not execute remaining tests."
      exit
    end

    print "Vidjil browser loaded, launching tests.\n"
    
    # A live server can be configured with a database.
    # The welcome popup should not be tested.
    
    if not ENV['LIVE_SERVER']

      # check the welcoming popup
      assert ($b.div(:class => 'popup_msg').present?), "Popup message is not present at the opening of Vidjil"
    
      # close the welcoming popup
      $b.div(:class => 'popup_msg').button(:text => 'ok').click
      assert (not $b.div(:class => 'popup_msg').present?), "Popup message still present after trying to close it"
    end
    
    # check the 'import data' menu element, and click on it
    $b.div(:id => 'demo_file_menu').click
    assert ($b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor')), "'import data' not present"
    $b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor').click
    
    # select data file
    $b.div(:id => 'file_menu').file_field(:name,"json").set(data_path)

    # select analysis file
    if analysis_path != nil
      $b.div(:id => 'file_menu').file_field(:name, "pref").set(analysis_path)
    end

    $b.div(:id => 'file_menu').button(:text => 'start').click

  end

  def close_everything
    if defined? $b
      print "\nTests finished, closing browser.\n"
      $b.close
      if ENV['HEADLESS']
        $headless.destroy
      end
    end
  end

end
