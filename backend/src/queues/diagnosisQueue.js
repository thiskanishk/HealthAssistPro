
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const diagnosisQueue = new Queue('diagnosisQueue', {
  connection
});

module.exports = diagnosisQueue;
