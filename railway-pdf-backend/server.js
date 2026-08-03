const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Eurocar PDF Generator v2' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'Se requiere el campo html' });
    }

    console.log(`Generando PDF... HTML length: ${html.length}`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['networkidle0', 'domcontentloaded'] });
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: options.format || 'Letter',
      printBackground: true,
      margin: options.margin || {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();
    browser = null;

    console.log(`PDF generado: ${pdfBuffer.length} bytes`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=contrato.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generando PDF:', err.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    res.status(500).json({ error: 'Error generando PDF: ' + err.message });
  }
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Eurocar PDF Generator v2 running on port ${PORT}`);
});
