import type {
  ChecklistCategory,
  ChecklistCondition,
  Conversation,
  MoveInChecklistData,
  MoveInChecklistItem,
  Property,
  RentalAgreementData,
  User,
} from '../types/index.ts';
import { sanitizePlainText } from './security.ts';

const VALID_CONDITIONS: ReadonlySet<ChecklistCondition> = new Set([
  'Good',
  'Fair',
  'Needs Repair',
  'N/A',
]);

const VALID_CATEGORIES: ReadonlySet<ChecklistCategory> = new Set([
  'Utilities',
  'Appliances',
  'Fixtures & Keys',
]);

function escapeChecklistHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clampKeys(val: number): number {
  if (!Number.isFinite(val)) return 2;
  return Math.min(20, Math.max(0, Math.round(val)));
}

function normalizeDateIso(raw: string, fallback: string): string {
  const cleaned = sanitizePlainText(raw, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : fallback;
}

export function canCustomizeMoveInChecklist(
  user: Pick<User, 'id' | 'role' | 'status'> | null | undefined,
  conversation: Pick<Conversation, 'landlordId'> | null | undefined
): boolean {
  if (!user || !conversation) return false;
  if (user.status !== 'active') return false;
  return user.role === 'landlord' && conversation.landlordId === user.id;
}

export function canSignMoveInChecklist(
  user: Pick<User, 'id' | 'role' | 'status'> | null | undefined,
  conversation: Pick<Conversation, 'tenantId'> | null | undefined,
  checklist: Pick<MoveInChecklistData, 'tenantId' | 'status'> | null | undefined
): boolean {
  if (!user || !conversation || !checklist) return false;
  if (user.status !== 'active' || user.role !== 'tenant') return false;
  if (conversation.tenantId !== user.id || checklist.tenantId !== user.id) return false;
  return checklist.status === 'pending_tenant';
}

export function buildDefaultMoveInChecklist(params: {
  agreement: Pick<
    RentalAgreementData,
    | 'agreementId'
    | 'propertyId'
    | 'propertyTitle'
    | 'landlordId'
    | 'landlordName'
    | 'tenantId'
    | 'tenantName'
    | 'startDate'
    | 'utilitiesIncluded'
  >;
  property?: Property;
  now?: Date;
}): MoveInChecklistData {
  const { agreement, property } = params;
  const now = params.now ?? new Date();
  const amenities = new Set(
    [...(agreement.utilitiesIncluded || []), ...(property?.amenities || [])].map((a) =>
      a.toLowerCase()
    )
  );

  const hasGenerator = Array.from(amenities).some((a) => a.includes('generator'));
  const hasInternet = Array.from(amenities).some(
    (a) => a.includes('wifi') || a.includes('internet') || a.includes('fiber')
  );
  const hasWaterTank = Array.from(amenities).some(
    (a) => a.includes('water') || a.includes('tank')
  );

  const defaultItems: MoveInChecklistItem[] = [
    {
      id: 'chk-elec',
      category: 'Utilities',
      name: 'Main Electricity Supply & Breaker Panel',
      condition: 'Good',
      notes: 'All wall sockets and switches tested operational',
    },
    {
      id: 'chk-water',
      category: 'Utilities',
      name: hasWaterTank
        ? 'Municipal Water Supply & Reserve Tank Pump'
        : 'Municipal Water Supply & Pressure',
      condition: 'Good',
      notes: hasWaterTank ? 'Reserve tank clean and pump functional' : 'Continuous flow verified',
    },
    {
      id: 'chk-gen',
      category: 'Utilities',
      name: 'Backup Generator / Inverter Line',
      condition: hasGenerator ? 'Good' : 'N/A',
      notes: hasGenerator ? 'Automatic transfer checked' : 'Not included on premises',
    },
    {
      id: 'chk-net',
      category: 'Utilities',
      name: 'Ethio Telecom Fiber / Internet Port',
      condition: hasInternet ? 'Good' : 'Fair',
      notes: hasInternet ? 'Fiber ONT outlet active' : 'Ready for tenant subscription',
    },
    {
      id: 'chk-stove',
      category: 'Appliances',
      name: 'Kitchen Stove / Electric Range & Hood',
      condition: 'Good',
      notes: 'Clean burners and oven verified',
    },
    {
      id: 'chk-boiler',
      category: 'Appliances',
      name: 'Electric Water Heater (Boiler)',
      condition: 'Good',
      notes: 'Hot water reaches normal temperature without leaks',
    },
    {
      id: 'chk-fridge',
      category: 'Appliances',
      name: 'Refrigerator & Freezer Seals',
      condition: 'Good',
      notes: 'Clean interior shelves and cooling verified',
    },
    {
      id: 'chk-washer',
      category: 'Appliances',
      name: 'Washing Machine & Drain Hose',
      condition: 'Good',
      notes: 'No leaks during spin check',
    },
    {
      id: 'chk-locks',
      category: 'Fixtures & Keys',
      name: 'Main Door, Window Latches & Compound Gate Locks',
      condition: 'Good',
      notes: 'Locks operate smoothly',
    },
    {
      id: 'chk-plumbing',
      category: 'Fixtures & Keys',
      name: 'Bathroom Faucets, Showers & Toilets',
      condition: 'Good',
      notes: 'No dripping taps or drainage blockage',
    },
  ];

  const baseId = sanitizePlainText(agreement.agreementId, 32) || 'GD-LEASE';
  const inspectionDate = normalizeDateIso(
    agreement.startDate,
    now.toISOString().slice(0, 10)
  );

  return sanitizeMoveInChecklistData({
    checklistId: `CHK-${baseId}`,
    agreementId: baseId,
    propertyId: agreement.propertyId,
    propertyTitle: agreement.propertyTitle,
    landlordId: agreement.landlordId,
    landlordName: agreement.landlordName,
    tenantId: agreement.tenantId,
    tenantName: agreement.tenantName,
    inspectionDate,
    electricityMeterReading: '',
    waterMeterReading: '',
    keysHandedOver: 2,
    items: defaultItems,
    status: 'pending_tenant',
    tenantGeneralNotes: '',
  });
}

export function sanitizeMoveInChecklistItem(
  item: MoveInChecklistItem,
  index: number
): MoveInChecklistItem {
  const category = VALID_CATEGORIES.has(item.category) ? item.category : 'Utilities';
  const condition = VALID_CONDITIONS.has(item.condition) ? item.condition : 'Good';
  const safeName = sanitizePlainText(item.name, 100) || `Inspection Item ${index + 1}`;
  const safeId =
    sanitizePlainText(item.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || `chk-item-${index + 1}`;

  return {
    id: safeId,
    category,
    name: safeName,
    condition,
    notes: sanitizePlainText(item.notes ?? '', 240),
  };
}

export function sanitizeMoveInChecklistData(raw: MoveInChecklistData): MoveInChecklistData {
  const todayIso = new Date().toISOString().slice(0, 10);
  const safeItems = Array.isArray(raw.items)
    ? raw.items.slice(0, 30).map((it, idx) => sanitizeMoveInChecklistItem(it, idx))
    : [];

  const isSigned = raw.status === 'signed' && !!sanitizePlainText(raw.tenantSignature ?? '', 80);

  return {
    checklistId: sanitizePlainText(raw.checklistId, 40) || 'CHK-GD-001',
    agreementId: sanitizePlainText(raw.agreementId, 32) || 'GD-LEASE-001',
    propertyId: sanitizePlainText(raw.propertyId, 64),
    propertyTitle: sanitizePlainText(raw.propertyTitle, 120) || 'Rental Property',
    landlordId: sanitizePlainText(raw.landlordId, 64),
    landlordName: sanitizePlainText(raw.landlordName, 80) || 'Landlord',
    tenantId: sanitizePlainText(raw.tenantId, 64),
    tenantName: sanitizePlainText(raw.tenantName, 80) || 'Tenant',
    inspectionDate: normalizeDateIso(raw.inspectionDate, todayIso),
    electricityMeterReading: sanitizePlainText(raw.electricityMeterReading ?? '', 40),
    waterMeterReading: sanitizePlainText(raw.waterMeterReading ?? '', 40),
    keysHandedOver: clampKeys(raw.keysHandedOver),
    items: safeItems,
    status: isSigned ? 'signed' : 'pending_tenant',
    tenantSignature: isSigned ? sanitizePlainText(raw.tenantSignature ?? '', 80) : undefined,
    tenantSignedAt: isSigned
      ? sanitizePlainText(raw.tenantSignedAt ?? new Date().toISOString(), 40)
      : undefined,
    tenantAcknowledgement: isSigned ? Boolean(raw.tenantAcknowledgement) : false,
    tenantGeneralNotes: sanitizePlainText(raw.tenantGeneralNotes ?? '', 500),
  };
}

export function applyTenantSignOff(params: {
  checklist: MoveInChecklistData;
  user: Pick<User, 'id' | 'role' | 'status'>;
  conversation: Pick<Conversation, 'tenantId'>;
  updatedItems: MoveInChecklistItem[];
  electricityMeterReading?: string;
  waterMeterReading?: string;
  tenantGeneralNotes?: string;
  signature: string;
  acknowledged: boolean;
  now?: Date;
}): { ok: true; checklist: MoveInChecklistData } | { ok: false; error: string } {
  const { checklist, user, conversation, signature, acknowledged } = params;

  if (!canSignMoveInChecklist(user, conversation, checklist)) {
    return {
      ok: false,
      error: 'Only the active tenant on an unsigned move-in checklist can sign off.',
    };
  }

  if (!acknowledged) {
    return {
      ok: false,
      error: 'Please confirm the move-in condition acknowledgement checkbox before signing.',
    };
  }

  const cleanSig = sanitizePlainText(signature, 80);
  if (cleanSig.length < 2) {
    return {
      ok: false,
      error: 'Please enter your full name as your digital signature.',
    };
  }

  const signed = sanitizeMoveInChecklistData({
    ...checklist,
    items: params.updatedItems.length > 0 ? params.updatedItems : checklist.items,
    electricityMeterReading:
      params.electricityMeterReading !== undefined
        ? params.electricityMeterReading
        : checklist.electricityMeterReading,
    waterMeterReading:
      params.waterMeterReading !== undefined
        ? params.waterMeterReading
        : checklist.waterMeterReading,
    tenantGeneralNotes:
      params.tenantGeneralNotes !== undefined
        ? params.tenantGeneralNotes
        : checklist.tenantGeneralNotes,
    status: 'signed',
    tenantSignature: cleanSig,
    tenantSignedAt: (params.now ?? new Date()).toISOString(),
    tenantAcknowledgement: true,
  });

  return { ok: true, checklist: signed };
}

export function getChecklistSummaryCounts(checklist: MoveInChecklistData): {
  total: number;
  good: number;
  fair: number;
  needsRepair: number;
  notApplicable: number;
} {
  let good = 0;
  let fair = 0;
  let needsRepair = 0;
  let notApplicable = 0;
  for (const item of checklist.items) {
    if (item.condition === 'Good') good += 1;
    else if (item.condition === 'Fair') fair += 1;
    else if (item.condition === 'Needs Repair') needsRepair += 1;
    else notApplicable += 1;
  }
  return {
    total: checklist.items.length,
    good,
    fair,
    needsRepair,
    notApplicable,
  };
}

export function formatMoveInChecklistText(raw: MoveInChecklistData): string {
  const data = sanitizeMoveInChecklistData(raw);
  const counts = getChecklistSummaryCounts(data);

  const lines = [
    '====================================================================',
    '                    MOVE-IN CONDITION CHECKLIST                     ',
    '                  GojoDirect Utilities & Appliances Log             ',
    '====================================================================',
    `Checklist Ref      : ${data.checklistId}`,
    `Linked Agreement   : ${data.agreementId}`,
    `Property           : ${data.propertyTitle}`,
    `Landlord           : ${data.landlordName}`,
    `Tenant             : ${data.tenantName}`,
    `Inspection Date    : ${data.inspectionDate}`,
    `Keys Handed Over   : ${data.keysHandedOver}`,
    `Electricity Meter  : ${data.electricityMeterReading || 'Not recorded'}`,
    `Water Meter        : ${data.waterMeterReading || 'Not recorded'}`,
    `Status             : ${data.status === 'signed' ? 'Digitally Signed by Tenant' : 'Pending Tenant Sign-off'}`,
    `Summary            : ${counts.total} items (${counts.good} Good, ${counts.fair} Fair, ${counts.needsRepair} Needs Repair, ${counts.notApplicable} N/A)`,
    '',
    'INSPECTED ITEMS',
    ...data.items.map(
      (item, idx) =>
        `  ${idx + 1}. [${item.category}] ${item.name} — ${item.condition}${item.notes ? ` (${item.notes})` : ''}`
    ),
  ];

  if (data.tenantGeneralNotes) {
    lines.push('', `Tenant Move-in Notes: ${data.tenantGeneralNotes}`);
  }

  lines.push('');
  if (data.status === 'signed' && data.tenantSignature) {
    lines.push(
      `TENANT DIGITAL SIGN-OFF: ${data.tenantSignature}`,
      `Signed Timestamp       : ${data.tenantSignedAt || ''}`
    );
  } else {
    lines.push('TENANT DIGITAL SIGN-OFF: Pending signature upon move-in inspection');
  }
  lines.push('====================================================================');

  return lines.join('\n');
}

export function formatMoveInChecklistHtml(raw: MoveInChecklistData): string {
  const data = sanitizeMoveInChecklistData(raw);
  const counts = getChecklistSummaryCounts(data);
  const rowsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeChecklistHtml(item.category)}</td>
        <td><strong>${escapeChecklistHtml(item.name)}</strong></td>
        <td><span class="cond cond-${item.condition.toLowerCase().replace(/\s+/g, '-')}">${escapeChecklistHtml(item.condition)}</span></td>
        <td>${escapeChecklistHtml(item.notes || '—')}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Move-in Checklist - ${escapeChecklistHtml(data.checklistId)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 32px 16px; line-height: 1.5; }
    .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 36px 40px; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .brand { font-size: 12px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.04em; }
    h1 { margin: 4px 0 0; font-size: 20px; color: #0f172a; }
    .meta { font-size: 12px; color: #475569; text-align: right; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
    .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 12px; }
    .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { text-align: left; background: #f1f5f9; color: #334155; padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
    .cond { font-weight: 700; }
    .cond-good { color: #047857; }
    .cond-fair { color: #b45309; }
    .cond-needs-repair { color: #be123c; }
    .cond-n-a { color: #64748b; }
    .signoff { margin-top: 24px; padding: 14px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 13px; }
    .signoff.signed { border-color: #10b981; background: #ecfdf5; color: #065f46; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">GojoDirect · Move-in Inspection Record</div>
        <h1>Utilities &amp; Appliances Move-in Checklist</h1>
      </div>
      <div class="meta">
        <div><strong>Checklist:</strong> ${escapeChecklistHtml(data.checklistId)}</div>
        <div><strong>Agreement:</strong> ${escapeChecklistHtml(data.agreementId)}</div>
        <div><strong>Date:</strong> ${escapeChecklistHtml(data.inspectionDate)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="stat"><div class="stat-label">Property</div><strong>${escapeChecklistHtml(data.propertyTitle)}</strong></div>
      <div class="stat"><div class="stat-label">Landlord</div><strong>${escapeChecklistHtml(data.landlordName)}</strong></div>
      <div class="stat"><div class="stat-label">Tenant</div><strong>${escapeChecklistHtml(data.tenantName)}</strong></div>
      <div class="stat"><div class="stat-label">Electricity Meter</div><strong>${escapeChecklistHtml(data.electricityMeterReading || 'Not recorded')}</strong></div>
      <div class="stat"><div class="stat-label">Water Meter</div><strong>${escapeChecklistHtml(data.waterMeterReading || 'Not recorded')}</strong></div>
      <div class="stat"><div class="stat-label">Keys Handed Over</div><strong>${data.keysHandedOver} set(s)</strong></div>
    </div>

    <p style="font-size: 12px; color: #475569;">Summary: ${counts.total} items · ${counts.good} Good · ${counts.fair} Fair · ${counts.needsRepair} Needs Repair · ${counts.notApplicable} N/A</p>

    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Utility / Appliance</th>
          <th>Condition</th>
          <th>Inspection Notes</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${
      data.tenantGeneralNotes
        ? `<p style="font-size: 12px; margin-top: 14px;"><strong>Tenant General Notes:</strong> ${escapeChecklistHtml(data.tenantGeneralNotes)}</p>`
        : ''
    }

    <div class="signoff ${data.status === 'signed' ? 'signed' : ''}">
      ${
        data.status === 'signed' && data.tenantSignature
          ? `<strong>Digitally Signed by Tenant:</strong> ${escapeChecklistHtml(data.tenantSignature)}<br/><span>Signed At: ${escapeChecklistHtml(data.tenantSignedAt || '')}</span>`
          : `<strong>Tenant Digital Sign-off:</strong> Pending tenant inspection and signature upon move-in.`
      }
    </div>
  </div>
</body>
</html>`;
}

export function getSafeChecklistFilename(
  checklistId: string,
  ext: 'html' | 'txt' = 'html'
): string {
  const safeId =
    sanitizePlainText(checklistId, 40).replace(/[^a-zA-Z0-9_-]/g, '_') || 'Checklist';
  return `GojoDirect_MoveIn_Checklist_${safeId}.${ext}`;
}

export function downloadMoveInChecklistFile(
  checklist: MoveInChecklistData,
  format: 'html' | 'txt' = 'html'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const content =
    format === 'txt'
      ? formatMoveInChecklistText(checklist)
      : formatMoveInChecklistHtml(checklist);
  const mimeType = format === 'txt' ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getSafeChecklistFilename(checklist.checklistId, format);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
