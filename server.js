const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'docs');
const DATA_FILE = path.join(ROOT, 'data', 'cartelera.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(text);
}

function getTodayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function notFound(res) {
  sendJson(res, 404, { ok: false, message: 'Recurso no encontrado' });
}

function getMovieById(data, movieId) {
  return data.movies.find((movie) => movie.id === movieId);
}

function getShowtimeById(data, showId) {
  for (const movie of data.movies) {
    const showtime = movie.showtimes.find((show) => show.id === showId);
    if (showtime) return { movie, showtime };
  }
  return null;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function safePathJoin(baseDir, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = path.join(baseDir, normalized);
  if (!resolved.startsWith(baseDir)) return null;
  return resolved;
}

async function handleApi(req, res, url) {
  const data = readData();

  if (req.method === 'GET' && url.pathname === '/api/cartelera') {
    return sendJson(res, 200, {
      ok: true,
      today: getTodayIso(),
      movies: data.movies,
      upcoming: data.upcoming || [],
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/proximamente') {
    return sendJson(res, 200, {
      ok: true,
      upcoming: data.upcoming || [],
    });
  }

  const movieMatch = url.pathname.match(/^\/api\/cartelera\/([^/]+)$/);
  if (req.method === 'GET' && movieMatch) {
    const movieId = decodeURIComponent(movieMatch[1]);
    const movie = getMovieById(data, movieId);
    if (!movie) return sendJson(res, 404, { ok: false, message: 'Película no encontrada' });
    return sendJson(res, 200, { ok: true, movie });
  }

  const showMatch = url.pathname.match(/^\/api\/funciones\/([^/]+)$/);
  if (req.method === 'GET' && showMatch) {
    const movieId = decodeURIComponent(showMatch[1]);
    const movie = getMovieById(data, movieId);
    if (!movie) return sendJson(res, 404, { ok: false, message: 'Película no encontrada' });

    const today = getTodayIso();
    const showtimes = movie.showtimes.filter((showtime) => showtime.date === today);
    return sendJson(res, 200, {
      ok: true,
      movieId: movie.id,
      title: movie.title,
      showtimes: showtimes.length ? showtimes : movie.showtimes,
    });
  }

  const seatingMatch = url.pathname.match(/^\/api\/asientos\/([^/]+)$/);
  if (req.method === 'GET' && seatingMatch) {
    const showId = decodeURIComponent(seatingMatch[1]);
    const found = getShowtimeById(data, showId);
    if (!found) return sendJson(res, 404, { ok: false, message: 'Función no encontrada' });
    const { movie, showtime } = found;
    return sendJson(res, 200, {
      ok: true,
      movie: {
        id: movie.id,
        title: movie.title,
        poster: movie.poster,
        duration: movie.duration,
        rating: movie.rating,
        genre: movie.genre,
      },
      showtime,
      seatRows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      seatCols: [1, 2, 3, 4, 5, 6, 7, 8],
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/checkout') {
    const raw = await collectBody(req);
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return sendJson(res, 400, { ok: false, message: 'JSON inválido' });
    }

    const errors = [];
    if (!payload.name || !payload.name.trim()) errors.push('El nombre es obligatorio');
    if (!payload.email || !payload.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      errors.push('El correo electrónico es inválido');
    }
    if (!payload.movieId || !payload.showId) errors.push('Falta película o función');
    if (!Array.isArray(payload.seats) || payload.seats.length === 0) errors.push('Debes seleccionar al menos un asiento');

    const found = payload.showId ? getShowtimeById(data, payload.showId) : null;
    if (!found) errors.push('La función seleccionada no existe');

    if (errors.length) {
      return sendJson(res, 400, { ok: false, message: 'No se pudo completar la compra', errors });
    }

    const ticketCode = `CP-${Date.now().toString(36).toUpperCase()}`;
    const purchase = {
      id: ticketCode,
      createdAt: new Date().toISOString(),
      movieId: payload.movieId,
      showId: payload.showId,
      seats: payload.seats,
      customer: {
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: (payload.phone || '').trim(),
      },
      total: Number(payload.total || 0),
    };

    data.purchases = Array.isArray(data.purchases) ? data.purchases : [];
    data.purchases.unshift(purchase);
    writeData(data);

    const { movie, showtime } = found;
    return sendJson(res, 200, {
      ok: true,
      ticketCode,
      purchase: {
        ...purchase,
        movieTitle: movie.title,
        poster: movie.poster,
        showtime,
      },
    });
  }

  return notFound(res);
}

function serveStatic(req, res, url) {
  let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = safePathJoin(PUBLIC_DIR, pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }

    if (serveStatic(req, res, url)) return;
    return notFound(res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, message: 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`CinePalace listo en http://localhost:${PORT}`);
});
