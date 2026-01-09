import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import participantsRoutes from './routes/participants.js';

// Load env from parent directory (try multiple locations)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback: try from current working directory
if (!process.env.ZOOM_CLIENT_ID) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}
// Fallback 2: try from project root
if (!process.env.ZOOM_CLIENT_ID) {
  dotenv.config();
}

console.log('Loaded ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID ? 'yes' : 'no');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'https://ba27addc41a0.ngrok-free.app'],
  credentials: true,
}));

// OWASP Security Headers (required by Zoom)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; frame-ancestors https://*.zoom.us");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://zoom.us');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'zoom-randomizer-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', healthRoutes);
app.use('/api/participants', participantsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
