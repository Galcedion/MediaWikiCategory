# Change Log

Version changelog for MediaWikiCategory.

## 1.2 - 30.09.2026

### Quality of Life

- Overall improved error display and messaging.
- The math categories now support drag and drop to change positions.
- Various visual improvements to MediaWikiCategory.
- Success-feedback when changing settings.
- Result-filter is now persistent within the current wiki.

### Added

#### Capabilities

- Fetching of currently open category pages is now possible.
- Wiki languages are now detected, allowing for language separation in the results for subdomains with multiple wikis.
- Advanced math mode with brackets and the option to add categories multiple times.

#### Settings

- Math type. (default simple)
- Download of settings and stored wiki data.
- Load previously downloaded settings and wiki data.

### Fixes

- Fixing issue where faulty page links were created for categories with multiple source pages. (retroactive)

### Security

- Added security checks when saving category items against malicious wikis.

## 1.1 - 30.03.2026

### Quality of Life

- Display of used storage size.
- Improved saving of categories.
- Various visual improvements to MediaWikiCategory.
- Option for case sensitive / insensitive search in results.
- Better operator explanations including truth table.

### Added

#### Capabilities

- Options to delete all data and settings.
- NAND, NOR, XNOR operators.

#### Settings

- Logic notation. (default text-based)

### Fixes

- Fixing issues related to saving categories.
- Fixing issues where refreshing the wiki-view would not reload the data correctly.

### Security

- Added security checks to the category saving against malicious wikis.

## 1.0 - 03.09.2025

### Added

#### Capabilities

- Fetch categories from MediaWiki pages.
- Independent management of different wikis.
- Remove stored data.
- Logical operations on stored categories: AND, OR, XOR