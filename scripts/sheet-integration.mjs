// Feature Organizer - Sheet Integration
// FoundryVTT V13 (Build 351+) | D&D 5e 5.1.x
// v1.0.21

import { CategoryManager } from "./category-manager.mjs";

const MODULE_ID = "feature-organizer";

// Module-level drag state
let currentDragData = null;

/**
 * Handles integration with the D&D 5e character sheet.
 */
export class SheetIntegration {
  
  /**
   * Main entry point - called on character sheet render
   */
  static onRenderCharacterSheet(app, html, context) {
    const actor = app.actor || app.document;
    if (!actor) return;
    
    const featuresTab = html.querySelector('section.tab[data-tab="features"]') 
      || html.querySelector('[data-tab="features"]');
    if (!featuresTab) return;
    
    const inventoryElement = featuresTab.querySelector('dnd5e-inventory') 
      || featuresTab.querySelector('.inventory-element')
      || featuresTab;
    
    const featuresListSection = inventoryElement.querySelector('section.features-list[data-item-list="features"]')
      || inventoryElement.querySelector('.features-list')
      || inventoryElement.querySelector('.items-list');
    
    const sheet = html.closest('.sheet') || html;
    const isEditMode = sheet.classList.contains('editable');
    
    this._addCategoryButton(app, featuresTab, inventoryElement, actor, isEditMode);
    
    if (featuresListSection) {
      this._hideCustomCategoryItems(featuresListSection, actor);
      this._handleNativeOverrides(featuresListSection, actor, isEditMode);
      this._enableNativeCardDrops(featuresListSection, actor, app);
      this._injectCustomCategories(app, featuresListSection, actor, isEditMode);
      this._setupCategoryOrdering(featuresListSection, actor, app, isEditMode);
    }
  }
  
  static _hideCustomCategoryItems(container, actor) {
    const itemsInCustomCategories = new Set();
    
    for (const item of actor.items) {
      if (item.type !== "feat") continue;
      const assignedCategory = item.getFlag(MODULE_ID, "category");
      if (assignedCategory && !assignedCategory.startsWith('native:')) {
        itemsInCustomCategories.add(item.id);
      }
    }
    
    if (itemsInCustomCategories.size === 0) return;
    
    const nativeCards = container.querySelectorAll('.items-section.card[data-group-origin]');
    
    for (const card of nativeCards) {
      const items = card.querySelectorAll('.item[data-item-id]');
      for (const itemEl of items) {
        if (itemsInCustomCategories.has(itemEl.dataset.itemId)) {
          itemEl.classList.add('fo-hidden');
        }
      }
    }
  }
  
  static _handleNativeOverrides(container, actor, isEditMode) {
    const nativeOverrides = new Map();
    
    for (const item of actor.items) {
      if (item.type !== "feat") continue;
      const assignedCategory = item.getFlag(MODULE_ID, "category");
      if (assignedCategory && assignedCategory.startsWith('native:')) {
        const targetOrigin = assignedCategory.replace('native:', '');
        nativeOverrides.set(item.id, { item, targetOrigin });
      }
    }
    
    if (nativeOverrides.size === 0) return;
    
    const nativeCards = container.querySelectorAll('.items-section.card[data-group-origin]');
    
    for (const card of nativeCards) {
      const cardOrigin = card.dataset.groupOrigin;
      const itemList = card.querySelector('.item-list');
      if (!itemList) continue;
      
      const nativeItems = card.querySelectorAll('.item[data-item-id]');
      for (const itemEl of nativeItems) {
        const override = nativeOverrides.get(itemEl.dataset.itemId);
        if (override && override.targetOrigin !== cardOrigin) {
          itemEl.classList.add('fo-hidden');
        }
      }
      
      const itemsToInject = [];
      for (const [itemId, { item, targetOrigin }] of nativeOverrides) {
        if (targetOrigin === cardOrigin) {
          const existingItem = card.querySelector(`.item[data-item-id="${itemId}"]:not(.fo-hidden)`);
          if (!existingItem) {
            itemsToInject.push(item);
          }
        }
      }
      
      for (const item of itemsToInject) {
        const injectedEl = this._createNativeItemElement(item, actor, isEditMode);
        injectedEl.classList.add('fo-injected');
        
        const allListItems = [...itemList.querySelectorAll('li.item[data-item-id]:not(.fo-hidden)')];
        let insertBefore = null;
        
        for (const listItem of allListItems) {
          const listItemId = listItem.dataset.itemId;
          const listItemDoc = actor.items.get(listItemId);
          if (listItemDoc && (listItemDoc.sort ?? 0) > (item.sort ?? 0)) {
            insertBefore = listItem;
            break;
          }
        }
        
        if (insertBefore) {
          itemList.insertBefore(injectedEl, insertBefore);
        } else {
          itemList.appendChild(injectedEl);
        }
      }
    }
  }
  
  static _createNativeItemElement(item, actor, isEditMode) {
    const li = document.createElement('li');
    li.className = 'item collapsible fo-injected-item';
    li.dataset.uuid = item.uuid;
    li.dataset.itemId = item.id;
    li.dataset.entryId = item.id;
    li.dataset.itemName = item.name;
    
    const uses = item.system.uses;
    const hasUses = uses?.max > 0;
    const usesValue = uses?.value ?? 0;
    const usesMax = uses?.max ?? 0;
    const recovery = uses?.recovery?.[0]?.period || '';
    const recoveryLabel = { sr: 'SR', lr: 'LR', day: 'Day', dawn: 'Dawn', dusk: 'Dusk' }[recovery] || '';
    
    li.innerHTML = `
      <div class="item-row draggable" draggable="true">
        <div class="item-name item-action item-tooltip rollable" role="button" data-action="use" aria-label="${item.name}">
          <img class="item-image gold-icon" src="${item.img}" alt="${item.name}" draggable="false">
          <div class="name name-stacked">
            <span class="title">${item.name}</span>
          </div>
          <div class="tags"></div>
        </div>
        <div class="item-detail item-uses ${!hasUses ? 'empty' : ''}" data-column-id="uses">${hasUses ? `${usesValue} / ${usesMax}` : ''}</div>
        <div class="item-detail item-recovery ${!recovery ? 'empty' : ''}" data-column-id="recovery">${recoveryLabel}</div>
        <div class="item-detail item-controls always-visible" data-column-id="controls">
          <button type="button" class="unbutton config-button item-control item-action always-interactive" data-toggle-description data-action="toggleExpand" aria-label="Toggle Description">
            <i class="fa-solid fa-expand" inert></i>
          </button>
          <button type="button" class="unbutton config-button item-control always-interactive" data-context-menu aria-label="Additional Controls">
            <i class="fa-solid fa-ellipsis-vertical" inert></i>
          </button>
        </div>
      </div>
    `;
    
    li.querySelector('.item-name').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      item.sheet.render(true);
    });
    
    const row = li.querySelector('.item-row');
    row.addEventListener('dragstart', (e) => {
      // Ensure we get the latest flags
      const categoryFlag = item.getFlag(MODULE_ID, 'category') || '';
      const nativeOrigin = SheetIntegration._getItemNativeOrigin(item);
      
      currentDragData = {
        itemId: item.id,
        categoryId: categoryFlag, // This will have the 'native:X' override
        uuid: item.uuid,
        isNativeItem: false, // Injected items are by definition not in their native visual slot
        nativeOrigin: nativeOrigin
      };
      
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: "Item",
        uuid: item.uuid
      }));
      // Add custom type to help identify our drags
      e.dataTransfer.setData('application/x-fo-item', JSON.stringify({ uuid: item.uuid }));
      
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('fo-dragging');
    });
    
    row.addEventListener('dragend', () => {
      li.classList.remove('fo-dragging');
      currentDragData = null;
    });
    
    return li;
  }
  
  static _enableNativeCardDrops(container, actor, app) {
    const nativeCards = container.querySelectorAll('.items-section.card[data-group-origin]');
    
    for (const card of nativeCards) {
      const cardOrigin = card.dataset.groupOrigin;
      
      if (card.dataset.foDropEnabled) continue;
      card.dataset.foDropEnabled = 'true';
      
      this._enableNativeCategorySorting(card, cardOrigin, actor, app);
      this._enableInjectedItemSorting(card, cardOrigin, actor, app);
      
      card.addEventListener('dragenter', (e) => {
        // PERMISSIVE: Always allow dragenter to register the drop zone
        if (currentDragData || e.dataTransfer.types.includes('application/x-fo-item')) {
            e.preventDefault(); 
            card.classList.add('fo-drag-over');
        }
      }, true);
      
      card.addEventListener('dragover', (e) => {
        // PERMISSIVE: Always prevent default to allow the drop.
        // This fixes the "Cancel" symbol (🚫). 
        
        // If it's one of our drags, we MUST allow it.
        if (currentDragData || e.dataTransfer.types.includes('application/x-fo-item')) {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            // Note: We do NOT stop propagation here on the card, because we want 
            // the event to trickle down to the LIST for sorting.
            // If we stopped it here, the list listener (also capture) might be skipped 
            // depending on browser impl, or standard bubbling listeners would die.
        }
      }, true);
      
      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove('fo-drag-over');
        }
      }, true);
      
      // Use CAPTURE phase (true) to intercept before native handlers
      card.addEventListener('drop', async (e) => {
        card.classList.remove('fo-drag-over');
        
        let dragData = currentDragData;

        // Fallback: If currentDragData is null, attempt to rehydrate from dataTransfer
        if (!dragData) {
            try {
                const textData = e.dataTransfer.getData('text/plain');
                if (textData) {
                    const parsed = JSON.parse(textData);
                    if (parsed.uuid) {
                         const item = await fromUuid(parsed.uuid);
                         if (item && item.type === "feat") {
                             dragData = {
                                 itemId: item.id,
                                 categoryId: item.getFlag(MODULE_ID, "category"),
                                 uuid: item.uuid,
                                 isNativeItem: !item.getFlag(MODULE_ID, "category"),
                                 nativeOrigin: this._getItemNativeOrigin(item)
                             };
                         }
                    }
                }
            } catch (err) { /* ignore */ }
        }

        if (!dragData) return;
        
        // True native item in its home - let native handle sorting
        const isTrueNativeHome = dragData.nativeOrigin === cardOrigin && dragData.isNativeItem;
        if (isTrueNativeHome) return;
        
        // If we are dropping onto the same injected category, let sorting handle it
        const isInjectedInThisCard = dragData.categoryId === `native:${cardOrigin}`;
        if (isInjectedInThisCard) return;
        
        // Cross-category move: This is where we override native behavior
        // Stop native listeners from processing this drop as invalid
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        const item = await fromUuid(dragData.uuid);
        if (!item || item.parent !== actor || item.type !== "feat") return;
        
        const currentCategory = item.getFlag(MODULE_ID, "category");
        const itemNativeOrigin = this._getItemNativeOrigin(item);
        
        // Dropping on item's natural home - clear any override
        // Use loose check for "species" vs "race" discrepancy
        const isReturningHome = itemNativeOrigin === cardOrigin || 
                               (itemNativeOrigin === "race" && cardOrigin === "species") ||
                               (itemNativeOrigin === "species" && cardOrigin === "race");

        if (isReturningHome) {
          if (currentCategory) {
            await item.unsetFlag(MODULE_ID, "category");
            app.render();
          }
          return;
        }
        
        // Cross-category move - set the override
        const targetCategory = `native:${cardOrigin}`;
        if (currentCategory !== targetCategory) {
          await CategoryManager.setItemCategory(item, targetCategory);
          app.render();
        }
      }, true); // Important: Capture phase
    }
  }
  
  static _enableInjectedItemSorting(card, cardOrigin, actor, app) {
    const list = card.querySelector('.item-list');
    if (!list) return;
    
    let draggedItem = null;
    let placeholder = null;
    
    list.addEventListener('dragover', (e) => {
      // 1. Check if this is a "Feature Organizer" drag
      const isFODrag = currentDragData || e.dataTransfer.types.includes('application/x-fo-item');
      
      // 2. If it's a native item in its own home, let it bubble to the native system.
      if (currentDragData && currentDragData.nativeOrigin === cardOrigin && currentDragData.isNativeItem) {
          return; 
      }
      
      // 3. If it's NOT a native home drag, but it IS our drag, we MUST intervene
      // This prevents the native list listener from seeing the event and setting dropEffect = none
      if (isFODrag) {
          e.preventDefault();
          e.stopPropagation(); // CRITICAL: Stop the Native 5e List listener from firing
          e.dataTransfer.dropEffect = 'move';
      } else {
          return;
      }
      
      // 4. Handle Visual Sorting
      if (!currentDragData) return; // Can't sort if we don't have memory of what we are dragging

      // Only sort if we are in the correct target category
      const targetCategory = `native:${cardOrigin}`;
      // Allow sorting if it's already assigned here, OR if we are dragging a custom item 
      // (We want to allow "drop to sort" even if not assigned yet, though usually drop happens first)
      
      // For now, only sort if it's already assigned here to prevent jitter on initial drop
      if (currentDragData.categoryId !== targetCategory) return;
      
      const targetItem = e.target.closest('li.item');
      if (!targetItem || targetItem.classList.contains('fo-dragging')) return;
      
      if (!placeholder) {
        placeholder = document.createElement('li');
        placeholder.className = 'fo-sort-placeholder';
      }
      
      if (!draggedItem) {
        draggedItem = list.querySelector('.fo-dragging');
      }
      
      if (!draggedItem) return;
      
      const rect = targetItem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        targetItem.parentNode.insertBefore(placeholder, targetItem);
      } else {
        targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
      }
      
      draggedItem.style.display = 'none';
    }, true); // Capture phase to preempt native listener
    
    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) {
        if (placeholder?.parentNode) placeholder.remove();
        if (draggedItem) draggedItem.style.display = '';
        placeholder = null;
        draggedItem = null;
      }
    }, true);
    
    list.addEventListener('drop', async (e) => {
      if (!currentDragData) return;
      
      // Only process sorting if we are in the destination category
      if (currentDragData.categoryId !== `native:${cardOrigin}`) return;
      
      // Check if we even need to handle sorting (are there injected items?)
      const isMixedList = list.querySelector('.fo-injected-item') !== null;
      const isTargetInjected = !currentDragData.isNativeItem;

      if (!isMixedList && !isTargetInjected) {
        if (placeholder?.parentNode) placeholder.remove();
        if (draggedItem) draggedItem.style.display = '';
        placeholder = null;
        draggedItem = null;
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Prevent native sort from running on injected items
      
      if (draggedItem) {
        draggedItem.style.display = '';
        draggedItem.classList.remove('fo-dragging');
      }
      
      if (placeholder?.parentNode) {
        const allItems = [...list.querySelectorAll('li.item[data-item-id]')]
          .filter(el => el.dataset.itemId !== currentDragData.itemId);
        
        let insertIndex = 0;
        for (const item of allItems) {
          if (placeholder.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING) {
            break;
          }
          insertIndex++;
        }
        
        placeholder.remove();
        
        const newOrder = [];
        for (let i = 0; i < allItems.length; i++) {
          if (i === insertIndex) {
            newOrder.push({ itemId: currentDragData.itemId, sort: newOrder.length * 100000 });
          }
          newOrder.push({ itemId: allItems[i].dataset.itemId, sort: newOrder.length * 100000 });
        }
        
        if (insertIndex >= allItems.length) {
          newOrder.push({ itemId: currentDragData.itemId, sort: newOrder.length * 100000 });
        }
        
        const updates = newOrder.map(({ itemId, sort }) => ({ _id: itemId, sort }));
        if (updates.length > 0) {
          await actor.updateEmbeddedDocuments("Item", updates);
        }
      }
      
      placeholder = null;
      draggedItem = null;
    }, true);
  }
  
  static _enableNativeCategorySorting(card, cardOrigin, actor, app) {
    const list = card.querySelector('.item-list');
    if (!list) return;
    
    const items = list.querySelectorAll('li.item[data-item-id]');
    for (const itemEl of items) {
      if (itemEl.classList.contains('fo-injected-item')) continue;
      
      if (itemEl.dataset.foSortEnabled) continue;
      itemEl.dataset.foSortEnabled = 'true';
      itemEl.classList.add('fo-sortable-item');
      
      const row = itemEl.querySelector('.item-row[draggable="true"]') 
        || itemEl.querySelector('[draggable="true"]');
      if (!row) continue;
      
      row.addEventListener('dragstart', (e) => {
        const itemId = itemEl.dataset.itemId;
        const item = actor.items.get(itemId);
        const categoryFlag = item?.getFlag(MODULE_ID, 'category');
        
        currentDragData = {
          itemId: itemId,
          categoryId: categoryFlag || `native:${cardOrigin}`,
          uuid: item?.uuid,
          isNativeItem: !categoryFlag, 
          nativeOrigin: cardOrigin
        };
        
        // Add custom type here too
        e.dataTransfer.setData('application/x-fo-item', JSON.stringify({ uuid: item?.uuid }));
        
        itemEl.classList.add('fo-dragging');
      });
      
      row.addEventListener('dragend', () => {
        itemEl.classList.remove('fo-dragging');
        currentDragData = null;
      });
    }
  }
  
  static _getItemNativeOrigin(item) {
    if (item.type !== "feat") return null;
    
    const featureType = item.system.type?.value;
    const subtype = item.system.type?.subtype;
    
    if (featureType === "class" && subtype) return subtype.toLowerCase();
    if (featureType === "subclass" && subtype) return subtype.toLowerCase();
    
    // Fallback for 5.x if class/subclass features lack subtype (e.g. generic features)
    if (featureType === "class") return "class";
    if (featureType === "subclass") return "subclass";
    
    if (featureType === "background") return "background";
    if (featureType === "race") return "species"; 
    if (featureType === "feat") return "feat";
    if (featureType === "monster") return "monster";
    
    return featureType?.toLowerCase() || "other";
  }

  static _addCategoryButton(app, featuresTab, inventoryElement, actor, isEditMode) {
    featuresTab.querySelector('.fo-add-category-btn')?.remove();
    
    if (!isEditMode) return;
    const canCreate = game.user.isGM || game.settings.get(MODULE_ID, "allowPlayerCategories");
    if (!canCreate) return;
    
    const middleDiv = inventoryElement.querySelector('.middle');
    if (!middleDiv) return;
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fo-add-category-btn';
    btn.innerHTML = '<i class="fas fa-plus"></i> Add Category';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this._showCategoryDialog(actor, null, app);
    });
    
    middleDiv.appendChild(btn);
  }

  static _injectCustomCategories(app, container, actor, isEditMode) {
    container.querySelectorAll('.fo-custom-card').forEach(el => el.remove());
    
    const customCategories = CategoryManager.getActorCategories(actor).filter(c => !c.system);
    if (customCategories.length === 0) return;
    
    const groupedItems = CategoryManager.groupItemsByCategory(actor);
    
    for (const category of customCategories) {
      const items = groupedItems.get(category.id) || [];
      const card = this._createCategoryCard(category, items, actor, isEditMode, app);
      container.appendChild(card);
    }
  }
  
  static _createCategoryCard(category, items, actor, isEditMode, app) {
    const card = document.createElement('div');
    card.className = 'items-section card fo-custom-card';
    card.dataset.categoryId = category.id;
    card.dataset.groupOrigin = category.id;
    
    const header = document.createElement('div');
    header.className = 'items-header header';
    
    const nameEl = document.createElement('h3');
    nameEl.className = 'item-name';
    nameEl.textContent = category.label;
    header.appendChild(nameEl);
    
    const usesCol = document.createElement('div');
    usesCol.className = 'item-header item-uses';
    usesCol.textContent = 'Uses';
    header.appendChild(usesCol);
    
    const recoveryCol = document.createElement('div');
    recoveryCol.className = 'item-header item-recovery';
    recoveryCol.textContent = 'Recovery';
    header.appendChild(recoveryCol);
    
    const controlsCol = document.createElement('div');
    controlsCol.className = 'item-header item-controls';
    header.appendChild(controlsCol);
    
    if (isEditMode) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'fo-category-buttons';
      btnContainer.innerHTML = `
        <button type="button" data-action="editCategory" title="Edit"><i class="fas fa-edit"></i></button>
        <button type="button" data-action="deleteCategory" title="Delete"><i class="fas fa-trash"></i></button>
      `;
      header.appendChild(btnContainer);
    }
    
    const list = document.createElement('ul');
    list.className = 'item-list unlist';
    
    const sortedItems = [...items].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    for (const item of sortedItems) {
      const itemEl = this._createItemElement(item, actor, isEditMode, category);
      list.appendChild(itemEl);
    }
    
    if (items.length === 0) {
      const emptyEl = document.createElement('li');
      emptyEl.className = 'item fo-empty';
      emptyEl.innerHTML = '<div class="item-row"><div class="item-name" style="opacity:0.5;font-style:italic;">Drag features here</div></div>';
      list.appendChild(emptyEl);
    }
    
    card.appendChild(header);
    card.appendChild(list);
    
    this._attachCategoryEvents(card, list, app, category, actor);
    
    return card;
  }

  static _createItemElement(item, actor, isEditMode, category) {
    const li = document.createElement('li');
    li.className = 'item collapsible fo-custom-item';
    li.dataset.uuid = item.uuid;
    li.dataset.itemId = item.id;
    li.dataset.entryId = item.id;
    li.dataset.itemName = item.name;
    
    const uses = item.system.uses;
    const hasUses = uses?.max > 0;
    const usesValue = uses?.value ?? 0;
    const usesMax = uses?.max ?? 0;
    const recovery = uses?.recovery?.[0]?.period || '';
    const recoveryLabel = { sr: 'SR', lr: 'LR', day: 'Day', dawn: 'Dawn', dusk: 'Dusk' }[recovery] || '';
    
    li.innerHTML = `
      <div class="item-row draggable" draggable="true">
        <div class="item-name item-action item-tooltip rollable" role="button" data-action="use" aria-label="${item.name}">
          <img class="item-image gold-icon" src="${item.img}" alt="${item.name}" draggable="false">
          <div class="name name-stacked">
            <span class="title">${item.name}</span>
          </div>
          <div class="tags"></div>
        </div>
        <div class="item-detail item-uses ${!hasUses ? 'empty' : ''}" data-column-id="uses">${hasUses ? `${usesValue} / ${usesMax}` : ''}</div>
        <div class="item-detail item-recovery ${!recovery ? 'empty' : ''}" data-column-id="recovery">${recoveryLabel}</div>
        <div class="item-detail item-controls always-visible" data-column-id="controls">
          <button type="button" class="unbutton config-button item-control item-action always-interactive fo-expand-btn" data-toggle-description data-action="toggleExpand" aria-label="Toggle Description">
            <i class="fa-solid fa-expand" inert></i>
          </button>
          <button type="button" class="unbutton config-button item-control always-interactive fo-context-btn" data-context-menu aria-label="Additional Controls">
            <i class="fa-solid fa-ellipsis-vertical" inert></i>
          </button>
        </div>
      </div>
      <div class="item-description collapsible-content" hidden>
        <div class="wrapper">
          <div class="description">${item.system.description?.value || ''}</div>
        </div>
      </div>
    `;
    
    li.querySelector('.item-name').addEventListener('click', async (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      const activity = item.system.activities?.contents?.[0];
      if (activity) {
        await activity.use({}, {}, {});
      } else {
        await item.displayCard();
      }
    });
    
    li.querySelector('.fo-expand-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const description = li.querySelector('.item-description');
      const isHidden = description.hidden;
      description.hidden = !isHidden;
      li.classList.toggle('expanded', !isHidden);
      
      const icon = e.currentTarget.querySelector('i');
      icon.classList.toggle('fa-expand', isHidden);
      icon.classList.toggle('fa-compress', !isHidden);
    });
    
    li.querySelector('.fo-context-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const menuItems = [
        {
          name: "DND5E.ContextMenuActionEdit",
          icon: '<i class="fas fa-edit"></i>',
          callback: () => item.sheet.render(true)
        },
        {
          name: "DND5E.ContextMenuActionDuplicate", 
          icon: '<i class="fas fa-copy"></i>',
          callback: () => item.clone({name: game.i18n.format("DOCUMENT.CopyOf", {name: item.name})}, {save: true})
        },
        {
          name: "DND5E.ContextMenuActionDelete",
          icon: '<i class="fas fa-trash"></i>',
          callback: () => item.deleteDialog()
        }
      ];
      
      menuItems.unshift({
        name: "DND5E.ContextMenuActionPost",
        icon: '<i class="fas fa-comment"></i>',
        callback: () => item.displayCard()
      });
      
      const menu = new ContextMenu($(li), null, menuItems);
      menu.render($(li));
    });
    
    const row = li.querySelector('.item-row');
    
    row.addEventListener('dragstart', (e) => {
      const nativeOrigin = SheetIntegration._getItemNativeOrigin(item);
      
      currentDragData = {
        itemId: item.id,
        categoryId: category.id,
        uuid: item.uuid,
        isNativeItem: false, 
        nativeOrigin: nativeOrigin
      };
      
      e.dataTransfer.setData('application/x-fo-sort', JSON.stringify({
        itemId: item.id,
        categoryId: category.id
      }));
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: "Item",
        uuid: item.uuid
      }));
      // Add custom type here as well
      e.dataTransfer.setData('application/x-fo-item', JSON.stringify({ uuid: item.uuid }));
      
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('fo-dragging');
    });
    
    row.addEventListener('dragend', () => {
      li.classList.remove('fo-dragging');
      currentDragData = null;
    });
    
    return li;
  }
  
  static _attachCategoryEvents(card, list, app, category, actor) {
    card.querySelector('[data-action="editCategory"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._showCategoryDialog(actor, category, app);
    });
    
    card.querySelector('[data-action="deleteCategory"]')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (await Dialog.confirm({ title: "Delete Category", content: `<p>Delete "${category.label}"? Items will return to their default section.</p>` })) {
        await CategoryManager.deleteCategory(actor, category.id);
        app.render();
      }
    });
    
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('fo-drag-over');
    });
    
    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('fo-drag-over');
      }
    });
    
    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      card.classList.remove('fo-drag-over');
      
      const sortData = e.dataTransfer.getData('application/x-fo-sort');
      if (sortData) return; 
      
      let data;
      try {
        const textData = e.dataTransfer.getData('text/plain');
        if (textData) data = JSON.parse(textData);
      } catch (err) {
        return;
      }
      
      if (!data || data.type !== "Item") return;
      
      const item = await fromUuid(data.uuid);
      if (!item || item.parent !== actor || item.type !== "feat") return;
      
      const currentCategory = item.getFlag(MODULE_ID, "category");
      if (currentCategory === category.id) return;
      
      await CategoryManager.setItemCategory(item, category.id);
      app.render();
    });
    
    let draggedItem = null;
    let placeholder = null;
    
    list.addEventListener('dragover', (e) => {
      if (!currentDragData) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      
      const targetItem = e.target.closest('.fo-custom-item');
      if (!targetItem || targetItem === draggedItem) return;
      
      if (!placeholder) {
        placeholder = document.createElement('li');
        placeholder.className = 'fo-sort-placeholder';
      }
      
      if (!draggedItem) {
        draggedItem = list.querySelector('.fo-dragging');
      }
      
      if (!draggedItem) return;
      
      const rect = targetItem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        targetItem.parentNode.insertBefore(placeholder, targetItem);
      } else {
        targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
      }
      
      if (draggedItem) {
        draggedItem.style.display = 'none';
      }
    });
    
    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) {
        if (placeholder?.parentNode) placeholder.remove();
        if (draggedItem) draggedItem.style.display = '';
        placeholder = null;
        draggedItem = null;
      }
    });
    
    list.addEventListener('drop', async (e) => {
      if (!currentDragData) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const sortData = currentDragData;
      
      if (sortData.categoryId !== category.id) {
        const item = actor.items.get(sortData.itemId);
        if (item) {
          await CategoryManager.setItemCategory(item, category.id);
          app.render();
        }
        currentDragData = null;
        return;
      }
      
      if (draggedItem) {
        draggedItem.style.display = '';
        draggedItem.classList.remove('fo-dragging');
      }
      
      if (placeholder?.parentNode) {
        const allItems = [...list.querySelectorAll('.fo-custom-item')]
          .filter(el => el.dataset.itemId !== sortData.itemId);
        
        let insertIndex = 0;
        for (const item of allItems) {
          if (placeholder.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING) {
            break;
          }
          insertIndex++;
        }
        
        placeholder.remove();
        
        const newOrder = [];
        for (let i = 0; i < allItems.length; i++) {
          if (i === insertIndex) {
            newOrder.push({ itemId: sortData.itemId, sort: newOrder.length * 100000 });
          }
          newOrder.push({ itemId: allItems[i].dataset.itemId, sort: newOrder.length * 100000 });
        }
        
        if (insertIndex >= allItems.length) {
          newOrder.push({ itemId: sortData.itemId, sort: newOrder.length * 100000 });
        }
        
        const updates = newOrder.map(({ itemId, sort }) => ({ _id: itemId, sort }));
        if (updates.length > 0) {
          await actor.updateEmbeddedDocuments("Item", updates);
        }
      }
      
      placeholder = null;
      draggedItem = null;
      currentDragData = null;
    });
    
    list.addEventListener('dragend', () => {
      if (placeholder?.parentNode) placeholder.remove();
      if (draggedItem) {
        draggedItem.style.display = '';
        draggedItem.classList.remove('fo-dragging');
      }
      placeholder = null;
      draggedItem = null;
      currentDragData = null;
    });
  }
  
  static _setupCategoryOrdering(container, actor, app, isEditMode) {
    const allCards = [...container.querySelectorAll('.items-section.card')];
    if (allCards.length === 0) return;
    
    const order = this._getCategoryOrder(actor, allCards);
    
    const sortedCards = [...allCards].sort((a, b) => {
      const aId = a.classList.contains('fo-custom-card') 
        ? a.dataset.categoryId 
        : `native:${a.dataset.groupOrigin}`;
      const bId = b.classList.contains('fo-custom-card') 
        ? b.dataset.categoryId 
        : `native:${b.dataset.groupOrigin}`;
      
      const aIndex = order.indexOf(aId);
      const bIndex = order.indexOf(bId);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    for (const card of sortedCards) {
      container.appendChild(card);
    }
    
    for (const card of allCards) {
      const catId = card.classList.contains('fo-custom-card') 
        ? card.dataset.categoryId 
        : `native:${card.dataset.groupOrigin}`;
      
      if (isEditMode && !card.querySelector('.fo-reorder-buttons')) {
        const header = card.querySelector('.items-header, .header');
        const nameEl = header?.querySelector('h3, .item-name');
        
        if (nameEl) {
          const btnContainer = document.createElement('span');
          btnContainer.className = 'fo-reorder-buttons';
          btnContainer.innerHTML = `
            <button type="button" data-action="moveUp" title="Move Up"><i class="fas fa-chevron-up"></i></button>
            <button type="button" data-action="moveDown" title="Move Down"><i class="fas fa-chevron-down"></i></button>
          `;
          
          nameEl.insertBefore(btnContainer, nameEl.firstChild);
          
          btnContainer.querySelector('[data-action="moveUp"]').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this._moveCategoryInOrder(actor, catId, -1, allCards);
            app.render();
          });
          
          btnContainer.querySelector('[data-action="moveDown"]').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this._moveCategoryInOrder(actor, catId, 1, allCards);
            app.render();
          });
        }
      }
    }
  }
  
  static async _moveCategoryInOrder(actor, categoryId, direction, allCards) {
    let order = this._getCategoryOrder(actor, allCards);
    
    const currentIndex = order.indexOf(categoryId);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    
    [order[currentIndex], order[newIndex]] = [order[newIndex], order[currentIndex]];
    
    await actor.setFlag(MODULE_ID, "categoryOrder", order);
  }
  
  static _getCategoryOrder(actor, allCards) {
    const savedOrder = actor.getFlag(MODULE_ID, "categoryOrder") || [];
    
    const currentIds = allCards.map(card => {
      return card.classList.contains('fo-custom-card')
        ? card.dataset.categoryId
        : `native:${card.dataset.groupOrigin}`;
    }).filter(id => id && id !== 'native:undefined');
    
    const finalOrder = [];
    
    for (const catId of savedOrder) {
      if (currentIds.includes(catId)) {
        finalOrder.push(catId);
      }
    }
    
    for (const catId of currentIds) {
      if (!finalOrder.includes(catId)) {
        finalOrder.push(catId);
      }
    }
    
    return finalOrder;
  }
  
  static _showCategoryDialog(actor, category = null, app = null) {
    const isEdit = !!category;
    const title = isEdit ? "Edit Category" : "Add Category";
    
    new Dialog({
      title,
      content: `
        <form class="dnd5e2">
          <div class="form-group">
            <label>Category Name</label>
            <input type="text" name="label" value="${category?.label || ''}" placeholder="Enter category name..." autofocus>
          </div>
        </form>
      `,
      buttons: {
        save: {
          icon: '<i class="fas fa-check"></i>',
          label: "Save",
          callback: async (html) => {
            const label = html.find('[name="label"]').val()?.trim() 
              || html[0]?.querySelector('[name="label"]')?.value?.trim();
            
            if (!label) {
              ui.notifications.warn("Please enter a category name.");
              return;
            }
            
            if (isEdit) {
              await CategoryManager.updateCategory(actor, category.id, { label });
            } else {
              await CategoryManager.createCategory(actor, label, {});
            }
            
            if (app) app.render();
            else actor.sheet?.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "save",
      render: (html) => {
        html.find('[name="label"]').focus();
      }
    }, {
      width: 300,
      classes: ['dnd5e2', 'dialog']
    }).render(true);
  }
  
  static onDropActorSheetData(actor, sheet, data) {
    return true;
  }
}