import type { Conversation, Property, RentalAgreementData, User } from '../types/index.ts';
import { formatETB } from './rules.ts';
import { sanitizePlainText } from './security.ts';
import { sanitizeMoveInChecklistData } from './moveInChecklist.ts';

const VALID_PAYMENT_METHODS: ReadonlySet<RentalAgreementData['paymentMethod']> = new Set([
  'Telebirr',
  'CBE Birr',
  'Bank Transfer',
  'Cash Receipt',
]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function canGenerateRentalAgreement(
  user: Pick<User, 'id' | 'role' | 'status'> | null | undefined,
  conversation: Pick<Conversation, 'landlordId'> | null | undefined
): boolean {
  if (!user || !conversation) return false;
  if (user.status !== 'active') return false;
  return user.role === 'landlord' && conversation.landlordId === user.id;
}

function defaultStartDateIso(now = new Date()): string {
  const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

function clampInt(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.min(max, Math.max(min, Math.round(val)));
}

function normalizeDateString(raw: string, fallback: string): string {
  const cleaned = sanitizePlainText(raw, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : fallback;
}

export function buildDefaultAgreementData(params: {
  conversation: Conversation;
  property?: Property;
  landlord?: User;
  tenant?: User;
  now?: Date;
}): RentalAgreementData {
  const { conversation, property, landlord, tenant } = params;
  const now = params.now ?? new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const shortSuffix = conversation.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0001';

  const monthlyRentETB = clampInt(
    property?.rentPrice ?? conversation.propertyPrice ?? 25000,
    500,
    2_000_000,
    25000
  );

  const landlordFullName = landlord
    ? `${landlord.firstName} ${landlord.lastName}`
    : conversation.landlordName;

  const tenantFullName = tenant
    ? `${tenant.firstName} ${tenant.lastName}`
    : conversation.tenantName;

  return sanitizeAgreementData({
    agreementId: `GD-${stamp}-${shortSuffix}`,
    generatedAt: now.toISOString(),
    propertyId: property?.id ?? conversation.propertyId,
    propertyTitle: property?.title ?? conversation.propertyTitle,
    propertyType: property?.propertyType ?? 'Residential Property',
    city: property?.city ?? 'Addis Ababa',
    subCity: property?.subCity ?? 'Bole',
    neighborhood: property?.neighborhood ?? '',
    address: property?.address ?? '',
    bedrooms: property?.bedrooms ?? 2,
    bathrooms: property?.bathrooms ?? 1,
    areaSqM: property?.areaSqM,
    landlordId: conversation.landlordId,
    landlordName: landlordFullName,
    landlordPhone: property?.ownerPhone ?? landlord?.phone ?? '',
    landlordEmail: landlord?.email ?? '',
    tenantId: conversation.tenantId,
    tenantName: tenantFullName,
    tenantPhone: tenant?.phone ?? '',
    tenantEmail: tenant?.email ?? '',
    monthlyRentETB,
    securityDepositETB: monthlyRentETB,
    leaseTermMonths: 12,
    startDate: defaultStartDateIso(now),
    paymentDueDay: 5,
    paymentMethod: 'Telebirr',
    utilitiesIncluded: property?.amenities?.slice(0, 6) ?? ['Water Tank', 'Security'],
    specialClauses:
      'Direct Landlord-Tenant Agreement via GojoDirect with zero broker (delala) commission. Premises shall be used solely for peaceful residential/authorized occupancy in accordance with Ethiopian Civil Code tenancy provisions.',
  });
}

export function sanitizeAgreementData(raw: RentalAgreementData): RentalAgreementData {
  const paymentMethod = VALID_PAYMENT_METHODS.has(raw.paymentMethod)
    ? raw.paymentMethod
    : 'Telebirr';

  const utilities = Array.isArray(raw.utilitiesIncluded)
    ? raw.utilitiesIncluded
        .map((item) => sanitizePlainText(item, 48))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  return {
    agreementId: sanitizePlainText(raw.agreementId, 32) || 'GD-LEASE-001',
    generatedAt: sanitizePlainText(raw.generatedAt, 40) || new Date().toISOString(),
    propertyId: sanitizePlainText(raw.propertyId, 64),
    propertyTitle: sanitizePlainText(raw.propertyTitle, 120) || 'Rental Property',
    propertyType: sanitizePlainText(raw.propertyType, 60) || 'Residential Property',
    city: sanitizePlainText(raw.city, 60) || 'Addis Ababa',
    subCity: sanitizePlainText(raw.subCity, 60) || 'Bole',
    neighborhood: sanitizePlainText(raw.neighborhood, 100),
    address: sanitizePlainText(raw.address, 140),
    bedrooms: clampInt(raw.bedrooms, 0, 20, 1),
    bathrooms: clampInt(raw.bathrooms, 0, 20, 1),
    areaSqM:
      typeof raw.areaSqM === 'number' && Number.isFinite(raw.areaSqM)
        ? clampInt(raw.areaSqM, 10, 5000, 80)
        : undefined,
    landlordId: sanitizePlainText(raw.landlordId, 64),
    landlordName: sanitizePlainText(raw.landlordName, 80) || 'Landlord',
    landlordPhone: sanitizePlainText(raw.landlordPhone, 24),
    landlordEmail: sanitizePlainText(raw.landlordEmail ?? '', 120),
    tenantId: sanitizePlainText(raw.tenantId, 64),
    tenantName: sanitizePlainText(raw.tenantName, 80) || 'Tenant',
    tenantPhone: sanitizePlainText(raw.tenantPhone ?? '', 24),
    tenantEmail: sanitizePlainText(raw.tenantEmail ?? '', 120),
    monthlyRentETB: clampInt(raw.monthlyRentETB, 500, 2_000_000, 25000),
    securityDepositETB: clampInt(raw.securityDepositETB, 0, 12_000_000, 25000),
    leaseTermMonths: clampInt(raw.leaseTermMonths, 1, 60, 12),
    startDate: normalizeDateString(raw.startDate, defaultStartDateIso()),
    paymentDueDay: clampInt(raw.paymentDueDay, 1, 28, 5),
    paymentMethod,
    utilitiesIncluded: utilities,
    specialClauses: sanitizePlainText(raw.specialClauses, 1200),
    ...(raw.moveInChecklist
      ? { moveInChecklist: sanitizeMoveInChecklistData(raw.moveInChecklist) }
      : {}),
  };
}

export function getEndDateIso(startDateIso: string, leaseTermMonths: number): string {
  const parts = startDateIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return startDateIso;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1 + leaseTermMonths, parts[2]));
  return d.toISOString().slice(0, 10);
}

export function formatRentalAgreementText(raw: RentalAgreementData): string {
  const data = sanitizeAgreementData(raw);
  const endDate = getEndDateIso(data.startDate, data.leaseTermMonths);
  const locationParts = [data.address, data.neighborhood, data.subCity, data.city].filter(Boolean);
  const fullAddress = locationParts.join(', ');
  const specsParts = [
    data.propertyType,
    data.bedrooms > 0 ? `${data.bedrooms} Bedroom(s)` : 'Studio / Open Plan',
    `${data.bathrooms} Bathroom(s)`,
    data.areaSqM ? `${data.areaSqM} m²` : '',
  ].filter(Boolean);

  return [
    '====================================================================',
    '                    STANDARD RESIDENTIAL RENTAL AGREEMENT           ',
    '                         GojoDirect Verified Lease                  ',
    '====================================================================',
    `Agreement Reference : ${data.agreementId}`,
    `Date Generated      : ${data.generatedAt.slice(0, 10)}`,
    '',
    '1. PARTIES TO THIS AGREEMENT',
    `   Landlord (Lessor): ${data.landlordName}`,
    data.landlordPhone ? `   Landlord Phone   : ${data.landlordPhone}` : '',
    data.landlordEmail ? `   Landlord Email   : ${data.landlordEmail}` : '',
    `   Tenant (Lessee)  : ${data.tenantName}`,
    data.tenantPhone ? `   Tenant Phone     : ${data.tenantPhone}` : '',
    data.tenantEmail ? `   Tenant Email     : ${data.tenantEmail}` : '',
    '',
    '2. LEASED PROPERTY PREMISES',
    `   Listing Title    : ${data.propertyTitle}`,
    `   Location         : ${fullAddress}`,
    `   Specifications   : ${specsParts.join(' | ')}`,
    '',
    '3. LEASE TERM & COMMENCEMENT',
    `   Duration         : ${data.leaseTermMonths} Month(s)`,
    `   Start Date       : ${data.startDate}`,
    `   End Date         : ${endDate}`,
    '',
    '4. MONTHLY RENT, DEPOSIT & PAYMENT TERMS',
    `   Monthly Rent     : ${formatETB(data.monthlyRentETB)}`,
    `   Security Deposit : ${formatETB(data.securityDepositETB)} (refundable upon handover inspection)`,
    `   Payment Due Day  : Day ${data.paymentDueDay} of each calendar month`,
    `   Payment Channel  : ${data.paymentMethod}`,
    '',
    '5. INCLUDED UTILITIES & COMPOUND FACILITIES',
    `   ${data.utilitiesIncluded.length > 0 ? data.utilitiesIncluded.join(', ') : 'Standard compound utilities as inspected'}`,
    '',
    '6. DIRECT ANTI-BROKER (DELALA) & GENERAL OBLIGATIONS',
    '   a) Zero Commission: Both parties confirm this lease is executed directly',
    '      without any undisclosed informal broker (delala) surcharge.',
    '   b) Care of Premises: Tenant agrees to maintain the premises in clean condition',
    '      and report structural or utility defects promptly to Landlord.',
    '   c) Notice Period: Either party must provide at least 30 days written notice',
    '      prior to lease termination or non-renewal.',
    data.specialClauses ? `   d) Special Clauses: ${data.specialClauses}` : '',
    ...(data.moveInChecklist
      ? [
          '',
          '7. ATTACHED MOVE-IN CONDITION CHECKLIST',
          `   Checklist Ref    : ${data.moveInChecklist.checklistId} (${data.moveInChecklist.status === 'signed' ? `Digitally Signed by ${data.moveInChecklist.tenantSignature}` : 'Pending Tenant Sign-off'})`,
          `   Inspection Date  : ${data.moveInChecklist.inspectionDate} | Keys Handed Over: ${data.moveInChecklist.keysHandedOver}`,
          `   Meter Readings   : Elec ${data.moveInChecklist.electricityMeterReading || 'N/A'} | Water ${data.moveInChecklist.waterMeterReading || 'N/A'}`,
          ...data.moveInChecklist.items.map(
            (item, idx) =>
              `   ${idx + 1}. [${item.category}] ${item.name}: ${item.condition}${item.notes ? ` (${item.notes})` : ''}`
          ),
        ]
      : []),
    '',
    '8. SIGNATURES & EXECUTION',
    `   Landlord Signature: _______________________   Date: ____________`,
    `   (${data.landlordName})`,
    '',
    `   Tenant Signature  : _______________________   Date: ____________`,
    `   (${data.tenantName})`,
    '====================================================================',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function formatRentalAgreementHtml(raw: RentalAgreementData): string {
  const data = sanitizeAgreementData(raw);
  const endDate = getEndDateIso(data.startDate, data.leaseTermMonths);
  const locationParts = [data.address, data.neighborhood, data.subCity, data.city].filter(Boolean);
  const fullAddress = locationParts.join(', ');
  const utilitiesHtml =
    data.utilitiesIncluded.length > 0
      ? data.utilitiesIncluded.map((u) => `<li>${escapeHtml(u)}</li>`).join('')
      : '<li>Standard compound utilities as inspected</li>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Rental Agreement - ${escapeHtml(data.agreementId)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 32px 16px; line-height: 1.6; }
    .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 40px 44px; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .brand { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 800; color: #059669; letter-spacing: 0.04em; text-transform: uppercase; }
    h1 { margin: 4px 0 0; font-size: 22px; color: #0f172a; }
    .meta { font-family: system-ui, sans-serif; font-size: 12px; color: #475569; text-align: right; }
    h2 { font-family: system-ui, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 24px 0 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 13px; }
    .label { font-family: system-ui, sans-serif; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    td { padding: 7px 10px; border: 1px solid #e2e8f0; }
    td.k { width: 34%; font-family: system-ui, sans-serif; font-weight: 600; background: #f8fafc; color: #334155; }
    ul { margin: 8px 0; padding-left: 20px; font-size: 13px; }
    .clauses { font-size: 13px; color: #1e293b; }
    .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 38px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
    .sig-line { border-bottom: 1px solid #334155; height: 34px; margin-bottom: 6px; }
    .sig-cap { font-family: system-ui, sans-serif; font-size: 12px; color: #475569; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; padding: 12px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">GojoDirect · Verified Direct Lease</div>
        <h1>Residential Rental Agreement</h1>
      </div>
      <div class="meta">
        <div><strong>Ref:</strong> ${escapeHtml(data.agreementId)}</div>
        <div><strong>Date:</strong> ${escapeHtml(data.generatedAt.slice(0, 10))}</div>
      </div>
    </div>

    <h2>1. Contracting Parties</h2>
    <div class="grid">
      <div class="box">
        <div class="label">Landlord (Lessor)</div>
        <div><strong>${escapeHtml(data.landlordName)}</strong></div>
        ${data.landlordPhone ? `<div>Phone: ${escapeHtml(data.landlordPhone)}</div>` : ''}
        ${data.landlordEmail ? `<div>Email: ${escapeHtml(data.landlordEmail)}</div>` : ''}
      </div>
      <div class="box">
        <div class="label">Tenant (Lessee)</div>
        <div><strong>${escapeHtml(data.tenantName)}</strong></div>
        ${data.tenantPhone ? `<div>Phone: ${escapeHtml(data.tenantPhone)}</div>` : ''}
        ${data.tenantEmail ? `<div>Email: ${escapeHtml(data.tenantEmail)}</div>` : ''}
      </div>
    </div>

    <h2>2. Property Premises</h2>
    <table>
      <tr><td class="k">Property Title</td><td>${escapeHtml(data.propertyTitle)}</td></tr>
      <tr><td class="k">Property Type</td><td>${escapeHtml(data.propertyType)}</td></tr>
      <tr><td class="k">Address &amp; Sub-City</td><td>${escapeHtml(fullAddress)}</td></tr>
      <tr><td class="k">Specifications</td><td>${data.bedrooms > 0 ? `${data.bedrooms} Bedroom(s)` : 'Studio'} · ${data.bathrooms} Bathroom(s)${data.areaSqM ? ` · ${data.areaSqM} m²` : ''}</td></tr>
    </table>

    <h2>3. Lease Term &amp; Financial Terms</h2>
    <table>
      <tr><td class="k">Lease Duration</td><td>${data.leaseTermMonths} Month(s) (${escapeHtml(data.startDate)} to ${escapeHtml(endDate)})</td></tr>
      <tr><td class="k">Monthly Rent</td><td><strong>${escapeHtml(formatETB(data.monthlyRentETB))}</strong></td></tr>
      <tr><td class="k">Security Deposit</td><td>${escapeHtml(formatETB(data.securityDepositETB))} (refundable upon end-of-lease inspection)</td></tr>
      <tr><td class="k">Payment Schedule</td><td>Due by Day ${data.paymentDueDay} of each month via ${escapeHtml(data.paymentMethod)}</td></tr>
    </table>

    <h2>4. Included Utilities &amp; Amenities</h2>
    <ul>${utilitiesHtml}</ul>

    <h2>5. Standard Covenants &amp; Direct Anti-Broker Clause</h2>
    <div class="clauses">
      <p><strong>1. Zero Broker (Delala) Guarantee:</strong> Landlord and Tenant execute this lease directly via GojoDirect without any informal brokerage commission.</p>
      <p><strong>2. Maintenance &amp; Use:</strong> Tenant agrees to maintain the premises cleanly and notify Landlord promptly of structural or plumbing issues.</p>
      <p><strong>3. Termination Notice:</strong> Either party shall provide at least thirty (30) days written notice before termination or non-renewal.</p>
      ${data.specialClauses ? `<p><strong>4. Special Clauses:</strong> ${escapeHtml(data.specialClauses)}</p>` : ''}
    </div>

    ${
      data.moveInChecklist
        ? `<h2>6. Attached Move-in Condition Checklist (${escapeHtml(data.moveInChecklist.checklistId)})</h2>
    <p style="font-size: 12px; color: #334155;">
      <strong>Inspection Date:</strong> ${escapeHtml(data.moveInChecklist.inspectionDate)} ·
      <strong>Keys Handed Over:</strong> ${data.moveInChecklist.keysHandedOver} ·
      <strong>Status:</strong> ${
        data.moveInChecklist.status === 'signed' && data.moveInChecklist.tenantSignature
          ? `Digitally Signed by ${escapeHtml(data.moveInChecklist.tenantSignature)} (${escapeHtml((data.moveInChecklist.tenantSignedAt || '').slice(0, 10))})`
          : 'Pending Tenant Move-in Sign-off'
      }
    </p>
    <table>
      ${data.moveInChecklist.items
        .map(
          (item) =>
            `<tr><td class="k">${escapeHtml(item.category)} · ${escapeHtml(item.name)}</td><td><strong>${escapeHtml(item.condition)}</strong>${item.notes ? ` — ${escapeHtml(item.notes)}` : ''}</td></tr>`
        )
        .join('')}
    </table>`
        : ''
    }

    <div class="sigs">
      <div>
        <div class="sig-line"></div>
        <div class="sig-cap"><strong>Landlord:</strong> ${escapeHtml(data.landlordName)}<br/>Date: ______________________</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-cap"><strong>Tenant:</strong> ${escapeHtml(data.tenantName)}<br/>Date: ______________________</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function getSafeAgreementFilename(
  agreementId: string,
  ext: 'html' | 'txt' = 'html'
): string {
  const safeId = sanitizePlainText(agreementId, 40).replace(/[^a-zA-Z0-9_-]/g, '_') || 'Contract';
  return `GojoDirect_Rental_Agreement_${safeId}.${ext}`;
}

export function downloadRentalAgreementFile(
  agreement: RentalAgreementData,
  format: 'html' | 'txt' = 'html'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const content =
    format === 'txt'
      ? formatRentalAgreementText(agreement)
      : formatRentalAgreementHtml(agreement);
  const mimeType = format === 'txt' ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getSafeAgreementFilename(agreement.agreementId, format);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
