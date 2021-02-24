# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

 def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4606_subset_imgt.vidjil")
    end
  end


  def after_tests
  end

   
  ### Issue 4606; Add subset search to imgt
  def test_00_hide_distrib_clones_with_tagspan
    ### clone 1; no subset
    $b.clone_in_list("0").click
    $b.update_icon.wait_while(&:present?)

    $b.span(:id => "toIMGT" ).click
    assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening second IMGT "

    $b.window(:title => "IMGT/V-QUEST").use do
      assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
      assert ($b.text.include? "no rearrangement found (stop codons)"), ">> IMGT expected V not found"
      assert ($b.text.include? "subset"), ">> mention of subset in the table header"
      assert (not $b.text.include? "Subset"), ">> no mention of subset (except 'subset' in the table header)"
    end
    $b.window(:title => "").use
    $b.window(:title => "IMGT/V-QUEST").close
    ###
    
    ### Clone 2; subset2
    $b.clone_in_list("1").click
    $b.update_icon.wait_while(&:present?)

    $b.span(:id => "toIMGT" ).click
    assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening second IMGT "

    $b.window(:title => "IMGT/V-QUEST").use do
      assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
      assert ($b.text.include? "Homsap IGHV3-21*01"), ">> IMGT expected V not found"
      assert ($b.text.include? "Homsap IGHJ6*02"), ">> IMGT expected J not found"
      assert ($b.text.include? "(a) Subset #2 is characterized by the expression of stereotyped B cell receptor immunoglobulin"), ">> return information on subset#2 if detected"
    end
    $b.window(:title => "").use
    $b.window(:title => "IMGT/V-QUEST").close
    ###
  
    
    ### Clone 3; subset 8
    $b.clone_in_list("2").click
    $b.update_icon.wait_while(&:present?)

    $b.span(:id => "toIMGT" ).click
    assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening second IMGT "

    $b.window(:title => "IMGT/V-QUEST").use do
      assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
      assert ($b.text.include? "Homsap IGHV4-39*01"), ">> IMGT expected V not found"
      assert ($b.text.include? "Homsap IGHJ5*02"), ">> IMGT expected J not found"
      assert ($b.text.include? "(a) Subset #8 is characterized by the expression of stereotyped B cell receptor immunoglobulin"), ">> return information on subset#2 if detected"
    end
    $b.window(:title => "").use
    $b.window(:title => "IMGT/V-QUEST").close
    ###
    
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end


# sh launch_functional_tests $(BROWSERS)  functional/issues/test_gra*rb