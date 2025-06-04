# bgc-atlas-web

[![DOI](https://zenodo.org/badge/842928932.svg)](https://doi.org/10.5281/zenodo.13903805)

## Configuration

The application reads its configuration from environment variables. Create a
`.env` file (you can copy `\.env.example`) and adjust the values as needed.

Key variables include:

- `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT` – PostgreSQL
  connection details
- `APP_URL` – the public URL used when generating the sitemap
- `PORT` – port for the HTTPS server (defaults to `443`)
- `SSL_CERT_PATH` – directory containing `privkey.pem`, `fullchain.pem` and
  `chain.pem` (defaults to `/etc/letsencrypt/live/bgc-atlas.cs.uni-tuebingen.de`)
- `ULTRA_DEEP_SOIL_DIR` – location of the ultra‑deep soil results
  (defaults to `/ceph/ibmi/tgm/bgc-atlas/ultra-deep-soil`)
