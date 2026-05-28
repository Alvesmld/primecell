import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Service } from '@/types';
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORIES,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
} from './format';

interface FinanceReportData {
  period: { start: string; end: string };
  summary: {
    totalExpenses: number;
    grossRevenue: number;
    netProfit: number;
    cashBalance: number;
  };
  expensesList: { description: string; amount: number; date: string; category: string }[];
  revenuesList: { description: string; amount: number; date: string }[];
}

export function exportFinanceReport(data: FinanceReportData) {
  const doc = new jsPDF();
  const { period, summary, expensesList, revenuesList } = data;

  doc.setFontSize(18);
  doc.setTextColor(12, 74, 110);
  doc.text('PrimeCell — Relatório Financeiro', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Período: ${formatDate(period.start)} a ${formatDate(period.end)}`,
    14,
    28
  );
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

  doc.setFontSize(11);
  doc.setTextColor(0);
  const summaryY = 44;
  doc.text(`Ganho bruto: ${formatCurrency(summary.grossRevenue)}`, 14, summaryY);
  doc.text(`Gastos totais: ${formatCurrency(summary.totalExpenses)}`, 14, summaryY + 7);
  doc.text(`Lucro líquido: ${formatCurrency(summary.netProfit)}`, 14, summaryY + 14);
  doc.text(`Saldo em caixa: ${formatCurrency(summary.cashBalance)}`, 14, summaryY + 21);

  autoTable(doc, {
    startY: summaryY + 30,
    head: [['Gastos — Descrição', 'Categoria', 'Data', 'Valor']],
    body: expensesList.map((e) => [
      e.description,
      EXPENSE_CATEGORIES[e.category] || e.category,
      formatDate(e.date),
      formatCurrency(e.amount),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [12, 74, 110] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

  autoTable(doc, {
    startY: finalY + 10,
    head: [['Receitas avulsas — Descrição', 'Data', 'Valor']],
    body: revenuesList.map((r) => [
      r.description,
      formatDate(r.date),
      formatCurrency(r.amount),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [6, 182, 212] },
  });

  doc.save(`primecell-financas-${period.start}-${period.end}.pdf`);
}

function addHeader(doc: jsPDF, title: string) {
  doc.setFontSize(16);
  doc.setTextColor(12, 74, 110);
  doc.text('PrimeCell', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
}

export function exportServiceOrder(service: Service, storeName = 'PrimeCell') {
  const doc = new jsPDF();
  addHeader(doc, 'Ordem de Serviço');

  let y = 42;
  const line = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(label, 14, y);
    doc.setTextColor(0);
    doc.text(value || '—', 60, y);
    y += 7;
  };

  line('OS Nº:', String(service.id));
  line('Loja:', storeName);
  line('Cliente:', service.client_name);
  line('Telefone:', service.client_phone);
  line('Aparelho:', `${service.brand || ''} ${service.phone_model || ''}`.trim());
  line('Cor:', service.color || '—');
  line('Entrada:', formatDate(service.entry_date));
  line('Status:', STATUS_LABELS[service.status] || service.status);

  y += 4;
  doc.setFontSize(11);
  doc.setTextColor(12, 74, 110);
  doc.text('Serviço solicitado', 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(0);
  const descLines = doc.splitTextToSize(service.description || '—', 180);
  doc.text(descLines, 14, y);
  y += descLines.length * 5 + 4;

  if (service.pre_existing_defects) {
    doc.setFontSize(11);
    doc.setTextColor(180, 0, 0);
    doc.text('Defeitos pré-existentes (já estavam antes do conserto)', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(0);
    const defectLines = doc.splitTextToSize(service.pre_existing_defects, 180);
    doc.text(defectLines, 14, y);
    y += defectLines.length * 5 + 4;
  }

  if (service.repair_details) {
    doc.setFontSize(11);
    doc.setTextColor(12, 74, 110);
    doc.text('O que foi consertado', 14, y);
    y += 6;
    doc.setFontSize(9);
    const repairLines = doc.splitTextToSize(service.repair_details, 180);
    doc.text(repairLines, 14, y);
    y += repairLines.length * 5 + 4;
  }

  autoTable(doc, {
    startY: y + 4,
    head: [['Item', 'Valor']],
    body: [
      ['Custo da peça', formatCurrency(service.part_cost)],
      ['Mão de obra', formatCurrency(service.labor_cost)],
      ['Total', formatCurrency(service.total_charged)],
      ['Forma de pagamento', PAYMENT_METHOD_LABELS[service.payment_method || ''] || service.payment_method || '—'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [12, 74, 110] },
  });

  doc.save(`primecell-os-${service.id}.pdf`);
}

export function exportWarrantyCertificate(
  service: Service,
  store: { store_name?: string; address?: string; cnpj?: string; warranty_template?: string }
) {
  const doc = new jsPDF();
  addHeader(doc, 'Comprovante de Garantia');

  let y = 44;
  const storeName = store.store_name || 'PrimeCell';

  if (store.warranty_template) {
    const text = store.warranty_template
      .replace(/\{cliente\}/gi, service.client_name)
      .replace(/\{aparelho\}/gi, `${service.brand} ${service.phone_model}`)
      .replace(/\{dias\}/gi, String(service.warranty_days))
      .replace(/\{inicio\}/gi, formatDate(service.warranty_start))
      .replace(/\{fim\}/gi, formatDate(service.warranty_end));
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 10;
  } else {
    doc.setFontSize(10);
    doc.text(
      `${storeName} garante o serviço realizado no aparelho abaixo pelo período indicado.`,
      14,
      y,
      { maxWidth: 180 }
    );
    y += 14;
  }

  autoTable(doc, {
    startY: y,
    body: [
      ['Cliente', service.client_name],
      ['Aparelho', `${service.brand} ${service.phone_model}`],
      ['Serviço', service.description || '—'],
      ['Início da garantia', formatDate(service.warranty_start)],
      ['Término da garantia', formatDate(service.warranty_end)],
      ['Período', `${service.warranty_days} dias`],
    ],
    theme: 'plain',
  });

  if (store.address || store.cnpj) {
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (store.cnpj) doc.text(`CNPJ: ${store.cnpj}`, 14, finalY + 10);
    if (store.address) doc.text(store.address, 14, finalY + 16);
  }

  doc.save(`primecell-garantia-${service.id}.pdf`);
}
