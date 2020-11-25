# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

 def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4472.vidjil")
    end
  end


  def after_tests
  end

   
  ### Issue 4472; model precision is incorect if distributions clones are set
  def test_00_hide_distrib_clones_with_tagspan

    labels = $b.elements(:tag_name => 'text', :class => "graph_text")

    for i in 0..labels.length-1
      if (labels[i].attribute('x').to_i == 60 and labels[i].attribute('y').to_i == 40) or (labels[i].attribute('x').to_i == 59 and labels[i].attribute('y').to_i == 39) 
        assert ( labels[i].text == "100%" ), "Correct label text at init" 
      end
    end

    $b.locus_topleft("TRG").click


    for i in 0..labels.length-1
      if (labels[i].attribute('x').to_i == 60 and labels[i].attribute('y').to_i == 40) or (labels[i].attribute('x').to_i == 59 and labels[i].attribute('y').to_i == 39) 
        assert ( labels[i].text == "10%" ), "Correct label text after locus hidding" 
      end
    end


  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end


# sh launch_functional_tests $(BROWSERS)  functional/issues/test_gra*rb