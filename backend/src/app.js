const express = require("express")
const app = express()

app.use(express.json())

const interviewRouter = require('./routes/interview.routes')
app.use('/interviews', interviewRouter)

module.exports = app