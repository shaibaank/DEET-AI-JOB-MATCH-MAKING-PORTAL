const express = require("express")
const interviewRouter = express.Router()
const interviewController = require('../controllers/interview.controller')
const upload = require('../config/multer')

interviewRouter.post('/triggercall', upload.single('resume'), interviewController.triggerCall)
interviewRouter.post('/webhook', interviewController.handleWebhook)
interviewRouter.get('/status/:callId', interviewController.getCallStatus)
interviewRouter.get('/all', interviewController.getAllCalls)

module.exports = interviewRouter