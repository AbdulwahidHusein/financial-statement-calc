type ExportPdfOptions = {
  pages: HTMLElement[];
  companyName: string;
  currentDateLabel: string;
  fileDate: string;
};

type CapturedPage = {
  imgData: string;
  width: number;
  height: number;
};

const UNSUPPORTED_COLOR_FUNCTIONS = ['oklch(', 'oklab(', 'lab(', 'lch(', 'color('];
const PAGE_MARGIN_MM = 10;

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

async function capturePage(element: HTMLElement): Promise<CapturedPage> {
  const { default: html2canvas } = await import('html2canvas');

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

  return {
    imgData: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

function addFullPageImage(pdf: InstanceType<typeof import('jspdf').jsPDF>, page: CapturedPage, pageIndex: number): void {
  if (pageIndex > 0) {
    pdf.addPage();
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const maxHeight = pageHeight - PAGE_MARGIN_MM * 2;

  const aspectRatio = page.width / page.height;
  let renderWidth = maxWidth;
  let renderHeight = renderWidth / aspectRatio;

  if (renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = renderHeight * aspectRatio;
  }

  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  pdf.addImage(page.imgData, 'PNG', x, y, renderWidth, renderHeight);
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
  pages,
  companyName,
  currentDateLabel,
  fileDate,
}: ExportPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const capturedPages = await Promise.all(pages.map((page) => capturePage(page)));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const title = companyName.trim() || 'Financial Report';

  pdf.setProperties({
    title: `${title} - ${currentDateLabel}`,
    subject: 'Financial Statements',
    creator: 'Financial Statement Generator',
  });

  capturedPages.forEach((page, index) => {
    addFullPageImage(pdf, page, index);
  });

  pdf.save(`${sanitizeFilename(title)}_${fileDate}.pdf`);
}
