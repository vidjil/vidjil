# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestInfo < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/tools/tests/data/fused_multiple.vidjil")

      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
    end
  end


  def after_tests
  end


  def test_000_default
    assert (     $b.info_colorBy.span(:id => "fastTag0").exist? ), "info colorMethod is on tag by default"
    assert ( not $b.info_colorBy.span(:text => "not productive").exist? ), "info colorMethod is NOT on productivity at init"
  end

  def test_001_change_productivity
    $b.element(:id => "color_menu_select").click
    $b.select_list(:id, "color_menu_select").select_value("productive")
    $b.update_icon.wait_while(&:present?)

    assert ( not $b.info_colorBy.span(:id => "fastTag0").exist? ),     "info colorMethod is no more on tag after select change"
    assert ( $b.info_colorBy.span(:text => "not productive").exist? ), "info colorMethod is on productivity (span not prod)"
    assert ( $b.info_colorBy.span(:text => "productive").exist? ),     "info colorMethod is on productivity (span prod)"
  end

  def test_002_change_abundance
    $b.element(:id => "color_menu_select").click
    $b.select_list(:id, "color_menu_select").select_value("abundance")
    $b.update_icon.wait_while(&:present?)

    assert ( not $b.info_colorBy.span(:text => "not productive").exist? ), "info colorMethod is no more on productivity"
    assert (     $b.info_colorBy.span(:text => "abundance").exist? ),      "info colorMethod is on abundance (text)"
    assert (     $b.info_colorBy.span(:text => "0%").exist? ),             "info colorMethod is on abundance (0%)"
    assert (     $b.info_colorBy.span(:class => "gradient").exist? ),      "info colorMethod is on abundance (gradient class)"
    assert (     $b.info_colorBy.span(:text => "100%").exist? ),           "info colorMethod is on abundance (100%)"
  end

  def test_003_play_button
    $b.div(:class => "play_button button").click
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
