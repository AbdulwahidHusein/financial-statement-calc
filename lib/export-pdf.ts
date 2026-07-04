type ExportPdfOptions = {
  element: HTMLElement;
  companyName: string;
  currentDateLabel: string;
  fileDate: string;
};

const UNSUPPORTED_COLOR_FUNCTIONS = ['oklch(', 'oklab(', 'lab(', 'lch(', 'color('];

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_');

  return cleaned || 'Financial_Report';
}

function hasUnsupportedColor(value: string): boolean {
  return UNSUPPORTED_COLOR_FUNCTIONS.some((fn) => value.includes(fn));
}

function copyComputedStyles(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source);

  if (target instanceof HTMLElement || target instanceof SVGElement) {
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      const value = computed.getPropertyValue(prop);
      if (!value || hasUnsupportedColor(value)) continue;
      target.style.setProperty(prop, value, computed.getPropertyPriority(prop));
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);

  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) {
      copyComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }
}

function prepareCloneForCapture(clonedDoc: Document, sourceElement: HTMLElement, clonedElement: HTMLElement): void {
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
  clonedElement.style.background = '#ffffff';
  copyComputedStyles(sourceElement, clonedElement);
}

export function getExportDateParts(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    fileDate: `${year}-${month}-${day}`,
    currentDateLabel: now.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    }),
  };
}

export async function exportElementToPdf({
  element,
  companyName,
  currentDateLabel,
  fileDate,
}: ExportPdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    height: element.scrollHeight,
    onclone: (clonedDoc, clonedElement) => {
      if (clonedElement instanceof HTMLElement) {
        prepareCloneForCapture(clonedDoc, element, clonedElement);
      }
    },
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const title = companyName.trim() || 'Financial Report';
  pdf.setProperties({
    title: `${title} - ${currentDateLabel}`,
    subject: 'Financial Statements',
    creator: 'Financial Statement Generator',
  });

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${sanitizeFilename(title)}_${fileDate}.pdf`);
}
