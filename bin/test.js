const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('../app');

const certDir = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/bgc-atlas.cs.uni-tuebingen.de';
const privateKey = fs.readFileSync(path.join(certDir, 'privkey.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(certDir, 'fullchain.pem'), 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate
};

const port = 3000; // Use a different port than 443 for local testing

const server = https.createServer(credentials, app);

server.listen(port, () => {
    console.log(`Server running locally on port ${port}`);
});
