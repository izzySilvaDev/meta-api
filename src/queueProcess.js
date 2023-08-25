require('dotenv').config();
const { uploadQueue , updateUserQueue, uploadImageToApiQueue, sendEmailQueue, sendProposalToAnaliseQueue  } = require('./lib/Queue');

const ImageUploadJob = require('./jobs/ImageUploadJob');
const updateUserJob = require('./jobs/updateUserJob');
const uploadImageToApiJob = require('./jobs/uploadImageToApiJob');
const sendEmailJob = require('./jobs/sendEmailJob');
const sendProposalToAnaliseJob = require('./jobs/SendProposalToAnaliseJob');

uploadQueue.process(ImageUploadJob.handle);
updateUserQueue.process(updateUserJob.handle);
uploadImageToApiQueue.process(uploadImageToApiJob.handle);
sendEmailQueue.process(sendEmailJob.handle);
sendProposalToAnaliseQueue.process(sendProposalToAnaliseJob.handle);

