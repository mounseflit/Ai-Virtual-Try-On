let outputimage = "";

class MagicFaceTransform {
  constructor() {
    this.currentScreen = 'welcome';
    this.capturedImage = null;
    this.selectedCharacter = '';
    this.customPrompt = '';
    this.transformedImage = null;
    this.stream = null;
    this.facingMode = 'environment';
    this.isNavigating = false;
    this.loadingInterval = null;
    this.countdownInterval = null;
    this.accessorySelections = {};
    this.wardrobeData = [];
    this.accessoryDefinitions = [];
    this.accessoryMap = {};
    this.generalOutfitPrompt = '';

    this.loadingMessages = [
      "Pinning hems and adjusting the fit... ✂️",
      "Threading the perfect style together... 🧶",
      "Sliding on those statement sunglasses... 🕶️",
      "Buttoning up your sharp blazer... 👔",
      "Wrapping you in cozy outerwear... 🧥",
      "Layering that perfect lab coat look... 🥼",
      "Slipping into your favorite tee... 👕",
      "Draping elegant kimono sleeves... 👘",
      "Flowing into that stunning sari... 🥻",
      "Twirling in your dream dress... 👗",
      "Pulling on those comfy socks... 🧦",
      "Snapping on stylish gloves... 🧤",
      "Wrapping up with a cozy scarf... 🧣",
      "Stepping into those perfect shorts... 🩳",
      "Zipping up your go-to jeans... 👖",
      "Choosing the right undergarments... 🩲",
      "Splashing into summer swimwear... 👙",
      "Diving into that sleek swimsuit... 🩱",
      "Buttoning your crisp blouse... 👚",
      "Packing your essentials in style... 🎒",
      "Lacing up those classic shoes... 👞",
      "Stepping into fresh sneakers... 👟",
      "Stomping in sturdy boots... 🥾",
      "Sliding on elegant loafers... 🥿",
      "Clicking in those heels... 👡",
      "Strutting in stilettos... 👠",
      "Marching in tall boots... 👢",
      "Shopping for the perfect accessories... 🛍️",
      "Clutching that designer bag... 👝",
      "Carrying your chic handbag... 👜",
      "Securing your cute purse... 👛",
      "Dancing in ballet flats... 🩰",
      "Topping off with the perfect cap... 🧢",
      "Sliding on that sparkly ring... 💍",
      "Protecting with safety gear... ⛑️",
      "Crowning with a stylish hat... 👒",
      "Graduating in cap and gown... 🎩",
      "Adding that perfect makeup touch... 💄",
      "Measuring for the perfect fit... 📏",
      "Sketching your style vision... ✏️",
      "Adding sparkle to your look... ✨",
      "Timing your fashion moment... ⏳",
      "Crafting timeless elegance... ⌛",
      "Pinning every detail in place... 📌"
    ];

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.setupTryOnOptions();
    this.setActiveScreen('welcome');
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only in character screen
      if (this.currentScreen !== 'character') return;
      
      // Tab navigation with numbers 1-9
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (this.accessoryDefinitions[index]) {
          this.activateTab(this.accessoryDefinitions[index].id);
        }
      }
      
      // Escape to clear current category selection
      if (e.key === 'Escape') {
        const activeTab = document.querySelector('.category-tab.active');
        if (activeTab) {
          const categoryId = activeTab.dataset.category;
          if (this.accessorySelections[categoryId]) {
            delete this.accessorySelections[categoryId];
            this.renderSelectionTags();
            this.updatePresetHighlights(categoryId);
          }
        }
      }
      
      // Enter to render (Ctrl/Cmd + Enter)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const finishBtn = document.getElementById('finish-btn');
        if (finishBtn && !finishBtn.disabled) {
          finishBtn.click();
        }
      }
    });
  }

  /* ---------- Navigation helpers (no wiggle) ---------- */
  getScreenEl(name) {
    return document.getElementById(`${name}-screen`);
  }

  setActiveScreen(name) {
    // Ensure exactly one active
    document.querySelectorAll('.screen.active').forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
    });
    const next = this.getScreenEl(name);
    if (next) {
      next.classList.add('active');
      next.removeAttribute('aria-hidden');
      this.currentScreen = name;
      window.scrollTo(0, 0); // defensive
    }
  }

  async navigateTo(name, { before = null, after = null } = {}) {
    if (this.isNavigating) return;
    this.isNavigating = true;

    try {
      if (typeof before === 'function') await before();
      this.setActiveScreen(name);
      if (typeof after === 'function') await after();
    } finally {
      setTimeout(() => (this.isNavigating = false), 50);
    }
  }

  /* ---------- Event wiring ---------- */
  bindEvents() {
    // Welcome → Camera (start camera before showing the screen)
    document.getElementById('start-camera-btn').addEventListener('click', () => {

      document.getElementById("camera-screen").style.display = "flex";
      document.getElementById("welcome-screen").style.display = "none";
      document.getElementById("character-screen").style.display = "none";

      this.navigateTo('camera', {
        before: async () => {
          // Small delay to ensure screen is visible before starting camera
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('[Navigation] Starting camera from welcome screen');
          await this.startCamera();
          // Start countdown after camera is initialized
          setTimeout(() => {
            if (this.stream) {
              console.log('[Navigation] Starting countdown');
              this.startCountdown();
            }
          }, 1000);
        }
      });

    });

    // Camera → Back to Welcome
    document.getElementById('back-to-welcome-btn').addEventListener('click', () => {
      this.stopCamera();
      this.navigateTo('welcome');
      document.getElementById("welcome-screen").style.display = "flex";
      document.getElementById("character-screen").style.display = "none";
      document.getElementById("camera-screen").style.display = "none";
    });

    document.getElementById('switch-camera-btn').addEventListener('click', () => {
      this.switchCamera();
    });

    document.getElementById('capture-btn').addEventListener('click', () => {
      // Manual capture skips countdown
      const cameraView = document.querySelector('.camera-view');
      cameraView.classList.add('camera-flash');
      setTimeout(() => {
        cameraView.classList.remove('camera-flash');
        this.capturePhoto();
        document.getElementById("camera-screen").style.display = "none";
        document.getElementById("character-screen").style.display = "flex";
        document.getElementById("welcome-screen").style.display = "none";
      }, 300);
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('upload-photo-btn').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('retry-camera-btn').addEventListener('click', () => {
      console.log('[Navigation] Retry camera button clicked');
      this.startCamera();
      document.getElementById("welcome-screen").style.display = "none";
      document.getElementById("character-screen").style.display = "none";
      document.getElementById("camera-screen").style.display = "flex";
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
      this.handleFileUpload(e);
    });

    // Accessory modal buttons
    document.getElementById('close-accessory-modal').addEventListener('click', () => this.closeAccessoryModal());
    document.getElementById('cancel-accessory-btn').addEventListener('click', () => this.closeAccessoryModal());
    document.getElementById('save-accessory-btn').addEventListener('click', () => this.saveAccessoryFromModal());

    // Character screen
    document.getElementById('retake-photo-btn').addEventListener('click', () => {
      this.navigateTo('camera', { 
      before: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[Navigation] Retaking photo');
        await this.startCamera();
        // Start countdown after camera is initialized
        setTimeout(() => {
          if (this.stream) {
            this.startCountdown();
          }
        }, 1000);
      }
      });
      document.getElementById("welcome-screen").style.display = "none";
      document.getElementById("character-screen").style.display = "none";
      document.getElementById("camera-screen").style.display = "flex";
    });

    // Finish button for try-on flow
    document.getElementById('finish-btn').addEventListener('click', () => {
      this.handleFinish();
    });

    document.getElementById('custom-prompt').addEventListener('input', (e) => {
      this.customPrompt = e.target.value;
      this.clearCharacterSelection();
    });

    // General outfit prompt control (automatically uses when text is present)
    const generalPromptEl = document.getElementById('general-outfit-prompt');
    if (generalPromptEl) {
      generalPromptEl.addEventListener('input', (e) => {
        this.generalOutfitPrompt = (e.target.value || '').trim();
      });
    }

    // Character option click handlers (delegated for dynamic content)
    document.addEventListener('click', (e) => {
      const option = e.target.closest('.character-option');
      if (!option) return;
      const characterData = option.dataset.character;
      if (characterData === 'personalized') {
        this.showPersonalizedModal();
      } else {
        this.selectCharacterOption(option);
      }
    });

    // Legacy character button support (if any remain)
    document.querySelectorAll('.character-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectCharacter(e.target);
      });
    });

    // Personalized modal handlers
    document.getElementById('close-personalized-modal-btn').addEventListener('click', () => {
      this.hidePersonalizedModal();
    });

    document.getElementById('cancel-personalized-btn').addEventListener('click', () => {
      this.hidePersonalizedModal();
    });

    document.getElementById('continue-personalized-btn').addEventListener('click', () => {
      this.handlePersonalizedPrompt();
    });

    // Result screen
    document.getElementById('transform-again-btn').addEventListener('click', () => {
      this.resetApp();
    });


    // 
    document.getElementById('share-result-btn').addEventListener('click', () => {
      this.showShareModal();
    });


    // Share modal
    document.getElementById('close-modal-btn').addEventListener('click', () => {
      this.hideShareModal();
    });

    document.getElementById('send-email-btn').addEventListener('click', () => {
      this.sendEmail();
    });

    document.getElementById('copy-link-btn').addEventListener('click', () => {
      this.copyLink();
    });

    document.getElementById('download-btn').addEventListener('click', () => {
      this.downloadImage();
    });
  }

  /* ---------- Try-on setup ---------- */
  
  // Load wardrobe data from JSON
  async loadWardrobeData() {
    try {
      const response = await fetch('/data/wardrobe.json');
      if (!response.ok) throw new Error('Failed to load wardrobe data');
      const data = await response.json();
      this.wardrobeData = data.categories;
      return this.wardrobeData;
    } catch (error) {
      console.error('Error loading wardrobe data:', error);
      // Fallback to basic data if JSON fails
      return this.buildFallbackAccessoryDefinitions();
    }
  }

  // Fallback accessory definitions (in case JSON fails)
  buildFallbackAccessoryDefinitions() {
    return [
      { 
        id: 'lower-body', 
        label: 'Lower Body', 
        emoji: '👖',
        presets: [
          { label: 'Blue Jeans', value: 'classic blue denim jeans' },
          { label: 'Black Pants', value: 'black dress pants' },
          { label: 'Khaki Chinos', value: 'khaki chino pants' },
          { label: 'Denim Skirt', value: 'blue denim mini skirt' },
          { label: 'Leather Pants', value: 'black leather pants' },
          { label: 'Joggers', value: 'grey athletic joggers' }
        ]
      },
      { 
        id: 'upper-body', 
        label: 'Upper Body', 
        emoji: '👕',
        presets: [
          { label: 'White T-Shirt', value: 'plain white cotton t-shirt' },
          { label: 'Black Tee', value: 'black fitted t-shirt' },
          { label: 'Button Shirt', value: 'white button-up dress shirt' },
          { label: 'Hoodie', value: 'grey pullover hoodie' },
          { label: 'Tank Top', value: 'black athletic tank top' },
          { label: 'Polo Shirt', value: 'navy blue polo shirt' }
        ]
      },
      { 
        id: 'outerwear', 
        label: 'Outerwear', 
        emoji: '🧥',
        presets: [
          { label: 'Denim Jacket', value: 'blue denim jacket' },
          { label: 'Leather Jacket', value: 'black leather biker jacket' },
          { label: 'Blazer', value: 'navy blue blazer' },
          { label: 'Bomber Jacket', value: 'olive green bomber jacket' },
          { label: 'Hoodie Zip', value: 'grey zip-up hoodie' },
          { label: 'Trench Coat', value: 'beige trench coat' }
        ]
      },
      { 
        id: 'footwear', 
        label: 'Footwear', 
        emoji: '👟',
        presets: [
          { label: 'White Sneakers', value: 'white canvas sneakers' },
          { label: 'Black Boots', value: 'black leather boots' },
          { label: 'Running Shoes', value: 'athletic running shoes' },
          { label: 'Dress Shoes', value: 'black oxford dress shoes' },
          { label: 'Sandals', value: 'brown leather sandals' },
          { label: 'High Heels', value: 'black stiletto heels' }
        ]
      },
      { 
        id: 'glasses', 
        label: 'Eyewear', 
        emoji: '👓',
        presets: [
          { label: 'Sunglasses', value: 'black aviator sunglasses' },
          { label: 'Clear Glasses', value: 'clear frame eyeglasses' },
          { label: 'Cat Eye', value: 'cat-eye frame glasses' },
          { label: 'Round Frames', value: 'round wire-frame glasses' },
          { label: 'Sport Glasses', value: 'athletic sport sunglasses' }
        ]
      },
      { 
        id: 'headwear', 
        label: 'Headwear', 
        emoji: '🧢',
        presets: [
          { label: 'Baseball Cap', value: 'black baseball cap' },
          { label: 'Beanie', value: 'grey knit beanie' },
          { label: 'Fedora', value: 'brown fedora hat' },
          { label: 'Bucket Hat', value: 'khaki bucket hat' },
          { label: 'Snapback', value: 'streetwear snapback cap' }
        ]
      },
      { 
        id: 'accessories', 
        label: 'Accessories', 
        emoji: '💎',
        presets: [
          { label: 'Watch', value: 'silver wristwatch' },
          { label: 'Necklace', value: 'gold chain necklace' },
          { label: 'Bracelet', value: 'leather bracelet' },
          { label: 'Earrings', value: 'silver hoop earrings' },
          { label: 'Ring', value: 'gold ring' },
          { label: 'Scarf', value: 'patterned silk scarf' }
        ]
      },
      { 
        id: 'bags', 
        label: 'Bags', 
        emoji: '👜',
        presets: [
          { label: 'Backpack', value: 'black leather backpack' },
          { label: 'Tote Bag', value: 'canvas tote bag' },
          { label: 'Messenger Bag', value: 'brown messenger bag' },
          { label: 'Handbag', value: 'designer handbag' },
          { label: 'Clutch', value: 'evening clutch bag' }
        ]
      },
      { 
        id: 'background', 
        label: 'Background', 
        emoji: '🌆',
        presets: [
          { label: 'City Street', value: 'urban city street background' },
          { label: 'Studio', value: 'white photography studio' },
          { label: 'Park', value: 'outdoor park with trees' },
          { label: 'Beach', value: 'sandy beach with ocean' },
          { label: 'Modern Office', value: 'contemporary office interior' },
          { label: 'Cafe', value: 'cozy coffee shop interior' }
        ]
      }
    ];
  }

  async setupTryOnOptions() {
    // Load wardrobe data from JSON
    const categories = await this.loadWardrobeData();
    this.accessoryDefinitions = categories;
    this.accessoryMap = categories.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    
    this.renderCategoryTabs();
    this.renderTabContent();
    if (this.accessoryDefinitions.length > 0) {
      this.activateTab(this.accessoryDefinitions[0].id);
    }
    this.renderSelectionTags();
  }

  renderCategoryTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';
    
    this.accessoryDefinitions.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.className = 'category-tab';
      tab.dataset.category = category.id;
      tab.innerHTML = `<span class="tab-emoji">${category.emoji}</span><span>${category.label}</span>`;
      tab.addEventListener('click', () => this.activateTab(category.id));
      tabsContainer.appendChild(tab);
    });
  }

  renderTabContent() {
    const contentWrapper = document.getElementById('tab-content-wrapper');
    if (!contentWrapper) return;
    contentWrapper.innerHTML = '';
    
    this.accessoryDefinitions.forEach(category => {
      const panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.dataset.category = category.id;
      
      // Add description if available
      if (category.description) {
        const desc = document.createElement('p');
        desc.className = 'category-description';
        desc.textContent = category.description;
        panel.appendChild(desc);
      }
      
      // Presets section with carousel
      if (category.items && category.items.length > 0) {
        const carouselWrapper = document.createElement('div');
        carouselWrapper.className = 'preset-carousel-wrapper';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav carousel-prev';
        prevBtn.innerHTML = '&#10094;';
        prevBtn.setAttribute('aria-label', 'Previous items');
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav carousel-next';
        nextBtn.innerHTML = '&#10095;';
        nextBtn.setAttribute('aria-label', 'Next items');
        
        // Scrollable grid
        const grid = document.createElement('div');
        grid.className = 'preset-grid-carousel';
        
        category.items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'preset-card-modern';
          card.dataset.categoryId = category.id;
          card.dataset.itemId = item.id;
          card.dataset.itemName = item.name;
          card.innerHTML = `
            <div class="preset-image-wrapper">
              <img src="${item.image}" alt="${item.name}" class="preset-image" loading="lazy" />
              <div class="preset-overlay">
                <span class="preset-check-badge">✓</span>
              </div>
            </div>
            <div class="preset-name">${item.name}</div>
          `;
          card.addEventListener('click', () => {
            this.selectPreset(category.id, item.name, item.prompt || item.name);
          });
          grid.appendChild(card);
        });
        
        // Carousel navigation
        prevBtn.addEventListener('click', () => {
          grid.scrollBy({ left: -320, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
          grid.scrollBy({ left: 320, behavior: 'smooth' });
        });
        
        carouselWrapper.appendChild(prevBtn);
        carouselWrapper.appendChild(grid);
        carouselWrapper.appendChild(nextBtn);
        panel.appendChild(carouselWrapper);
      }
      
      // Custom input section
      const customSection = document.createElement('div');
      customSection.className = 'custom-section';
      customSection.innerHTML = `
        <h4 class="section-title">✏️ Or Describe Your Own</h4>
        <div class="custom-input-wrapper">
          <input 
            type="text" 
            class="custom-input" 
            data-category="${category.id}"
            placeholder="Type your custom ${category.label.toLowerCase()} description..."
          />
        </div>
      `;
      
      const input = customSection.querySelector('.custom-input');
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          this.selectCustom(category.id, category.label, input.value.trim());
          input.value = '';
        }
      });
      
      panel.appendChild(customSection);
      contentWrapper.appendChild(panel);
    });
  }

  activateTab(categoryId) {
    // Update tab buttons
    document.querySelectorAll('.category-tab').forEach(tab => {
      if (tab.dataset.category === categoryId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      if (panel.dataset.category === categoryId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    this.updatePresetHighlights(categoryId);
  }

  selectPreset(categoryId, presetLabel, presetValue) {
    if (!this.accessorySelections) this.accessorySelections = {};
    const category = this.accessoryMap[categoryId];
    this.accessorySelections[categoryId] = {
      label: category?.label || categoryId,
      value: presetValue,
      displayValue: presetLabel
    };
    this.renderSelectionTags();
    this.updatePresetHighlights(categoryId);
  }

  selectCustom(categoryId, categoryLabel, customValue) {
    if (!this.accessorySelections) this.accessorySelections = {};
    this.accessorySelections[categoryId] = {
      label: categoryLabel,
      value: customValue,
      displayValue: customValue
    };
    this.renderSelectionTags();
    this.updatePresetHighlights(categoryId);
  }

  updatePresetHighlights(categoryId) {
    const currentSelection = this.accessorySelections?.[categoryId];
    const currentItemName = currentSelection?.displayValue;
    
    // Update modern cards
    document.querySelectorAll(`.preset-card-modern[data-category-id="${categoryId}"]`).forEach(card => {
      const cardName = card.dataset.itemName;
      if (cardName === currentItemName) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
    
    // Also update any legacy cards if present
    document.querySelectorAll(`.preset-card[data-category-id="${categoryId}"]`).forEach(card => {
      const badge = card.querySelector('.selected-badge');
      if (card.dataset.presetValue === currentSelection?.value) {
        card.classList.add('selected');
        if (!badge) {
          const newBadge = document.createElement('span');
          newBadge.className = 'selected-badge';
          newBadge.textContent = '✓';
          card.appendChild(newBadge);
        }
      } else {
        card.classList.remove('selected');
        if (badge) badge.remove();
      }
    });
  }

  renderSelectionTags() {
    const container = document.getElementById('selection-tags-list');
    const countBadge = document.getElementById('selection-count');
    if (!container) return;
    container.innerHTML = '';
    
    const count = this.accessorySelections ? Object.keys(this.accessorySelections).length : 0;
    if (countBadge) countBadge.textContent = count;
    
    if (!this.accessorySelections || count === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; text-align: center; padding: 1rem;">No selections yet. Pick items from the editor!</p>';
      return;
    }
    
    for (const [id, entry] of Object.entries(this.accessorySelections)) {
      const category = this.accessoryMap?.[id];
      const emoji = category?.emoji || '📦';
      const label = entry?.label || category?.label || id;
      const displayValue = entry?.displayValue || entry?.value || '';
      
      if (!displayValue) continue;
      
      const tag = document.createElement('div');
      tag.className = 'selection-tag';
      tag.innerHTML = `
        <span class="tag-icon">${emoji}</span>
        <div class="tag-content">
          <span class="tag-label">${label}</span>
          <span class="tag-value">${displayValue}</span>
        </div>
        <button class="tag-remove" data-id="${id}" title="Remove">✕</button>
      `;
      
      const removeBtn = tag.querySelector('.tag-remove');
      removeBtn.addEventListener('click', () => {
        delete this.accessorySelections[id];
        this.renderSelectionTags();
        this.updatePresetHighlights(id);
      });
      
      container.appendChild(tag);
    }
  }

  /* ---------- Accessory modal & chips ---------- */
  openAccessoryModal(acc) {
    const meta = this.accessoryMap?.[acc.id] || acc;
    this._editingAcc = { id: acc.id, label: meta.label || acc.label || acc.id };
    const modal = document.getElementById('accessory-modal');
    const input = document.getElementById('accessory-input');
    const stored = this.accessorySelections?.[acc.id];
    input.value = (stored && stored.value) || stored || '';
    if (input && this._editingAcc?.label) {
      input.placeholder = `Describe ${this._editingAcc.label.toLowerCase()}`;
    }
    modal.style.display = 'flex';
    input.focus();
  }

  closeAccessoryModal() {
    const modal = document.getElementById('accessory-modal');
    modal.style.display = 'none';
    this._editingAcc = null;
  }

  saveAccessoryFromModal() {
    const input = document.getElementById('accessory-input');
    const val = (input.value || '').trim();
    if (!this._editingAcc) return;
    if (!this.accessorySelections) this.accessorySelections = {};
    const editingId = this._editingAcc.id;
    const editingLabel = this._editingAcc.label || this.accessoryMap?.[editingId]?.label || editingId;
    if (val.length === 0) {
      // remove selection if empty
      delete this.accessorySelections[editingId];
    } else {
      this.accessorySelections[editingId] = { label: editingLabel, value: val };
    }
    this.closeAccessoryModal();
    this.renderSelectionTags();
    // visual feedback on button
    const btn = document.querySelector(`button.accessory-btn[data-acc="${editingId}"]`);
    if (btn) {
      if (this.accessorySelections[editingId]) btn.classList.add('selected'); else btn.classList.remove('selected');
    }
  }

  /* ---------- Camera lifecycle ---------- */
  async startCamera() {
    this.hideError();
    console.log('[Camera] Starting camera initialization...');

    const video = document.getElementById('camera-video');
    if (!video) {
      console.error('[Camera] Video element not found in DOM');
      return;
    }

    // Check for browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[Camera] getUserMedia not supported');
      this.showError('Camera is not supported on this device. Please upload a photo instead.');
      await this.updateCameraControls({ streamAvailable: false });
      return;
    }

    // Stop any existing stream first
    if (this.stream) {
      console.log('[Camera] Stopping existing stream');
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Reset video element state
    video.srcObject = null;
    video.load();

    // Base constraints with fallback strategies
    const constraintStrategies = [
      // Strategy 1: Try with facingMode
      {
        audio: false,
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          facingMode: { ideal: this.facingMode }
        }
      },
      // Strategy 2: Try opposite facingMode
      {
        audio: false,
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          facingMode: { ideal: this.facingMode === 'environment' ? 'user' : 'environment' }
        }
      },
      // Strategy 3: Try without facingMode but with dimensions
      {
        audio: false,
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 }
        }
      },
      // Strategy 4: Basic constraints only
      {
        audio: false,
        video: true
      }
    ];

    let lastError = null;

    for (let i = 0; i < constraintStrategies.length; i++) {
      const constraints = constraintStrategies[i];
      console.log(`[Camera] Trying constraint strategy ${i + 1}:`, JSON.stringify(constraints));

      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[Camera] Stream obtained successfully', stream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        })));

        this.stream = stream;

        // Configure video element
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');
        video.muted = true;
        video.playsInline = true;
        video.defaultMuted = true;

        console.log('[Camera] Video element configured, waiting for metadata...');

        // Wait for video metadata to load
        await this.waitForVideoReady(video);
        console.log('[Camera] Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });

        // Attempt to play
        try {
          await video.play();
          console.log('[Camera] Video playing successfully');
        } catch (playError) {
          console.warn('[Camera] Auto-play failed, attempting manual play:', playError);
          // Some browsers require user interaction, but we'll try anyway
          video.play().catch(e => console.warn('[Camera] Manual play also failed:', e));
        }

        // Update UI controls
        await this.updateCameraControls({ streamAvailable: true });
        console.log('[Camera] Camera started successfully');
        return;

      } catch (error) {
        lastError = error;
        console.error(`[Camera] Strategy ${i + 1} failed:`, error.name, error.message);
        
        // Clean up failed attempt
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      }
    }

    // All strategies failed
    console.error('[Camera] All strategies failed. Last error:', lastError);
    this.showError('Unable to access camera. Please check permissions and try again.');
    await this.updateCameraControls({ streamAvailable: false });
  }

  stopCamera() {
    // Clear countdown interval if it exists
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
      document.getElementById('countdown-overlay').style.display = 'none';
    }

    // Stop the camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.updateCameraControls({ streamAvailable: false });
  }

  switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.startCamera();
  }

  async waitForVideoReady(video) {
    if (!video) {
      console.error('[Camera] waitForVideoReady: video element is null');
      return;
    }
    
    console.log('[Camera] Current readyState:', video.readyState);
    
    // readyState >= 2 means HAVE_CURRENT_DATA or better
    if (video.readyState >= 2) {
      console.log('[Camera] Video already ready');
      return;
    }

    // Wait for metadata with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        video.removeEventListener('loadedmetadata', metadataHandler);
        video.removeEventListener('loadeddata', dataHandler);
        console.warn('[Camera] Video metadata load timeout');
        resolve(); // Don't reject, continue anyway
      }, 10000); // 10 second timeout

      const metadataHandler = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadeddata', dataHandler);
        console.log('[Camera] Metadata loaded event fired');
        resolve();
      };

      const dataHandler = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', metadataHandler);
        console.log('[Camera] Data loaded event fired');
        resolve();
      };

      video.addEventListener('loadedmetadata', metadataHandler, { once: true });
      video.addEventListener('loadeddata', dataHandler, { once: true });
    });
  }

  async updateCameraControls({ streamAvailable = false } = {}) {
    const toggleControl = (id, visible) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = !visible;
      el.style.display = visible ? '' : 'none';
    };

    toggleControl('capture-btn', streamAvailable);
    toggleControl('upload-btn', true);
    toggleControl('back-to-welcome-btn', true);

    if (!navigator.mediaDevices?.enumerateDevices) {
      toggleControl('switch-camera-btn', false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      toggleControl('switch-camera-btn', streamAvailable && videoInputs.length > 1);
    } catch (error) {
      console.warn('Unable to enumerate devices for camera switch:', error);
      toggleControl('switch-camera-btn', false);
    }
  }

  /* ---------- Capture / Upload ---------- */
  startCountdown() {
    // Show and initialize the countdown overlay
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownNumber = countdownOverlay.querySelector('.countdown-number');
    const cameraView = document.querySelector('.camera-view');

    countdownOverlay.style.display = 'flex';
    let count = 5;
    countdownNumber.textContent = count;

    this.countdownInterval = setInterval(() => {
      count--;

      if (count <= 0) {
        // Clear the interval
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;

        // Flash effect
        cameraView.classList.add('camera-flash');
        setTimeout(() => {
          cameraView.classList.remove('camera-flash');

          // Hide the countdown overlay
          countdownOverlay.style.display = 'none';

          // Take the photo
          this.capturePhoto();
        }, 500);
      } else {
        // Update the countdown
        countdownNumber.textContent = count;
      }
    }, 1000);
  }

  capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');

    if (!video.videoWidth || !video.videoHeight) {
      alert('Camera not ready. Please wait a moment and try again.');
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Crop/resize to vertical portrait (keep center)
    const outW = 720;
    const outH = 1280;
    const tmp = document.createElement('canvas');
    tmp.width = outW;
    tmp.height = outH;
    const tctx = tmp.getContext('2d');

    // Calculate source crop to keep fullbody when possible
    const srcW = canvas.width;
    const srcH = canvas.height;
    const srcAspect = srcW / srcH;
    const dstAspect = outW / outH;

    let sx = 0, sy = 0, sWidth = srcW, sHeight = srcH;
    if (srcAspect > dstAspect) {
      // source is wider -> crop horizontally
      sWidth = Math.round(srcH * dstAspect);
      sx = Math.round((srcW - sWidth) / 2);
    } else if (srcAspect < dstAspect) {
      // source is taller -> crop vertically (rare)
      sHeight = Math.round(srcW / dstAspect);
      sy = Math.round((srcH - sHeight) / 2);
    }

    tctx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, outW, outH);
    this.capturedImage = tmp.toDataURL('image/jpeg', 0.9);

    this.stopCamera();
    this.accessorySelections = {};
    this.renderSelectionTags();
    this.showCharacterScreen();


    document.getElementById("camera-screen").style.display = "none";
    document.getElementById("character-screen").style.display = "flex";
    document.getElementById("welcome-screen").style.display = "none";
  }

  /* ---------- Accessory prompts & try-on ---------- */
  promptAccessory(acc) {
    const desc = window.prompt(`Describe the ${acc.label} to add (e.g. "black leather boots"):`);
    if (!desc) return;
    if (!this.accessorySelections) this.accessorySelections = {};
    this.accessorySelections[acc.id] = { label: acc.label || this.accessoryMap?.[acc.id]?.label || acc.id, value: desc.trim() };
    // visual feedback
    const btn = document.querySelector(`button.accessory-btn[data-acc="${acc.id}"]`);
    if (btn) btn.classList.add('selected');
    this.renderSelectionTags();
  }

  buildTryOnPrompt() {
    
    // Otherwise build prompt from per-item selections (fallback to custom-prompt if present)
    const directives = [];
    if (this.accessorySelections) {
      for (const [id, entry] of Object.entries(this.accessorySelections)) {
        const label = entry?.label || this.accessoryMap?.[id]?.label || id;
        const value = entry?.value || entry;
        if (!value) continue;
        directives.push(`${label}: ${value}`);
      }
    }
    const custom = (document.getElementById('custom-prompt') || {}).value || '';
    if (custom.trim()) directives.push(`Additional direction: ${custom.trim()}`);

    // If general outfit prompt has text, use it (no override, add it to the others) : this.generalOutfitPrompt

    if (this.generalOutfitPrompt && this.generalOutfitPrompt.trim().length > 0) {
      directives.push(this.generalOutfitPrompt.trim());
    }

    return directives.join('; ');
  }

  async handleFinish() {
    if (!this.capturedImage) { alert('Please capture or upload a photo first!'); return; }
    const prompt = this.buildTryOnPrompt();
    if (!prompt || prompt.length < 3) { alert('Please select or describe at least one item to try on.'); return; }

    this.showLoadingScreen();
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    try {
      const response = await fetch('/api/transform/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: this.capturedImage, prompt, character: '' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transformation failed');
      }

      const result = await response.json();
      if (result.success && result.image_url) {
        const displayImage = result.data_url
          || (result.image_url.startsWith('data:') ? result.image_url : `data:image/png;base64,${result.image_url}`);
        this.transformedImage = displayImage;
        outputimage = result.real_url || displayImage;
        this.showResultScreen();
        if (loadingScreen) loadingScreen.style.display = 'none';
        document.getElementById('character-screen').style.display = 'none';
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('Try-on transformation error:', error);
      alert(`Try-on failed: ${error.message}`);
      this.setActiveScreen('character');
      if (loadingScreen) loadingScreen.style.display = 'none';
      const characterScreen = document.getElementById('character-screen');
      if (characterScreen) characterScreen.style.display = 'flex';
    }
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.capturedImage = e.target.result;
      this.showCharacterScreen();
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) loadingScreen.style.display = "none";
      document.getElementById("welcome-screen").style.display = "none";
      document.getElementById("character-screen").style.display = "flex";
      document.getElementById("camera-screen").style.display = "none";
      this.accessorySelections = {};
      this.renderSelectionTags();
    };
    reader.readAsDataURL(file);
  }

  showCharacterScreen() {
    const previewImg = document.getElementById('captured-image');

    document.getElementById("camera-screen").style.display = "none";
    document.getElementById("character-screen").style.display = "flex";
    document.getElementById("welcome-screen").style.display = "none";

    previewImg.src = this.capturedImage;
    this.setActiveScreen('character');
  }

  /* ---------- Character & transform ---------- */
  selectCharacter(button) {
  const customPromptInput = document.getElementById('custom-prompt');
  if (customPromptInput) customPromptInput.value = '';
    this.customPrompt = '';
    document.querySelectorAll('.character-btn').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    this.selectedCharacter = button.dataset.character;
  }

  clearCharacterSelection() {
    document.querySelectorAll('.character-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.character-option').forEach(option => option.classList.remove('selected'));
    this.selectedCharacter = '';
  }

  selectCharacterOption(option) {
    // Clear previous selections
    document.querySelectorAll('.character-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.character-btn').forEach(btn => btn.classList.remove('selected'));

    // Select the clicked option
    option.classList.add('selected');
    this.selectedCharacter = option.dataset.character;
    this.customPrompt = '';
  }

  showPersonalizedModal() {
    document.getElementById('personalized-modal').style.display = 'flex';
    document.getElementById('personalized-prompt').focus();
  }

  hidePersonalizedModal() {
    document.getElementById('personalized-modal').style.display = 'none';
    document.getElementById('personalized-prompt').value = '';
  }

  handlePersonalizedPrompt() {
    const promptText = document.getElementById('personalized-prompt').value.trim();
    if (!promptText) {
      alert('Please enter a transformation description!');
      return;
    }

    // Clear other selections and set custom prompt
    document.querySelectorAll('.character-option').forEach(option => option.classList.remove('selected'));
    document.querySelectorAll('.character-btn').forEach(btn => btn.classList.remove('selected'));

    // Mark personalized option as selected and set the prompt
    document.querySelector('.personalized-option').classList.add('selected');
    this.selectedCharacter = '';
    this.customPrompt = promptText;

    this.hidePersonalizedModal();
  }

  async handleTransform() {
    const prompt = `${this.customPrompt} ${this.selectedCharacter}`.trim();
    if (!this.capturedImage) {
      alert('Please capture or upload a photo first!');
      return;
    }
    if (!prompt || prompt.length < 3) {
      alert('Please select a character or enter a custom transformation!');
      return;
    }

    this.showLoadingScreen();

    try {
      const response = await fetch('/api/transform/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: this.capturedImage, prompt, character: this.selectedCharacter }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transformation failed');
      }

      const result = await response.json();
      if (result.success && result.image_url) {
        this.transformedImage = result.data_url
        outputimage = result.real_url;
        this.showResultScreen();
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('character-screen').style.display = 'none';
        document.getElementById("camera-screen").style.display = "none";
        document.getElementById("result-screen").style.display = "flex";

      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('Transformation error:', error);
      alert(`Transformation failed: ${error.message}`);
      this.setActiveScreen('character');
    }
  }

  /* ---------- Loading / Result ---------- */
  showLoadingScreen() {
    this.setActiveScreen('loading');
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (this.loadingInterval) clearInterval(this.loadingInterval);
    let i = 0;
    const el = document.getElementById('loading-message');
    if (el && this.loadingMessages.length) {
      el.textContent = this.loadingMessages[0];
    }
    this.loadingInterval = setInterval(() => {
      // random message
      const msg = this.loadingMessages[Math.floor(Math.random() * this.loadingMessages.length)];
      if (el) el.textContent = msg;
      i++;
    }, 2000);
  }

  showResultScreen() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    const resultImg = document.getElementById('result-image');
    resultImg.src = this.transformedImage;
    this.setActiveScreen('result');
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'flex';
  }

  /* ---------- Share modal ---------- */
  showShareModal() {
    const modal = document.getElementById('share-modal');
    const shareImg = document.getElementById('share-image');
    const shareLink = document.getElementById('share-link');
    const qrCode = document.getElementById('qr-code');

    const linkValue = outputimage || this.transformedImage || '';
    shareImg.src = this.transformedImage || linkValue;
    shareLink.value = linkValue;

    if (linkValue && /^https?:/i.test(linkValue)) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(linkValue)}&size=150x150`;
      qrCode.src = qrUrl;
    } else {
      qrCode.removeAttribute('src');
    }

    modal.style.display = 'flex';
  }

  hideShareModal() {
    document.getElementById('share-modal').style.display = 'none';
  }

  async sendEmail() {
    const email = document.getElementById('email-input').value;
    if (!email) { alert('Please enter an email address.'); return; }
    if (!this.isValidEmail(email)) { alert('Please enter a valid email address.'); return; }

    let linktosend = this.transformedImage;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          imageUrl: linktosend
        }),
      });

      if (response.ok) {
        alert('Email sent successfully! 📧');
        document.getElementById('email-input').value = '';
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('Failed to send email. Please try again.');
    }
  }

  async copyLink() {
    const linkInput = document.getElementById('share-link');
    if (!linkInput || !linkInput.value) {
      alert('No shareable link yet. Finish a digital try-on first.');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(linkInput.value);
      } else {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999);
        document.execCommand('copy');
      }
      alert('Link copied to clipboard! 📋');
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy link. Please copy manually.');
    } finally {
      if (document.activeElement === linkInput) linkInput.blur();
    }
  }

  downloadImage() {
    // Print the image
    if (!this.transformedImage) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Image</title>
          <style>
            body { margin: 0; text-align: center; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; }
              img { max-width: 100%; height: auto; }
            }
          </style>
        </head>
        <body>
          <img src="${this.transformedImage}" onload="window.print();window.close()" />
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  /* ---------- Errors & reset ---------- */
  showError(message) {
    const errorDiv = document.getElementById('camera-error');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorDiv.style.display = 'flex';
  }

  hideError() {
    document.getElementById('camera-error').style.display = 'none';
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  resetApp() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    this.stopCamera();

    this.capturedImage = null;
    this.selectedCharacter = '';
    this.customPrompt = '';
    this.transformedImage = null;
    this.facingMode = 'user';
    this.accessorySelections = {};
    this.renderSelectionTags();
    document.querySelectorAll('.accessory-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.preset-card').forEach(card => {
      card.classList.remove('selected');
      const badge = card.querySelector('.selected-badge');
      if (badge) badge.remove();
    });
    outputimage = '';

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'none';
    const characterScreen = document.getElementById('character-screen');
    if (characterScreen) characterScreen.style.display = 'none';
    const cameraScreen = document.getElementById('camera-screen');
    if (cameraScreen) cameraScreen.style.display = 'none';
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) welcomeScreen.style.display = 'flex';

    document.getElementById('custom-prompt').value = '';
    const emailInput = document.getElementById('email-input');
    if (emailInput) emailInput.value = '';

    document.querySelectorAll('.character-btn').forEach(btn => btn.classList.remove('selected'));
    this.hideShareModal();
    this.setActiveScreen('welcome');
  }
}

/* Initialize app when DOM is loaded */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MagicFaceTransform();
});

/* Stop camera when hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && window.app && window.app.stream) {
    window.app.stopCamera();
  }
});

/* Stop camera on unload */
window.addEventListener('beforeunload', () => {
  if (window.app && window.app.stream) {
    window.app.stopCamera();
  }
});
