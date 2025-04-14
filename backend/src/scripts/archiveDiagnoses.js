
const mongoose = require('mongoose');
const Diagnosis = require('../models/Diagnosis');

async function archiveOldDiagnoses() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const oldDiagnoses = await Diagnosis.find({ createdAt: { $lt: oneYearAgo } });
  if (oldDiagnoses.length === 0) {
    console.log('No diagnoses to archive');
    return;
  }

  const archivedCollection = mongoose.connection.collection('archived_diagnoses');
  const toInsert = oldDiagnoses.map(doc => doc.toObject());
  await archivedCollection.insertMany(toInsert);

  const ids = oldDiagnoses.map(doc => doc._id);
  await Diagnosis.deleteMany({ _id: { $in: ids } });

  console.log(`Archived ${ids.length} old diagnoses`);
}

archiveOldDiagnoses().then(() => {
  console.log('Archival job completed.');
  process.exit();
}).catch(err => {
  console.error('Archival job failed:', err);
  process.exit(1);
});
