# BGC Atlas

[![DOI](https://zenodo.org/badge/842928932.svg)](https://doi.org/10.5281/zenodo.13903805)

## About

BGC Atlas is a web resource dedicated to exploring the diversity of biosynthetic gene clusters (BGCs) in metagenomes. Leveraging the power of metagenomics, BGC Atlas identifies and analyzes BGCs from diverse environmental samples, providing insights into the chemical diversity encoded in bacterial genomes. Our goal is to enhance the understanding of secondary metabolites produced by microorganisms and their ecological and evolutionary roles.

## Citation

If you use BGC Atlas in your research, please cite:

Bağcı, C., Nuhamunada, M., Goyat, H., Ladanyi, C., Sehnal, L., Blin, K., Kautsar, S. A., Tagirdzhanov, A., Gurevich, A., Mantri, S., von Mering, C., Udwary, D., Medema, M. H., Weber, T., & Ziemert, N. (2025). BGC Atlas: A web resource for exploring the global chemical diversity encoded in bacterial genomes. Nucleic Acids Research, 53(D1), D618–D624. https://doi.org/10.1093/nar/gkae953

## Key Features

- **Data Collection and Integration**: Metagenomic datasets are collected from publicly available repositories (MGnify). Datasets are processed to extract assembled contigs and associated metadata, providing detailed environmental context for each BGC.

- **BGC Identification and Annotation**: The [antiSMASH](https://antismash.secondarymetabolites.org) tool is used to identify and annotate BGCs within metagenomic assemblies.

- **Clustering and Analysis**: Identified BGCs are clustered into gene cluster families (GCFs) using [BiG-SLICE](https://github.com/medema-group/bigslice/).

- **User-Friendly Web Interface**: The web interface allows users to explore BGCs, GCFs, and samples with ease. Users can filter and search for BGCs based on specific criteria, visualize their distribution across various biomes, and query the database for similar clusters.

## Interface

The BGC Atlas interface consists of five main sections:

### Home
The Home page displays an overview of the BGC Atlas database, including the total number of samples, BGCs, and GCFs. It displays a global overview of the samples analyzed on a world map. Users can zoom in and out of the map, as well as pan to different regions. Users can highlight a section of the map using the rectangle tool and inspect the BGCs within that region.

### Samples
The Samples section displays a table of metagenomic samples, including information on the sample name, biome, the number of BGCs identified, and their associated metadata. Users can filter and search for samples based on specific criteria.

### BGCs
The BGCs section provides detailed information on individual biosynthetic gene clusters identified in metagenomic samples. Users can view the list of all BGCs, their product categories and types, the GCFs they clustered into, and their membership value. BGC entries shown in red indicate that the BGC is a putative member of its GCF (above a membership value of 0.4).

### GCFs
The GCFs section presents gene cluster families (GCFs) identified in the database, along with information on the number of BGCs, their product types, and distribution across different biomes they are found in. Opening a GCF entry displays detailed information on the family, including the list of associated BGCs and samples.

### Search
The Search section allows users to perform homology searches using antiSMASH-compatible GenBank files of BGCs they identify from other sources against the BGC-Atlas database. Users can upload one or multiple GenBank files containing biosynthetic gene clusters and search the database for similar clusters.

### Download
The Download section provides access to the raw data (GenBank files for BGCs, the BiG-SLiCE clustering of the database, and the full dump of the database) used in the BGC Atlas database.

## Installation

To set up a local instance of BGC Atlas, follow these steps. The project
requires **Node.js 18** or later (the recommended version is defined in
the `.nvmrc` file):

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/bgc-atlas-web.git
   cd bgc-atlas-web
   ```

2. Install dependencies:
   ```
   npm install
   npm run build-css  # or npm run watch-css for development
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables
   (see `.env.example` for a complete template):
   ```
   # Database connection
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_DATABASE=bgc_atlas
   DB_PASSWORD=change_me
   DB_PORT=5432

   # Redis configuration
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379

   # Application settings
   APP_URL=http://localhost:3000
   PORT=3000
   ENABLE_SSL=true      # Set to false to disable HTTPS
   SSL_CERT_PATH=/path/to/ssl/certs  # Optional

   # Paths used by the search feature
   MONTHLY_SOIL_BASE_DIR=/path/to/monthly-soil     # optional
   ULTRA_DEEP_SOIL_DIR=/path/to/ultra-deep-soil    # optional
   SEARCH_UPLOADS_DIR=/path/to/search/uploads      # optional
   SEARCH_SCRIPT_PATH=/path/to/search/script.py    # required
   REPORTS_DIR=/path/to/reports                    # required
   ```

4. Set up the database:
   - Install PostgreSQL if not already installed
   - Create a database named `bgcatlas`
   - Import the database dump (available in the Download section of the live site)

5. Start the application:
   ```
   npm start
   ```

6. Access the application at `http://localhost:3000`

## Dependencies

BGC Atlas is built with the following main dependencies:

- [Express.js](https://expressjs.com/) - Web framework
- [Helmet](https://helmetjs.github.io/) - Security headers
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit) - API rate limiting
- [Pug](https://pugjs.org/) - Template engine
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Node.js](https://nodejs.org/) - JavaScript runtime

For a complete list of dependencies, see the `package.json` file.

## Running Tests

Automated tests are written with [Jest](https://jestjs.io/). Ensure Node.js 18 or later is installed and run `npm install` to install dev dependencies. Then execute:

```
npm test
```

This command runs all test suites in the `tests` directory.

## Frontend Components

The user interface is built with Pug templates. Reusable pieces of markup live in the `views/components` directory as mixins. Core elements such as the navigation bar and footer are defined once and included across all pages. Additional components, like a generic card, can be composed to simplify future UI work.

## Data

The current version of BGC Atlas includes:
- 35,486 samples from MGnify
- 1,854,079 BGCs identified
- 13,854 GCFs identified

## Change Log

- **Current**: Added API rate limiting to prevent abuse of endpoints.
- **04.06.2025**: Added ultra-deep and monthly-soil sampling data from Schönbuch.
- **15.08.2024**: First release. 35,486 samples from MGnify analysed, and 1,854,079 BGCs and 13,854 GCFs identified.

## Contributing

Contributions to BGC Atlas are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please contact us at [caner.bagci@uni-tuebingen.de](mailto:caner.bagci@uni-tuebingen.de).
