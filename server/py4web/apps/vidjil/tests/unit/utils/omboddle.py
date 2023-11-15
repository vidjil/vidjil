import io
import json as lib_json
from base64 import b64encode
from py4web import request
from py4web.core import _before_request
from ....common import auth

try:
    from urlparse import urlparse
    from urllib import urlencode
except ImportError:
    from urllib.parse import urlparse, urlencode


class Omboddle(object):
    """
    Test initializer for py4web
    Freely and largely inspired by boddle (https://github.com/keredson/boddle) and py4web TestAuth
    """

    def __init__(self, session, keep_session=False, app_name="vidjil",
                 params={}, path=None, method=None, headers=None, json=None, url=None, body=None, query={}, auth=None, **extras):

        self.on_request(session, keep_session=keep_session)

        environ = {}
        self.extras = extras
        self.extra_orig = {}
        self.orig_app_reader = app_name

        if auth is not None:
            user, password = auth
            environ["HTTP_AUTHORIZATION"] = "Basic {}".format(
                b64encode(bytes(f"{user}:{password}", "utf-8")).decode("ascii"))

        if params is not None:
            self._set_payload(environ, urlencode(params).encode('utf8'))

        if path is not None:
            environ['PATH_INFO'] = path.lstrip('/')

        if method is not None:
            environ['REQUEST_METHOD'] = method

        for k, v in (headers or {}).items():
            k = k.replace('-', '_').upper()
            environ['HTTP_' + k] = v

        if json is not None:
            environ['CONTENT_TYPE'] = 'application/json'
            self._set_payload(environ, lib_json.dumps(json).encode('utf8'))

        if body is not None:
            if body.lower:
                body = io.BytesIO(bytes(body.encode('utf-8')))
            environ['CONTENT_LENGTH'] = str(len(body.read()))
            body.seek(0)
            environ['wsgi.input'] = body

        if url is not None:
            o = urlparse(url)
            environ['wsgi.url_scheme'] = o.scheme
            environ['HTTP_HOST'] = o.netloc
            environ['PATH_INFO'] = o.path.lstrip('/')

        if query is not None:
            environ['QUERY_STRING'] = urlencode(query)

        self.environ = environ

    def on_request(self, session, context={}, keep_session=False):
        storage = session._safe_local

        # mimic before_request bottle-hook
        _before_request()

        # mimic action.uses()
        session.initialize()
        auth.flash.on_request(context)
        auth.on_request(context)
        if keep_session:
            session._safe_local = storage

    def _set_payload(self, environ, payload):
        payload = bytes(payload)
        environ['CONTENT_LENGTH'] = str(len(payload))
        environ['wsgi.input'] = io.BytesIO(payload)

    def __enter__(self):
        self.orig = request.environ
        request.environ = self.environ
        for k, v in self.extras.items():
            if hasattr(request, k):
                self.extra_orig[k] = getattr(request, k)
            setattr(request, k, v)
        setattr(request, 'app', True)
        setattr(request, 'app_name', self.orig_app_reader)

    def __exit__(self, a, b, c):
        request.environ = self.orig
        for k, v in self.extras.items():
            if k in self.extra_orig:
                setattr(request, k, self.extra_orig[k])
            else:
                try:
                    delattr(request, k)
                except AttributeError:
                    pass
        setattr(request, 'app', self.orig_app_reader)
