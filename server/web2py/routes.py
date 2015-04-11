default_application='vidjil'
default_controller = "default"
default_function = "index"

routes_onerror = [
  ('*/400','/vidjil/static/404.html'),
  ('*/404','/vidjil/static/404.html'),
  ('*/415','/vidjil/static/404.html'),
  ('*/422','/vidjil/static/404.html'),
  ('*/502','/vidjil/static/404.html'),
  ('vidjil/500', '/vidjil/default/error'),
]
