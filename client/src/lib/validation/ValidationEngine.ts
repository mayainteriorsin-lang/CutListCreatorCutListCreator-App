/**
 * ValidationEngine
 * 
 * NOTE TO CLAUDE:
 * MOVE the following from home.tsx:
 * 
 * - collectMissingLaminateDetails(cabinet)
 * - validateShutterLaminate()
 * - validateInnerLaminateRules()
 * - validateBeforeAddCabinet()
 * - validateBeforeOptimize()
 * 
 * DO NOT change logic.
 * DO NOT change rule order.
 * DO NOT change wording of messages.
 * 
 * Only MOVE the code here.
 */

type MissingLaminateDetail = {
  panel: string;
  missingFront: boolean;
  missingInner: boolean;
};

type MissingLaminateResult = {
  needsConfirmation: boolean;
  details: MissingLaminateDetail[];
  formattedMessages: string[];
};

function formatMissingLaminateMessages(details: MissingLaminateDetail[]) {
  return details.map(d =>
    d.missingFront && d.missingInner ? `${d.panel}: Missing both front and inner laminate` :
      d.missingFront ? `${d.panel}: Missing front laminate` :
        `${d.panel}: Missing inner laminate`
  );
}

function getCabinetMode(cabinet: any): 'basic' | 'advanced' {
  return cabinet?.configurationMode === 'basic' ? 'basic' : 'advanced';
}

function getTrackingSet(cabinet: any): Set<string> {
  const candidate = cabinet?.__validationTracking ?? cabinet?.userSelectedLaminates ?? cabinet?.laminateTracking;
  return candidate instanceof Set ? candidate : new Set();
}

function requiresMaterialConfirmation({ laminateCode }: { plywood?: string; laminateCode?: string }): boolean {
  const normalizedLaminate = (laminateCode || '').trim().toLowerCase();

  if (normalizedLaminate === '' || normalizedLaminate === 'none') {
    return true;
  }

  return false;
}

function validateInnerLaminateRules(
  panels: Array<{
    label: string;
    frontCode?: string;
    innerCode?: string;
    frontField: string;
    innerField: string;
  }>,
  trackingSet: Set<string>
): MissingLaminateDetail[] {
  const details: MissingLaminateDetail[] = [];

  for (const panel of panels) {
    const hasFrontCode = !!(panel.frontCode && panel.frontCode.trim());
    const hasInnerCode = !!(panel.innerCode && panel.innerCode.trim());
    const isFrontUserSelected = trackingSet.has(panel.frontField);
    const isInnerUserSelected = trackingSet.has(panel.innerField);

    const missingFront = !hasFrontCode || !isFrontUserSelected;
    const missingInner = !hasInnerCode || !isInnerUserSelected;

    if (missingFront || missingInner) {
      details.push({
        panel: panel.label,
        missingFront,
        missingInner
      });
    }
  }

  return details;
}

function collectMissingLaminateDetailsInternal(
  cabinet: any,
  mode: 'basic' | 'advanced',
  trackingSet: Set<string>,
  requireTrackingForBasic: boolean
): MissingLaminateResult {
  const details: MissingLaminateDetail[] = [];

  if (mode === 'basic') {
    const hasShutterCode = !!(cabinet.shutterLaminateCode && cabinet.shutterLaminateCode.trim());
    const isShutterUserSelected = trackingSet.has('shutterLaminateCode');

    if (!hasShutterCode || (requireTrackingForBasic && !isShutterUserSelected)) {
      details.push({
        panel: 'Shutter',
        missingFront: true,
        missingInner: false
      });
    }

    const formattedMessages = formatMissingLaminateMessages(details);
    return { needsConfirmation: details.length > 0, details, formattedMessages };
  }

  const panels = [
    { key: 'top', label: 'Top Panel', frontCode: cabinet.topPanelLaminateCode, innerCode: cabinet.topPanelInnerLaminateCode, frontField: 'topPanelLaminateCode', innerField: 'topPanelInnerLaminateCode' },
    { key: 'bottom', label: 'Bottom Panel', frontCode: cabinet.bottomPanelLaminateCode, innerCode: cabinet.bottomPanelInnerLaminateCode, frontField: 'bottomPanelLaminateCode', innerField: 'bottomPanelInnerLaminateCode' },
    { key: 'left', label: 'Left Panel', frontCode: cabinet.leftPanelLaminateCode, innerCode: cabinet.leftPanelInnerLaminateCode, frontField: 'leftPanelLaminateCode', innerField: 'leftPanelInnerLaminateCode' },
    { key: 'right', label: 'Right Panel', frontCode: cabinet.rightPanelLaminateCode, innerCode: cabinet.rightPanelInnerLaminateCode, frontField: 'rightPanelLaminateCode', innerField: 'rightPanelInnerLaminateCode' },
    { key: 'back', label: 'Back Panel', frontCode: cabinet.backPanelLaminateCode, innerCode: cabinet.backPanelInnerLaminateCode, frontField: 'backPanelLaminateCode', innerField: 'backPanelInnerLaminateCode' }
  ];

  const advancedDetails = validateInnerLaminateRules(panels, trackingSet);
  const formattedMessages = formatMissingLaminateMessages(advancedDetails);

  return { needsConfirmation: advancedDetails.length > 0, details: advancedDetails, formattedMessages };
}

function collectMissingLaminateDetailsWithTracking(
  cabinet: any,
  mode: 'basic' | 'advanced',
  trackingSet: Set<string>
): MissingLaminateResult {
  return collectMissingLaminateDetailsInternal(cabinet, mode, trackingSet, false);
}

export function collectMissingLaminateDetails(cabinet: any) {
  const mode = getCabinetMode(cabinet);
  const trackingSet = getTrackingSet(cabinet);
  return collectMissingLaminateDetailsInternal(cabinet, mode, trackingSet, true);
}

export function validateCabinetLaminate(cabinet: any) {
  const result = collectMissingLaminateDetails(cabinet);
  return {
    valid: !result.needsConfirmation,
    missing: result.formattedMessages,
  };
}

export function validateShutterLaminate(shutters: any[]) {
  const details: MissingLaminateDetail[] = [];
  let hasLaminate = false;

  if (Array.isArray(shutters)) {
    hasLaminate = shutters.some((shutter) => (shutter?.laminateCode || '').trim());
  } else if (shutters && typeof shutters === 'object') {
    hasLaminate = !!(shutters.shutterLaminateCode && shutters.shutterLaminateCode.trim());
  }

  if (!hasLaminate && Array.isArray(shutters) && shutters.length > 0) {
    details.push({
      panel: 'Shutter',
      missingFront: true,
      missingInner: false
    });
  }

  if (!hasLaminate && shutters && !Array.isArray(shutters)) {
    details.push({
      panel: 'Shutter',
      missingFront: true,
      missingInner: false
    });
  }

  const formattedMessages = formatMissingLaminateMessages(details);
  return {
    valid: details.length === 0,
    missing: formattedMessages,
  };
}

export function validateBeforeAddCabinet(cabinet: any) {
  const mode = getCabinetMode(cabinet);
  const updatedTracking = new Set(getTrackingSet(cabinet));

  if (mode === 'basic') {
    if (cabinet.shutterLaminateCode && cabinet.shutterLaminateCode.trim()) {
      updatedTracking.add('shutterLaminateCode');
    }
  } else {
    const panelFields = [
      { frontCode: cabinet.topPanelLaminateCode, innerCode: cabinet.topPanelInnerLaminateCode, frontField: 'topPanelLaminateCode', innerField: 'topPanelInnerLaminateCode' },
      { frontCode: cabinet.bottomPanelLaminateCode, innerCode: cabinet.bottomPanelInnerLaminateCode, frontField: 'bottomPanelLaminateCode', innerField: 'bottomPanelInnerLaminateCode' },
      { frontCode: cabinet.leftPanelLaminateCode, innerCode: cabinet.leftPanelInnerLaminateCode, frontField: 'leftPanelLaminateCode', innerField: 'leftPanelInnerLaminateCode' },
      { frontCode: cabinet.rightPanelLaminateCode, innerCode: cabinet.rightPanelInnerLaminateCode, frontField: 'rightPanelLaminateCode', innerField: 'rightPanelInnerLaminateCode' },
      { frontCode: cabinet.backPanelLaminateCode, innerCode: cabinet.backPanelInnerLaminateCode, frontField: 'backPanelLaminateCode', innerField: 'backPanelInnerLaminateCode' }
    ];

    for (const panel of panelFields) {
      if (panel.frontCode && panel.frontCode.trim()) {
        updatedTracking.add(panel.frontField);
      }
      if (panel.innerCode && panel.innerCode.trim()) {
        updatedTracking.add(panel.innerField);
      }
    }
  }

  const laminateCheck = collectMissingLaminateDetailsWithTracking(cabinet, mode, updatedTracking);

  return {
    valid: !laminateCheck.needsConfirmation,
    missing: laminateCheck.formattedMessages,
    updatedTracking,
  };
}

export function validateBeforeOptimize(cabinets: any[]) {
  const errors: Array<{ title: string; description: string }> = [];

  if (!Array.isArray(cabinets) || cabinets.length === 0) {
    errors.push({
      title: "No Cabinet to Preview",
      description: "Please add a cabinet first to see the preview."
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
