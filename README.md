# Risk Checker Core

This repository contains the core UI and logic for the Risk Checker project.

## What this is

- A decision-support tool
- NOT a diagnostic or judgment system
- Designed to detect red flags and return final decisions to humans

## Included tools

- Night Checker (WIP)

## Running Night Checker locally

Night Checker relies on ES modules, so open a browser via HTTP instead of directly opening the file. From the `docs` folder:

```
cd /Users/aramakimasato/projects/risk-checker-core/docs
python3 -m http.server 8000
```

Then visit `http://localhost:8000/night.html`. If you serve from the repository root, the same content is available at `http://localhost:8000/docs/night.html`.

## Principles

This project follows strict design principles:

- No diagnosis
- No evaluation
- No final judgment
- Yes/No fact confirmation only

See:

- ARCHITECTURE.md
- PRINCIPLES.md
