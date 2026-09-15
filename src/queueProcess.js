require('dotenv').config();
require('./lib/http');

const {
  uploadQueue,
  updateUserQueue,
  uploadImageToApiQueue,
  sendEmailQueue,
  sendProposalToAnaliseQueue,
  sendProposalMailQueue,
  registerQueueListeners,
  closeQueues,
} = require('./lib/Queue');

const ImageUploadJob = require('./jobs/ImageUploadJob');
const updateUserJob = require('./jobs/updateUserJob');
const uploadImageToApiJob = require('./jobs/uploadImageToApiJob');
const sendEmailJob = require('./jobs/sendEmailJob');
const sendProposalToAnaliseJob = require('./jobs/SendProposalToAnaliseJob');
const sendMailProposalJob = require('./jobs/sendProposalMail');

registerQueueListeners();

uploadQueue.process(ImageUploadJob.handle);
updateUserQueue.process(updateUserJob.handle);
uploadImageToApiQueue.process(uploadImageToApiJob.handle);
sendEmailQueue.process(sendEmailJob.handle);
sendProposalToAnaliseQueue.process(sendProposalToAnaliseJob.handle);
sendProposalMailQueue.process(sendMailProposalJob.handle);

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} recebido, encerrando worker de filas...`);

  await closeQueues();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
