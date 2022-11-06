#!/bin/sh

# Fetches, patches, and re-orgs the stacys metadata

rm -rf .metadata

yarn -s cli metadata opensea-pull -s hunnys-ogs
yarn -s cli metadata opensea-pull -s stacys
yarn -s cli metadata opensea-pull -s stacy-s-cupcake-store
yarn -s cli metadata opensea-pull -s stacy-s-cute-village
yarn -s cli metadata opensea-pull -s stacypets
yarn -s cli metadata opensea-pull -s stacy-s-candy-shop
yarn -s cli metadata opensea-pull -s stacys-collabs
yarn -s cli metadata opensea-pull -s bunny-rewards

cd .metadata
git init
git add .
git commit -m "Initial commit"
git apply --reject --whitespace=fix ../updates.patch
git add .
git commit -m "Update"

cp -r stacy-s-cupcake-store/* stacys-collabs/
cp -r stacy-s-cute-village/* stacys-collabs/
cp -r stacypets/* stacys-collabs/
cp -r stacy-s-candy-shop/* stacys-collabs/
cp -r bunny-rewards/* stacys-collabs/

# rm -rf stacy-s-cupcake-store
# rm -rf stacy-s-cute-village
# rm -rf stacypets
# rm -rf stacy-s-candy-shop
# rm -rf bunny-rewards

cd ..
