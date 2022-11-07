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

rm stacys/49949388378051653683986555167011770124866897184891886820722263559079542652929*
rm stacys/49949388378051653683986555167011770124866897184891886820722263557980031025153*
rm stacys/49949388378051653683986555167011770124866897184891886820722263562378077536257*
rm stacys/49949388378051653683986555167011770124866897184891886820722263524994682191873*
rm stacys/49949388378051653683986555167011770124866897184891886820722263604159519391745*
rm stacys/49949388378051653683986555167011770124866897184891886820722263554681496141825*

mv stacy-s-cupcake-store/* stacys-collabs/
mv stacy-s-cute-village/* stacys-collabs/
mv stacypets/* stacys-collabs/
mv stacy-s-candy-shop/* stacys-collabs/
mv bunny-rewards/* stacys-collabs/

rm -rf stacy-s-cupcake-store
rm -rf stacy-s-cute-village
rm -rf stacypets
rm -rf stacy-s-candy-shop
rm -rf bunny-rewards

cd ..


yarn -s cli metadata prepare -i .metadata/stacys -o .metadata/stacys-airdrop
yarn -s cli metadata prepare -i .metadata/hunnys-ogs -o .metadata/hunnys-ogs-airdrop-testnet
