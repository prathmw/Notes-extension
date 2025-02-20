// Create and inject the slider
const createSlider = () => {
  const slider = document.createElement('div');
  slider.id = 'notes-slider';
  slider.innerHTML = `
    <div class="slider-header">
      <h3>Quick Notes</h3>
      <button id="close-slider">×</button>
    </div>
    <textarea id="notes-content" placeholder="Type your notes here..."></textarea>
    <div class="slider-footer">
      <button id="save-notes">Save</button>
    </div>
  `;
  document.body.appendChild(slider);
  
  // Create floating button
  const floatingButton = document.createElement('button');
  floatingButton.id = 'floating-notes-button';
  floatingButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  `;
  document.body.appendChild(floatingButton);

  // Load button position
  chrome.storage.local.get(['buttonPosition'], (result) => {
    if (result.buttonPosition) {
      floatingButton.style.left = result.buttonPosition.x + 'px';
      floatingButton.style.top = result.buttonPosition.y + 'px';
      floatingButton.style.right = 'auto';
      floatingButton.style.bottom = 'auto';
    }
  });
  
  // Make button draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  floatingButton.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - floatingButton.offsetLeft;
    initialY = e.clientY - floatingButton.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      // Keep button within viewport
      currentX = Math.max(0, Math.min(currentX, window.innerWidth - floatingButton.offsetWidth));
      currentY = Math.max(0, Math.min(currentY, window.innerHeight - floatingButton.offsetHeight));
      
      floatingButton.style.left = currentX + 'px';
      floatingButton.style.top = currentY + 'px';
      floatingButton.style.right = 'auto';
      floatingButton.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      // Save button position
      chrome.storage.local.set({
        buttonPosition: { x: currentX, y: currentY }
      });
    }
  });
  
  // Load saved notes
  chrome.storage.local.get(['notes'], (result) => {
    const notesContent = document.getElementById('notes-content');
    notesContent.value = result.notes || '';
  });
  
  // Event listeners
  document.getElementById('close-slider').addEventListener('click', toggleSlider);
  document.getElementById('save-notes').addEventListener('click', saveNotes);
  floatingButton.addEventListener('click', (e) => {
    if (!isDragging) {
      toggleSlider();
    }
  });
};

// Toggle slider visibility
const toggleSlider = () => {
  const slider = document.getElementById('notes-slider');
  if (slider.classList.contains('visible')) {
    slider.classList.remove('visible');
  } else {
    slider.classList.add('visible');
  }
};

// Save notes to chrome.storage
const saveNotes = () => {
  const notesContent = document.getElementById('notes-content').value;
  chrome.storage.local.set({ notes: notesContent }, () => {
    const saveBtn = document.getElementById('save-notes');
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save';
    }, 1500);

    // Broadcast note changes to other tabs
    chrome.runtime.sendMessage({ 
      action: 'notesUpdated', 
      notes: notesContent 
    });
  });
};

// Initialize slider
createSlider();

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '\\') {
    toggleSlider();
  }
});

// Listen for messages from popup and other tabs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSlider') {
    toggleSlider();
  } else if (request.action === 'notesUpdated') {
    // Update notes content when changes are made in other tabs
    const notesContent = document.getElementById('notes-content');
    notesContent.value = request.notes;
  }
});