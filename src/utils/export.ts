import * as XLSX from 'xlsx';
import { DailyReport, ReportRow, ArchiveRecord, PeriodicOverallReport, ArchiveType } from '../types';
import { toPersianDigits, formatStandardReportTitle, compareReportsLatestFirst } from './shamsi';

export function exportSingleReportToExcel(report: DailyReport) {
  const data = report.rows.map((row) => ({
    'ردیف': row.rowNumber,
    'نام و نام خانوادگی کارفرما': row.clientName,
    'زمینه فعالیت / صنف': row.activityField,
    'تعداد پرسنل': row.personnelCount || '-',
    'شماره تماس': row.phone,
    'آدرس': row.address,
    'دغدغه اصلی کارفرما': row.employerConcern,
    'پیگیری ۱': row.followUp1 || '-',
    'تاریخ پیگیری ۱': row.followUp1DateShamsi || '-',
    'پیگیری ۲': row.followUp2 || '-',
    'تاریخ پیگیری ۲': row.followUp2DateShamsi || '-',
    'پیگیری ۳': row.followUp3 || '-',
    'تاریخ پیگیری ۳': row.followUp3DateShamsi || '-',
    'پیگیری ۴': row.followUp4 || '-',
    'تاریخ پیگیری ۴': row.followUp4DateShamsi || '-',
    'نتیجه نهایی پیگیری': row.followUpResult || '-',
    'موضوع جلسه': row.meetingTopic || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش عملکرد روزانه');

  const fileName = `گزارش_${report.consultantName.replace(/\s+/g, '_')}_${report.dateShamsi.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportAggregatedReportsToExcel(reports: DailyReport[], fileNameTitle?: string) {
  const rows: Array<Record<string, string | number>> = [];
  let rowIdx = 1;

  if (Array.isArray(reports) && reports.length > 0) {
    reports.forEach((rep) => {
      if (Array.isArray(rep.rows) && rep.rows.length > 0) {
        rep.rows.forEach((r) => {
          rows.push({
            'ردیف کل': rowIdx++,
            'نام مشاور': rep.consultantName || '-',
            'کد مشاور': rep.consultantCode || '-',
            'صنف گزارش': rep.guild || '-',
            'تاریخ ثبت گزارش': rep.dateShamsi || '-',
            'نام کارفرما / مجموعه': r.clientName || '-',
            'زمینه فعالیت': r.activityField || '-',
            'تعداد پرسنل': r.personnelCount || '-',
            'شماره تماس': r.phone || '-',
            'آدرس': r.address || '-',
            'دغدغه اصلی کارفرما': r.employerConcern || '-',
            'پیگیری ۱': r.followUp1 || '-',
            'تاریخ پیگیری ۱': r.followUp1DateShamsi || (r.followUp1 ? rep.dateShamsi : '-'),
            'پیگیری ۲': r.followUp2 || '-',
            'تاریخ پیگیری ۲': r.followUp2DateShamsi || (r.followUp2 ? rep.dateShamsi : '-'),
            'پیگیری ۳': r.followUp3 || '-',
            'تاریخ پیگیری ۳': r.followUp3DateShamsi || (r.followUp3 ? rep.dateShamsi : '-'),
            'پیگیری ۴': r.followUp4 || '-',
            'تاریخ پیگیری ۴': r.followUp4DateShamsi || (r.followUp4 ? rep.dateShamsi : '-'),
            'نتیجه پیگیری': r.followUpResult || '-',
            'موضوع جلسه': r.meetingTopic || '-',
            'نظر شخصی مشاور': rep.personalOpinion || '-'
          });
        });
      } else {
        rows.push({
          'ردیف کل': rowIdx++,
          'نام مشاور': rep.consultantName || '-',
          'کد مشاور': rep.consultantCode || '-',
          'صنف گزارش': rep.guild || '-',
          'تاریخ ثبت گزارش': rep.dateShamsi || '-',
          'نام کارفرما / مجموعه': 'بدون ردیف کارفرما',
          'زمینه فعالیت': '-',
          'تعداد پرسنل': '-',
          'شماره تماس': '-',
          'آدرس': '-',
          'دغدغه اصلی کارفرما': '-',
          'پیگیری ۱': '-',
          'تاریخ پیگیری ۱': '-',
          'پیگیری ۲': '-',
          'تاریخ پیگیری ۲': '-',
          'پیگیری ۳': '-',
          'تاریخ پیگیری ۳': '-',
          'پیگیری ۴': '-',
          'تاریخ پیگیری ۴': '-',
          'نتیجه پیگیری': '-',
          'موضوع جلسه': '-',
          'نظر شخصی مشاور': rep.personalOpinion || '-'
        });
      }
    });
  }

  // If there are no reports for this day (empty day requirement)
  if (rows.length === 0) {
    const dateMatch = fileNameTitle ? fileNameTitle.match(/\d{4}-\d{2}-\d{2}/) : null;
    const inferredDate = dateMatch ? dateMatch[0].replace(/-/g, '/') : '-';
    rows.push({
      'ردیف کل': '-',
      'نام مشاور': 'در این تاریخ هیچ گزارشی توسط مشاوران ثبت نشده است',
      'کد مشاور': '-',
      'صنف گزارش': '-',
      'تاریخ ثبت گزارش': inferredDate,
      'نام کارفرما / مجموعه': 'روز بدون ثبت گزارش (بایگانی مکانیزه ۲۳:۰۰)',
      'زمینه فعالیت': '-',
      'تعداد پرسنل': '-',
      'شماره تماس': '-',
      'آدرس': '-',
      'دغدغه اصلی کارفرما': '-',
      'پیگیری ۱': '-',
      'تاریخ پیگیری ۱': '-',
      'پیگیری ۲': '-',
      'تاریخ پیگیری ۲': '-',
      'پیگیری ۳': '-',
      'تاریخ پیگیری ۳': '-',
      'پیگیری ۴': '-',
      'تاریخ پیگیری ۴': '-',
      'نتیجه پیگیری': '-',
      'موضوع جلسه': '-',
      'نظر شخصی مشاور': 'سیستم بایگانی خودکار ۲۳:۰۰ کارینو'
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Generous column widths for crisp Excel display
  worksheet['!cols'] = [
    { wch: 8 },  // ردیف کل
    { wch: 18 }, // نام مشاور
    { wch: 12 }, // کد مشاور
    { wch: 14 }, // صنف گزارش
    { wch: 14 }, // تاریخ ثبت گزارش
    { wch: 22 }, // نام کارفرما / مجموعه
    { wch: 18 }, // زمینه فعالیت
    { wch: 12 }, // تعداد پرسنل
    { wch: 16 }, // شماره تماس
    { wch: 28 }, // آدرس
    { wch: 30 }, // دغدغه اصلی کارفرما
    { wch: 10 }, // پیگیری ۱
    { wch: 14 }, // تاریخ پیگیری ۱
    { wch: 10 }, // پیگیری ۲
    { wch: 14 }, // تاریخ پیگیری ۲
    { wch: 10 }, // پیگیری ۳
    { wch: 14 }, // تاریخ پیگیری ۳
    { wch: 10 }, // پیگیری ۴
    { wch: 14 }, // تاریخ پیگیری ۴
    { wch: 18 }, // نتیجه پیگیری
    { wch: 22 }, // موضوع جلسه
    { wch: 30 }  // نظر شخصی مشاور
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تماس‌ها و پیگیری‌ها');

  const defaultName = `تماس‌های_روزانه_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const finalFileName = fileNameTitle ? (fileNameTitle.endsWith('.xlsx') ? fileNameTitle : `${fileNameTitle}.xlsx`) : defaultName;
  XLSX.writeFile(workbook, finalFileName);
}

export function exportPeriodicReportsToExcel(reports: PeriodicOverallReport[], fileNameTitle?: string) {
  const rows: Array<Record<string, string | number>> = [];
  let rowIdx = 1;

  if (Array.isArray(reports) && reports.length > 0) {
    const sorted = [...reports].sort(compareReportsLatestFirst);
    sorted.forEach((rep) => {
      const typeLabel = rep.periodType === 'daily' 
        ? 'تحلیلی روزانه' 
        : rep.periodType === 'weekly' 
        ? 'تحلیلی هفتگی' 
        : 'تحلیلی ماهانه';

      const statusLabel = rep.managerStatus === 'approved' 
        ? 'تایید شده' 
        : rep.managerStatus === 'rewarded' 
        ? 'پاداش و تشویق' 
        : rep.managerStatus === 'warned' 
        ? 'تذکر انضباطی' 
        : 'در انتظار بازبینی';

      rows.push({
        'ردیف': rowIdx++,
        'نام مشاور': rep.consultantName || '-',
        'کد مشاور': rep.consultantCode || '-',
        'سطح گزارش': typeLabel,
        'تاریخ ثبت': rep.dateShamsi || '-',
        'عنوان دوره': formatStandardReportTitle(rep.periodType, rep.dateShamsi, rep.periodLabel),
        'خلاصه عملکرد اجرایی': rep.summary || '-',
        'دستاوردها و نتایج کلیدی': rep.keyAchievements || '-',
        'موانع و چالش‌ها': rep.challengesOrBarriers || '-',
        'برنامه و اهداف دوره بعد': rep.plansOrPriorities || '-',
        'صنوف کانون توجه': rep.weeklyFocusGuilds || '-',
        'پیشنهاد استراتژیک به مدیر': rep.monthlyStrategicNotes || '-',
        'خودارزیابی مشاور': rep.selfRating ? `${rep.selfRating} از ۵` : '-',
        'وضعیت ارزیابی مدیریت': statusLabel,
        'نمره مدیر': rep.managerRating ? `${rep.managerRating} از ۵` : '-',
        'بازخورد مدیر': rep.managerFeedback || '-',
        'ساعت ثبت': rep.submittedAt || '-'
      });
    });
  } else {
    rows.push({
      'ردیف': '-',
      'نام مشاور': 'هیچ گزارش تحلیلی در این دوره ثبت نشده است',
      'کد مشاور': '-',
      'سطح گزارش': '-',
      'تاریخ ثبت': '-',
      'عنوان دوره': '-',
      'خلاصه عملکرد اجرایی': '-',
      'دستاوردها و نتایج کلیدی': '-',
      'موانع و چالش‌ها': '-',
      'برنامه و اهداف دوره بعد': '-',
      'صنوف کانون توجه': '-',
      'پیشنهاد استراتژیک به مدیر': '-',
      'خودارزیابی مشاور': '-',
      'وضعیت ارزیابی مدیریت': '-',
      'نمره مدیر': '-',
      'بازخورد مدیر': '-',
      'ساعت ثبت': '-'
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 18 }, // نام مشاور
    { wch: 12 }, // کد مشاور
    { wch: 16 }, // سطح گزارش
    { wch: 14 }, // تاریخ ثبت
    { wch: 22 }, // عنوان دوره
    { wch: 35 }, // خلاصه عملکرد
    { wch: 30 }, // دستاوردها
    { wch: 28 }, // موانع
    { wch: 30 }, // برنامه دوره بعد
    { wch: 25 }, // صنوف کانون توجه
    { wch: 30 }, // پیشنهاد به مدیر
    { wch: 16 }, // خودارزیابی
    { wch: 18 }, // وضعیت مدیریت
    { wch: 14 }, // نمره مدیر
    { wch: 30 }, // بازخورد مدیر
    { wch: 12 }  // ساعت ثبت
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تحلیلی عملکرد مشاورین');

  const defaultName = `تحلیلی_عملکرد_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const finalFileName = fileNameTitle ? (fileNameTitle.endsWith('.xlsx') ? fileNameTitle : `${fileNameTitle}.xlsx`) : defaultName;
  XLSX.writeFile(workbook, finalFileName);
}

export function exportArchiveToExcel(archive: ArchiveRecord) {
  if (archive.archiveType && archive.archiveType.startsWith('periodic')) {
    exportPeriodicReportsToExcel(archive.overallReports || [], archive.fileName);
    return;
  }
  exportAggregatedReportsToExcel(archive.reports || [], archive.fileName);
}

export function printOfficialReport(report: DailyReport) {
  const rowsHtml = report.rows.map(r => `
    <tr>
      <td style="border: 1px solid #c5a880; padding: 6px; text-align: center;">${toPersianDigits(r.rowNumber)}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-weight: bold;">${r.clientName}</td>
      <td style="border: 1px solid #c5a880; padding: 6px;">${r.activityField}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; text-align: center;">${r.personnelCount ? toPersianDigits(r.personnelCount) : '-'}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; direction: ltr; text-align: right;">${r.phone}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.address}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px; color: #8a2a00; font-weight: 600;">${r.employerConcern}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.followUp1 || '-'}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.followUp2 || '-'}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.followUp3 || '-'}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.followUp4 || '-'}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px; font-weight: 600;">${r.followUpResult}</td>
      <td style="border: 1px solid #c5a880; padding: 6px; font-size: 11px;">${r.meetingTopic}</td>
    </tr>
  `).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>برگه رسمی گزارش عملکرد روزانه بخش اجرایی - کارینو</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Tahoma, 'Vazirmatn', sans-serif; font-size: 12px; color: #111; direction: rtl; margin: 0; padding: 15px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b8860b; padding-bottom: 10px; margin-bottom: 12px; }
        .title { text-align: center; font-size: 16px; font-weight: bold; color: #0a192f; }
        .meta-box { display: flex; justify-content: space-between; background: #fdfaf2; padding: 8px 15px; border-radius: 6px; border: 1px solid #e0cfb3; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #0a192f; color: #fce08b; border: 1px solid #c5a880; padding: 8px 4px; font-size: 11px; }
        .opinion-box { background: #f9f9f9; border-right: 4px solid #b8860b; padding: 10px; margin-top: 10px; border-radius: 4px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding: 0 40px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h2 style="margin: 0; color: #0a192f;">مجموعه تخصصی کارینو</h2>
          <small style="color: #666;">مهندسی ساختار، پایداری، حقوق کار و سیستم‌سازی مدیریتی</small>
        </div>
        <div class="title">گزارش عملکرد روزانه بخش اجرایی</div>
        <div style="text-align: left; font-size: 11px;">
          <div>تاریخ: <strong>${report.dateShamsi} (${report.dayOfWeekShamsi})</strong></div>
          <div>ساعت ثبت: <strong>${report.submittedAt}</strong></div>
        </div>
      </div>

      <div class="meta-box">
        <div>نام مشاور: <strong>${report.consultantName}</strong></div>
        <div>کد مشاور: <strong>${report.consultantCode}</strong></div>
        <div>صنف / حوزه: <strong>${report.guild}</strong></div>
        <div>تعداد کارفرمایان پیگیری شده: <strong>${toPersianDigits(report.rows.length)} مورد</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">ردیف</th>
            <th>نام و نام خانوادگی</th>
            <th>زمینه فعالیت</th>
            <th style="width: 45px;">تعداد پرسنل</th>
            <th>شماره تماس</th>
            <th>آدرس</th>
            <th>دغدغه اصلی کارفرما</th>
            <th>پیگیری ۱</th>
            <th>پیگیری ۲</th>
            <th>پیگیری ۳</th>
            <th>پیگیری ۴</th>
            <th>نتیجه پیگیری</th>
            <th>موضوع جلسه</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="opinion-box">
        <strong>بازخورد و نظر کارشناسی مشاور درباره فعالیت روز:</strong>
        <p style="margin: 5px 0 0 0; line-height: 1.6;">${report.personalOpinion || 'موردی ثبت نشده است.'}</p>
      </div>

      ${report.managerFeedback ? `
        <div class="opinion-box" style="border-right-color: #0a192f; background: #eef4fb; margin-top: 10px;">
          <strong>بازخورد و دستورات مدیریت:</strong>
          <p style="margin: 5px 0 0 0; line-height: 1.6;">${report.managerFeedback}</p>
        </div>
      ` : ''}

      <div class="signatures">
        <div>امضاء و تایید مشاور اجرایی</div>
        <div>امضاء مدیر فاوا و هماهنگی</div>
        <div>ملاحظه و تایید مدیریت مجموعه کارینو</div>
      </div>
    </body>
    </html>
  `;

  // First try standard window.open
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    // Fallback if onload already triggered
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        // Ignored
      }
    }, 500);
    return;
  }

  // Fallback for sandboxed iframes or popup blockers: hidden iframe printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  }
}
