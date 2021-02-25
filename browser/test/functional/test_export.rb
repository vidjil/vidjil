# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestExport < BrowserTest

  def setup
    super
  end

  def after_tests
  end


  def test_00_export_disable
      # If only one sample, the button report monitor should be disable
      set_browser("/doc/analysis-example1.vidjil")

      skip_on_browser('chrome', nil, 'Issue #3699 must be solved first')

      $b.menu_item_export('export_sample_report')
      assert ( $b.a(:id => "export_monitor_report", :class => 'disabledClass').exists?), ">> export monitor is disable if only one samples is open"
  end

  
  def test_01_export_available
      # If only one sample, the button report monitor should be enable
      set_browser("/doc/analysis-example.vidjil")

      skip_on_browser('chrome', nil, 'Issue #3699 must be solved first')

      $b.menu_item_export('export_sample_report')
      assert (not $b.a(:id => "export_monitor_report", :class => 'disabledClass').exists?), ">> export monitor available if 2 samples are present"
      $b.menu_item_export('export_sample_report').click
      assert ( $b.window(index: 1).exists?), "A new window should have openened"
  end

  # Not really a test
  def test_zz_close
    close_everything
  end

end
