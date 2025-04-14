
const diagnosisQueue = require('../queues/diagnosisQueue');
const { Job } = require('bullmq');
const jwt = require('jsonwebtoken');

exports.submitDiagnosisAsync = async (req, res) => {
  const userId = req.user._id;
  const promptData = `Symptoms: ${req.body.symptoms.join(', ')}`;
  const job = await diagnosisQueue.add('gpt-diagnosis', { promptData, userId });
  res.status(202).json({ jobId: job.id });
};

exports.getDiagnosisStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.fromId(diagnosisQueue, jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  const state = await job.getState();
  const result = await job.returnvalue;

  res.json({ state, result });
};
