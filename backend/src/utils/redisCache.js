
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

client.connect().catch(console.error);

async function getOrSetCache(key, fetchFunction) {
  const cached = await client.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const freshData = await fetchFunction();
  await client.set(key, JSON.stringify(freshData), { EX: 3600 }); // cache for 1 hour
  return freshData;
}

module.exports = { getOrSetCache };
