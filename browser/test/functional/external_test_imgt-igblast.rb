# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class ExternalTest < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example.vidjil")
    end
  end


  def after_tests
  end
  

  def test_10_imgt
    begin
      $b.clone_in_scatterplot('25').wait_until(&:present?)
      sleep 1
      $b.clone_in_scatterplot('25').click
      $b.update_icon.wait_while(&:present?)
      $b.div(:id => "align-external-tool" ).hover
      $b.a(:id => "toIMGT" ).click
      
      assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening IMGT "
      $b.window(:title => "IMGT/V-QUEST").use do
        assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
        assert ($b.text.include? "Homsap TRBV28*01"), ">> IMGT expected V not found"
        assert ($b.text.include? "Homsap TRBJ2-5*01"), ">> IMGT expected J not found"
      end
      
      $b.window(:title => "").use
      
      $b.window(:title => "IMGT/V-QUEST").close

      $b.clone_in_scatterplot('26').click
      $b.update_icon.wait_while(&:present?)
      $b.div(:id => "align-external-tool" ).hover
      $b.a(:id => "toIMGT" ).click
      assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening second IMGT "

      $b.window(:title => "IMGT/V-QUEST").use do
        assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
        assert ($b.text.include? "Homsap IGHV3-9*01"), ">> IMGT expected V not found"
        assert ($b.text.include? "Homsap IGHJ6*02"), ">> IMGT expected J not found"
      end
      $b.window(:title => "").use

    end
  end

  def test_10bis_imgt_post
    begin
      $b.clone_in_scatterplot('25').click
      $b.update_icon.wait_while(&:present?)
      $b.span(:id => "toIMGTSeg" ).click
      $b.until { $b.segmenter_checkbox_imgt_vdj.present? }

      clone_info = $b.clone_info_segmenter('25')
      productive_title = clone_info[:axis].element(:class => ['productivity', 'IMGT']).title
      assert (productive_title.include? 'productivity'), "IMGT should tell us the productivity of the sequence"

      clone_segmenter = $b.clone_in_segmenter('25')
      $b.segmenter_checkbox_imgt_vdj.click
      highlights = clone_segmenter.spans(:class => 'highlight_border')
      assert (highlights.size >= 2 && highlights.size <= 3), "We should have the V(D)J genes highlighted, we had %d highlights" % highlights.size
      for h in highlights
        assert (h.style('width').to_i >= 100), "Highlights should have a reasonable width, found to be %s" % h.style('width')
      end

      Watir::Wait.until(timeout: 10) { clone_info[:identity].span.exists? }
      clone_info[:identity].element(:text => "NaN%").wait_while(&:present?)
      assert ((clone_info[:identity].text =~ /^[0-9\.]+%$/) == 0 ), "We should have identity rate (found: %s)" % clone_info[:identity].text

      $b.unselect
    end
  end
  
  
  def test_11_igBlast
    begin
      $b.clone_in_scatterplot('25').wait_until(&:present?)
      $b.clone_in_scatterplot('25').click
      $b.update_icon.wait_while(&:present?)
      $b.span(:id => "toIgBlast" ).click
      
      assert ( $b.window(:title => "IgBLAST Search Results").exists? ) , ">> fail opening igblast "
      $b.window(:title => "IgBLAST Search Results").use do
        assert ($b.text.include? "Length=180"), ">> igblast: was not launched on the correct sequence"
        assert ($b.text.include? "TRBV28*01"), ">> igblast: expected V not found"
        assert ($b.text.include? "TRBJ2-5*01"), ">> igblast: expected Js not found"
      end
      $b.window(:title => "IgBLAST Search Results").close

      $b.window(:title => "").use


      $b.clone_in_scatterplot('26').click
      $b.update_icon.wait_while(&:present?)
      $b.span(:id => 'toIgBlast').click
      assert ( $b.window(:title => "IgBLAST Search Results").exists? ) , ">> fail opening second igblast "
      $b.window(:title => "IgBLAST Search Results").use do
        assert ($b.text.include? "Length=318"), ">> igblast: was not launched on the correct sequence"
        assert ($b.text.include? "IGHV3-9*01"), ">> igblast: expected V not found"
        assert ($b.text.include? "IGHJ6*02"), ">> igblast: expected Js not found"
      end
      
      $b.window(:title => "").use
    end
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
