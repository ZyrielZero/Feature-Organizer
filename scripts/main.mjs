// Feature Organizer - Main Entry Point
// FoundryVTT V13 (Build 351+) | D&D 5e 5.1.x
// v1.0.0 Release Candidate

import { FeatureOrganizerConfig } from "./config.mjs";
import { CategoryManager } from "./category-manager.mjs";
import { SheetIntegration } from "./sheet-integration.mjs";
import { registerSettings } from "./settings.mjs";

const MODULE_ID = "feature-organizer";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
  
  registerSettings();
  
  // Store module API for external access
  game.modules.get(MODULE_ID).api = {
    CategoryManager,
    getActorCategories: CategoryManager.getActorCategories,
    createCategory: CategoryManager.createCategory,
    MODULE_ID
  };
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
  
  // Global drop debug
  document.addEventListener('drop', (e) => {
    console.log('GLOBAL DROP EVENT:', e.target, e.defaultPrevented);
  }, true);
  
  document.addEventListener('dragend', (e) => {
    console.log('GLOBAL DRAGEND EVENT');
  }, true);
});

// Hook into character sheet rendering (legacy V12 style)
Hooks.on("renderActorSheet", (app, html, context) => {
  if (app.actor?.type !== "character") return;
  
  const htmlElement = html instanceof HTMLElement ? html : html[0];
  if (!htmlElement) return;
  
  SheetIntegration.onRenderCharacterSheet(app, htmlElement, context);
});

// Hook into ApplicationV2 render cycle (V13 style)
Hooks.on("renderDocumentSheetV2", (app, html, context) => {
  if (app.document?.type !== "character") return;
  SheetIntegration.onRenderCharacterSheet(app, html, context);
});

// Handle item drops for category assignment
Hooks.on("dropActorSheetData", (actor, sheet, data) => {
  return SheetIntegration.onDropActorSheetData(actor, sheet, data);
});

export { MODULE_ID, CategoryManager, FeatureOrganizerConfig };
