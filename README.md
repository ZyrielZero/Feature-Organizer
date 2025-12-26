# Feature Organizer

A FoundryVTT module for D&D 5e that allows you to organize character features into custom categories with full drag-and-drop support. Perfect for homebrew-heavy campaigns or anyone who wants better control over their character sheet organization.

**Compatibility:**
- FoundryVTT: V13 (Build 351+)
- D&D 5e System: 5.0.0 - 5.1.x

## Why Use This?

The default D&D 5e character sheet organizes features by their source (Class, Background, Species, Feats). This works fine for standard play, but becomes unwieldy when:

- You have homebrew systems that don't fit neatly into existing categories
- You want to group features by function (Offensive, Defensive, Utility)
- Multiclassing creates a cluttered mess of features
- You prefer organizing by usage frequency or combat role

Feature Organizer lets you create categories like "Ki Techniques," "Combat Maneuvers," "Passive Abilities," or whatever makes sense for your character.

## Features

- **Custom Categories**: Create unlimited categories tailored to your needs
- **Drag & Drop**: Move features between native and custom categories effortlessly
- **Cross-Category Movement**: Reorganize features between native categories (Class, Background, Species, Feats)
- **Category Reordering**: Arrange category cards in any order using the ▲/▼ buttons
- **Manual Sorting**: Drag features within categories to set your preferred order
- **Per-Character Storage**: Each character maintains their own organization scheme
- **World Categories**: GMs can create template categories available to all characters

## Installation

### Manifest URL (Recommended)

1. In Foundry, go to **Add-on Modules** → **Install Module**
2. Paste the manifest URL:
   ```
   https://raw.githubusercontent.com/ZyrielZero/feature-organizer/main/module.json
   ```
3. Click **Install**

### Forge VTT

1. Download the module ZIP from the [Releases](https://github.com/ZyrielZero/feature-organizer/releases) page
2. Go to [forge-vtt.com](https://forge-vtt.com) → **My Foundry** → **Bazaar**
3. Use **Import Wizard** to upload the ZIP
4. Enable the module in your world

### Self-Hosted

1. Download and extract the ZIP to your Foundry `Data/modules/` directory
2. Restart Foundry and enable the module in your world

## Usage

### Creating Categories

1. Open a character sheet and navigate to the **Features** tab
2. Enter **Edit Mode** (click the pencil icon in the sheet header)
3. Click the **+ Add Category** button
4. Enter a category name and click Save

### Organizing Features

| Action | How To |
|--------|--------|
| Move to custom category | Drag a feature onto a custom category card |
| Move between native categories | Drag a feature from one native category to another |
| Return to default location | Drag a feature back to its original native category |
| Reorder categories | Click ▲/▼ buttons on any category header |
| Sort within a category | Drag features up or down within any custom category |

### Managing Categories

- **Edit**: Click the pencil icon on a custom category header to rename it
- **Delete**: Click the trash icon to remove a category (features return to their default locations)

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Allow Player Categories | Enabled | When enabled, players can create custom categories on their own characters. Disable to restrict category creation to GMs only. |

GMs can also access **Manage World Categories** in module settings to create categories that appear on all character sheets.

## How It Works

The module stores category assignments as flags on individual items. When you drag a feature to a custom category, it sets a flag indicating where to display that feature. The underlying item data remains unchanged, and native D&D 5e sorting continues to work normally within native categories.

## Troubleshooting

**Categories not appearing:**
- Verify the module is enabled in Module Management
- You must be in Edit Mode to see the Add Category button
- Try refreshing your browser (F5)

**Can't drag features:**
- Only "feat" type items can be organized (class features, racial traits, feats, etc.)
- Spells, equipment, and other item types use different tabs and aren't affected by this module

**Features not moving:**
- Ensure you're dropping on the category card itself, not empty space
- Check the browser console (F12) for any error messages

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
