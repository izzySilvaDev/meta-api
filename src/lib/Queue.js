require('dotenv').config();
const Queue = require('bull');
const fs = require('fs');

const ImageUploadJob = require('../jobs/ImageUploadJob');
const updateUserJob = require('../jobs/updateUserJob');
const uploadImageToApiJob = require('../jobs/uploadImageToApiJob');
const sendEmailJob = require('../jobs/sendEmailJob');
const sendProposalToAnaliseJob = require('../jobs/SendProposalToAnaliseJob');
const sendProposalMailJob = require('../jobs/sendProposalMail');
const { createIoredisClient } = require('./redis');

// Cada fila adiciona listeners 'error' no Commander compartilhado (ioredis).
const sharedClient = createIoredisClient('Bull Redis client', { maxListeners: 32 });
const sharedSubscriber = createIoredisClient('Bull Redis subscriber', { maxListeners: 32 });
const blockingClients = [];

const queueOptions = {
  createClient(type) {
    switch (type) {
      case 'client':
        return sharedClient;
      case 'subscriber':
        return sharedSubscriber;
      case 'bclient': {
        const conn = createIoredisClient('Bull Redis bclient');
        blockingClients.push(conn);
        return conn;
      }
      default:
        throw new Error(`Tipo de conexão Redis inesperado: ${type}`);
    }
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 20000,
    },
  },
};

const uploadQueue = new Queue(ImageUploadJob.key, queueOptions);
const updateUserQueue = new Queue(updateUserJob.key, queueOptions);
const uploadImageToApiQueue = new Queue(uploadImageToApiJob.key, queueOptions);
const sendEmailQueue = new Queue(sendEmailJob.key, queueOptions);
const sendProposalToAnaliseQueue = new Queue(sendProposalToAnaliseJob.key, queueOptions);
const sendProposalMailQueue = new Queue(sendProposalMailJob.key, queueOptions);

const queuesArray = [
  uploadQueue,
  updateUserQueue,
  uploadImageToApiQueue,
  sendEmailQueue,
  sendProposalToAnaliseQueue,
  sendProposalMailQueue,
];

queuesArray.forEach((queue) => {
  queue.on('error', (err) => {
    console.error(`[${queue.name}] Redis/Bull:`, err.message);
  });
});

function unlinkJobFiles(files = []) {
  files.forEach((file) => {
    if (!file?.path) return;
    fs.unlink(file.path, (error) => {
      if (error && error.code !== 'ENOENT') {
        console.error('Falha ao remover arquivo temporário:', error.message);
      }
    });
  });
}

let listenersRegistered = false;

function registerQueueListeners() {
  if (listenersRegistered) {
    console.log('Queue listeners já foram registrados, pulando registração duplicada');
    return;
  }

  uploadQueue.on('completed', (job) => {
    unlinkJobFiles(job.data?.fileInfo?.files);
    console.log('upload completed');
  });

  uploadQueue.on('failed', (job, error) => {
    unlinkJobFiles(job?.data?.fileInfo?.files);
    console.error('upload job failed', job?.id, error?.message);
  });

  updateUserQueue.on('completed', (job) => {
    console.log('user update complete');
    const images = job.data.images;
    if (images) {
      images.forEach((img) => {
        const userData = { id: job.data.id, image: img };
        uploadImageToApiQueue.add(userData, { attempts: 3, backoff: 1000 * 20 });
      });
    }
  });

  updateUserQueue.on('failed', (job, error) => {
    console.error('update user job failed', job?.id, error?.message);
  });

  uploadImageToApiQueue.on('completed', () => {
    console.log('upload to api completed!');
  });

  uploadImageToApiQueue.on('failed', (job, error) => {
    console.error('upload to api failed', job?.id, error?.message);
  });

  sendEmailQueue.on('completed', (job) => {
    console.log('email job completed', job?.id);
    unlinkJobFiles(job.data?.files);
  });

  sendEmailQueue.on('failed', (job, error) => {
    unlinkJobFiles(job?.data?.files);
    console.error('email job failed', job?.id, error?.message);
  });

  sendProposalToAnaliseQueue.on('completed', (job) => {
    console.log('send Proposal To Analise job completed', job.data?.id);
  });

  sendProposalToAnaliseQueue.on('failed', (job, error) => {
    console.error('send Proposal To Analise job failed', job.data?.id, error?.message);
  });

  sendProposalMailQueue.on('completed', (job) => {
    console.log('send Email Proposal job completed', job.data?.id);
  });

  sendProposalMailQueue.on('failed', (job, error) => {
    console.error('send Proposal Email job failed', job.data?.id, error?.message);
  });

  listenersRegistered = true;
  console.log('Queue listeners registrados com sucesso');
}

async function closeQueues() {
  await Promise.allSettled(queuesArray.map((queue) => queue.close()));
  await Promise.allSettled(
    [sharedClient, sharedSubscriber, ...blockingClients].map((conn) => conn.quit())
  );
}

module.exports = {
  uploadQueue,
  updateUserQueue,
  uploadImageToApiQueue,
  sendEmailQueue,
  sendProposalToAnaliseQueue,
  sendProposalMailQueue,
  registerQueueListeners,
  closeQueues,
};
