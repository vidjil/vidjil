# This file is only need for client side setup.
# Will create various links

# Init css files
make -C browser/css/icons
make -C demo
# Germline file cannot be intergrated on our docker image for licenece reasons.
make germline

# Create symbolic links for cypress (to avoid "--project" param error)
ln -sf $PWD /app/vidjil
ln -sf $PWD/$CYPRESS_PATH /app/cypress
ln -sf $PWD/docker/ci/cypress_script.bash /app/script.bash


ln -sf $PWD/browser /app/browser || true
ln -sf $PWD/doc  /app/doc    || true
ln -sf $PWD/demo /app/demo   || true
ln -sf $PWD/tools /app/tools || true


CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==> ls /app${NC}"
ls /app

echo -e "${CYAN}==> ls /app/browser${NC}"
ls /app/browser
echo -e "${CYAN}==> ls /app/browser/test/data${NC}"
ls /app/browser/test/data
echo -e "${CYAN}==> ls /app/data${NC}"
ls /app/data
echo -e "${CYAN}==> ls /app/doc${NC}"
ls /app/doc
echo -e "${CYAN}==> ls /app/demo${NC}"
ls /app/demo
echo -e "${CYAN}==> ls /app/tools${NC}"
ls /app/tools

echo -e "${CYAN}==> ls cypress/e2e/${NC}"
ls cypress/e2e/