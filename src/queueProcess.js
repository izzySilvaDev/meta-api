require('dotenv').config();
const { uploadQueue , updateUserQueue, uploadImageToApiQueue, sendEmailQueue  } = require('./lib/Queue');

const ImageUploadJob = require('./jobs/ImageUploadJob');
const updateUserJob = require('./jobs/updateUserJob');
const uploadImageToApiJob = require('./jobs/uploadImageToApiJob');
const sendEmailJob = require('./jobs/sendEmailJob');

uploadQueue.process(ImageUploadJob.handle);
updateUserQueue.process(updateUserJob.handle);
uploadImageToApiQueue.process(uploadImageToApiJob.handle);
sendEmailQueue.process(sendEmailJob.handle);

