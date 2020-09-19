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
  
  def test_00_load_data_without_mrd
    set_browser("/tools/tests/data/fused_multiple.vidjil")
    c1 = $b.clone_in_list("1") # c0 have warning icon
    c1.click
    c1.i(:class => "icon-info").click
    $b.update_icon.wait_while(&:present?)
    modal = $b.modal_container


    mrd_family    = modal.tr(:id => "modal_line_mrd_family")
    mrd_pearson   = modal.tr(:id => "modal_line_mrd_pearson")
    mrd_prevalent = modal.tr(:id => "modal_line_mrd_prevalent")
    mrd_prevalent_on_spike = modal.tr(:id => "modal_line_mrd_prevalent_on_spike")

    assert ( not  mrd_family.exist? ),    "modal line mrd_family NOT exist for clone without mrd"
    assert ( not  mrd_pearson.exist? ),   "modal line mrd_pearson NOT exist for clone without mrd"
    assert ( not  mrd_prevalent.exist? ), "modal line mrd_prevalent NOT exist for clone without mrd"
    assert ( not  mrd_prevalent_on_spike.exist? ), "modal line mrd_prevalent_on_spike NOT exist for clone without mrd"
    modal.i(:class => "icon-cancel").fire_event('click') # close modal


  end  
 
  def test_01_load_data_with_mrd
    set_browser("/browser/test/data/issues/issue_mrd.vidjil")
    c0 = $b.clone_in_list("0")
    c0.click
    c0.i(:class => "icon-info").click
    $b.update_icon.wait_while(&:present?)
    modal = $b.modal_container


    mrd_family    = modal.tr(:id => "modal_line_mrd_family")
    mrd_pearson   = modal.tr(:id => "modal_line_mrd_pearson")
    mrd_prevalent = modal.tr(:id => "modal_line_mrd_prevalent")
    mrd_prevalent_on_spike = modal.tr(:id => "modal_line_mrd_prevalent_on_spike")

    assert ( mrd_family.exist? ),    "modal line mrd_family exist for clone with mrd"
    assert ( mrd_pearson.exist? ),   "modal line mrd_pearson exist for clone with mrd"
    assert ( mrd_prevalent.exist? ), "modal line mrd_prevalent exist for clone with mrd"
    assert ( mrd_prevalent_on_spike.exist? ), "modal line mrd_prevalent_on_spike exist for clone with mrd"

    ## Test text values
    mrd_family_value    = mrd_family.td(:id => "modal_line_value_mrd_family_0")
    mrd_pearson_value   = mrd_pearson.td(:id => "modal_line_value_mrd_pearson_0")
    mrd_prevalent_value = mrd_prevalent.td(:id => "modal_line_value_mrd_prevalent_0")
    mrd_prevalent_on_spike_value = mrd_prevalent_on_spike.td(:id => "modal_line_value_mrd_prevalent_on_spike_0")

    assert ( mrd_family_value.text == "UNI" ),            "modal line mrd_family content is correct"
    assert ( mrd_pearson_value.text == "0.96" ),          "modal line mrd_pearson content is correct"
    assert ( mrd_prevalent_value.text.include? "IGK" ), "modal line mrd_prevalent content is correct"
    assert ( mrd_prevalent_on_spike_value.text == "64.89233726998077" ), "modal line mrd_prevalent_on_spike content is correct"
    modal.i(:class => "icon-cancel").fire_event('click') # close modal

    ## Same tests on clone 1
    c1 = $b.clone_in_list("1")
    c1.click
    c1.i(:class => "icon-info").click
    $b.update_icon.wait_while(&:present?)
    modal = $b.modal_container


    mrd_family    = modal.tr(:id => "modal_line_mrd_family")
    mrd_pearson   = modal.tr(:id => "modal_line_mrd_pearson")
    mrd_prevalent = modal.tr(:id => "modal_line_mrd_prevalent")
    mrd_prevalent_on_spike = modal.tr(:id => "modal_line_mrd_prevalent_on_spike")

    assert ( mrd_family.exist? ),    "modal line mrd_family exist for clone with mrd"
    assert ( mrd_pearson.exist? ),   "modal line mrd_pearson exist for clone with mrd"
    assert ( mrd_prevalent.exist? ), "modal line mrd_prevalent exist for clone with mrd"
    assert ( mrd_prevalent_on_spike.exist? ), "modal line mrd_prevalent_on_spike exist for clone with mrd"

    ## Test text value
    mrd_family_value    = mrd_family.td(:id => "modal_line_value_mrd_family_0")
    mrd_pearson_value   = mrd_pearson.td(:id => "modal_line_value_mrd_pearson_0")
    mrd_prevalent_value = mrd_prevalent.td(:id => "modal_line_value_mrd_prevalent_0")
    mrd_prevalent_on_spike_value = mrd_prevalent_on_spike.td(:id => "modal_line_value_mrd_prevalent_on_spike_0")

    assert ( mrd_family_value.text == "UNI" ),            "modal line mrd_family content is correct"
    assert ( mrd_pearson_value.text == "0.964285714285714" ),          "modal line mrd_pearson content is correct"
    assert ( mrd_prevalent_value.text.include? "IGK" ), "modal line mrd_prevalent content is correct" # value not dependant of the clone...
    assert ( mrd_prevalent_on_spike_value.text == "64.89233726998077" ), "modal line mrd_prevalent_on_spike content is correct"
    modal.i(:class => "icon-cancel").fire_event('click') # close modal

  end  

  
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
