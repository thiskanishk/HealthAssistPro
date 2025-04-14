
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const openAIService = require('../services/openAIService');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker('diagnosisQueue', async job => {
  const { promptData, userId } = job.data;
  return await openAIService.sendToGPT4(promptData, userId);
}, { connection });

worker.on('completed', job => {
  console.log(`✅ Diagnosis job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Diagnosis job ${job.id} failed: ${err.message}`);
});
