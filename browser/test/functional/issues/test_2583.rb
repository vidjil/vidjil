# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end


  def after_tests
  end

  ### Test the slider value and reset after loading/reloading of analysis
  # also reset other 

  def test_00_load_analysis_without_clone
    set_browser("/browser/test/data/issues/2583.vidjil")
    $b.update_icon.wait_while(&:present?) # wait update

    $b.menu_filter.hover
    slider_label = $b.span(:id => "top_label")
    slider_input = $b.input(:id => "top_slider")
    assert (slider_label.text == "0 clones (top 0)"), "Correct slider label text when no clone"
    assert (slider_input.value == "5"), "correct slider value if no clone (minimum allowed value)"

    ## Load data with enough clone to change top value
    set_browser("/browser/test/data/issues/2583_25Xclones.vidjil")
    $b.update_icon.wait_while(&:present?) # wait update

    $b.menu_filter.hover
    slider_label = $b.span(:id => "top_label")
    slider_input = $b.input(:id => "top_slider")
    assert ( slider_label.text == "20 clones (top 20)" ), "Correct slider label text when clones are present"
    assert (slider_input.value == "20"), "correct slider value if many clones (alligned on m.top value)"
  end


  def test_01_reset_samplename_settings
    set_browser("/browser/test/data/issues/2583.vidjil")
    $b.update_icon.wait_while(&:present?) # wait update
    assert (not $b.input(:id => "menuTimeFormName").checked?  ), "settings sample name: not simple name"
    assert (not $b.input(:id => "menuTimeFormShort").checked? ), "settings sample name: not short name"
    assert (not $b.input(:id => "menuTimeFormSample").checked?), "settings sample name: not sample"
    assert ($b.input(:id => "menuTimeFormSamplePlus").checked?), "settings sample name:  IS sample plus"

    ## change setting value
    $b.menu_settings.hover
    $b.input(:id => "menuTimeFormName").click
    $b.update_icon.wait_while(&:present?) # wait update
    assert (    $b.input(:id => "menuTimeFormName").checked?  ), "settings sample name: IS simple name"
    assert (not $b.input(:id => "menuTimeFormShort").checked? ), "settings sample name: not short name"
    
    # test reset of this parameter after loading of a new analysis
    set_browser("/browser/test/data/issues/2583.vidjil")
    assert (not $b.input(:id => "menuTimeFormName").checked?  ), "settings sample name: not simple name"
    assert ($b.input(:id => "menuTimeFormSamplePlus").checked?), "settings sample name:  IS sample plus (correct reset)"

  end
  

  def test_02_reset_Nregion_names
    set_browser("/browser/test/data/issues/2583.vidjil")
    $b.update_icon.wait_while(&:present?) # wait update
    assert (not $b.input(:id => "menuCloneNotNucNum").checked? ), "settings Nregion: not number"
    assert ($b.input(:id => "menuCloneNotSeqShort").checked? ),   "settings Nregion: IS short name if needed"
    assert (not $b.input(:id => "menuCloneNotSeq").checked?),     "settings Nregion: not nucleotides only"

    ## change setting value
    $b.menu_settings.hover
    $b.input(:id => "menuCloneNotSeq").click
    $b.update_icon.wait_while(&:present?) # wait update
    assert (    $b.input(:id => "menuCloneNotSeq").checked?  ), "settings Nregion: IS nucleotides only"
    assert (not $b.input(:id => "menuCloneNotSeqShort").checked? ), "settings Nregion: not short name if needed"
    
    # test reset of this parameter after loading of a new analysis
    set_browser("/browser/test/data/issues/2583.vidjil")
    assert ($b.input(:id => "menuCloneNotSeqShort").checked? ),   "settings Nregion: IS short name"
    assert (not $b.input(:id => "menuCloneNotSeq").checked?),     "settings Nregion: not sample"
  end
  
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
