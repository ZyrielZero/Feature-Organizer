// Feature Organizer - Settings Registration
// FoundryVTT V13 (Build 351+) | D&D 5e 5.1.x
// v1.0.6

import { FeatureOrganizerConfig } from "./config.mjs";

const MODULE_ID = "feature-organizer";

export function registerSettings() {
  
  // World-wide template categories that appear for all actors
  game.settings.register(MODULE_ID, "worldCategories", {
    name: "FEATURE_ORGANIZER.Settings.WorldCategories",
    hint: "FEATURE_ORGANIZER.Settings.WorldCategoriesHint",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  
  // Whether players can create their own categories
  game.settings.register(MODULE_ID, "allowPlayerCategories", {
    name: "FEATURE_ORGANIZER.Settings.AllowPlayerCategories",
    hint: "FEATURE_ORGANIZER.Settings.AllowPlayerCategoriesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  
  // Settings menu for managing world categories
  game.settings.registerMenu(MODULE_ID, "worldCategoryManager", {
    name: "FEATURE_ORGANIZER.Settings.ManageWorldCategories",
    label: "FEATURE_ORGANIZER.Settings.ManageWorldCategoriesLabel",
    hint: "FEATURE_ORGANIZER.Settings.ManageWorldCategoriesHint",
    icon: "fas fa-folder-tree",
    type: FeatureOrganizerConfig,
    restricted: true
  });
}
