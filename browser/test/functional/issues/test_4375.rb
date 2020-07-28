# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

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
   
  ### Issue 4375; hide distrib clone by tag
  def test_00_hide_distrib_clones_with_tagspan

    ### exist in list
    # first, distrib clones are visible, in opened preset 0 or 4
    assert ( $b.clone_in_list('0').exists?),   ">> real clone exist in list"
    assert ( $b.clone_in_list('29').style == "display: block;"),  ">> seg5/seg3 distrib clone exist in list"
    assert ( $b.clone_in_list('18').style == "display: none;"),  ">> lenSeqAverage distrib clone DON'T show in list"

    ## hide distrib clone by tag switch
    $b.info_colorBy.span(:id => "fastTag9").click
    $b.update_icon.wait_while(&:present?)

    assert ( $b.clone_in_list('0').exists?),   ">> real clone still presnet in list"
    assert ( $b.clone_in_list('29').style == "display: none;"),  ">> seg5/seg3 distrib clone are NO MORE present in list"


    ## change in another preset with distributions clones
    $b.send_keys 4
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_list('18').style == "display: none;"),  ">> lenSeqAverage distrib clone is NOT present in list"

    
    ## Remove filter
    $b.send_keys 0
    $b.info_colorBy.span(:id => "fastTag9").click
    $b.update_icon.wait_while(&:present?)

    assert ( $b.clone_in_list('29').style == "display: block;"),  ">> seg5/seg3 distrib clone is present in list"
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
