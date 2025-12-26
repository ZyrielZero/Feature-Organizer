// Feature Organizer - Category Manager
// FoundryVTT V13 (Build 351+) | D&D 5e 5.1.x
// v1.0.0 Release Candidate

const MODULE_ID = "feature-organizer";

/**
 * Manages custom feature categories for actors
 */
export class CategoryManager {
  
  /**
   * Default system categories that always exist
   */
  static get SYSTEM_CATEGORIES() {
    return [
      { id: "class", label: "DND5E.Feature.Class", system: true, sortOrder: 0 },
      { id: "subclass", label: "DND5E.Feature.Subclass", system: true, sortOrder: 1 },
      { id: "background", label: "DND5E.Feature.Background", system: true, sortOrder: 2 },
      { id: "race", label: "DND5E.Feature.Race", system: true, sortOrder: 3 },
      { id: "feat", label: "DND5E.Feature.Feat", system: true, sortOrder: 4 }
    ];
  }
  
  /**
   * Get all categories for an actor (system + world + actor-specific)
   * @param {Actor5e} actor - The actor document
   * @returns {Array} Array of category objects
   */
  static getActorCategories(actor) {
    const systemCategories = this.SYSTEM_CATEGORIES.map(c => ({...c}));
    const worldCategories = this.getWorldCategories();
    const actorCategories = this.getActorSpecificCategories(actor);
    
    // Merge and sort
    const customCategories = [...worldCategories, ...actorCategories]
      .filter((cat, index, self) => 
        self.findIndex(c => c.id === cat.id) === index
      )
      .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
    
    return [...systemCategories, ...customCategories];
  }
  
  /**
   * Get world-wide template categories
   * @returns {Array} Array of category objects
   */
  static getWorldCategories() {
    return game.settings.get(MODULE_ID, "worldCategories") || [];
  }
  
  /**
   * Set world-wide template categories
   * @param {Array} categories - Array of category objects
   */
  static async setWorldCategories(categories) {
    await game.settings.set(MODULE_ID, "worldCategories", categories);
  }
  
  /**
   * Get actor-specific categories
   * @param {Actor5e} actor - The actor document
   * @returns {Array} Array of category objects
   */
  static getActorSpecificCategories(actor) {
    return actor.getFlag(MODULE_ID, "categories") || [];
  }
  
  /**
   * Create a new category for an actor
   * @param {Actor5e} actor - The actor document
   * @param {string} label - Category display name
   * @param {Object} options - Additional options
   * @returns {Object} The created category
   */
  static async createCategory(actor, label, options = {}) {
    const categories = this.getActorSpecificCategories(actor);
    const id = `custom-${foundry.utils.randomID()}`;
    
    const newCategory = {
      id,
      label,
      system: false,
      sortOrder: options.sortOrder ?? (categories.length + 10),
      icon: options.icon ?? "fas fa-star",
      color: options.color ?? null
    };
    
    categories.push(newCategory);
    await actor.setFlag(MODULE_ID, "categories", categories);
    
    return newCategory;
  }
  
  /**
   * Create a world-wide category
   * @param {string} label - Category display name
   * @param {Object} options - Additional options
   * @returns {Object} The created category
   */
  static async createWorldCategory(label, options = {}) {
    const categories = this.getWorldCategories();
    const id = `world-${foundry.utils.randomID()}`;
    
    const newCategory = {
      id,
      label,
      system: false,
      world: true,
      sortOrder: options.sortOrder ?? (categories.length + 10),
      icon: options.icon ?? "fas fa-star",
      color: options.color ?? null
    };
    
    categories.push(newCategory);
    await this.setWorldCategories(categories);
    
    return newCategory;
  }
  
  /**
   * Update a category
   * @param {Actor5e|null} actor - The actor (null for world categories)
   * @param {string} categoryId - Category ID to update
   * @param {Object} updates - Properties to update
   */
  static async updateCategory(actor, categoryId, updates) {
    if (categoryId.startsWith("world-") || !actor) {
      const categories = this.getWorldCategories();
      const index = categories.findIndex(c => c.id === categoryId);
      if (index >= 0) {
        categories[index] = { ...categories[index], ...updates };
        await this.setWorldCategories(categories);
      }
    } else {
      const categories = this.getActorSpecificCategories(actor);
      const index = categories.findIndex(c => c.id === categoryId);
      if (index >= 0) {
        categories[index] = { ...categories[index], ...updates };
        await actor.setFlag(MODULE_ID, "categories", categories);
      }
    }
  }
  
  /**
   * Delete a category
   * @param {Actor5e|null} actor - The actor (null for world categories)
   * @param {string} categoryId - Category ID to delete
   */
  static async deleteCategory(actor, categoryId) {
    if (categoryId.startsWith("world-") || !actor) {
      const categories = this.getWorldCategories().filter(c => c.id !== categoryId);
      await this.setWorldCategories(categories);
    } else {
      const categories = this.getActorSpecificCategories(actor).filter(c => c.id !== categoryId);
      await actor.setFlag(MODULE_ID, "categories", categories);
    }
    
    // If actor provided, reset any items in this category back to default
    if (actor) {
      const itemsToUpdate = actor.items.filter(i => 
        i.getFlag(MODULE_ID, "category") === categoryId
      );
      for (const item of itemsToUpdate) {
        await item.unsetFlag(MODULE_ID, "category");
      }
    }
  }
  
  /**
   * Get the category assignment for an item
   * @param {Item5e} item - The item document
   * @returns {string|null} Category ID or null for default
   */
  static getItemCategory(item) {
    return item.getFlag(MODULE_ID, "category") || null;
  }
  
  /**
   * Assign an item to a category
   * @param {Item5e} item - The item document
   * @param {string|null} categoryId - Category ID or null to reset to default
   */
  static async setItemCategory(item, categoryId) {
    if (categoryId) {
      await item.setFlag(MODULE_ID, "category", categoryId);
    } else {
      await item.unsetFlag(MODULE_ID, "category");
    }
  }
  
  /**
   * Get the default category for an item based on its type
   * @param {Item5e} item - The item document
   * @returns {string} Default category ID
   */
  static getDefaultCategory(item) {
    if (item.type !== "feat") return "feat";
    
    const featureType = item.system.type?.value;
    switch (featureType) {
      case "class": return "class";
      case "subclass": return "subclass";
      case "background": return "background";
      case "race": return "race";
      case "feat": return "feat";
      default: return "feat";
    }
  }
  
  /**
   * Get the effective category for an item (custom or default)
   * @param {Item5e} item - The item document
   * @returns {string} Category ID
   */
  static getEffectiveCategory(item) {
    return this.getItemCategory(item) || this.getDefaultCategory(item);
  }
  
  /**
   * Group actor's feature items by category
   * @param {Actor5e} actor - The actor document
   * @returns {Map} Map of categoryId -> items array
   */
  static groupItemsByCategory(actor) {
    const categories = this.getActorCategories(actor);
    const grouped = new Map();
    
    // Initialize all categories
    for (const cat of categories) {
      grouped.set(cat.id, []);
    }
    
    // Sort items into categories
    const features = actor.items.filter(i => i.type === "feat");
    for (const item of features) {
      const categoryId = this.getEffectiveCategory(item);
      if (grouped.has(categoryId)) {
        grouped.get(categoryId).push(item);
      } else {
        // Category doesn't exist, put in feat
        grouped.get("feat").push(item);
      }
    }
    
    return grouped;
  }
  
  /**
   * Get the display order of categories for an actor
   * Returns array of category IDs in display order
   * Native categories use "native:origin" format (e.g., "native:warlock")
   * @param {Actor5e} actor - The actor document
   * @returns {Array} Array of category IDs in order
   */
  static getCategoryOrder(actor) {
    return actor.getFlag(MODULE_ID, "categoryOrder") || [];
  }
  
  /**
   * Set the display order of categories for an actor
   * @param {Actor5e} actor - The actor document
   * @param {Array} order - Array of category IDs in desired order
   */
  static async setCategoryOrder(actor, order) {
    await actor.setFlag(MODULE_ID, "categoryOrder", order);
  }
  
  /**
   * Move a category up or down in the display order
   * @param {Actor5e} actor - The actor document
   * @param {string} categoryId - The category ID to move (native:origin or custom ID)
   * @param {number} direction - -1 for up, 1 for down
   * @param {Array} allCategoryIds - All current category IDs in DOM order
   */
  static async moveCategoryOrder(actor, categoryId, direction, allCategoryIds) {
    // Get current stored order, or use provided DOM order as default
    let order = this.getCategoryOrder(actor);
    
    // If no stored order, initialize from current DOM order
    if (!order || order.length === 0) {
      order = [...allCategoryIds];
    } else {
      // Merge any new categories that aren't in stored order
      for (const id of allCategoryIds) {
        if (!order.includes(id)) {
          order.push(id);
        }
      }
      // Remove any categories that no longer exist
      order = order.filter(id => allCategoryIds.includes(id));
    }
    
    const currentIndex = order.indexOf(categoryId);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    
    // Swap positions
    [order[currentIndex], order[newIndex]] = [order[newIndex], order[currentIndex]];
    
    await this.setCategoryOrder(actor, order);
  }
  
  /**
   * Sort an array of DOM elements based on stored category order
   * @param {Array} elements - Array of card elements
   * @param {Array} storedOrder - Stored category order array
   * @returns {Array} Sorted array of elements
   */
  static sortCardsByOrder(elements, storedOrder) {
    if (!storedOrder || storedOrder.length === 0) return elements;
    
    return [...elements].sort((a, b) => {
      const aId = a.dataset.categoryId || `native:${a.dataset.groupOrigin}`;
      const bId = b.dataset.categoryId || `native:${b.dataset.groupOrigin}`;
      
      const aIndex = storedOrder.indexOf(aId);
      const bIndex = storedOrder.indexOf(bId);
      
      // Items not in stored order go to the end
      const aSort = aIndex === -1 ? 9999 : aIndex;
      const bSort = bIndex === -1 ? 9999 : bIndex;
      
      return aSort - bSort;
    });
  }
}
