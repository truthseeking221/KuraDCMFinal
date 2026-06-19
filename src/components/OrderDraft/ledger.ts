import type { OrderLedgerImpact, OrderRouteId, PaymentStatus, PlacedOrderSummary, PscPayChoice } from "./types";

export const DOCTOR_COMMISSION_RATE = 0.15;
export const DOCTOR_FEE_MAX_ABSOLUTE = 20;
export const DOCTOR_FEE_MAX_SHARE = 0.3;

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function getDoctorFeeMax(subtotal: number): number {
  return roundMoney(Math.max(0, Math.min(DOCTOR_FEE_MAX_ABSOLUTE, subtotal * DOCTOR_FEE_MAX_SHARE)));
}

export function clampDoctorFee(value: number, subtotal: number): number {
  const next = Number.isFinite(value) ? value : 0;
  return roundMoney(Math.max(0, Math.min(getDoctorFeeMax(subtotal), next)));
}

export function normalizePayChoiceForRoute(route: OrderRouteId, pscPay: PscPayChoice | null): PscPayChoice {
  if (route === "psc") return pscPay === "later" || pscPay === "khqr" ? pscPay : "khqr";
  return pscPay === "cash" || pscPay === "khqr" ? pscPay : "khqr";
}

export function isDirectKuraPayment(pscPay: PscPayChoice | null): boolean {
  return pscPay === "khqr";
}

export function paymentChoiceFromOrder(order: PlacedOrderSummary): PscPayChoice | null {
  const label = order.payment.label.toLowerCase();
  if (label.includes("cash")) return "cash";
  if (label.includes("khqr")) return "khqr";
  if (order.route === "psc") return "later";
  return "khqr";
}

export function buildOrderLedgerImpact({
  subtotal,
  statFee = 0,
  doctorFee = 0,
  pscPay,
  paymentStatus,
}: {
  subtotal: number;
  statFee?: number;
  doctorFee?: number;
  pscPay: PscPayChoice | null;
  paymentStatus?: PaymentStatus;
}): OrderLedgerImpact {
  const normalizedSubtotal = roundMoney(Math.max(0, subtotal));
  const normalizedStatFee = roundMoney(Math.max(0, statFee));
  const safeDoctorFee = clampDoctorFee(doctorFee, normalizedSubtotal);
  const labTotal = roundMoney(normalizedSubtotal + normalizedStatFee);
  const doctorCommission = roundMoney(labTotal * DOCTOR_COMMISSION_RATE);
  const doctorEarns = roundMoney(doctorCommission + safeDoctorFee);
  const patientTotal = roundMoney(labTotal + safeDoctorFee);
  const kuraShare = roundMoney(Math.max(0, labTotal - doctorCommission));
  const isCash = pscPay === "cash";
  const isConfirmed = paymentStatus === "collected" || paymentStatus === "claimed";
  const kind = isCash ? "doctor-owes-kura" : isConfirmed ? "earning-confirmed" : "earning-pending";
  const doctorOwes = isCash ? kuraShare : 0;
  const balanceDelta = kind === "doctor-owes-kura" ? -doctorOwes : doctorEarns;
  const settlementCopy =
    kind === "doctor-owes-kura"
      ? "Cash is with the clinic. Settle the Kura share after pickup."
      : kind === "earning-confirmed"
        ? "Earning is added after payment confirmation."
        : pscPay === "later"
          ? "Earning stays pending until the PSC collects payment."
          : "Earning stays pending until the patient pays Kura.";

  return {
    kind,
    patientTotal,
    kuraShare,
    doctorCommission,
    doctorFee: safeDoctorFee,
    doctorEarns,
    doctorOwes,
    balanceDelta,
    settlementCopy,
  };
}

export function deriveOrderLedgerImpact(order: PlacedOrderSummary): OrderLedgerImpact {
  const pscPay = paymentChoiceFromOrder(order);
  const statFee = order.statFee ?? 0;
  const doctorFee = order.ledgerImpact?.doctorFee ?? 0;
  const subtotal = roundMoney(Math.max(0, order.total - statFee - doctorFee));
  return buildOrderLedgerImpact({
    subtotal,
    statFee,
    doctorFee,
    pscPay,
    paymentStatus: order.payment.status,
  });
}

export function refreshOrderLedgerImpact(order: PlacedOrderSummary): PlacedOrderSummary {
  const ledgerImpact = deriveOrderLedgerImpact(order);
  return { ...order, ledgerImpact, total: ledgerImpact.patientTotal };
}

export function getLedgerImpactLabel(ledger: OrderLedgerImpact): string {
  if (ledger.kind === "doctor-owes-kura") return "Doctor owes Kura";
  if (ledger.kind === "earning-confirmed") return "Earning added";
  return "Earning pending";
}

export function getLedgerImpactValue(ledger: OrderLedgerImpact): number {
  return ledger.kind === "doctor-owes-kura" ? ledger.doctorOwes : ledger.doctorEarns;
}
