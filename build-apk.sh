#!/usr/bin/env bash
# Android APK derler. Gerekenler: Java 11+, Python 3, Node.js 18+. Android SDK gerekmez.
# İmza anahtarı: keys/key8.pem ve keys/cert.pem (depoya KOYMA, .gitignore bunu engeller)
set -euo pipefail
cd "$(dirname "$0")"
KEY=${KEY:-keys/key8.pem}; CERT=${CERT:-keys/cert.pem}
[ -f "$KEY" ] && [ -f "$CERT" ] || { echo "İmza anahtarı yok: $KEY / $CERT"; exit 1; }
(cd tools && [ -d node_modules ] || npm install --silent)
python3 tools/bundle.py
JAR=$(ls tools/node_modules/apktool-jar/bin/apktool_*.jar | head -1)
mkdir -p build && rm -rf android/build
java -jar "$JAR" b android -o build/unsigned.apk
python3 tools/zipalign.py build/unsigned.apk build/aligned.apk
VER=$(grep versionName android/apktool.yml | sed "s/.*'\(.*\)'.*/\1/")
(cd tools && node sign.mjs ../build/aligned.apk ../build/PostdocRadari-$VER.apk ../$KEY ../$CERT)
echo "Hazır: build/PostdocRadari-$VER.apk"
