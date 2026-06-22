import sys
import os

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

def create_pdf(filepath):
    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            rightMargin=50, leftMargin=50,
                            topMargin=50, bottomMargin=50)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY, fontSize=11, leading=14))
    styles.add(ParagraphStyle(name='CenterHeading', alignment=TA_CENTER, fontSize=16, spaceAfter=20, fontName="Helvetica-Bold"))
    
    Story = []

    # Title
    Story.append(Paragraph("<b>Requisitos para Cita de Inicio y Expediente</b>", styles['CenterHeading']))
    Story.append(Spacer(1, 12))

    # Intro text
    intro_text = """
    Señor/señora, para poder avanzar con su expediente, los documentos deben enviarse <b>únicamente escaneados por escáner</b>. 
    <b>No se aceptan fotografías tomadas con celular.</b> 
    Si un documento llega como foto, borroso, recortado o incompleto, el sistema lo rechazará y se le indicará exactamente qué debe corregir.
    """
    Story.append(Paragraph(intro_text, styles['Justify']))
    Story.append(Spacer(1, 24))

    Story.append(Paragraph("<b>7.1 Documentos auditados en esta etapa</b>", styles['Heading2']))
    Story.append(Spacer(1, 12))

    # Table data
    data = [
        ["Documento", "Criterio de aceptación"],
        ["INE", "Ambos lados, escaneada, legible, completa, sin recortes y sin reflejos.\n*CRITICO IMPORTANTE*"],
        ["Comprobante de domicilio / CFE", "Antigüedad máxima de 3 meses, completo, escaneado y legible.\n*IMPORTANTE*"],
        ["Resolución de pensión IMSS", "Completa, escaneada, legible, sin páginas faltantes ni márgenes cortados.\n*NO IMPORTANTE*"],
        ["Estados de cuenta", "Últimos 2 meses, consecutivos, escaneados, completos y legibles.\n*CRITICO IMPORTANTE*"],
        ["Resumen de movimientos", "Rango de 60 días, movimientos completos, documento escaneado y legible.\n*CRITICO IMPORTANTE*"]
    ]

    # Convert text to paragraphs so it wraps properly in the table
    formatted_data = []
    for row in data:
        formatted_row = []
        for item in row:
            formatted_row.append(Paragraph(item, styles['Normal']))
        formatted_data.append(formatted_row)

    # Table style
    t = Table(formatted_data, colWidths=[150, 350])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))

    Story.append(t)
    doc.build(Story)

if __name__ == "__main__":
    create_pdf("Requisitos_Documentales.pdf")
    print("PDF generated successfully.")
