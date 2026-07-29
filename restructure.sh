#!/bin/bash
# Run this from the root of your Oasis- repo in Termux.
set -e

mkdir -p js css

git mv appwriteClient.js assessment.js buySnack.js cde.js dni.js foodData.js \
  foodSearch.js growthCharts.js library.js main.js oasis-news.js oasisAI.js \
  parenteral.js paychangu-sdk.js pediBurn.js pediNutrition.js pes.js \
  pwaManifest.js recipeCalculator.js references.js regionalFCT.js screening.js js/

git mv news-styles.css responsive.css styles.css css/

echo "Files moved. Now apply the index.html patch:"
echo "  git apply index-restructure.patch"
echo "Then:"
echo "  git add -A && git commit -m 'Reorganize into js/ and css/ folders' && git push"
