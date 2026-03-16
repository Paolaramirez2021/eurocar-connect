/**
 * Script Node.js para generar PDFs con Puppeteer
 * Lee HTML desde stdin y retorna PDF en base64 a stdout
 */
const puppeteer = require('puppeteer');

async function generatePDF() {
  let browser;
  try {
    // Leer input desde stdin
    const input = await readStdin();
    const data = JSON.parse(input);
    const { html, options } = data;

    // Lanzar navegador
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar contenido HTML con timeout más corto
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Generar PDF
    const pdf = await page.pdf({
      format: options.format || 'Letter',
      printBackground: options.printBackground !== false,
      margin: options.margin || {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    // Convertir a base64 y enviar a stdout
    const base64 = pdf.toString('base64');
    console.log(base64);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

generatePDF();
