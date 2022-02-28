# Init css files
make -C browser/css/icons
make -C demo

# Create symbolic links for cypress (to avoid "--project" param error)
ln -sf $PWD /app/vidjil
ln -sf $PWD/$CYPRESS_PATH /app/cypress
ln -sf $PWD/docker/ci/cypress.json /app/cypress.json
ln -sf $PWD/docker/ci/cypress_script.bash /app/script.bash

echo "==> ls /app"
ls /app
echo "==> ls /app/cypress"
ls /app/cypress

ln -sf $PWD/browser/test/data /app/cypress/fixtures/data || true
ln -sf $PWD/doc  /app/cypress/fixtures/doc  || true
ln -sf $PWD/demo /app/cypress/fixtures/demo || true
ln -sf $PWD/tools /app/cypress/fixtures/tools || true

echo "==> ls /app/vidjil/demo"
ls /app/vidjil/demo
echo "==> ls /app/vidjil/tools/tests"
ls /app/vidjil/tools/tests