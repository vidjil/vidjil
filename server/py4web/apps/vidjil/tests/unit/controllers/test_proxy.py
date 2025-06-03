import json
import os
import unittest
from unittest.mock import ANY, MagicMock, patch

import requests
from py4web.core import Session, _before_request

from ....common import auth, db
from ....controllers import proxy as proxy_controller
from ...functional.db_initialiser import DBInitialiser
from ..utils.omboddle import Omboddle


class TestProxyController(unittest.TestCase):
    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5]
        )
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        initialiser = DBInitialiser(db)
        initialiser.run()

    ##################################
    # Tests on proxy_controller.imgt()
    ##################################

    def test_imgt_successful_response_with_params(self):
        # Given : A mocked successful response from requests.post
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "Mocked successful response"
        with patch("requests.post", return_value=mock_response) as mock_post:
            # When : Calling imgt with specific parameters
            params = {"param1": "value1", "param2": "value2"}
            with Omboddle(
                self.session, keep_session=True, params=params, method="POST"
            ):
                result = proxy_controller.imgt()

            # Then : The mocked response is returned
            assert result.status_code == 200
            assert result.text == "Mocked successful response"

            # Verify the URL and parameters sent to requests.post
            mock_post.assert_called_once_with(
                proxy_controller.IMGT_URL,
                headers=ANY,
                data=params,
                timeout=(
                    proxy_controller.REQUEST_CONNECT_TIMEOUT,
                    proxy_controller.REQUEST_READ_TIMEOUT,
                ),
            )

    def test_imgt_timeout(self):
        # Given : A mocked timeout exception from requests.post
        with patch("requests.post", side_effect=requests.exceptions.Timeout):
            # When : Calling imgt
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.imgt()

            # Then : A timeout error message is returned
            assert json.loads(result) == "Timeout when trying to contact the website"

    def test_imgt_ssl_error(self):
        # Given : A mocked SSL error exception from requests.post
        with patch("requests.post", side_effect=requests.exceptions.SSLError):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.imgt()

            # Then : An SSL error message is returned
            assert json.loads(result) == "SSL error when trying to contact the website"

    def test_imgt_unexpected_error(self):
        # Given : A mocked unexpected exception from requests.post
        with patch("requests.post", side_effect=Exception("Unexpected error")):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.imgt()

            # Then : An unexpected error message is returned
            assert (
                json.loads(result)
                == "Unexpected error when trying to contact the website"
            )

    def test_imgt_http_error(self):
        # Given : A mocked HTTP error response from requests.post
        mock_response = MagicMock()
        mock_response.status_code = 500
        with patch("requests.post", return_value=mock_response):
            # When : Calling imgt
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.imgt()

            # Then : An error message is returned
            assert json.loads(result) == "The website returned an invalid response"

    def test_imgt_improper_method(self):
        # Given : A GET request instead of POST
        with Omboddle(
            self.session, keep_session=True, params={"format": "json"}, method="GET"
        ):
            # When : Calling imgt
            result = proxy_controller.imgt()

        # Then : An error message is returned
        assert json.loads(result) == "Improper method, only POST can be used"

    ##################################
    # Tests on proxy_controller.assign_subsets()
    ##################################

    def test_assign_subsets_successful_response(self):
        # Given : A mocked successful response from requests.post
        response_url = "/arrest/assignsubsets_results/0000974579.html"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = (
            f'<META HTTP-EQUIV=refresh CONTENT="0;URL={response_url}">'
        )
        with patch("requests.post", return_value=mock_response) as mock_post:
            # When : Calling assign_subsets with specific parameters
            params = {"param1": "value1", "param2": "value2"}
            with Omboddle(
                self.session, keep_session=True, params=params, method="POST"
            ):
                result = proxy_controller.assign_subsets()

            # Then : The mocked response is processed and returned
            assert (
                result
                == f'<META HTTP-EQUIV=refresh CONTENT="0;URL=https://bat.infspire.org{response_url}">'
            )
            mock_post.assert_called_once_with(
                proxy_controller.ASSIGN_SUBSET_CGI,
                headers={"referer": proxy_controller.ASSIGN_SUBSET_URL},
                data=params,
                timeout=(
                    proxy_controller.REQUEST_CONNECT_TIMEOUT,
                    proxy_controller.REQUEST_READ_TIMEOUT,
                ),
            )

    def test_assign_subsets_timeout(self):
        # Given : A mocked timeout exception from requests.post
        with patch("requests.post", side_effect=requests.exceptions.Timeout):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.assign_subsets()

            # Then : A timeout error message is returned
            assert json.loads(result) == "Timeout when trying to contact the website"

    def test_assign_subsets_ssl_error(self):
        # Given : A mocked SSL error exception from requests.post
        with patch("requests.post", side_effect=requests.exceptions.SSLError):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.assign_subsets()

            # Then : An SSL error message is returned
            assert json.loads(result) == "SSL error when trying to contact the website"

    def test_assign_subsets_http_error(self):
        # Given : A mocked HTTP error response from requests.post
        mock_response = MagicMock()
        mock_response.status_code = 500
        with patch("requests.post", return_value=mock_response):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.assign_subsets()

            # Then : An error message is returned
            assert json.loads(result) == "The website returned an invalid response"

    def test_assign_subsets_unexpected_error(self):
        # Given : A mocked unexpected exception from requests.post
        with patch("requests.post", side_effect=Exception("Unexpected error")):
            # When : Calling assign_subsets
            with Omboddle(
                self.session,
                keep_session=True,
                params={"format": "json"},
                method="POST",
            ):
                result = proxy_controller.assign_subsets()

            # Then : An unexpected error message is returned
            assert (
                json.loads(result)
                == "Unexpected error when trying to contact the website"
            )

    def test_assign_subsets_improper_method(self):
        # Given : A GET request instead of POST
        with Omboddle(
            self.session, keep_session=True, params={"format": "json"}, method="GET"
        ):
            # When : Calling imgt
            result = proxy_controller.assign_subsets()

        # Then : An error message is returned
        assert json.loads(result) == "Improper method, only POST can be used"
