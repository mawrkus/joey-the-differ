# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.0] - 2020-06-03

### Changed

- Split into two distinct exports: `JoeyTheDiffer` and `JoeyTheFilesDiffer`

### Added

- Added basic browser support via `require('joey-the-differ/browser')`
- Added `returnPathAsArray` option

### Removed

- `JoeyTheDiffer.diffFiles()` has moved to `JoeyTheFilesDiffer.diff()`

## [1.5.0] - 2020-05-03

### Added

- Bulk diffing: diffing all files contained in a directory (one against many or by pairs)
- Option to save results to file(s)

### Removed

- CLI spinner to allow pipes and redirections

## [1.4.0] - 2020-05-01

### Added

- Preprocessors

## [1.3.0] - 2020-04-29

### Added

- Dockerfile added (thanks @joskfg)

## [1.2.1] - 2020-04-28

### Fixed

- undefined source values diffed with non-undefined target values were detected twice: as a type change and as new values

## [1.2.0] - 2020-04-28

### Added

- `-c` CLI option: it's now possible to specify a config file that will be passed as options to Joey
- Added demo files

## [1.1.0] - 2020-04-25

### Changed

- Operations returned followed the [JSON Patch RFC 6902](https://tools.ietf.org/html/rfc6902)

### Fixed

- Custom differs now take precedence over checking if the value has disappeared

### Added

- Added CHANGELOG
- Support for "undefined" type (not an actual JSON type but useful ;))

## [1.0.0] - 2020-04-11

### Added

- First version! 🎉
