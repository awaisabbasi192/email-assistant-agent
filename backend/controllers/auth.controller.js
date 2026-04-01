import AuthService from '../services/authService.js';
import StorageService from '../services/storageService.js';
import LoggingService from '../services/loggingService.js';

/**
 * Sign up a new user
 */
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    if (!AuthService.validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if email already exists
    const existingUser = await StorageService.findOne('users.json', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
      gmailConnected: false,
      emailVerified: true,
      gmailApproved: true,
      settings: {
        autoGenerateReplies: false,
        replyTone: 'professional'
      }
    };

    // Save user
    await StorageService.append('users.json', newUser);

    // Generate JWT token
    const tokenPayload = AuthService.createTokenPayload(newUser);
    const token = AuthService.generateToken(tokenPayload);

    // Log activity
    await LoggingService.logActivity(newUser.id, 'SIGNUP', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await StorageService.findOne('users.json', { email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await AuthService.comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const tokenPayload = AuthService.createTokenPayload(user);
    const token = AuthService.generateToken(tokenPayload);

    // Log activity
    await LoggingService.logActivity(user.id, 'LOGIN', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        gmailConnected: user.gmailConnected
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user data
    const user = await StorageService.findOne('users.json', { id: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      gmailConnected: user.gmailConnected,
      createdAt: user.createdAt,
      settings: user.settings
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

/**
 * Update user settings
 */
export const updateSettings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { replyTone, autoGenerateReplies } = req.body;

    const updates = {};
    if (typeof replyTone === 'string') {
      updates.replyTone = replyTone;
    }
    if (typeof autoGenerateReplies === 'boolean') {
      updates.autoGenerateReplies = autoGenerateReplies;
    }

    // Update settings
    const updated = await StorageService.update(
      'users.json',
      { id: req.user.userId },
      { settings: { ...updates } }
    );

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Logout (client-side token removal)
 */
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await LoggingService.logActivity(req.user.userId, 'LOGOUT', {
        ip: req.ip
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Setup admin account on first deployment
 */
export const setupAdmin = async (req, res) => {
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin@123';

    // Check if admin already exists
    const existingAdmin = await StorageService.findOne('users.json', { email: adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account already exists', email: adminEmail, password: adminPassword });
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(adminPassword);

    // Create admin user
    const adminUser = {
      id: `user_${Date.now()}`,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
      gmailConnected: false,
      settings: {
        autoGenerateReplies: false,
        replyTone: 'professional'
      }
    };

    // Save admin user
    await StorageService.append('users.json', adminUser);

    res.status(201).json({
      message: 'Admin account created successfully',
      email: adminEmail,
      password: adminPassword
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to setup admin account' });
  }
};
