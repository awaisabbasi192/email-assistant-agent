/**
 * Dashboard functionality
 */

let currentEmailData = null;
let currentUser = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  // Load user data
  await loadUserData();

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  await loadEmails();
});

/**
 * Load user profile data
 */
async function loadUserData() {
  try {
    showLoading('Loading profile...');

    const response = await apiCall('/auth/me');

    if (!response.ok) {
      throw new Error('Failed to load user data');
    }

    currentUser = await response.json();

    // Update UI with user data
    document.getElementById('userEmail').textContent = currentUser.email;
    const firstLetter = currentUser.email.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = firstLetter;

    // Update Gmail status
    updateGmailStatus(currentUser.gmailConnected);

    hideLoading();
  } catch (error) {
    console.error('Error loading user data:', error);
    showError('Failed to load profile');
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

  // Email Modal
  document.getElementById('closeEmailModal').addEventListener('click', closeEmailModal);
  document.getElementById('closeEmailModalBtn').addEventListener('click', closeEmailModal);
  document.getElementById('generateNewReplyBtn').addEventListener('click', generateReply);
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);

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
 * Load emails from Gmail
 */
async function loadEmails() {
  try {
    if (!currentUser.gmailConnected) {
      document.getElementById('emailList').innerHTML =
        '<li class="empty-state"><div class="empty-state-icon">📬</div><p>Connect your Gmail account to view emails.</p></li>';
      return;
    }

    showLoading('Loading emails...');

    const response = await apiCall('/gmail/emails?maxResults=20');

    if (!response.ok) {
      throw new Error('Failed to load emails');
    }

    const emails = await response.json();

    displayEmails(emails);
    hideLoading();
  } catch (error) {
    console.error('Error loading emails:', error);
    showError('Failed to load emails');
    hideLoading();
  }
}

/**
 * Display emails in the list
 */
function displayEmails(emails) {
  const emailList = document.getElementById('emailList');

  if (emails.length === 0) {
    emailList.innerHTML =
      '<li class="empty-state"><div class="empty-state-icon">✓</div><p>No unread emails!</p></li>';
    return;
  }

  emailList.innerHTML = '';

  emails.forEach((email) => {
    const emailItem = document.createElement('li');
    emailItem.className = 'email-item';

    const displayFrom = email.from
      .replace(/<.*>/, '')
      .trim()
      .substring(0, 30);
    const displaySubject = truncateText(email.subject, 50);
    const displaySnippet = truncateText(email.snippet || email.body, 100);

    emailItem.innerHTML = `
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

    const response = await apiCall('/ai/generate-reply', {
      method: 'POST',
      body: JSON.stringify({
        subject: currentEmailData.subject,
        from: currentEmailData.from,
        body: currentEmailData.body,
        tone: document.getElementById('replyTone')?.value || 'professional'
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
 * Load user settings
 */
async function loadSettings() {
  if (currentUser) {
    document.getElementById('autoGenerateReplies').checked =
      currentUser.settings?.autoGenerateReplies || false;
    document.getElementById('replyTone').value = currentUser.settings?.replyTone || 'professional';
  }
}

/**
 * Save user settings
 */
async function saveSettings() {
  try {
    const settings = {
      autoGenerateReplies: document.getElementById('autoGenerateReplies').checked,
      replyTone: document.getElementById('replyTone').value
    };

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
