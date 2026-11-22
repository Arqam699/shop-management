export const getInstallmentRevisionLabel = (plan = {}) => {
  const revisionNumber = Number(
    plan.revisionNumber ?? plan.installmentPlanRevisionNumber ?? 0
  );
  if (revisionNumber <= 0) return '';

  let direction = plan.lastRevisionChange || plan.installmentPlanRevisionDirection || '';
  if (!direction && Array.isArray(plan.revisions) && plan.revisions.length > 0) {
    const previousPlan = plan.revisions[plan.revisions.length - 1];
    const previousDuration = Number(previousPlan.selectedDuration || previousPlan.duration || 0);
    const currentDuration = Number(plan.selectedDuration || plan.duration || 0);
    direction = currentDuration > previousDuration
      ? 'Increase'
      : currentDuration < previousDuration ? 'Decrease' : 'Same';
  }

  const label = direction === 'Increase'
    ? 'Increased Revised Plan'
    : direction === 'Decrease'
      ? 'Decreased Revised Plan'
      : 'Revised Plan';
  return `${label}${revisionNumber > 1 ? ` · Rev ${revisionNumber}` : ''}`;
};
