import LRU from 'lru-cache';

const rateLimit = new LRU({
  max: 500,
  maxAge: 1000
});

export async function applyRateLimit(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const tokenCount = rateLimit.get(ip) || 0;

  if (tokenCount > 10) {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.'
    });
    return false;
  }

  rateLimit.set(ip, tokenCount + 1);
  return true;
} 