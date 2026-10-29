import { readFileSync, writeFileSync } from 'node:fs';
import { ApkSigner, SigningKey } from 'apk_sign_ts';
const [,, inp, out, key, cert] = process.argv;
const apk = new Uint8Array(readFileSync(inp));
const signer = new ApkSigner({ signingKey: SigningKey.fromPEM(readFileSync(key,'utf8'), readFileSync(cert,'utf8')), digestAlgorithm: 'SHA-256' });
const { signedApk } = await signer.sign(apk);
writeFileSync(out, signedApk);
console.log('signed', signedApk.length);
