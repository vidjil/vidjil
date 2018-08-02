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

  def initialize
    ObjectSpace.define_finalizer(self, proc { close_everything })
  end

  def self.test_order
    :random
  end

  def setup
    if ENV['HEADLESS'] and not defined? $headless
      $headless = Headless.new
      $headless.start
    end
  end

  def set_browser(url)
    puts "Open browser"
    $b = VidjilBrowser.new

    puts "Resize"
    $b.window.resize_to(1500, 800)

    puts "Testing Vidjil client at %s" % url
    $b.goto url

    # check that the browser loaded correctly
    if not $b.div(:id => 'logo').present?
      print "Loading of Vidjil client failed. Do not execute remaining tests."
      exit
    end

    puts "Vidjil client loaded, launching tests."
    
    # check the 'db_content' window opens
    assert ($b.div(:id => 'db_content').wait_until_present), "db content is not present"
    $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
  end

  def close_everything
    if defined? $b
      puts "\nTests finished, closing browser."
      $b.close
      if ENV['HEADLESS']
        $headless.destroy
      end
    end
  end

end
