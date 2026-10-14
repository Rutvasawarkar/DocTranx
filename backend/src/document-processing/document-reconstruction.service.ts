import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import { StorageService } from '../storage/storage.service';
import { StructuredDocument } from './structured-document.service';

/**
 * Reconstructs documents from the structured JSON representation
 * into target output formats (PDF, DOCX, PPTX).
 */
@Injectable()
export class DocumentReconstructionService {
  private readonly logger = new Logger(
    DocumentReconstructionService.name,
  );

  constructor(private readonly storage: StorageService) {}

  /**
   * Reconstruct document into target export format.
   */
  async reconstruct(
    documentId: string,
    targetFormat: string,
    structuredDoc: StructuredDocument,
    options?: {
      resolution?: string;
      watermark?: boolean;
      password?: string;
    },
  ): Promise<{ outputFilePath: string; fidelityScore: number }> {
    this.logger.log(
      `Reconstructing document ${documentId} -> ${targetFormat}`,
    );

    let outputBuffer: Buffer;
    let fidelityScore: number;

    switch (targetFormat.toUpperCase()) {
      case 'PDF':
        outputBuffer = await this.reconstructPdf(structuredDoc, options);
        fidelityScore = 90;
        break;

      case 'DOCX':
        outputBuffer = await this.reconstructDocx(structuredDoc);
        fidelityScore = 95;
        break;

      case 'PPTX':
        outputBuffer = await this.reconstructPptx(structuredDoc);
        fidelityScore = 85;
        break;

      case 'TXT':
        outputBuffer = this.reconstructTxt(structuredDoc);
        fidelityScore = 70;
        break;

      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    // Save to local storage
    const outputFilePath = `exports/${documentId}/output.${targetFormat.toLowerCase()}`;
    const contentTypeMap: Record<string, string> = {
      PDF: 'application/pdf',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      TXT: 'text/plain',
    };

    await this.storage.uploadFile(
      outputFilePath,
      outputBuffer,
      contentTypeMap[targetFormat.toUpperCase()] || 'application/octet-stream',
    );

    this.logger.log(
      `Reconstruction complete: ${outputFilePath} (${outputBuffer.length} bytes)`,
    );

    return { outputFilePath, fidelityScore };
  }

  /**
   * Reconstruct as PDF using pdfkit.
   */
  private async reconstructPdf(
    doc: StructuredDocument,
    options?: { watermark?: boolean },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: doc.metadata?.title || 'Reconstructed Document',
          Author: doc.metadata?.creator || 'Document Platform',
        },
      });

      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      // Render sections
      for (const section of doc.sections) {
        switch (section.type) {
          case 'heading':
            pdf
              .fontSize(section.level === 1 ? 24 : section.level === 2 ? 18 : 14)
              .font('Helvetica-Bold')
              .text(section.content, { paragraphGap: 10 });
            pdf.moveDown(0.5);
            break;

          case 'paragraph':
            pdf
              .fontSize(11)
              .font('Helvetica')
              .text(section.content, {
                paragraphGap: 8,
                lineGap: 4,
                align: 'left',
              });
            pdf.moveDown(0.3);
            break;

          case 'list':
            pdf
              .fontSize(11)
              .font('Helvetica')
              .text(`• ${section.content}`, {
                indent: 20,
                paragraphGap: 4,
              });
            break;

          case 'slide':
            // Add page break between slides (except first)
            if (section.slideNumber && section.slideNumber > 1) {
              pdf.addPage();
            }
            pdf
              .fontSize(16)
              .font('Helvetica-Bold')
              .text(`Slide ${section.slideNumber}`, { paragraphGap: 10 });
            pdf
              .fontSize(11)
              .font('Helvetica')
              .text(section.content, { paragraphGap: 8 });
            break;

          default:
            pdf
              .fontSize(11)
              .font('Helvetica')
              .text(section.content);
        }
      }

      // Render tables
      for (const table of doc.tables) {
        pdf.moveDown(1);
        pdf.fontSize(10).font('Helvetica');

        // Headers
        if (table.headers.length > 0) {
          pdf.font('Helvetica-Bold');
          pdf.text(table.headers.join('  |  '), { paragraphGap: 4 });
          pdf.text('─'.repeat(60));
          pdf.font('Helvetica');
        }

        // Rows
        for (const row of table.rows) {
          pdf.text(row.join('  |  '), { paragraphGap: 2 });
        }
        pdf.moveDown(0.5);
      }

      // Watermark
      if (options?.watermark) {
        const pages = pdf.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          pdf.switchToPage(i);
          pdf.save();
          pdf
            .fontSize(60)
            .fillColor('gray', 0.15)
            .text('DRAFT', 150, 300);
          pdf.restore();
        }
      }

      pdf.end();
    });
  }

  /**
   * Reconstruct as DOCX using the docx npm package.
   */
  private async reconstructDocx(
    doc: StructuredDocument,
  ): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [];

    // Render sections
    for (const section of doc.sections) {
      switch (section.type) {
        case 'heading': {
          const levelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
            4: HeadingLevel.HEADING_4,
            5: HeadingLevel.HEADING_5,
            6: HeadingLevel.HEADING_6,
          };

          children.push(
            new Paragraph({
              children: [new TextRun({ text: section.content, bold: true })],
              heading: levelMap[section.level || 1] || HeadingLevel.HEADING_1,
            }),
          );
          break;
        }

        case 'paragraph':
          children.push(
            new Paragraph({
              children: [new TextRun(section.content)],
              spacing: { after: 200 },
            }),
          );
          break;

        case 'list':
          children.push(
            new Paragraph({
              children: [new TextRun(section.content)],
              bullet: { level: 0 },
            }),
          );
          break;

        case 'slide':
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Slide ${section.slideNumber}: `,
                  bold: true,
                }),
                new TextRun(section.content),
              ],
              spacing: { after: 400 },
            }),
          );
          break;

        default:
          children.push(
            new Paragraph({
              children: [new TextRun(section.content)],
            }),
          );
      }
    }

    // Render tables
    for (const table of doc.tables) {
      const allRows = [table.headers, ...table.rows];

      const tableRows = allRows.map(
        (rowData, rowIdx) =>
          new TableRow({
            children: rowData.map(
              (cellText) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          bold: rowIdx === 0,
                        }),
                      ],
                    }),
                  ],
                  width: { size: 100 / rowData.length, type: WidthType.PERCENTAGE },
                }),
            ),
          }),
      );

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    const docxDoc = new DocxDocument({
      sections: [{ children }],
      creator: doc.metadata?.creator || 'Document Platform',
      title: doc.metadata?.title || 'Reconstructed Document',
    });

    const buffer = await Packer.toBuffer(docxDoc);
    return Buffer.from(buffer);
  }

  /**
   * Reconstruct as PPTX using PptxGenJS.
   */
  private async reconstructPptx(
    doc: StructuredDocument,
  ): Promise<Buffer> {
    const pptx = new PptxGenJS();

    pptx.author = doc.metadata?.creator || 'Document Platform';
    pptx.title = doc.metadata?.title || 'Reconstructed Presentation';

    // If we have slide sections, create one slide per section
    const slideSections = doc.sections.filter((s) => s.type === 'slide');

    if (slideSections.length > 0) {
      for (const section of slideSections) {
        const slide = pptx.addSlide();
        slide.addText(section.content, {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: '80%',
          fontSize: 14,
          valign: 'top',
        });
      }
    } else {
      // Create a single slide with all content
      const slide = pptx.addSlide();
      const allText = doc.sections.map((s) => s.content).join('\n\n');
      slide.addText(allText, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: '80%',
        fontSize: 12,
        valign: 'top',
      });
    }

    const arrayBuffer = await pptx.write({ outputType: 'nodebuffer' });
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  /**
   * Reconstruct as plain text.
   */
  private reconstructTxt(doc: StructuredDocument): Buffer {
    const lines: string[] = [];

    for (const section of doc.sections) {
      if (section.type === 'heading') {
        lines.push('');
        lines.push(section.content.toUpperCase());
        lines.push('='.repeat(section.content.length));
      } else {
        lines.push(section.content);
      }
      lines.push('');
    }

    // Add tables
    for (const table of doc.tables) {
      lines.push('');
      if (table.headers.length > 0) {
        lines.push(table.headers.join('\t'));
        lines.push('-'.repeat(60));
      }
      for (const row of table.rows) {
        lines.push(row.join('\t'));
      }
      lines.push('');
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }
}
