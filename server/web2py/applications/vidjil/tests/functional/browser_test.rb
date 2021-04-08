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

  def initialize(opt)
    super opt
    ObjectSpace.define_finalizer(self, proc { close_everything })
  end

  def self.test_order
    :alpha
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
    assert ($b.div(:id => 'db_content').wait_until(&:present?)), "db content is not present"
    $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
  end



  def close_everything
    if defined? $b
        puts "\nTests finished, closing browser."
        if ENV['HEADLESS']
          $b.close
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
