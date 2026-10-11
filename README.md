# MOSAdemy public site

This repository is the public, static output of the MOSAdemy data-management project.
It is deployed to GitHub Pages from `docs/` and intentionally contains no backend
source, administrator UI, credentials, hospital registration records, raw sensor
history, or private API configuration.

## Published content

- `docs/index.html`: public project entry point
- `docs/data-guide.html`: public-data contract and availability rules
- `docs/svgmap-guide.html`: SVGMap integration guide
- `docs/public-data/catalog.json`: allowlisted public-data catalog
- `docs/public_manifest.json`: hashes produced by the private release builder

The catalog may be empty. Data is published only after an explicit review in the
private source repository; missing data must not be inferred from private storage.

## Deployment

Pushes to `main` run `.github/workflows/deploy-pages.yml`. The workflow first runs
`python scripts/validate_public_repository.py`, then uploads `docs/` to GitHub Pages.
The validator rejects unexpected tracked files, manifest mismatches, secret-like
strings, backend files, administrator pages, raw archives, and private-data paths.

Site: <https://mosa-github.github.io/data_test_server_page/>

## Source boundary

The application server, authentication, operational documentation, migrations,
and source data belong to the separate private repository. Do not add them here.
Publishing is one-way and allowlist-based.

Historical commits may still contain files removed from the current branch. Any
history rewrite must follow the separately reviewed cleanup plan and requires
credential rotation plus coordination with every clone and deployment consumer.
