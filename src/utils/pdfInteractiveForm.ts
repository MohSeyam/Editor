import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface FormFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'date';
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  defaultValue?: string;
  placeholder?: string;
  isRequired?: boolean;
}

export interface FormBuilderOptions {
  fields: FormFieldDefinition[];
  autoDetectLines?: boolean;
}

/**
 * Creates or enhances a PDF with interactive fillable AcroForm fields
 */
export async function buildInteractiveForm(
  srcPdfBytes: Uint8Array,
  options: FormBuilderOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'تحليل بنية المستند وتهيئة محرك AcroForms التفاعلي...');

  const pdfDoc = await PDFDocument.load(srcPdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  onProgress?.(40, 'تضمين الحقول التفاعلية وخانات التعبئة...');

  const fieldsToAdd = [...options.fields];

  // If user requested auto-detection or no fields provided, auto-place standard fields on page 1
  if (fieldsToAdd.length === 0 && options.autoDetectLines) {
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Auto-detect & generate 4 smart interactive fields (Name, Date, Email, Agreement)
    fieldsToAdd.push(
      {
        id: 'fullName',
        name: 'full_name',
        type: 'text',
        pageNumber: 1,
        x: width * 0.1,
        y: height * 0.75,
        width: width * 0.8,
        height: 24,
        placeholder: 'الاسم الكامل / Full Name',
      },
      {
        id: 'userEmail',
        name: 'email',
        type: 'text',
        pageNumber: 1,
        x: width * 0.1,
        y: height * 0.65,
        width: width * 0.45,
        height: 24,
        placeholder: 'البريد الإلكتروني / Email Address',
      },
      {
        id: 'formDate',
        name: 'date',
        type: 'date',
        pageNumber: 1,
        x: width * 0.6,
        y: height * 0.65,
        width: width * 0.3,
        height: 24,
        defaultValue: new Date().toISOString().split('T')[0],
      },
      {
        id: 'agreementCheckbox',
        name: 'agree_terms',
        type: 'checkbox',
        pageNumber: 1,
        x: width * 0.1,
        y: height * 0.55,
        width: 18,
        height: 18,
      }
    );
  }

  // Iterate and create AcroForm fields
  for (let i = 0; i < fieldsToAdd.length; i++) {
    const def = fieldsToAdd[i];
    const pageIdx = Math.max(0, Math.min(pages.length - 1, def.pageNumber - 1));
    const targetPage = pages[pageIdx];

    onProgress?.(
      45 + Math.round(((i + 1) / fieldsToAdd.length) * 45),
      `إنشاء الحقل التفاعلي: ${def.name}...`
    );

    if (def.type === 'text' || def.type === 'date') {
      const textField = form.createTextField(def.name);
      if (def.defaultValue) {
        textField.setText(def.defaultValue);
      }
      textField.addToPage(targetPage, {
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        textColor: rgb(0.1, 0.1, 0.15),
        backgroundColor: rgb(0.97, 0.98, 1.0),
        borderColor: rgb(0.3, 0.5, 0.9),
        borderWidth: 1,
        font: helvetica,
      });
    } else if (def.type === 'checkbox') {
      const checkBox = form.createCheckBox(def.name);
      checkBox.addToPage(targetPage, {
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        textColor: rgb(0.1, 0.5, 0.9),
        backgroundColor: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.3, 0.5, 0.9),
        borderWidth: 1,
      });
    }
  }

  onProgress?.(92, 'حفظ النموذج التفاعلي وتفعيل دعم قارئات PDF القياسية...');
  const outPdfBytes = await pdfDoc.save();
  onProgress?.(100, 'تم إنشاء وتفعيل النموذج التفاعلي بنجاح!');

  return outPdfBytes;
}
