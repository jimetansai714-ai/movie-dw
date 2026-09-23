import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PYTHON_PORT = 8000;

// Body parser
app.use(express.json());

// Spawn Python FastAPI server in background
let pythonProcess: any = null;

function startPythonBackend() {
  console.log('[Server] Starting Python FastAPI backend (main.py) on port', PYTHON_PORT);
  
  pythonProcess = spawn('python3', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  pythonProcess.on('error', (err: any) => {
    console.error('[Server] Failed to start Python backend:', err);
  });

  pythonProcess.on('close', (code: number) => {
    console.log(`[Server] Python backend exited with code ${code}. Restarting in 3s...`);
    setTimeout(startPythonBackend, 3000);
  });
}

// Start python backend
startPythonBackend();

// Clean up child process on exit
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

// Proxy /api requests to FastAPI backend
app.use('/api', async (req, res) => {
  const targetUrl = `http://127.0.0.1:${PYTHON_PORT}/api${req.url}`;
  
  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.get('Content-Type') || 'application/json',
        'Accept': req.get('Accept') || '*/*',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    
    // Forward status and headers
    res.status(response.status);
    response.headers.forEach((value, name) => {
      // Don't forward transfer-encoding or content-encoding that might conflict
      if (!['transfer-encoding', 'content-encoding'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    if (response.body) {
      // Stream response back to client
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[Proxy Error]', err.message);
    res.status(503).json({
      error: 'Backend service initializing or temporarily unreachable',
      detail: err.message,
      suggestion: 'Python FastAPI server is warming up with yt-dlp. Please retry in 3 seconds.',
    });
  }
});

// Serve standalone HTML at /standalone
app.get('/standalone', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'standalone.html'));
});

// Setup Vite in development or serve built files
async function setupFrontend() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OmniStream] Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend();
