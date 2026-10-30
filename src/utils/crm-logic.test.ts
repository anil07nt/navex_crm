import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFollowUpStatus,
  addDaysToDate,
  cleanPhoneNumber,
  generateWhatsAppMessage,
  generateEmailContent,
  calculateKpis,
  filterLeads,
  exportLeadsToCsv,
  parseCsvContent,
  Lead,
  FilterState,
} from './crm-logic';

test('calculateFollowUpStatus identifies overdue, due today, and upcoming correctly', () => {
  const today = '2026-10-30';
  assert.equal(calculateFollowUpStatus('2026-10-29', today), 'overdue');
  assert.equal(calculateFollowUpStatus('2026-10-30', today), 'due_today');
  assert.equal(calculateFollowUpStatus('2026-10-31', today), 'upcoming');
  assert.equal(calculateFollowUpStatus('', today), 'upcoming');
});

test('addDaysToDate accurately shifts dates by +3 and +7 days', () => {
  assert.equal(addDaysToDate('2026-10-25', 3), '2026-10-28');
  assert.equal(addDaysToDate('2026-10-25', 7), '2026-11-01');
  assert.equal(addDaysToDate('2026-12-30', 3), '2027-01-02');
});

test('cleanPhoneNumber strips spaces, pluses, dashes', () => {
  assert.equal(cleanPhoneNumber('+91 93192 94022'), '919319294022');
  assert.equal(cleanPhoneNumber('+971-4-1234567'), '97141234567');
});

test('generateWhatsAppMessage customizes by Buyer Type and Product Interest', () => {
  const indianLead: Lead = {
    id: '1',
    companyName: 'Glee Impex',
    buyerType: 'Indian Merchant Exporter',
    location: 'New Delhi',
    phone: '+919319294022',
    email: 'glee@example.com',
    productInterest: 'Makhana (5-6+ Suta Jumbo)',
    productCategory: 'Makhana',
    stage: 'Sample Dispatched',
    nextFollowUpDate: '2026-10-30',
    lastContactDate: '2026-10-25',
    notes: 'Important client',
    sampleTrackingNumber: 'AWB-8839201',
  };

  const introMsg = generateWhatsAppMessage(indianLead, 'default');
  assert.ok(introMsg.includes('Namaste Glee Impex Team'));
  assert.ok(introMsg.includes('Makhana'));

  const sampleMsg = generateWhatsAppMessage(indianLead, 'sample_followup');
  assert.ok(sampleMsg.includes('AWB-8839201'));
  assert.ok(sampleMsg.includes('puffing ratio'));

  const intlLead: Lead = {
    id: '2',
    companyName: 'Al Maya Trading',
    buyerType: 'International Importer',
    location: 'Dubai, UAE',
    phone: '+97141234567',
    email: 'procurement@almaya.ae',
    productInterest: 'Both (Private Label)',
    productCategory: 'Both',
    stage: 'Sample Dispatched',
    nextFollowUpDate: '2026-10-29',
    lastContactDate: '2026-10-24',
    notes: '2kg sample sent',
  };

  const intlMsg = generateWhatsAppMessage(intlLead, 'default');
  assert.ok(intlMsg.includes('Dear Al Maya Trading Procurement Team'));
  assert.ok(intlMsg.includes('GI-tagged Mithila Makhana'));
});

test('generateEmailContent formats professional email templates with info@navexagrofarm.com', () => {
  const indianLead: Lead = {
    id: '1',
    companyName: 'Glee Impex',
    buyerType: 'Indian Merchant Exporter',
    location: 'New Delhi',
    phone: '+919319294022',
    email: 'glee@example.com',
    productInterest: 'Makhana (5-6+ Suta Jumbo)',
    productCategory: 'Makhana',
    stage: 'Sample Dispatched',
    nextFollowUpDate: '2026-10-30',
    lastContactDate: '2026-10-25',
    notes: 'Important client',
    sampleTrackingNumber: 'AWB-8839201',
  };

  const email = generateEmailContent(indianLead, 'intro');
  assert.ok(email.subject.includes('Bulk Supply'));
  assert.ok(email.body.includes('info@navexagrofarm.com'));
  assert.ok(email.body.includes('Glee Impex'));

  const sampleEmail = generateEmailContent(indianLead, 'sample_followup');
  assert.ok(sampleEmail.subject.includes('Sample Evaluation'));
  assert.ok(sampleEmail.body.includes('AWB-8839201'));
  assert.ok(sampleEmail.body.includes('info@navexagrofarm.com'));
});

test('calculateKpis computes overdue, due today, samples, and action queue counts', () => {
  const today = '2026-10-30';
  const leads: Lead[] = [
    {
      id: '1',
      companyName: 'Lead 1',
      buyerType: 'Indian Merchant Exporter',
      location: 'Delhi',
      phone: '123',
      email: 'a@b.com',
      productInterest: 'Makhana',
      productCategory: 'Makhana',
      stage: 'Sample Dispatched',
      nextFollowUpDate: '2026-10-29', // overdue
      lastContactDate: '2026-10-20',
      notes: '',
    },
    {
      id: '2',
      companyName: 'Lead 2',
      buyerType: 'Indian Merchant Exporter',
      location: 'Gujarat',
      phone: '456',
      email: 'b@b.com',
      productInterest: 'Chana Sattu',
      productCategory: 'Chana Sattu',
      stage: 'Price Negotiation',
      nextFollowUpDate: '2026-10-30', // due today
      lastContactDate: '2026-10-25',
      notes: '',
    },
    {
      id: '3',
      companyName: 'Lead 3',
      buyerType: 'International Importer',
      location: 'Dubai',
      phone: '789',
      email: 'c@b.com',
      productInterest: 'Both',
      productCategory: 'Both',
      stage: 'Closed Won',
      nextFollowUpDate: '2026-11-05', // upcoming
      lastContactDate: '2026-10-29',
      notes: '',
    },
  ];

  const kpis = calculateKpis(leads, today);
  assert.equal(kpis.total, 3);
  assert.equal(kpis.overdue, 1);
  assert.equal(kpis.dueToday, 1);
  assert.equal(kpis.sampleDispatched, 1);
  assert.equal(kpis.actionQueueCount, 2);
});

test('filterLeads filters by action queue, query, and category', () => {
  const today = '2026-10-30';
  const leads: Lead[] = [
    {
      id: '1',
      companyName: 'Foodsure',
      buyerType: 'Indian Merchant Exporter',
      location: 'New Delhi',
      phone: '9870533566',
      email: 'wecare@foodsure.in',
      productInterest: 'Makhana (4-5 Suta)',
      productCategory: 'Makhana',
      stage: 'New Lead',
      nextFollowUpDate: '2026-10-31',
      lastContactDate: '2026-10-28',
      notes: 'Initial inquiry',
    },
    {
      id: '2',
      companyName: 'Al Maya Trading Co.',
      buyerType: 'International Importer',
      location: 'Dubai, UAE',
      phone: '97141234567',
      email: 'procurement@almaya.ae',
      productInterest: 'Both (Private Label)',
      productCategory: 'Both',
      stage: 'Sample Dispatched',
      nextFollowUpDate: '2026-10-29', // overdue
      lastContactDate: '2026-10-24',
      notes: 'Sent sample',
    },
  ];

  const actionQueueFilter: FilterState = {
    searchQuery: '',
    buyerType: 'All',
    productCategory: 'All',
    stage: 'All',
    actionQueueOnly: true,
    statusFilter: 'all',
  };

  const actionQueueResult = filterLeads(leads, actionQueueFilter, today);
  assert.equal(actionQueueResult.length, 1);
  assert.equal(actionQueueResult[0].companyName, 'Al Maya Trading Co.');

  const searchFilter: FilterState = {
    searchQuery: 'Foodsure',
    buyerType: 'All',
    productCategory: 'All',
    stage: 'All',
    actionQueueOnly: false,
    statusFilter: 'all',
  };
  const searchResult = filterLeads(leads, searchFilter, today);
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].companyName, 'Foodsure');
});

test('exportLeadsToCsv and parseCsvContent roundtrips lead data', () => {
  const leads: Lead[] = [
    {
      id: '101',
      companyName: 'Chau Foods',
      buyerType: 'Indian Merchant Exporter',
      location: 'New Delhi',
      phone: '+919599021447',
      email: 'hello@chaufoods.com',
      productInterest: 'Makhana (6+ Suta)',
      productCategory: 'Makhana',
      stage: 'Intro Sent',
      nextFollowUpDate: '2026-10-30',
      lastContactDate: '2026-10-28',
      notes: 'APEDA certified buyer, interested in bulk contracts.',
    },
  ];

  const csv = exportLeadsToCsv(leads);
  assert.ok(csv.includes('Chau Foods'));
  assert.ok(csv.includes('hello@chaufoods.com'));

  const parsed = parseCsvContent(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].companyName, 'Chau Foods');
  assert.equal(parsed[0].phone, '+919599021447');
});
