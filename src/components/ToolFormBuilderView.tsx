import React, { useState } from 'react';
import { FormInput, ArrowLeft, ArrowRight, Plus, Trash2, CheckSquare, Calendar, Type } from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { FormFieldDefinition, FormBuilderOptions } from '../utils/pdfInteractiveForm';

interface ToolFormBuilderViewProps {
  file: UploadedFile;
  lang: Language;
  onExecute: (options: FormBuilderOptions) => void;
  onBack: () => void;
}

export const ToolFormBuilderView: React.FC<ToolFormBuilderViewProps> = ({
  file,
  lang,
  onExecute,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const [autoDetect, setAutoDetect] = useState<boolean>(true);
  const [fields, setFields] = useState<FormFieldDefinition[]>([
    {
      id: 'field-1',
      name: 'full_name',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 650,
      width: 470,
      height: 24,
      placeholder: isAr ? 'الاسم الكامل' : 'Full Name',
    },
    {
      id: 'field-2',
      name: 'email_address',
      type: 'text',
      pageNumber: 1,
      x: 60,
      y: 590,
      width: 300,
      height: 24,
      placeholder: isAr ? 'البريد الإلكتروني' : 'Email Address',
    },
    {
      id: 'field-3',
      name: 'submission_date',
      type: 'date',
      pageNumber: 1,
      x: 380,
      y: 590,
      width: 150,
      height: 24,
      defaultValue: new Date().toISOString().split('T')[0],
    },
    {
      id: 'field-4',
      name: 'agreement_check',
      type: 'checkbox',
      pageNumber: 1,
      x: 60,
      y: 530,
      width: 18,
      height: 18,
    },
  ]);

  const addField = (type: 'text' | 'checkbox' | 'date') => {
    const newId = `field-${Date.now()}`;
    const newField: FormFieldDefinition = {
      id: newId,
      name: `field_${fields.length + 1}`,
      type,
      pageNumber: 1,
      x: 60,
      y: Math.max(100, 500 - fields.length * 40),
      width: type === 'checkbox' ? 18 : 250,
      height: type === 'checkbox' ? 18 : 24,
      placeholder: type === 'text' ? (isAr ? 'حقل جديد' : 'New text field') : undefined,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormFieldDefinition>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute({
      fields,
      autoDetectLines: autoDetect,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-neutral-500 truncate max-w-xs">
          {file.name}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <FormInput className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'تحويل النموذج الثابت إلى نموذج تفاعلي (Interactive AcroForm)' : 'Convert Static PDF into Fillable Interactive Form'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تحويل الأسطر ومربعات المستند تلقائياً إلى حقول إدخال نصية وخانات اختيار وتوقيع قابلة للملء في أي متصفح'
                : 'Inject real AcroForm text fields and checkboxes into your PDF so users can fill them out electronically'}
            </p>
          </div>
        </div>

        {/* Auto Detect Toggle */}
        <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">
              {isAr ? 'التعرف الذكي التلقائي على أماكن الحقول' : 'Smart Auto-Detection of Form Lines'}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مطابقة المسافات والخطوط الفارغة ووضع حقول الإدخال عليها تلقائياً' : 'Detect empty underline blanks and place input fields automatically'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => setAutoDetect(e.target.checked)}
            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
          />
        </div>

        {/* Fields List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {isAr ? `الحقول التفاعلية الجاهزة للحقن (${fields.length})` : `Interactive Fields to Inject (${fields.length})`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addField('text')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <Type className="w-3 h-3" />
                <span>{isAr ? 'حقل نصي' : 'Text'}</span>
              </button>
              <button
                type="button"
                onClick={() => addField('checkbox')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <CheckSquare className="w-3 h-3" />
                <span>{isAr ? 'مربع اختيار' : 'Checkbox'}</span>
              </button>
              <button
                type="button"
                onClick={() => addField('date')}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <Calendar className="w-3 h-3" />
                <span>{isAr ? 'حقل تاريخ' : 'Date'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {fields.map((f) => (
              <div
                key={f.id}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="p-1.5 rounded-lg bg-white dark:bg-neutral-700 text-neutral-500 shadow-2xs">
                    {f.type === 'text' ? <Type className="w-3.5 h-3.5 text-sky-500" /> : f.type === 'checkbox' ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> : <Calendar className="w-3.5 h-3.5 text-indigo-500" />}
                  </span>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => updateField(f.id, { name: e.target.value })}
                    className="text-xs font-mono font-semibold px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 w-36"
                    placeholder="field_name"
                  />
                  {f.type !== 'checkbox' && (
                    <input
                      type="text"
                      value={f.placeholder || ''}
                      onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
                      className="text-xs px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 flex-1 min-w-0"
                      placeholder={isAr ? 'نص تلميحي مؤقت' : 'Placeholder'}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    صـ {f.pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FormInput className="w-4 h-4" />
          <span>{isAr ? 'توليد وحفظ النموذج التفاعلي (Fillable PDF)' : 'Generate Fillable AcroForm PDF'}</span>
        </button>
      </div>
    </div>
  );
};
