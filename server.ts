import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const SECRET_KEY = process.env.SECRET_KEY || 'lostlink-secure-hmac-key-2026';

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure upload directory exists
const UPLOADS_DIR = path.join(__dirname, 'static', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded static assets
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple, secure HMAC token signing for user sessions
function signToken(userId: number, email: string, isAdmin: boolean): string {
  const payload = Buffer.from(JSON.stringify({ userId, email, isAdmin, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token: string): { userId: number; email: string; isAdmin: boolean } | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (Date.now() > data.exp) return null;
    return { userId: data.userId, email: data.email, isAdmin: Boolean(data.isAdmin) };
  } catch {
    return null;
  }
}

// Auth extraction middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (authHeader) {
    token = authHeader;
  }
  
  if (token) {
    const user = verifyToken(token);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}

app.use(authMiddleware);

// Helper to execute Python API bridge
function runBridge(action: string, payload: any = {}): any {
  try {
    const bridgePath = path.join(__dirname, 'database', 'api_bridge.py');
    const stdout = execFileSync('python3', [
      bridgePath,
      action,
      JSON.stringify(payload)
    ], {
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, PYTHONPATH: __dirname }
    });
    return JSON.parse(stdout.trim());
  } catch (err: any) {
    console.error(`Error in runBridge(${action}):`, err.message);
    return { error: 'Database execution failed' };
  }
}

// ----------------- API ROUTES -----------------

// 1. Health check & Stats
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/stats', (_req, res) => {
  const result = runBridge('get_stats', {});
  res.json(result);
});

app.get('/api/categories', (_req, res) => {
  const result = runBridge('get_categories', {});
  res.json(result);
});

// 2. Authentication
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  const result = runBridge('auth_register', { name, email, phone: phone || '', password });
  if (result.error) {
    return res.status(400).json(result);
  }
  const token = signToken(result.user.id, result.user.email, Boolean(result.user.is_admin));
  res.json({ success: true, user: result.user, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const result = runBridge('auth_login', { email, password });
  if (result.error) {
    return res.status(401).json(result);
  }
  const token = signToken(result.user.id, result.user.email, Boolean(result.user.is_admin));
  res.json({ success: true, user: result.user, token });
});

// Google OAuth 2.0 URL generator
app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const appUrl = process.env.APP_URL || 'https://ais-dev-xx27nding5jforom4r24fx-352293469183.asia-southeast1.run.app';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/auth/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      prompt: 'select_account',
      access_type: 'online'
    }).toString();

  res.json({ url: authUrl, state, redirectUri, clientId });
});

// Google OAuth Popup Callback
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  const { code, state, error } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>LostLink – Google Verification</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #0F172A; text-align: center; }
          .box { padding: 32px; background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 380px; }
          .spinner { width: 36px; height: 36px; border: 3px solid #E2E8F0; border-top-color: #2563EB; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="spinner"></div>
          <h3 style="margin: 0 0 8px;">Connecting Google Account</h3>
          <p style="font-size: 13px; color: #64748B; margin: 0;">Completing secure authentication. This window will close automatically.</p>
        </div>
        <script>
          const payload = ${JSON.stringify({ code: code || '', state: state || '', error: error || '' })};
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_CALLBACK', ...payload }, '*');
            setTimeout(() => window.close(), 600);
          } else {
            window.location.href = '/#dashboard';
          }
        </script>
      </body>
    </html>
  `);
});

// Google Sign-In Verification Endpoint
app.post('/api/auth/google/verify', (req, res) => {
  try {
    const { google_id, email, name, profile_picture, email_verified, idToken } = req.body;

    let resolvedGoogleId = google_id;
    let resolvedEmail = email;
    let resolvedName = name;
    let resolvedPicture = profile_picture || '';
    let resolvedVerified = email_verified !== false;

    // If an ID token was passed from Google Identity Services, parse and verify claims
    if (idToken && typeof idToken === 'string') {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        try {
          const jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          const now = Math.floor(Date.now() / 1000);
          if (jwtPayload.exp && jwtPayload.exp < now) {
            return res.status(401).json({ error: 'Google authentication token has expired. Please sign in again.' });
          }
          if (jwtPayload.iss && !['accounts.google.com', 'https://accounts.google.com'].includes(jwtPayload.iss)) {
            return res.status(401).json({ error: 'Untrusted token issuer' });
          }
          resolvedGoogleId = jwtPayload.sub;
          resolvedEmail = jwtPayload.email;
          resolvedName = jwtPayload.name || jwtPayload.given_name || resolvedEmail.split('@')[0];
          resolvedPicture = jwtPayload.picture || '';
          resolvedVerified = Boolean(jwtPayload.email_verified);
        } catch (jwtErr) {
          console.warn('Could not decode JWT payload:', jwtErr);
        }
      }
    }

    if (!resolvedGoogleId || !resolvedEmail) {
      return res.status(400).json({ error: 'Google authentication failed: Missing verified Google ID or email address.' });
    }

    if (!resolvedVerified) {
      return res.status(400).json({ error: 'Your Google email address is not verified by Google.' });
    }

    const result = runBridge('auth_google', {
      google_id: resolvedGoogleId,
      email: resolvedEmail,
      name: resolvedName || resolvedEmail.split('@')[0],
      profile_picture: resolvedPicture,
      email_verified: resolvedVerified
    });

    if (result.error) {
      return res.status(400).json(result);
    }

    const token = signToken(result.user.id, result.user.email, Boolean(result.user.is_admin));
    res.json({
      success: true,
      user: result.user,
      token,
      is_new: result.is_new,
      linked: result.linked
    });
  } catch (err: any) {
    console.error('Google verify error:', err);
    res.status(500).json({ error: 'Internal server error verifying Google account' });
  }
});

// Demo Google Sign-In helper (allows immediate verification without manual GCP console setup)
app.post('/api/auth/google/demo', (req, res) => {
  const { persona } = req.body; // 'new_user', 'existing_asha', 'existing_ravi'
  let googleData = {
    google_id: '118273948572910384729',
    email: 'alex.mercer.google@gmail.com',
    name: 'Alex Mercer',
    profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    email_verified: true
  };

  if (persona === 'existing_asha') {
    googleData = {
      google_id: '109283746519283746510',
      email: 'asha@example.com',
      name: 'Asha Sharma',
      profile_picture: '/src/assets/images/avatar_verified_user_1794297159863.jpg',
      email_verified: true
    };
  } else if (persona === 'existing_ravi') {
    googleData = {
      google_id: '104829104829104829102',
      email: 'ravi@example.com',
      name: 'Ravi Patel',
      profile_picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
      email_verified: true
    };
  }

  const result = runBridge('auth_google', googleData);
  if (result.error) {
    return res.status(400).json(result);
  }

  const token = signToken(result.user.id, result.user.email, Boolean(result.user.is_admin));
  res.json({
    success: true,
    user: result.user,
    token,
    is_new: result.is_new,
    linked: result.linked
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const result = runBridge('get_profile', { user_id: user.userId });
  res.json(result);
});

app.put('/api/auth/profile', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { name, phone, avatar_url } = req.body;
  const result = runBridge('update_profile', {
    user_id: user.userId,
    name: name || '',
    phone: phone || '',
    avatar_url: avatar_url || ''
  });
  res.json(result);
});

// 3. Image Upload
app.post('/api/upload', (req, res) => {
  try {
    const { data, filename, mimeType } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Extract base64 payload
    let base64Data = data;
    let ext = 'jpg';
    if (data.includes(';base64,')) {
      const parts = data.split(';base64,');
      const mime = parts[0].split(':')[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      base64Data = parts[1];
    } else if (mimeType) {
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file size exceeds 10MB limit.' });
    }

    const safeName = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process image upload' });
  }
});

// 4. Items (Browse, Report, Details, Update, Delete)
app.get('/api/items', (req, res) => {
  const user = (req as any).user;
  const payload = {
    q: req.query.q || '',
    category: req.query.category || '',
    location: req.query.location || '',
    item_date: req.query.item_date || '',
    item_type: req.query.type || '',
    status: req.query.status || '',
    sort: req.query.sort || 'new',
    page: parseInt(req.query.page as string || '1', 10),
    limit: parseInt(req.query.limit as string || '9', 10),
    current_user_id: user ? user.userId : null
  };
  const result = runBridge('get_items', payload);
  res.json(result);
});

app.get('/api/items/:id', (req, res) => {
  const user = (req as any).user;
  const itemId = parseInt(req.params.id, 10);
  const result = runBridge('get_item', {
    item_id: itemId,
    current_user_id: user ? user.userId : null,
    is_admin: user ? user.isAdmin : false
  });
  if (result.error) {
    return res.status(404).json(result);
  }
  res.json(result);
});

app.post('/api/items', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'You must be logged in to report an item.' });
  }
  const { name, category, description, location, item_date, type, image_url, identifying_features, contact_info } = req.body;
  if (!name || !category || !description || !location || !item_date || !type) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  const result = runBridge('create_item', {
    user_id: user.userId,
    data: {
      name,
      category,
      description,
      location,
      item_date,
      type: type.toUpperCase(),
      image_url: image_url || '',
      identifying_features: identifying_features || '',
      contact_info: contact_info || user.email
    }
  });
  res.json(result);
});

app.put('/api/items/:id', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const itemId = parseInt(req.params.id, 10);
  const result = runBridge('update_item', {
    item_id: itemId,
    user_id: user.userId,
    is_admin: user.isAdmin,
    data: req.body
  });
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete('/api/items/:id', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const itemId = parseInt(req.params.id, 10);
  const result = runBridge('delete_item', {
    item_id: itemId,
    user_id: user.userId,
    is_admin: user.isAdmin
  });
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 5. Smart Matches
app.get('/api/matches', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const result = runBridge('get_matches', { user_id: user.userId });
  res.json(result);
});

app.post('/api/matches/:id/status', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const matchId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const result = runBridge('update_match', { match_id: matchId, user_id: user.userId, status });
  res.json(result);
});

// 6. Claims & Verification
app.get('/api/claims', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const result = runBridge('get_claims', { user_id: user.userId });
  res.json(result);
});

app.post('/api/claims', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'You must be logged in to claim an item.' });
  }
  const { item_id, proof_description, proof_attachment } = req.body;
  if (!item_id || !proof_description || proof_description.trim().length < 5) {
    return res.status(400).json({ error: 'Please describe specific proof of ownership.' });
  }
  const result = runBridge('create_claim', {
    item_id: parseInt(item_id, 10),
    claimant_id: user.userId,
    proof_description,
    proof_attachment: proof_attachment || ''
  });
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/claims/:id/decide', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const claimId = parseInt(req.params.id, 10);
  const { action, reviewer_notes } = req.body;
  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
  }
  const result = runBridge('decide_claim', {
    claim_id: claimId,
    user_id: user.userId,
    action,
    reviewer_notes: reviewer_notes || ''
  });
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/claims/:id/messages', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const claimId = parseInt(req.params.id, 10);
  const result = runBridge('get_claim_messages', { claim_id: claimId, user_id: user.userId });
  if (result.error) {
    return res.status(403).json(result);
  }
  res.json(result);
});

app.post('/api/claims/:id/messages', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const claimId = parseInt(req.params.id, 10);
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  const result = runBridge('send_claim_message', {
    claim_id: claimId,
    user_id: user.userId,
    message
  });
  if (result.error) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// 7. Notifications
app.get('/api/notifications', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.json({ notifications: [], unread_count: 0 });
  }
  const result = runBridge('get_notifications', { user_id: user.userId });
  res.json(result);
});

app.post('/api/notifications/read', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const result = runBridge('mark_notifications_read', { user_id: user.userId });
  res.json(result);
});

// 8. Admin Dashboard
app.get('/api/admin/data', (req, res) => {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  const result = runBridge('get_admin_data', { admin_id: user.userId });
  res.json(result);
});

app.post('/api/admin/users/:id/suspend', (req, res) => {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  const targetId = parseInt(req.params.id, 10);
  const result = runBridge('admin_toggle_suspend', { admin_id: user.userId, target_user_id: targetId });
  res.json(result);
});

app.post('/api/admin/categories', (req, res) => {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  const { name, icon } = req.body;
  const result = runBridge('admin_manage_category', {
    admin_id: user.userId,
    action: 'ADD',
    name,
    icon: icon || '📦'
  });
  res.json(result);
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  const catId = parseInt(req.params.id, 10);
  const result = runBridge('admin_manage_category', {
    admin_id: user.userId,
    action: 'DELETE',
    name: '',
    cat_id: catId
  });
  res.json(result);
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LostLink server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
