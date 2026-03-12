"""
Servicio para generar contratos en PDF usando Puppeteer (Node.js)
"""
import os
import json
import subprocess
import base64
from typing import Dict, Any
from datetime import datetime

class ContractGenerator:
    def __init__(self):
        self.node_script_path = os.path.join(os.path.dirname(__file__), 'generate_pdf.js')
    
    def generate_pdf(self, contract_data: Dict[str, Any], html_content: str) -> bytes:
        """
        Genera un PDF del contrato usando Node.js y Puppeteer
        
        Args:
            contract_data: Datos del contrato
            html_content: HTML renderizado del contrato
            
        Returns:
            bytes: PDF generado
        """
        try:
            # Preparar datos para Node.js
            input_data = {
                'html': html_content,
                'options': {
                    'format': 'Letter',
                    'printBackground': True,
                    'margin': {
                        'top': '1cm',
                        'right': '1cm',
                        'bottom': '1cm',
                        'left': '1cm'
                    }
                }
            }
            
            # Ejecutar script de Node.js
            result = subprocess.run(
                ['node', self.node_script_path],
                input=json.dumps(input_data),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise Exception(f"Error generando PDF: {result.stderr}")
            
            # Decodificar PDF de base64
            pdf_base64 = result.stdout.strip()
            pdf_bytes = base64.b64decode(pdf_base64)
            
            return pdf_bytes
            
        except subprocess.TimeoutExpired:
            raise Exception("Timeout generando PDF")
        except Exception as e:
            raise Exception(f"Error en generación de PDF: {str(e)}")
    
    def get_client_ip(self, request) -> str:
        """Obtiene la IP del cliente"""
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0]
        return request.remote_addr or 'Unknown'
