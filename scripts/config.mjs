// Feature Organizer - Configuration Application
// FoundryVTT V13 (Build 351+) | D&D 5e 5.1.x
// v1.0.7

import { CategoryManager } from "./category-manager.mjs";

const MODULE_ID = "feature-organizer";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Configuration application for managing world-wide categories
 */
export class FeatureOrganizerConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  
  static DEFAULT_OPTIONS = {
    id: "feature-organizer-config",
    classes: ["feature-organizer", "config-app"],
    tag: "form",
    position: { width: 500, height: "auto" },
    window: {
      title: "FEATURE_ORGANIZER.Config.Title",
      resizable: true
    },
    form: {
      handler: FeatureOrganizerConfig.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      addCategory: FeatureOrganizerConfig.#onAddCategory,
      deleteCategory: FeatureOrganizerConfig.#onDeleteCategory,
      moveUp: FeatureOrganizerConfig.#onMoveUp,
      moveDown: FeatureOrganizerConfig.#onMoveDown
    }
  };
  
  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/config.hbs` }
  };
  
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.categories = CategoryManager.getWorldCategories();
    context.MODULE_ID = MODULE_ID;
    return context;
  }
  
  static async #onSubmitForm(event, form, formData) {
    const categories = CategoryManager.getWorldCategories();
    const updates = [];
    
    // Process form data for each category
    for (const cat of categories) {
      const label = formData.object[`label-${cat.id}`];
      
      if (label !== cat.label) {
        updates.push({ id: cat.id, label });
      }
    }
    
    // Apply updates
    for (const update of updates) {
      await CategoryManager.updateCategory(null, update.id, update);
    }
    
    ui.notifications.info(game.i18n.localize("FEATURE_ORGANIZER.Config.Saved"));
  }
  
  static async #onAddCategory(event, target) {
    const dialog = new Dialog({
      title: game.i18n.localize("FEATURE_ORGANIZER.AddCategory"),
      content: `
        <form class="feature-organizer-dialog">
          <div class="form-group">
            <label>${game.i18n.localize("FEATURE_ORGANIZER.CategoryName")}</label>
            <input type="text" name="label" required autofocus>
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: game.i18n.localize("Create"),
          callback: async (html) => {
            const form = html[0]?.querySelector('form') || html.querySelector('form');
            const label = form.querySelector('[name="label"]').value.trim();
            
            if (!label) return;
            
            await CategoryManager.createWorldCategory(label, {});
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      },
      default: "create"
    });
    dialog.render(true);
  }
  
  static async #onDeleteCategory(event, target) {
    const categoryId = target.dataset.categoryId;
    const categories = CategoryManager.getWorldCategories();
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) return;
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("FEATURE_ORGANIZER.DeleteCategory"),
      content: `<p>${game.i18n.format("FEATURE_ORGANIZER.DeleteCategoryConfirm", { name: category.label })}</p>`
    });
    
    if (confirmed) {
      await CategoryManager.deleteCategory(null, categoryId);
      this.render();
    }
  }
  
  static async #onMoveUp(event, target) {
    const categoryId = target.dataset.categoryId;
    const categories = CategoryManager.getWorldCategories();
    const index = categories.findIndex(c => c.id === categoryId);
    
    if (index <= 0) return;
    
    // Swap positions in array
    [categories[index], categories[index - 1]] = [categories[index - 1], categories[index]];
    
    // Update sort orders
    categories.forEach((cat, i) => cat.sortOrder = i + 10);
    
    await CategoryManager.setWorldCategories(categories);
    this.render();
  }
  
  static async #onMoveDown(event, target) {
    const categoryId = target.dataset.categoryId;
    const categories = CategoryManager.getWorldCategories();
    const index = categories.findIndex(c => c.id === categoryId);
    
    if (index < 0 || index >= categories.length - 1) return;
    
    // Swap positions in array
    [categories[index], categories[index + 1]] = [categories[index + 1], categories[index]];
    
    // Update sort orders
    categories.forEach((cat, i) => cat.sortOrder = i + 10);
    
    await CategoryManager.setWorldCategories(categories);
    this.render();
  }
}
