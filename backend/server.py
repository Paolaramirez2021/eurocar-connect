"""
FastAPI Backend para Eurocar Rental - Contratos
"""
import os
import asyncio
import logging
import subprocess
import json
import base64
from typing import List, Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
import resend
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurar Resend
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend API configurado")
else:
    logger.warning("RESEND_API_KEY no configurado")

# Crear app FastAPI
app = FastAPI(title="Eurocar Rental Contracts API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class ContractEmailRequest(BaseModel):
    to: List[EmailStr]
    contract_pdf_url: str
    contract_data: dict

class GeneratePDFRequest(BaseModel):
    html: str
    options: Optional[dict] = None

# Router para rutas API (con y sin prefijo /api)
api_router = APIRouter()

# Rutas
@app.get("/")
async def root():
    return {
        "message": "Eurocar Rental Contracts API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "resend_configured": bool(RESEND_API_KEY)
    }

@app.post("/generate-pdf")
async def generate_pdf(request: GeneratePDFRequest):
    """
    Genera un PDF a partir de HTML usando Puppeteer
    Retorna el PDF en base64
    """
    try:
        logger.info("Generando PDF desde HTML...")
        
        # Preparar input para el script de Node
        input_data = json.dumps({
            "html": request.html,
            "options": request.options or {
                "format": "Letter",
                "printBackground": True,
                "margin": {
                    "top": "1cm",
                    "right": "1cm",
                    "bottom": "1cm",
                    "left": "1cm"
                }
            }
        })
        
        # Ejecutar script de Puppeteer
        script_path = os.path.join(os.path.dirname(__file__), "generate_pdf.cjs")
        
        process = await asyncio.to_thread(
            subprocess.run,
            ["node", script_path],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.dirname(__file__)
        )
        
        if process.returncode != 0:
            logger.error(f"Error en Puppeteer: {process.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Error generando PDF: {process.stderr}"
            )
        
        pdf_base64 = process.stdout.strip()
        
        logger.info("PDF generado exitosamente")
        
        return {
            "status": "success",
            "pdf_base64": pdf_base64
        }
        
    except subprocess.TimeoutExpired:
        logger.error("Timeout generando PDF")
        raise HTTPException(
            status_code=500,
            detail="Timeout generando PDF. El documento es muy grande o hay un error."
        )
    except Exception as e:
        logger.error(f"Error generando PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generando PDF: {str(e)}"
        )

@app.post("/generate-pdf-download")
async def generate_pdf_download(request: GeneratePDFRequest):
    """
    Genera un PDF y lo retorna directamente como archivo descargable
    """
    try:
        result = await generate_pdf(request)
        pdf_bytes = base64.b64decode(result["pdf_base64"])
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=contrato.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando PDF: {str(e)}"
        )

@app.post("/send-contract-email")
async def send_contract_email(request: ContractEmailRequest):
    """
    Envía el contrato por email a múltiples destinatarios
    """
    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Servicio de email no configurado. Por favor contacte al administrador."
        )
    
    try:
        logger.info(f"Enviando contrato a: {request.to}")
        
        # Preparar contenido HTML del email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: white;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                }}
                .footer {{
                    background: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-radius: 0 0 10px 10px;
                }}
                .button {{
                    display: inline-block;
                    background: #1e40af;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .info-box {{
                    background: #f0f9ff;
                    border-left: 4px solid #1e40af;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .contract-details {{
                    background: #f9fafb;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0;">EUROCAR RENTAL</h1>
                <p style="margin: 10px 0 0 0;">Contrato de Arrendamiento de Vehículo</p>
            </div>
            
            <div class="content">
                <h2>Estimado/a {request.contract_data.get('cliente_nombre', 'Cliente')},</h2>
                
                <p>Gracias por confiar en EUROCAR RENTAL para su alquiler de vehículo.</p>
                
                <p>Adjunto encontrará su contrato de arrendamiento firmado digitalmente. Por favor, guarde este documento para sus registros.</p>
                
                <div class="contract-details">
                    <h3 style="margin-top: 0;">Detalles del Contrato:</h3>
                    <p><strong>Vehículo:</strong> {request.contract_data.get('vehiculo_marca', '')} - {request.contract_data.get('vehiculo_placa', '')}</p>
                    <p><strong>Fecha Inicio:</strong> {request.contract_data.get('fecha_inicio', '')}</p>
                    <p><strong>Fecha Fin:</strong> {request.contract_data.get('fecha_fin', '')}</p>
                    <p><strong>Días Totales:</strong> {request.contract_data.get('dias_totales', 0)} días</p>
                    <p><strong>Valor Total:</strong> ${request.contract_data.get('valor_total', 0):,.0f} COP</p>
                </div>
                
                <div class="info-box">
                    <strong>📄 Nota Importante:</strong> Este contrato fue firmado digitalmente el {request.contract_data.get('fecha_firma', '')} y tiene la misma validez legal que un contrato físico.
                </div>
                
                <p style="text-align: center;">
                    <a href="{request.contract_pdf_url}" class="button" target="_blank">
                        Descargar Contrato PDF
                    </a>
                </p>
                
                <p><strong>Información de Contacto:</strong></p>
                <ul>
                    <li>📞 Teléfono: 3208341163 - 3132094156</li>
                    <li>📧 Email: jennygomez@eurocarental.com</li>
                    <li>📍 Dirección: AV CALLE 26 69C-03 LOCAL 105, Bogotá</li>
                </ul>
                
                <p>Si tiene alguna pregunta sobre su contrato o reserva, no dude en contactarnos.</p>
                
                <p>¡Que disfrute su viaje!</p>
                
                <p style="margin-top: 30px;">
                    Cordialmente,<br>
                    <strong>Equipo EUROCAR RENTAL</strong>
                </p>
            </div>
            
            <div class="footer">
                <p>EUROCAR RENTAL SAS - NIT: 900269555</p>
                <p>AV CALLE 26 69C-03 LOCAL 105, Bogotá, Colombia</p>
                <p>Este es un correo automático, por favor no responda a este mensaje.</p>
            </div>
        </body>
        </html>
        """
        
        # Parámetros del email
        params = {
            "from": f"EUROCAR RENTAL <{SENDER_EMAIL}>",
            "to": request.to,
            "subject": f"Contrato de Arrendamiento - {request.contract_data.get('vehiculo_placa', '')}",
            "html": html_content,
            "reply_to": "jennygomez@eurocarental.com"
        }
        
        # Enviar email de forma asíncrona
        response = await asyncio.to_thread(resend.Emails.send, params)
        
        logger.info(f"Email enviado exitosamente. ID: {response.get('id')}")
        
        return {
            "status": "success",
            "message": f"Contrato enviado a {len(request.to)} destinatario(s)",
            "email_id": response.get("id"),
            "recipients": request.to
        }
        
    except Exception as e:
        logger.error(f"Error enviando email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar email: {str(e)}"
        )

# Duplicar rutas con prefijo /api para compatibilidad con Kubernetes ingress
@app.post("/api/generate-pdf")
async def api_generate_pdf(request: GeneratePDFRequest):
    return await generate_pdf(request)

@app.post("/api/generate-pdf-download")
async def api_generate_pdf_download(request: GeneratePDFRequest):
    return await generate_pdf_download(request)

@app.post("/api/send-contract-email")
async def api_send_contract_email(request: ContractEmailRequest):
    return await send_contract_email(request)

@app.get("/api/health")
async def api_health_check():
    return await health_check()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
