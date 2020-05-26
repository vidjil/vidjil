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

  def set_browser(vidjil_file, analysis_file=nil)
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
      
    print "Open browser\n"
    $b = VidjilBrowser.new

    print "Resize\n"
    $b.window.resize_to(1500, 800)

    print "Testing Vidjil client at " + index_path + "\n"
    $b.goto index_path

    # check that the browser loaded correctly
    if not $b.div(:id => 'logo').present?
      print "Loading of Vidjil client failed. Do not execute remaining tests."
      exit
    end

    print "Vidjil client loaded, launching tests.\n"
    
    # A live server can be configured with a database.
    # The welcome popup should not be tested.

    sleep(5)

    if $b.div(id: 'tip-container').present?
      $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
    end

    if $b.div(:class => 'db_div').present?
      $b.div(:class => 'db_div').element(:class => 'icon-cancel').click
    end

    if $b.div(:class => 'popup_msg').present?
      $b.div(:class => 'popup_msg').button(:text => 'ok').click
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

  end

  def close_everything
    if defined? $b
      if ENV['HEADLESS']
        $headless.destroy
      else
        $b.close
      end
    end
  end

end
