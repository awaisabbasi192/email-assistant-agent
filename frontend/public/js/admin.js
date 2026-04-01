/**
 * Admin panel functionality
 */

let currentPage = {
  users: 1,
  activity: 1
};

// Initialize admin panel on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication and admin role
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  if (!isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  await loadStats();
  await loadUsers();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // Users
  document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);
  document.getElementById('userSearch').addEventListener('input', debounceSearch(loadUsers, 500));

  // Activity
  document.getElementById('refreshActivityBtn').addEventListener('click', loadActivity);
  document.getElementById('activityFilter').addEventListener('change', loadActivity);

  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  document.getElementById('clearLogsBtn').addEventListener('click', clearOldLogs);

  // Modals
  document.getElementById('closeUserModal').addEventListener('click', closeUserModal);
  document.getElementById('closeUserModalBtn').addEventListener('click', closeUserModal);
  document.getElementById('disableUserBtn').addEventListener('click', disableUser);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.admin-tab-content').forEach((tab) => {
    tab.style.display = 'none';
  });

  // Update active tab button
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Show selected tab
  document.getElementById(tabName + 'Tab').style.display = 'block';

  // Load tab data
  if (tabName === 'activity') {
    loadActivity();
  } else if (tabName === 'usage') {
    loadApiUsage();
  } else if (tabName === 'settings') {
    loadSettings();
  }
}

/**
 * Load system statistics
 */
async function loadStats() {
  try {
    const response = await apiCall('/admin/stats');

    if (!response.ok) {
      throw new Error('Failed to load stats');
    }

    const stats = await response.json();

    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('gmailConnected').textContent = stats.gmailConnected;
    document.getElementById('draftsCreated').textContent = stats.totalDrafts;
    document.getElementById('totalLogins').textContent = stats.totalLogins;
  } catch (error) {
    console.error('Error loading stats:', error);
    showError('Failed to load statistics');
  }
}

/**
 * Load and display users
 */
async function loadUsers() {
  try {
    const search = document.getElementById('userSearch').value;
    const page = currentPage.users;

    showLoading('Loading users...');

    const response = await apiCall(`/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);

    if (!response.ok) {
      throw new Error('Failed to load users');
    }

    const data = await response.json();

    displayUsers(data.users);
    displayPagination('usersPagination', data.pagination, (page) => {
      currentPage.users = page;
      loadUsers();
    });

    hideLoading();
  } catch (error) {
    console.error('Error loading users:', error);
    showError('Failed to load users');
    hideLoading();
  }
}

/**
 * Display users in table
 */
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; color: #95a5a6;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  users.forEach((user) => {
    const row = document.createElement('tr');

    const createdDate = new Date(user.createdAt).toLocaleDateString();

    row.innerHTML = `
      <td>${escapeHtml(user.email)}</td>
      <td><span class="status-badge success">Active</span></td>
      <td>${user.gmailConnected ? '✅' : '❌'}</td>
      <td>${createdDate}</td>
      <td>
        <div class="action-buttons">
          <button class="action-button" data-user-id="${user.id}" onclick="viewUserDetails('${user.id}')">
            View
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * View user details
 */
async function viewUserDetails(userId) {
  try {
    showLoading('Loading user details...');

    const response = await apiCall(`/admin/users/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to load user details');
    }

    const data = await response.json();

    // Display user details in modal
    const modalBody = document.getElementById('userModalBody');
    const activityCount = data.activityLogs.length;
    const createdDate = new Date(data.user.createdAt).toLocaleDateString();

    modalBody.innerHTML = `
      <p><strong>Email:</strong> ${escapeHtml(data.user.email)}</p>
      <p><strong>ID:</strong> ${escapeHtml(data.user.id)}</p>
      <p><strong>Role:</strong> ${capitalize(data.user.role)}</p>
      <p><strong>Created:</strong> ${createdDate}</p>
      <p><strong>Gmail Connected:</strong> ${data.user.gmailConnected ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Recent Activity:</strong> ${activityCount} events</p>
      <p><strong>API Usage (30 days):</strong> ${data.apiUsage.length} days</p>
    `;

    // Show disable button if not admin
    const disableBtn = document.getElementById('disableUserBtn');
    if (data.user.role !== 'admin') {
      disableBtn.style.display = 'inline-block';
      disableBtn.setAttribute('data-user-id', userId);
    } else {
      disableBtn.style.display = 'none';
    }

    document.getElementById('userModal').classList.add('show');
    hideLoading();
  } catch (error) {
    console.error('Error loading user details:', error);
    showError('Failed to load user details');
    hideLoading();
  }
}

/**
 * Close user details modal
 */
function closeUserModal() {
  document.getElementById('userModal').classList.remove('show');
}

/**
 * Disable user account
 */
async function disableUser() {
  const userId = document.getElementById('disableUserBtn').getAttribute('data-user-id');

  if (!confirm('Are you sure you want to disable this user?')) {
    return;
  }

  try {
    showLoading('Disabling user...');

    const response = await apiCall(`/admin/users/${userId}/disable`, { method: 'POST' });

    if (!response.ok) {
      throw new Error('Failed to disable user');
    }

    showSuccess('User disabled successfully');
    closeUserModal();
    loadUsers();
    hideLoading();
  } catch (error) {
    console.error('Error disabling user:', error);
    showError('Failed to disable user');
    hideLoading();
  }
}

/**
 * Load activity logs
 */
async function loadActivity() {
  try {
    const action = document.getElementById('activityFilter').value;
    const page = currentPage.activity;

    showLoading('Loading activity logs...');

    const response = await apiCall(
      `/admin/activity?page=${page}&limit=50&action=${encodeURIComponent(action)}`
    );

    if (!response.ok) {
      throw new Error('Failed to load activity logs');
    }

    const data = await response.json();

    displayActivity(data.logs);
    displayPagination('activityPagination', data.pagination, (page) => {
      currentPage.activity = page;
      loadActivity();
    });

    hideLoading();
  } catch (error) {
    console.error('Error loading activity:', error);
    showError('Failed to load activity logs');
    hideLoading();
  }
}

/**
 * Display activity logs in table
 */
function displayActivity(logs) {
  const tbody = document.getElementById('activityTableBody');

  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: #95a5a6;">No activity logs found</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  logs.forEach((log) => {
    const row = document.createElement('tr');

    const timestamp = formatDate(log.timestamp);
    const details = log.metadata ? JSON.stringify(log.metadata).substring(0, 50) : '';

    row.innerHTML = `
      <td>${truncateText(log.userId, 20)}</td>
      <td><strong>${log.action}</strong></td>
      <td>${timestamp}</td>
      <td style="font-size: 0.9rem; color: #7f8c8d;">${escapeHtml(details)}</td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Load API usage
 */
async function loadApiUsage() {
  try {
    showLoading('Loading API usage...');

    const response = await apiCall('/admin/api-usage');

    if (!response.ok) {
      throw new Error('Failed to load API usage');
    }

    const data = await response.json();

    // Display summary
    const maxGmail = Math.max(...data.usage.map((u) => u.gmailApiCalls || 0), 1);
    const maxGemini = Math.max(...data.usage.map((u) => u.geminiApiCalls || 0), 1);

    const todayGmail = data.usage[data.usage.length - 1]?.gmailApiCalls || 0;
    const todayGemini = data.usage[data.usage.length - 1]?.geminiApiCalls || 0;

    document.getElementById('gmailUsageFill').style.width = (todayGmail / maxGmail) * 100 + '%';
    document.getElementById('gmailUsageFill').textContent = todayGmail;

    document.getElementById('geminiUsageFill').style.width = (todayGemini / maxGemini) * 100 + '%';
    document.getElementById('geminiUsageFill').textContent = todayGemini;

    // Display daily usage table
    const tbody = document.getElementById('usageTableBody');
    tbody.innerHTML = '';

    data.usage
      .slice()
      .reverse()
      .forEach((usage) => {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${usage.date}</td>
        <td>${usage.gmailApiCalls}</td>
        <td>${usage.geminiApiCalls}</td>
        <td>${usage.users}</td>
      `;
        tbody.appendChild(row);
      });

    hideLoading();
  } catch (error) {
    console.error('Error loading API usage:', error);
    showError('Failed to load API usage');
    hideLoading();
  }
}

/**
 * Load and display settings
 */
async function loadSettings() {
  // For now, just reset checkboxes to default values
  document.getElementById('signupEnabledToggle').checked = true;
  document.getElementById('maintenanceModeToggle').checked = false;
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    showLoading('Saving settings...');

    const settings = {
      signupEnabled: document.getElementById('signupEnabledToggle').checked,
      maintenanceMode: document.getElementById('maintenanceModeToggle').checked
    };

    const response = await apiCall('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    showSuccess('Settings saved successfully');
    hideLoading();
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings');
    hideLoading();
  }
}

/**
 * Export data
 */
async function exportData() {
  try {
    showLoading('Exporting data...');

    const response = await apiCall('/admin/export');

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    const data = await response.json();

    // Create and download JSON file
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('Data exported successfully');
    hideLoading();
  } catch (error) {
    console.error('Error exporting data:', error);
    showError('Failed to export data');
    hideLoading();
  }
}

/**
 * Clear old logs
 */
async function clearOldLogs() {
  const daysOld = parseInt(document.getElementById('clearLogsInput').value);

  if (!daysOld || daysOld < 1) {
    showError('Please enter a valid number of days');
    return;
  }

  if (!confirm(`Are you sure you want to delete logs older than ${daysOld} days?`)) {
    return;
  }

  try {
    showLoading('Clearing logs...');

    const response = await apiCall('/admin/logs/clear', {
      method: 'POST',
      body: JSON.stringify({ daysOld })
    });

    if (!response.ok) {
      throw new Error('Failed to clear logs');
    }

    showSuccess('Old logs cleared successfully');
    hideLoading();
  } catch (error) {
    console.error('Error clearing logs:', error);
    showError('Failed to clear logs');
    hideLoading();
  }
}

/**
 * Display pagination controls
 */
function displayPagination(elementId, pagination, onPageChange) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  if (pagination.pages <= 1) {
    return;
  }

  for (let i = 1; i <= pagination.pages; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.className = i === pagination.page ? 'active' : '';
    button.addEventListener('click', () => {
      onPageChange(i);
    });
    container.appendChild(button);
  }
}

/**
 * Debounce search function
 */
function debounceSearch(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
