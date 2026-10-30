/**
 * Pure logic functions for AgroExport CRM
 */

export interface Lead {
  id: string;
  companyName: string;
  buyerType: 'Indian Merchant Exporter' | 'International Importer';
  location: string;
  phone: string;
  email: string;
  productInterest: string;
  productCategory: 'Makhana' | 'Chana Sattu' | 'Both';
  stage: 'New Lead' | 'Intro Sent' | 'Sample Dispatched' | 'Price Negotiation' | 'Closed Won';
  nextFollowUpDate: string; // YYYY-MM-DD
  lastContactDate: string; // YYYY-MM-DD
  notes: string;
  contactPerson?: string;
  sampleTrackingNumber?: string;
  estimatedOrderSize?: string;
  fssaiApedaStatus?: string;
}

export interface FilterState {
  searchQuery: string;
  buyerType: string;
  productCategory: string;
  stage: string;
  actionQueueOnly: boolean; // Overdue or Due Today
  statusFilter: string; // 'all' | 'overdue' | 'due_today' | 'upcoming'
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return formatDateToISO(new Date());
}

export function addDaysToDate(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return formatDateToISO(today);
  }
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

export function calculateFollowUpStatus(nextFollowUpDate: string, referenceToday?: string): 'overdue' | 'due_today' | 'upcoming' {
  const today = referenceToday || getTodayISO();
  if (!nextFollowUpDate) return 'upcoming';
  if (nextFollowUpDate < today) return 'overdue';
  if (nextFollowUpDate === today) return 'due_today';
  return 'upcoming';
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function generateWhatsAppMessage(lead: Lead, templateType: string = 'default'): string {
  const company = lead.companyName || 'Team';
  const product = lead.productInterest || 'Makhana and Chana Sattu';
  const isExporter = lead.buyerType === 'Indian Merchant Exporter';

  if (templateType === 'sample_followup') {
    return isExporter
      ? `Namaste ${company} Team, following up regarding the sample of ${product} dispatched from our processing facility in Bihar. Tracking/Dispatch info: ${lead.sampleTrackingNumber || 'Dispatched via Courier'}. Have you received and tested the grade moisture & puffing ratio? Awaiting your quality feedback!`
      : `Dear ${company} Procurement Team, greetings from Navex Agro Exports (India). Following up on the sample shipment of ${product} sent to your facility (${lead.sampleTrackingNumber || 'Courier Dispatch'}). We would be glad to share COA, phytosanitary specs, and discuss container CIF pricing once your lab inspection is complete.`;
  }

  if (templateType === 'price_quote') {
    return isExporter
      ? `Namaste ${company} Team, sharing our updated competitive ex-warehouse / FOB quote for bulk ${product}. We ensure uniform sorting (<9% moisture, zero dusting). Please confirm your expected volume (MT) for this dispatch cycle.`
      : `Dear ${company} Team, please find our export FOB/CIF quotation for ${product}. We support full private-label packaging with USFDA/APEDA compliance and lab-certified nutritional facts. Let us know your preferred port of discharge.`;
  }

  // Default introductory follow-up
  if (isExporter) {
    if (product.toLowerCase().includes('sattu') && !product.toLowerCase().includes('makhana')) {
      return `Namaste ${company} Team, regarding bulk B2B supply of 100% pure roasted Chana Sattu processed in Bihar with high protein and traditional aroma. We supply graded material to leading exporters. Can we dispatch a 1kg testing sample to your warehouse?`;
    }
    return `Namaste ${company} Team, regarding bulk supply of premium handpicked Makhana (${product}) directly from our farmer-aggregation hub in Mithila, Bihar. Fresh crop, moisture <9%, strict grading (5-6+ Suta). Can we share our current spec-sheet and batch rates?`;
  } else {
    return `Dear ${company} Procurement Team, greetings from Navex Agro Exports, India. We are direct processors and exporters of GI-tagged Mithila Makhana (Fox Nuts / Gorgon Nuts) and traditional roasted Chana Sattu. We supply overseas distributors across UAE, USA, and UK. May we present our product catalog and export credentials?`;
  }
}

export function calculateKpis(leads: Lead[], referenceToday?: string) {
  const today = referenceToday || getTodayISO();
  let overdue = 0;
  let dueToday = 0;
  let sampleDispatched = 0;
  let activeNegotiation = 0;
  let closedWon = 0;

  leads.forEach((l) => {
    const status = calculateFollowUpStatus(l.nextFollowUpDate, today);
    if (status === 'overdue') overdue++;
    if (status === 'due_today') dueToday++;
    if (l.stage === 'Sample Dispatched') sampleDispatched++;
    if (l.stage === 'Price Negotiation') activeNegotiation++;
    if (l.stage === 'Closed Won') closedWon++;
  });

  return {
    total: leads.length,
    overdue,
    dueToday,
    sampleDispatched,
    activeNegotiation,
    closedWon,
    actionQueueCount: overdue + dueToday,
  };
}

export function filterLeads(leads: Lead[], filters: FilterState, referenceToday?: string): Lead[] {
  const today = referenceToday || getTodayISO();
  const query = filters.searchQuery.trim().toLowerCase();

  return leads.filter((lead) => {
    // Action queue filter (Overdue or Due Today only)
    if (filters.actionQueueOnly) {
      const status = calculateFollowUpStatus(lead.nextFollowUpDate, today);
      if (status !== 'overdue' && status !== 'due_today') return false;
    }

    // Status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      const status = calculateFollowUpStatus(lead.nextFollowUpDate, today);
      if (status !== filters.statusFilter) return false;
    }

    // Buyer Type filter
    if (filters.buyerType && filters.buyerType !== 'All' && lead.buyerType !== filters.buyerType) {
      return false;
    }

    // Product Category filter
    if (filters.productCategory && filters.productCategory !== 'All' && lead.productCategory !== filters.productCategory) {
      return false;
    }

    // Stage filter
    if (filters.stage && filters.stage !== 'All' && lead.stage !== filters.stage) {
      return false;
    }

    // Search query across fields
    if (query) {
      const matchText = [
        lead.companyName,
        lead.location,
        lead.phone,
        lead.email,
        lead.productInterest,
        lead.notes,
        lead.contactPerson || '',
        lead.buyerType,
      ].join(' ').toLowerCase();

      if (!matchText.includes(query)) return false;
    }

    return true;
  });
}

export function exportLeadsToCsv(leads: Lead[]): string {
  const headers = [
    'Company Name',
    'Buyer Type',
    'Location',
    'Phone',
    'Email',
    'Product Interest',
    'Product Category',
    'Stage',
    'Next Follow-Up Date',
    'Last Contact Date',
    'Sample Tracking #',
    'Estimated Order Size',
    'Notes',
  ];

  const escapeField = (val: string | undefined): string => {
    if (!val) return '""';
    const clean = val.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = leads.map((l) => [
    escapeField(l.companyName),
    escapeField(l.buyerType),
    escapeField(l.location),
    escapeField(l.phone),
    escapeField(l.email),
    escapeField(l.productInterest),
    escapeField(l.productCategory),
    escapeField(l.stage),
    escapeField(l.nextFollowUpDate),
    escapeField(l.lastContactDate),
    escapeField(l.sampleTrackingNumber || ''),
    escapeField(l.estimatedOrderSize || ''),
    escapeField(l.notes),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function parseCsvContent(csvText: string): Lead[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerLine = lines[0].toLowerCase();
  const headers = parseCsvLine(headerLine);

  const getIdx = (keywords: string[]): number => {
    return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const companyIdx = getIdx(['company', 'lead', 'client', 'name']);
  const buyerTypeIdx = getIdx(['buyer', 'type', 'category']);
  const locIdx = getIdx(['location', 'city', 'country']);
  const phoneIdx = getIdx(['phone', 'mobile', 'whatsapp', 'contact']);
  const emailIdx = getIdx(['email', 'mail']);
  const prodIdx = getIdx(['product', 'interest', 'item']);
  const stageIdx = getIdx(['stage', 'status', 'pipeline']);
  const nextFollowIdx = getIdx(['next', 'follow', 'due']);
  const notesIdx = getIdx(['note', 'remark', 'comment']);

  const parsedLeads: Lead[] = [];
  const today = getTodayISO();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;
    const cols = parseCsvLine(rawLine);

    const company = (companyIdx >= 0 ? cols[companyIdx] : cols[0]) || '';
    if (!company) continue;

    const rawBuyerType = (buyerTypeIdx >= 0 ? cols[buyerTypeIdx] : '').toLowerCase();
    const buyerType: Lead['buyerType'] = rawBuyerType.includes('international') || rawBuyerType.includes('importer')
      ? 'International Importer'
      : 'Indian Merchant Exporter';

    const rawProduct = (prodIdx >= 0 ? cols[prodIdx] : 'Makhana') || 'Makhana';
    let productCat: Lead['productCategory'] = 'Makhana';
    if (rawProduct.toLowerCase().includes('both') || (rawProduct.toLowerCase().includes('makhana') && rawProduct.toLowerCase().includes('sattu'))) {
      productCat = 'Both';
    } else if (rawProduct.toLowerCase().includes('sattu')) {
      productCat = 'Chana Sattu';
    }

    const rawStage = (stageIdx >= 0 ? cols[stageIdx] : 'New Lead') || 'New Lead';
    let stage: Lead['stage'] = 'New Lead';
    const lowerStage = rawStage.toLowerCase();
    if (lowerStage.includes('intro')) stage = 'Intro Sent';
    else if (lowerStage.includes('sample')) stage = 'Sample Dispatched';
    else if (lowerStage.includes('negotiat') || lowerStage.includes('price')) stage = 'Price Negotiation';
    else if (lowerStage.includes('won') || lowerStage.includes('closed')) stage = 'Closed Won';

    parsedLeads.push({
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      companyName: company,
      buyerType,
      location: (locIdx >= 0 ? cols[locIdx] : 'India') || 'India',
      phone: (phoneIdx >= 0 ? cols[phoneIdx] : '') || '',
      email: (emailIdx >= 0 ? cols[emailIdx] : '') || '',
      productInterest: rawProduct,
      productCategory: productCat,
      stage,
      nextFollowUpDate: (nextFollowIdx >= 0 ? cols[nextFollowIdx] : today) || today,
      lastContactDate: today,
      notes: (notesIdx >= 0 ? cols[notesIdx] : '') || '',
    });
  }

  return parsedLeads;
}
