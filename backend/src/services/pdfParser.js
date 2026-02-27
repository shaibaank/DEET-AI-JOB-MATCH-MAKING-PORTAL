const { PDFParse } = require('pdf-parse')

const extractTextFromPDF = async (fileBuffer) => {
  const parser = new PDFParse({ data: fileBuffer })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

module.exports = { extractTextFromPDF }