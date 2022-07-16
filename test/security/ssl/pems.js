import { execSync } from 'child_process';

const action = process.argv[2];
const showOutput = process.argv.includes('--showOutput');
const isCiTest = process.argv.includes('--isCiTest');
const options = { stdio: 'pipe' };

if (showOutput) {
  delete options.stdio;
}

if (action == 'create') {
  execSync('openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca-key.pem -out ca-crt.pem', options);
  execSync('openssl genrsa -out server-key.pem 4096', options);
  execSync('openssl req -new -config server.cnf -key server-key.pem -out server-csr.pem', options);
  execSync('openssl x509 -req -extfile server.cnf -days 999 -passin "pass:password" -in server-csr.pem -CA ca-crt.pem -CAkey ca-key.pem -CAcreateserial -out server-crt.pem', options);
} else if (action == 'delete' && !isCiTest) {
  execSync('npx rimraf ca-crt.pem ca-key.pem ca-crt.srl server-crt.pem server-csr.pem server-key.pem', options);
}
