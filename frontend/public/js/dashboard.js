/**
 * Dashboard functionality
 */

let currentEmailData = null;
let currentUser = null;
let allEmails = []; // Store all emails for filtering
let currentCategory = 'all'; // Track active category tab
let currentSearchTerm = ''; // Track current search term

// Utility: Debounce function for search
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Filter and display emails based on category and search term
function updateEmailDisplay() {
  let filteredEmails = [...allEmails];

  // Filter by category
  if (currentCategory !== 'all') {
    filteredEmails = filteredEmails.filter(email => {
      if (currentCategory === 'important') {
        return email.labelIds && email.labelIds.includes('IMPORTANT');
      } else if (currentCategory === 'promotions') {
        return email.category === 'promotions' || (email.labelIds && email.labelIds.includes('CATEGORY_PROMOTIONS'));
      } else if (currentCategory === 'social') {
        return email.category === 'social' || (email.labelIds && email.labelIds.includes('CATEGORY_SOCIAL'));
      }
      return true;
    });
  }

  // Filter by search term
  if (currentSearchTerm) {
    filteredEmails = filteredEmails.filter(email => {
      const senderMatch = email.from.toLowerCase().includes(currentSearchTerm);
      const subjectMatch = email.subject.toLowerCase().includes(currentSearchTerm);
      return senderMatch || subjectMatch;
    });
  }

  // Display filtered emails
  displayEmails(filteredEmails);
}

// Dark mode management
function initializeDarkMode() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    updateDarkModeIcon(true);
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  updateDarkModeIcon(isDarkMode);
}

function updateDarkModeIcon(isDark) {
  const icon = document.querySelector('.dark-mode-icon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🔍 Dashboard initializing...');
    console.log('📍 URL:', window.location.href);

    // Initialize dark mode
    initializeDarkMode();

    // Handle OAuth callback - capture token from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const gmailConnected = urlParams.get('gmail');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      console.error('❌ OAuth Error:', errorParam);
      showError('Gmail connection failed: ' + errorParam);
    }

    // Save token if present in URL
    if (tokenFromUrl) {
      try {
        console.log('🔍 Raw token from URL:', tokenFromUrl.substring(0, 50) + '...');

        // Decode and verify token structure
        const parts = tokenFromUrl.split('.');
        console.log('📊 Token parts count:', parts.length);

        if (parts.length === 3) {
          // Verify token is valid JWT
          const decoded = JSON.parse(atob(parts[1]));
          console.log('✅ Token decoded successfully:', decoded);

          const userId = decoded.userId;
          const email = decoded.email;
          const role = decoded.role || 'user';

          if (!userId || !email) {
            throw new Error('Token missing userId or email');
          }

          // Save auth data - EXACT token as-is
          localStorage.setItem('authToken', tokenFromUrl);
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userRole', role);

          // Verify saved
          console.log('💾 Saved to localStorage:');
          console.log('   authToken:', localStorage.getItem('authToken').substring(0, 30) + '...');
          console.log('   userEmail:', localStorage.getItem('userEmail'));
          console.log('   userId:', localStorage.getItem('userId'));

          console.log('✅ OAuth token saved successfully');
          showSuccess('Gmail connected! Loading dashboard...');

          // Clean up URL to remove token
          window.history.replaceState({}, document.title, 'dashboard.html');

          // Small delay to ensure localStorage is persisted
          await new Promise(r => setTimeout(r, 500));
        } else {
          throw new Error(`Invalid token format: ${parts.length} parts`);
        }
      } catch (error) {
        console.error('❌ Failed to parse OAuth token:', error);
        console.error('Raw token:', tokenFromUrl);
        showError('OAuth processing failed: ' + error.message);
      }
    }

    // Check authentication
    if (!localStorage.getItem('authToken')) {
      console.log('❌ Not authenticated - redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    console.log('✅ User authenticated');

    // Load user data
    await loadUserData();

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadEmails();
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    showError('Failed to load dashboard: ' + error.message);
  }
});

/**
 * Load user profile data
 */
async function loadUserData() {
  try {
    showLoading('Loading profile...');

    const token = localStorage.getItem('authToken');
    console.log('🔐 Token exists:', !!token);

    const response = await apiCall('/auth/me');

    console.log('📡 /auth/me response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ /auth/me error:', response.status, errorText);
      throw new Error(`Failed to load user data (${response.status}): ${errorText}`);
    }

    currentUser = await response.json();

    // Update UI with user data
    document.getElementById('userEmail').textContent = currentUser.email;
    const firstLetter = currentUser.email.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = firstLetter;

    // Update Gmail status
    const isGmailConnected = currentUser.gmailConnected === true;
    updateGmailStatus(isGmailConnected);

    console.log('✅ User data loaded:', {
      email: currentUser.email,
      gmailConnected: isGmailConnected,
      role: currentUser.role
    });

    hideLoading();
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    showError('Failed to load profile: ' + error.message);
    hideLoading();
  }
}

/**
 * Update Gmail connection status display
 */
function updateGmailStatus(isConnected) {
  const statusBadge = document.getElementById('gmailStatusBadge');
  const connectBtn = document.getElementById('connectGmailBtn');
  const disconnectBtn = document.getElementById('disconnectGmailBtn');
  const statusIcon = document.getElementById('gmailStatus');

  if (isConnected) {
    statusBadge.textContent = 'Connected ✓';
    statusBadge.className = 'gmail-status connected';
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'inline-block';
    statusIcon.textContent = '✅';
  } else {
    statusBadge.textContent = 'Not Connected';
    statusBadge.className = 'gmail-status disconnected';
    connectBtn.style.display = 'inline-block';
    disconnectBtn.style.display = 'none';
    statusIcon.textContent = '❌';
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Dark mode toggle
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

  // Navigation
  document.querySelectorAll('[data-section]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = e.target.getAttribute('data-section');
      navigateToSection(section);
    });
  });

  // Gmail
  document.getElementById('connectGmailBtn').addEventListener('click', connectGmail);
  document.getElementById('disconnectGmailBtn').addEventListener('click', disconnectGmail);
  document.getElementById('refreshEmailsBtn').addEventListener('click', loadEmails);

  // Email Search and Filter
  const searchInput = document.getElementById('emailSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentSearchTerm = e.target.value.trim().toLowerCase();
      document.getElementById('emailSearchClear').style.display =
        currentSearchTerm ? 'block' : 'none';
      updateEmailDisplay();
    }, 300));
  }

  const searchClear = document.getElementById('emailSearchClear');
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      document.getElementById('emailSearchInput').value = '';
      currentSearchTerm = '';
      searchClear.style.display = 'none';
      updateEmailDisplay();
    });
  }

  // Category Tabs
  document.querySelectorAll('.category-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-category');
      currentSearchTerm = ''; // Clear search when changing category
      document.getElementById('emailSearchInput').value = '';
      document.getElementById('emailSearchClear').style.display = 'none';
      updateEmailDisplay();
    });
  });

  // Email Modal
  document.getElementById('closeEmailModal').addEventListener('click', closeEmailModal);
  document.getElementById('closeEmailModalBtn').addEventListener('click', closeEmailModal);
  document.getElementById('generateNewReplyBtn').addEventListener('click', generateReply);
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
  document.getElementById('sendEmailBtn').addEventListener('click', sendReply);

  // Settings - Tone selector
  const replyTone = document.getElementById('replyTone');
  if (replyTone) {
    replyTone.addEventListener('change', (e) => {
      const customGroup = document.getElementById('customToneGroup');
      if (customGroup) {
        customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
    });
  }

  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

/**
 * Navigate to section
 */
function navigateToSection(section) {
  // Hide all sections
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('emailsSection').style.display = 'none';
  document.getElementById('settingsSection').style.display = 'none';

  // Update active nav link
  document.querySelectorAll('[data-section]').forEach((link) => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-section="${section}"]`).classList.add('active');

  // Show selected section
  if (section === 'dashboard') {
    document.getElementById('dashboardSection').style.display = 'block';
  } else if (section === 'emails') {
    document.getElementById('emailsSection').style.display = 'block';
    loadEmails();
  } else if (section === 'settings') {
    document.getElementById('settingsSection').style.display = 'block';
    loadSettings();
  }
}

/**
 * Connect Gmail account
 */
async function connectGmail() {
  try {
    showLoading('Redirecting to Gmail...');

    const response = await apiCall('/gmail/auth-url');

    if (!response.ok) {
      throw new Error('Failed to get authorization URL');
    }

    const data = await response.json();

    // Redirect to Gmail OAuth
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('Error connecting Gmail:', error);
    showError('Failed to connect Gmail');
    hideLoading();
  }
}

/**
 * Disconnect Gmail account
 */
async function disconnectGmail() {
  if (!confirm('Are you sure you want to disconnect your Gmail account?')) {
    return;
  }

  try {
    showLoading('Disconnecting...');

    const response = await apiCall('/gmail/disconnect', { method: 'DELETE' });

    if (!response.ok) {
      throw new Error('Failed to disconnect');
    }

    currentUser.gmailConnected = false;
    updateGmailStatus(false);
    document.getElementById('emailList').innerHTML =
      '<li class="empty-state"><div class="empty-state-icon">📬</div><p>No emails to display. Connect your Gmail account to get started.</p></li>';

    showSuccess('Gmail account disconnected');
    hideLoading();
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    showError('Failed to disconnect Gmail');
    hideLoading();
  }
}

/**
 * Calculate email age category
 */
function getEmailAgeClass(dateString) {
  const emailDate = new Date(dateString);
  const now = new Date();
  const diffMs = now - emailDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) {
    return 'age-today';
  } else if (diffDays < 7) {
    return 'age-week';
  } else {
    return 'age-old';
  }
}

/**
 * Generate sender avatar with initials
 */
function generateSenderAvatar(fromString) {
  // Extract name from "Name <email@domain>" format
  const nameMatch = fromString.match(/^([^<]+)/);
  const name = nameMatch ? nameMatch[1].trim() : fromString;
  const initials = name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  return initials || '?';
}

/**
 * Get sender color class (cycling through 5 colors)
 */
function getSenderColorClass(fromString, index) {
  const senderHash = fromString.charCodeAt(0) + fromString.charCodeAt(fromString.length - 1);
  const colorClass = (senderHash % 5) + 1;
  return `sender-${colorClass}`;
}

/**
 * Generate skeleton loading HTML
 */
function generateSkeletonLoading() {
  const skeletonHTML = `
    <li class="skeleton-item">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-content">
        <div class="skeleton-line title skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line text skeleton"></div>
      </div>
    </li>
  `;
  return skeletonHTML;
}

/**
 * Load emails from Gmail
 */
async function loadEmails() {
  try {
    if (!currentUser.gmailConnected) {
      document.getElementById('emailList').innerHTML =
        '<li class="empty-state"><div class="empty-state-icon">📬</div><p>Connect your Gmail account to view emails.</p></li>';
      return;
    }

    // Show skeleton loading
    const emailList = document.getElementById('emailList');
    let skeletonHTML = '';
    for (let i = 0; i < 5; i++) {
      skeletonHTML += generateSkeletonLoading();
    }
    emailList.innerHTML = skeletonHTML;

    const response = await apiCall('/gmail/emails?maxResults=20');

    if (!response.ok) {
      throw new Error('Failed to load emails');
    }

    const emails = await response.json();

    // Store all emails for filtering
    allEmails = emails;
    currentCategory = 'all';
    currentSearchTerm = '';

    // Reset search bar and category tabs
    document.getElementById('emailSearchInput').value = '';
    document.getElementById('emailSearchClear').style.display = 'none';
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-category') === 'all');
    });

    displayEmails(emails);
  } catch (error) {
    console.error('Error loading emails:', error);
    showError('Failed to load emails');
    document.getElementById('emailList').innerHTML =
      '<li class="empty-state"><div class="empty-state-icon">❌</div><p>Failed to load emails. Please try again.</p></li>';
  }
}

/**
 * Display emails in the list
 */
function displayEmails(emails) {
  const emailList = document.getElementById('emailList');

  if (emails.length === 0) {
    if (currentSearchTerm) {
      emailList.innerHTML =
        '<li class="empty-state"><div class="empty-state-icon">🔍</div><p>No emails match your search.</p></li>';
    } else if (currentCategory !== 'all') {
      emailList.innerHTML =
        '<li class="empty-state"><div class="empty-state-icon">📬</div><p>No emails in this category.</p></li>';
    } else {
      emailList.innerHTML =
        '<li class="empty-state"><div class="empty-state-icon">✓</div><p>No unread emails!</p></li>';
    }
    return;
  }

  emailList.innerHTML = '';

  emails.forEach((email, index) => {
    const emailItem = document.createElement('li');

    // Add age class for color-coded border
    const ageClass = getEmailAgeClass(email.date);
    const colorClass = getSenderColorClass(email.from, index);

    emailItem.className = `email-item ${ageClass} ${colorClass}`;

    const displayFrom = email.from
      .replace(/<.*>/, '')
      .trim()
      .substring(0, 30);
    const displaySubject = truncateText(email.subject, 50);
    const displaySnippet = truncateText(email.snippet || email.body, 100);
    const senderInitials = generateSenderAvatar(displayFrom);

    emailItem.innerHTML = `
      <div class="email-avatar">${escapeHtml(senderInitials)}</div>
      <div class="email-content">
        <div class="email-item-header">
          <div>
            <div class="email-from">${escapeHtml(displayFrom)}</div>
            <div class="email-subject">${escapeHtml(displaySubject)}</div>
          </div>
          <div class="email-date">${formatDate(email.date)}</div>
        </div>
        <div class="email-snippet">${escapeHtml(displaySnippet)}</div>
        <div class="email-actions">
          <button class="btn btn-primary btn-sm" data-email-id="${email.id}">
            ✨ Generate Reply
          </button>
        </div>
      </div>
    `;

    // Add click handler for generate reply button
    emailItem.querySelector('[data-email-id]').addEventListener('click', () => {
      openEmailModal(email);
    });

    emailList.appendChild(emailItem);
  });
}

/**
 * Open email modal
 */
async function openEmailModal(email) {
  currentEmailData = email;

  document.getElementById('modalSubject').textContent = email.subject;
  document.getElementById('modalFrom').textContent = email.from;
  document.getElementById('modalBody').textContent = email.body;
  document.getElementById('replyContent').value = '';

  // Show modal
  document.getElementById('emailModal').classList.add('show');

  // Generate initial reply
  await generateReply();
}

/**
 * Close email modal
 */
function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('show');
  currentEmailData = null;
}

/**
 * Generate AI reply
 */
async function generateReply() {
  if (!currentEmailData) return;

  try {
    document.getElementById('generateNewReplyBtn').disabled = true;
    showLoading('Generating reply...');

    const tone = document.getElementById('replyTone')?.value || 'professional';
    const customTone = tone === 'custom'
      ? document.getElementById('customToneInput')?.value
      : null;

    const response = await apiCall('/ai/generate-reply', {
      method: 'POST',
      body: JSON.stringify({
        subject: currentEmailData.subject,
        from: currentEmailData.from,
        body: currentEmailData.body,
        tone: tone,
        customTone: customTone
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate reply');
    }

    const data = await response.json();
    document.getElementById('replyContent').value = data.reply;

    hideLoading();
  } catch (error) {
    console.error('Error generating reply:', error);
    showError(error.message || 'Failed to generate reply');
    hideLoading();
  } finally {
    document.getElementById('generateNewReplyBtn').disabled = false;
  }
}

/**
 * Save reply as draft
 */
async function saveDraft() {
  if (!currentEmailData) return;

  const replyContent = document.getElementById('replyContent').value.trim();

  if (!replyContent) {
    showError('Reply cannot be empty');
    return;
  }

  try {
    showLoading('Saving draft...');

    const response = await apiCall('/gmail/create-draft', {
      method: 'POST',
      body: JSON.stringify({
        emailId: currentEmailData.id,
        content: replyContent
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create draft');
    }

    showSuccess('Draft saved in Gmail!');
    closeEmailModal();
    hideLoading();
  } catch (error) {
    console.error('Error saving draft:', error);
    showError(error.message || 'Failed to save draft');
    hideLoading();
  }
}

/**
 * Send reply email directly
 */
async function sendReply() {
  if (!currentEmailData) return;

  const replyContent = document.getElementById('replyContent').value.trim();

  if (!replyContent) {
    showError('Reply cannot be empty');
    return;
  }

  try {
    showLoading('Sending email...');

    const response = await apiCall('/gmail/send-reply', {
      method: 'POST',
      body: JSON.stringify({
        emailId: currentEmailData.id,
        content: replyContent
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    showSuccess('Email sent successfully! ✓');
    closeEmailModal();

    // Reload emails to update list
    await loadEmails();
    hideLoading();
  } catch (error) {
    console.error('Error sending email:', error);
    showError(error.message || 'Failed to send email');
    hideLoading();
  }
}

/**
 * Load user settings
 */
async function loadSettings() {
  if (currentUser) {
    document.getElementById('autoGenerateReplies').checked =
      currentUser.settings?.autoGenerateReplies || false;

    const replyTone = currentUser.settings?.replyTone || 'professional';
    document.getElementById('replyTone').value = replyTone;

    const customToneGroup = document.getElementById('customToneGroup');
    if (customToneGroup) {
      customToneGroup.style.display = replyTone === 'custom' ? 'block' : 'none';
    }

    if (replyTone === 'custom' && currentUser.settings?.customTone) {
      document.getElementById('customToneInput').value = currentUser.settings.customTone;
    }
  }
}

/**
 * Save user settings
 */
async function saveSettings() {
  try {
    const tone = document.getElementById('replyTone').value;
    const settings = {
      autoGenerateReplies: document.getElementById('autoGenerateReplies').checked,
      replyTone: tone
    };

    // Save custom tone if selected
    if (tone === 'custom') {
      const customTone = document.getElementById('customToneInput').value.trim();
      if (!customTone) {
        showError('Please enter custom tone instructions');
        return;
      }
      settings.customTone = customTone;
    }

    showLoading('Saving settings...');

    const response = await apiCall('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    currentUser.settings = settings;
    showSuccess('Settings saved successfully');
    hideLoading();
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings');
    hideLoading();
  }
}

/**
 * Show loading overlay
 */
function showLoading(message) {
  document.getElementById('loadingMessage').textContent = message;
  document.getElementById('loadingOverlay').classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

/**
 * Show error message
 */
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Logout user
 */
async function logout() {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }

  clearAuthData();
  window.location.href = 'login.html';
}
