# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestClones < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/tools/tests/data/fused_multiple.vidjil")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end

      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
    end
  end


  def after_tests
  end

  ##############
  ### CLONES ###
  ##############
  # id     0 --> biggest clone, IGHV1, IGHJ1, _average_read_length==162
  # id 15/16 --> other clone (TRD, IGH)
  # id    18 --> lenSeqAverage/_average_read_length == 162
  # id    27 --> lenCDR3 (undefined), represent all clones
  # id    29 --> seg5; seg3 (IGHV1; IGHJ1)

  def test_000_default
    $info = $b.div(:id => "info").div(:class => "info_color")

    assert (     $info.span(:id => "fastTag0").exist? ), "info colorMethod is on tag by default"
    assert ( not $info.span(:text => "not productive").exist? ), "info colorMethod is NOT on productivity at init"
  end

  def test_001_change_productivity
    $b.element(:id => "color_menu_select").click
    $b.select_list(:id, "color_menu_select").select_value("productive")
    $b.update_icon.wait_while(&:present?)

    assert ( not $info.span(:id => "fastTag0").exist? ),     "info colorMethod is no more on tag after select change"
    assert ( $info.span(:text => "not productive").exist? ), "info colorMethod is on productivity (span not prod)"
    assert ( $info.span(:text => "productive").exist? ),     "info colorMethod is on productivity (span prod)"

  end

  def test_002_change_abundance
    $b.element(:id => "color_menu_select").click
    $b.select_list(:id, "color_menu_select").select_value("abundance")
    $b.update_icon.wait_while(&:present?)

    assert ( not $info.span(:text => "not productive").exist? ), "info colorMethod is no more on productivity"
    assert (     $info.span(:text => "abundance").exist? ),      "info colorMethod is on abundance (text)"
    assert (     $info.span(:text => "0%").exist? ),             "info colorMethod is on abundance (0%)"
    assert (     $info.span(:class => "gradient").exist? ),      "info colorMethod is on abundance (gradient class)"
    assert (     $info.span(:text => "100%").exist? ),           "info colorMethod is on abundance (100%)"
  end



  # Not really a test
  def test_zz_close
    close_everything
  end
end
