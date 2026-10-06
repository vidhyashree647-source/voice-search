/**
 * VOICE SEARCH SYSTEM - CORE JAVASCRIPT ENGINE
 * Powered by Web Speech API (SpeechRecognition) & localStorage
 * Pure Vanilla JS - Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. STATE MANAGEMENT & DOM ELEMENTS
  // ==========================================
  const state = {
    isListening: false,
    recognition: null,
    historyKey: 'voice_search_recent_history',
    maxHistory: 5,
    history: []
  };

  const elements = {
    apiStatusDot: document.getElementById('apiStatusDot'),
    apiStatusText: document.getElementById('apiStatusText'),
    compatAlert: document.getElementById('compatAlert'),
    
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    waveVisualizer: document.getElementById('waveVisualizer'),
    
    micButtonWrapper: document.querySelector('.mic-button-wrapper'),
    micBtn: document.getElementById('micBtn'),
    micIcon: document.getElementById('micIcon'),
    stopIcon: document.getElementById('stopIcon'),
    micHint: document.getElementById('micHint'),

    searchInput: document.getElementById('searchInput'),
    clearBtn: document.getElementById('clearBtn'),
    searchBtn: document.getElementById('searchBtn'),

    recentSearchesList: document.getElementById('recentSearchesList'),
    emptyHistoryState: document.getElementById('emptyHistoryState'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyCountBadge: document.getElementById('historyCountBadge'),

    toastContainer: document.getElementById('toastContainer'),
    chipBtns: document.querySelectorAll('.chip-btn')
  };

  // Check browser SpeechRecognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  // ==========================================
  // 2. INITIALIZATION
  // ==========================================
  function init() {
    loadHistory();
    setupSpeechRecognition();
    setupEventListeners();
    updateUIStatus('idle', 'Click the microphone to start');
  }

  // ==========================================
  // 3. SPEECH RECOGNITION SETUP
  // ==========================================
  function setupSpeechRecognition() {
    if (!isSupported) {
      elements.apiStatusDot.className = 'status-dot orange';
      elements.apiStatusText.textContent = 'Simulated Speech Mode';
      elements.compatAlert.classList.remove('hidden');
      return;
    }

    elements.apiStatusDot.className = 'status-dot green';
    elements.apiStatusText.textContent = 'Web Speech API Active';

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop when speech ends automatically
      recognition.interimResults = true; // Show interim text while speaking
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        state.isListening = true;
        updateUIStatus('listening', 'Listening...');
        showMicActiveUI(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          elements.searchInput.value = currentText;
          toggleClearBtn(true);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        state.isListening = false;
        showMicActiveUI(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast('Microphone permission denied. Please allow mic access.', 'error');
          updateUIStatus('idle', 'Microphone access blocked');
        } else if (event.error === 'no-speech') {
          showToast('No speech detected. Please try speaking again.', 'info');
          updateUIStatus('idle', 'Click the microphone to start');
        } else {
          showToast(`Speech recognition error: ${event.error}`, 'error');
          updateUIStatus('idle', 'Click the microphone to start');
        }
      };

      recognition.onend = () => {
        state.isListening = false;
        showMicActiveUI(false);

        const query = elements.searchInput.value.trim();
        if (query) {
          updateUIStatus('processing', 'Processing...');
          setTimeout(() => {
            executeSearch(query);
            updateUIStatus('idle', 'Click the microphone to start');
          }, 600);
        } else {
          updateUIStatus('idle', 'Click the microphone to start');
        }
      };

      state.recognition = recognition;
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  }

  // ==========================================
  // 4. MIC TOGGLE CONTROLLER
  // ==========================================
  function toggleVoiceSearch() {
    if (isSupported && state.recognition) {
      if (state.isListening) {
        state.recognition.stop();
        state.isListening = false;
        showMicActiveUI(false);
        updateUIStatus('processing', 'Processing...');
      } else {
        try {
          elements.searchInput.value = '';
          toggleClearBtn(false);
          state.recognition.start();
        } catch (err) {
          console.warn('SpeechRecognition restart warning:', err);
          state.recognition.stop();
          setTimeout(() => state.recognition.start(), 200);
        }
      }
    } else {
      // Fallback simulated voice mode for unsupported browsers
      runSimulatedVoiceSearch();
    }
  }

  // Simulated Voice Mode fallback for non-Chrome environments
  function runSimulatedVoiceSearch() {
    if (state.isListening) return;

    state.isListening = true;
    showMicActiveUI(true);
    updateUIStatus('listening', 'Listening...');
    elements.searchInput.value = '';
    toggleClearBtn(false);

    const sampleQueries = [
      'Best restaurants near Chennai',
      'Latest AI technology news 2026',
      'Weather forecast today',
      'Top places to visit in India'
    ];
    const targetQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < targetQuery.length) {
        elements.searchInput.value += targetQuery.charAt(charIndex);
        charIndex++;
        toggleClearBtn(true);
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          state.isListening = false;
          showMicActiveUI(false);
          updateUIStatus('processing', 'Processing...');

          setTimeout(() => {
            executeSearch(targetQuery);
            updateUIStatus('idle', 'Click the microphone to start');
          }, 600);
        }, 500);
      }
    }, 60);
  }

  // ==========================================
  // 5. UI STATE UPDATERS
  // ==========================================
  function updateUIStatus(mode, text) {
    elements.statusBadge.className = `status-badge ${mode}`;
    elements.statusText.textContent = text;
  }

  function showMicActiveUI(active) {
    if (active) {
      elements.micBtn.classList.add('listening');
      elements.micButtonWrapper.classList.add('active');
      elements.micIcon.classList.add('hidden');
      elements.stopIcon.classList.remove('hidden');
      elements.waveVisualizer.classList.remove('hidden');
      elements.micHint.textContent = 'Listening... Click again or pause to finish';
    } else {
      elements.micBtn.classList.remove('listening');
      elements.micButtonWrapper.classList.remove('active');
      elements.micIcon.classList.remove('hidden');
      elements.stopIcon.classList.add('hidden');
      elements.waveVisualizer.classList.add('hidden');
      elements.micHint.textContent = 'Tap mic & start speaking your query';
    }
  }

  function toggleClearBtn(show) {
    if (show && elements.searchInput.value.length > 0) {
      elements.clearBtn.classList.remove('hidden');
    } else {
      elements.clearBtn.classList.add('hidden');
    }
  }

  // ==========================================
  // 6. SEARCH EXECUTION & HISTORY ENGINE
  // ==========================================
  function executeSearch(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      showToast('Please speak or type a search query first.', 'info');
      return;
    }

    saveToHistory(trimmed);
    showToast(`Searching for: "${trimmed}"`, 'success');

    // Open Google search in a new tab
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    window.open(searchUrl, '_blank');
  }

  // Load history from localStorage
  function loadHistory() {
    try {
      const stored = localStorage.getItem(state.historyKey);
      state.history = stored ? JSON.parse(stored) : [];
      renderHistory();
    } catch (e) {
      console.error('Error loading history:', e);
      state.history = [];
      renderHistory();
    }
  }

  // Save query to localStorage history (max 5 items, unique, latest first)
  function saveToHistory(query) {
    // Remove duplicate if exists
    state.history = state.history.filter(item => item.toLowerCase() !== query.toLowerCase());

    // Add to top of list
    state.history.unshift(query);

    // Limit to max 5 items
    if (state.history.length > state.maxHistory) {
      state.history = state.history.slice(0, state.maxHistory);
    }

    try {
      localStorage.setItem(state.historyKey, JSON.stringify(state.history));
    } catch (e) {
      console.error('Error saving history:', e);
    }

    renderHistory();
  }

  // Remove single item from history
  function deleteHistoryItem(index) {
    state.history.splice(index, 1);
    try {
      localStorage.setItem(state.historyKey, JSON.stringify(state.history));
    } catch (e) {
      console.error('Error saving history:', e);
    }
    renderHistory();
    showToast('Search item removed from history', 'info');
  }

  // Clear all history
  function clearAllHistory() {
    if (state.history.length === 0) return;
    state.history = [];
    try {
      localStorage.removeItem(state.historyKey);
    } catch (e) {
      console.error('Error clearing history:', e);
    }
    renderHistory();
    showToast('Recent searches cleared', 'info');
  }

  // Render recent search items
  function renderHistory() {
    elements.historyCountBadge.textContent = `${state.history.length} / ${state.maxHistory}`;

    if (state.history.length === 0) {
      elements.emptyHistoryState.style.display = 'flex';
      elements.recentSearchesList.innerHTML = '';
      elements.recentSearchesList.appendChild(elements.emptyHistoryState);
      return;
    }

    elements.emptyHistoryState.style.display = 'none';
    elements.recentSearchesList.innerHTML = '';

    state.history.forEach((queryText, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';

      itemEl.innerHTML = `
        <div class="history-item-left">
          <svg class="history-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="history-text">${escapeHTML(queryText)}</span>
        </div>
        <div class="history-item-actions">
          <button class="history-search-btn" title="Search again">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Search</span>
          </button>
          <button class="delete-item-btn" title="Delete from history" aria-label="Delete search item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Click row or search button -> fill input & search
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.delete-item-btn')) {
          e.stopPropagation();
          deleteHistoryItem(index);
          return;
        }
        elements.searchInput.value = queryText;
        toggleClearBtn(true);
        executeSearch(queryText);
      });

      elements.recentSearchesList.appendChild(itemEl);
    });
  }

  // Helper escape HTML string
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ==========================================
  // 7. TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // 8. EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Mic button click
    elements.micBtn.addEventListener('click', toggleVoiceSearch);

    // Search button click
    elements.searchBtn.addEventListener('click', () => {
      executeSearch(elements.searchInput.value);
    });

    // Enter key press in input
    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearch(elements.searchInput.value);
      }
    });

    // Input text listener for clear button toggle
    elements.searchInput.addEventListener('input', () => {
      toggleClearBtn(elements.searchInput.value.length > 0);
    });

    // Clear search input button click
    elements.clearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      toggleClearBtn(false);
      elements.searchInput.focus();
    });

    // Clear history button
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);

    // Suggestion chips click handlers
    elements.chipBtns.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query) {
          elements.searchInput.value = query;
          toggleClearBtn(true);
          executeSearch(query);
        }
      });
    });
  }

  // Start the application
  init();

});
