# coding: utf-8
load 'vidjil_browser.rb'

class SegmenterBrowser < VidjilBrowser

  def sequences_area
    return element(:id => 'form_sequences')
  end
  
  protected
  
  def scatterplot_id(number=1)
    return 'scatter_container'
  end

  def segmenter_id
    return 'segmenter_container'
  end

end
