# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a front-end interview study repository containing markdown notes in Chinese. The content covers interview preparation topics for front-end developers.

## Project Structure

This project uses **MkDocs** with Material theme to generate a beautiful documentation site from markdown files.

### Key Files

- **mkdocs.yml** - MkDocs configuration (theme, plugins, navigation)
- **docs/** - Source markdown files
- **site/** - Generated HTML output (do not edit directly)
- **frontend-interview-master.md** - Main comprehensive document (single file source)
- **split_chapters.py** - Script to split master document into chapter files

### Directory Structure

```
docs/
├── index.md              # Homepage
├── html/                 # HTML chapter files
│   └── hyper-frequencies.md
├── css/                  # CSS chapter files
│   ├── hyper-frequencies.md
│   ├── section-1-5.md
│   └── section-6-10.md
├── js/                   # JavaScript chapter files
│   ├── hyper-frequencies.md
│   ├── section-13-18.md
│   └── section-19-25.md
├── typescript/
├── network/
├── performance/
├── coding/
└── stylesheets/
    └── extra.css         # Custom CSS overrides
```

## Commands

```bash
# Development server (live reload)
mkdocs serve --dev-addr 127.0.0.1:8000

# Build static site
mkdocs build

# Build and deploy (if hosting config is set)
mkdocs gh-deploy

# Clean build
mkdocs build --clean
```

## Document Conventions

- Main document uses `<!--toc-->` for auto-generated table of contents
- Sections follow consistent format: concept → code examples → key points
- Chinese headings: ## 一、xxx for main chapters, ### 1. xxx for subsections
- Code blocks use triple backticks with language specifiers (html, css, js, ts)

## Working with Content

- When adding new content, place it in the appropriate `docs/{topic}/` directory
- Update `mkdocs.yml` navigation section to include new pages
- Run `split_chapters.py` if modifying the main `frontend-interview-master.md`
- Commit both the markdown source and the generated `site/` folder

## Theme Customization

- Edit `docs/stylesheets/extra.css` for custom CSS
- Edit `mkdocs.yml` for theme, plugin, and navigation changes
- Material theme features enabled: instant navigation, search, code copy, dark mode