
# install libs for api_vidjil
apt-get update
apt-get -y install python3-pip
pip install requests bs4 tabulate requests-toolbelt urllib3 pytest pytest-cov

### Download SSL certificate of target Vidjil server.
# Use only for local test. CI env sue http so don't needed for the moment
SERVERNAME=localhost
echo -n | openssl s_client -connect $SERVERNAME:443 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > /app/vidjil/tools/tests/cert_$SERVERNAME-chain.pem

cd /app/vidjil
make demo

# test unit script

## If need to be launch locally, change APTH_VIDJIL variable:
PATH_VIDJIL="/app/vidjil/"
python3 -m pytest ${PATH_VIDJIL}/tools/tests/test_api.py  \
    --junitxml=${PATH_VIDJIL}/tools/tests/test_api_report.xml \
    --cov --cov-report term \
    --cov-report xml:${PATH_VIDJIL}/tools/tests/api_coverage.xml \
    --cov-config ${PATH_VIDJIL}/docker/ci/.coveragerc
