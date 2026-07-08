const userRepo = require('../repositories/user.repo');
const authService = require('../services/auth.service');

const toPublicUser = (user) => ({
  user_id: user.user_id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  role: user.role,
});

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await authService.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = { user_id: user.user_id, role: user.role, email: user.email };
    const accessToken = authService.signToken(payload);
    const refreshToken = authService.signRefreshToken(payload);

    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = authService.verifyRefreshToken(refreshToken);
    const user = await userRepo.findById(decoded.user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const payload = { user_id: user.user_id, role: user.role, email: user.email };
    const accessToken = authService.signToken(payload);

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.user.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/me — self-service profile update. Deliberately excludes
// role/is_active: those stay admin-only (see admin.controller.updateUser).
const updateMe = async (req, res, next) => {
  try {
    const { first_name, last_name, email, current_password, new_password } = req.body;
    const fields = { first_name, last_name, email };

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: 'current_password is required to set a new password' });
      }
      const user = await userRepo.findById(req.user.user_id);
      const isMatch = await authService.comparePassword(current_password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      fields.password_hash = await authService.hashPassword(new_password);
    }

    const updated = await userRepo.update(req.user.user_id, fields);
    if (!updated) {
      return res.status(400).json({ message: 'No valid fields provided' });
    }

    const user = await userRepo.findById(req.user.user_id);
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, getMe, updateMe };
