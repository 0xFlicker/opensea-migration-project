#!/bin/sh

# Fetches, patches, and re-orgs the stacys metadata

rm -rf .metadata

yarn -s cli metadata opensea-pull -s hunnys-ogs
yarn -s cli metadata opensea-pull -s stacys
yarn -s cli metadata opensea-pull -s stacy-s-cupcake-store
yarn -s cli metadata opensea-pull -s stacypets
yarn -s cli metadata opensea-pull -s stacy-s-candy-shop
yarn -s cli metadata opensea-pull -s stacys-collabs

mkdir -p .metadata/golden-hunny-ticket
cd .metadata
git init
git add .
git commit -m "Initial commit"
git apply --reject --whitespace=fix ../updates.patch

git mv stacys/49949388378051653683986555167011770124866897184891886820722263559079542652929* stacys-collabs/
git mv stacys/49949388378051653683986555167011770124866897184891886820722263557980031025153* stacys-collabs/
git mv stacys/49949388378051653683986555167011770124866897184891886820722263562378077536257* stacys-collabs/
git mv stacys/49949388378051653683986555167011770124866897184891886820722263524994682191873* stacys-collabs/
git mv stacys/49949388378051653683986555167011770124866897184891886820722263604159519391745* stacys-collabs/
git mv stacys/49949388378051653683986555167011770124866897184891886820722263554681496141825* stacys-collabs/

git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263688821914730502* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263765787728674817* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263766887240302593* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263767986751930369* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263769086263558145* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263770185775185921* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263771285286813697* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263772384798441473* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263773484310069249* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263774583821697025* golden-hunny-ticket/
git mv hunnys-ogs/49949388378051653683986555167011770124866897184891886820722263775683333324801* golden-hunny-ticket/

git add .
git commit -m "Update"

mv stacy-s-cupcake-store/* stacys-collabs/
mv stacypets/* stacys-collabs/
mv stacy-s-candy-shop/* stacys-collabs/

rm -rf stacy-s-cupcake-store
rm -rf stacypets
rm -rf stacy-s-candy-shop

cd ..

yarn -s cli metadata prepare --mint-attribute -i .metadata/stacys -o .metadata/stacys-airdrop -p https://stacys-v2.s3.us-east-2.amazonaws.com/stacys/
yarn -s cli metadata prepare --mint-attribute --hunnys -i .metadata/hunnys-ogs -o .metadata/hunnys-ogs-airdrop -p https://stacys-v2.s3.us-east-2.amazonaws.com/hunnys-ogs/
yarn -s cli metadata prepare -i .metadata/golden-hunny-ticket -o .metadata/golden-hunny-ticket-airdrop -p https://stacys-v2.s3.us-east-2.amazonaws.com/golden-hunny-ticket/
yarn -s cli metadata prepare --mint-attribute -i .metadata/stacys-collabs -o .metadata/stacys-collabs-airdrop -p https://stacys-v2.s3.us-east-2.amazonaws.com/stacys-collab/

# yarn -s cli ipfs pin-metadata -i http://localhost:5001 .metadata/hunnys-ogs-airdrop
# yarn -s cli ipfs pin-metadata -i http://localhost:5001 .metadata/stacys-airdrop
# yarn -s cli ipfs pin-metadata -i http://localhost:5001 .metadata/golden-hunny-ticket-airdrop
# yarn -s cli ipfs pin-metadata -i http://localhost:5001 .metadata/stacys-collabs-airdrop

yarn -s cli metadata owners-of --slug golden-hunny-ticket-airdrop --out .metadata/golden-hunny-ticket-airdrop.csv --out-json .metadata/golden-hunny-ticket-airdrop.json
yarn -s cli metadata owners-of --slug stacys-airdrop --out .metadata/stacys-airdrop.csv --out-json .metadata/stacys-airdrop.json
yarn -s cli metadata owners-of --slug hunnys-ogs-airdrop --out .metadata/hunnys-ogs-airdrop.csv --out-json .metadata/hunnys-ogs-airdrop.json
yarn -s cli metadata owners-of --slug stacys-collabs-airdrop --out .metadata/stacys-collabs-airdrop.csv --out-json .metadata/stacys-collabs-airdrop.json
