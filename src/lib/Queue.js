require('dotenv').config();
const Queue = require('bull');
const fs = require('fs');

const ImageUploadJob = require('../jobs/ImageUploadJob');
const updateUserJob = require('../jobs/updateUserJob');
const uploadImageToApiJob = require('../jobs/uploadImageToApiJob');
const sendEmailJob = require('../jobs/sendEmailJob');
const sendProposalToAnaliseJob = require('../jobs/SendProposalToAnaliseJob');

const sendProposalMailJob = require('../jobs/sendProposalMail');

const redisConfig = {
    redis: {
        port: process.env.REDIS_PORT, 
        host: process.env.REDIS_HOST,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD
    }
}

const uploadQueue = new Queue(ImageUploadJob.key, redisConfig);

const updateUserQueue = new Queue(updateUserJob.key, redisConfig);

const uploadImageToApiQueue = new Queue(uploadImageToApiJob.key, redisConfig);

const sendEmailQueue = new Queue(sendEmailJob.key, redisConfig);

const sendProposalToAnaliseQueue = new Queue(sendProposalToAnaliseJob.key, redisConfig);

const sendProposalMailQueue = new Queue(sendProposalMailJob.key, redisConfig);

// Define o limite de listeners para evitar memory leak
// Por padrão, Node.js avisa quando há mais de 10 listeners no mesmo evento
const queuesArray = [
    uploadQueue, 
    updateUserQueue, 
    uploadImageToApiQueue, 
    sendEmailQueue, 
    sendProposalToAnaliseQueue, 
    sendProposalMailQueue
];

queuesArray.forEach(queue => {
    queue.setMaxListeners(0); // 0 = sem limite de avisos
});

// Flag para evitar registrar listeners múltiplas vezes
let listenersRegistered = false;

function registerQueueListeners() {
    // Verifica se os listeners já foram registrados
    if (listenersRegistered) {
        console.log('Queue listeners já foram registrados, pulando registração duplicada');
        return;
    }

    uploadQueue.on('completed', (job) => {
        job.data.fileInfo.files.forEach(file => {
            fs.unlink(file.path, (error) => {
                if (error) { 
                    console.error(error);
                    return;
                }            
              });
        });
        console.log('upload completed');
        
    })

    uploadQueue.on('failed', (job) => {
        console.log('job failed', job.data);
    })

    updateUserQueue.on('completed', (job) => {    
        console.log('user update complete');
        const images = job.data.images;
        if(images) {
            images.forEach((img) => {
                const userData = { id: job.data.id, image: img };
                uploadImageToApiQueue.add(userData, { attempts: 3, backoff: (1000 * 20) });
            });
        }
    })

    updateUserQueue.on('failed', (job, error) => {
        console.log('job failed', job.data);
    })

    uploadImageToApiQueue.on('completed', (job) => {
        console.log('upload to api completed!');
    })

    uploadImageToApiQueue.on('failed', (job, error) => {
        console.log(error);
        console.log('upload to api failed!');
    })

    sendEmailQueue.on('completed', (job) => {
        console.log('email job completed', job.data);

        if(job.data.files) {
            job.data.files.forEach(file => {
                fs.unlink(file.path, (error) => {
                    if (error) { 
                        console.error(error);
                        return;
                    }            
                });
            });
        }    
    })

    sendEmailQueue.on('failed', (job, error) => {
        console.log('email job failed', error, job.data);
    })

    sendEmailQueue.on("error", function(error) {
        console.log("Error in email queue: " + error);
    });

    sendProposalToAnaliseQueue.on('completed', (job) => {
        console.log('send Proposal To Analise job completed', job.data?.id);
    })

    sendProposalToAnaliseQueue.on('failed', (job, error) => {
        console.log(error.message);
        console.log('send Proposal To Analise job failed!', job.data?.id);
    })

    sendProposalMailQueue.on('completed', (job) => {
        console.log('send Email Proposal job completed', job.data.id);
    })

    sendProposalMailQueue.on('failed', (job, error) => {
        console.log(error.message);
        console.log('send Proposal Email job failed!', job.data?.id);
    })

    listenersRegistered = true;
    console.log('Queue listeners registrados com sucesso');
}

module.exports = { 
    uploadQueue, 
    updateUserQueue, 
    uploadImageToApiQueue, 
    sendEmailQueue, 
    sendProposalToAnaliseQueue, 
    sendProposalMailQueue,
    registerQueueListeners
};