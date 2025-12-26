# Changelog

All notable changes to Feature Organizer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-25

### Added
- Custom category creation with unlimited categories per character
- Drag-and-drop organization between native and custom categories
- Cross-category movement for native D&D 5e categories (Class, Background, Race, Feats)
- Category card reordering via up/down buttons
- Manual sorting within custom categories
- Per-character category storage via actor flags
- World-wide category templates (GM configurable)
- Player category creation toggle (world setting)
- Full compatibility with D&D 5e 5.1.x Activities system
- Support for both legacy V12 and new V13 render hooks

### Technical
- Built for FoundryVTT V13 (Build 351+)
- Native DOM manipulation (no jQuery dependencies in module code)
- ApplicationV2 configuration dialog
- ES Module architecture
