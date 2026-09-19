/**
 * AIFIE Revenue Agent - Invoicing, Billing & Real Revenue Ledger
 * Zero external dependencies. Pure Node.js ESM.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { getServiceById } from "./service-catalog.mjs";

const DEFAULT_INVOICE_PATH = resolve(process.cwd(), "data", "revenue-invoices.json");

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED"
};

export class InvoiceManager {
  constructor(storagePath = DEFAULT_INVOICE_PATH) {
    this.storagePath = storagePath;
    this.invoices = new Map();
    this.totalCollectedInr = 0;
    this.totalProfitInr = 0;
    this.loadState();
  }

  loadState() {
    try {
      if (existsSync(this.storagePath)) {
        const raw = readFileSync(this.storagePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.invoices)) {
          for (const inv of data.invoices) {
            this.invoices.set(inv.id, inv);
          }
        }
        this.totalCollectedInr = Number(data.totalCollectedInr || 0);
        this.totalProfitInr = Number(data.totalProfitInr || 0);
      }
    } catch {
      // Fallback
    }
  }

  saveState() {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data = {
        updatedAt: new Date().toISOString(),
        totalCollectedInr: this.totalCollectedInr,
        totalProfitInr: this.totalProfitInr,
        invoices: Array.from(this.invoices.values())
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Best-effort
    }
  }

  /**
   * Generate an official commercial invoice
   */
  createInvoice({
    clientId,
    clientName,
    clientEmail,
    serviceId,
    tier = "starter",
    customAmountInr = null,
    dueDays = 7,
    notes = "Payment terms: Net 7. Deliverables initiated upon payment."
  }) {
    const service = getServiceById(serviceId);
    if (!service) throw new Error(`Invalid service ID: ${serviceId}`);

    const tierConfig = service.pricingTiers[tier] || service.pricingTiers.starter;
    const amountInr = customAmountInr || tierConfig.inr;
    const amountUsd = Number((amountInr / 83.5).toFixed(2));

    const year = new Date().getFullYear();
    const count = this.invoices.size + 1;
    const invoiceId = `INV-${year}-${count.toString().padStart(4, "0")}`;

    const now = new Date();
    const dueDate = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);

    const paymentMethods = {
      upi: process.env.BANK_UPI_ID || "aifie.billing@okaxis",
      bankTransfer: {
        accountName: "Aifie AI Agent Enterprise Solutions",
        bank: "HDFC Bank",
        ifsc: "HDFC0000240",
        accountNumber: "5020008892143"
      },
      international: {
        stripePaymentLink: "https://buy.stripe.com/aifie_services_intl",
        supportedCurrencies: ["USD", "EUR", "GBP", "INR"]
      }
    };

    const invoice = {
      id: invoiceId,
      clientId,
      clientName,
      clientEmail,
      serviceId: service.id,
      serviceName: service.name,
      tierName: tierConfig.name,
      deliverables: tierConfig.deliverables,
      marginPercent: service.marginPercent,
      amountInr,
      amountUsd,
      status: INVOICE_STATUS.SENT,
      issuedAt: now.toISOString(),
      dueAt: dueDate.toISOString(),
      paidAt: null,
      transactionRef: null,
      paymentMethod: null,
      paymentInstructions: paymentMethods,
      notes
    };

    this.invoices.set(invoiceId, invoice);
    this.saveState();
    return invoice;
  }

  /**
   * Mark an invoice as paid & record collected revenue and profit
   */
  recordPayment(invoiceId, {
    method = "UPI",
    transactionRef = `TXN-${Date.now().toString(36).toUpperCase()}`,
    paidAmountInr = null
  } = {}) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    if (invoice.status === INVOICE_STATUS.PAID) {
      return { success: false, message: "Invoice already paid", invoice };
    }

    const collected = paidAmountInr || invoice.amountInr;
    const profit = Number((collected * (invoice.marginPercent / 100)).toFixed(2));

    invoice.status = INVOICE_STATUS.PAID;
    invoice.paidAt = new Date().toISOString();
    invoice.paymentMethod = method;
    invoice.transactionRef = transactionRef;
    invoice.actualCollectedInr = collected;
    invoice.calculatedProfitInr = profit;

    this.totalCollectedInr = Number((this.totalCollectedInr + collected).toFixed(2));
    this.totalProfitInr = Number((this.totalProfitInr + profit).toFixed(2));

    this.saveState();

    const receipt = {
      receiptId: `REC-${Date.now().toString(36).toUpperCase()}`,
      invoiceId: invoice.id,
      clientName: invoice.clientName,
      serviceName: invoice.serviceName,
      amountPaid: `₹${collected.toLocaleString()}`,
      paymentMethod: method,
      transactionRef,
      paidAt: invoice.paidAt,
      fulfillmentStatus: "AUTHORIZED_FOR_IMMEDIATE_DELIVERY"
    };

    return {
      success: true,
      invoice,
      receipt,
      totalCollectedInr: this.totalCollectedInr,
      totalProfitInr: this.totalProfitInr
    };
  }

  /**
   * Financial Summary Metrics
   */
  getFinancialSummary() {
    const invoicesArr = Array.from(this.invoices.values());
    const paidInvoices = invoicesArr.filter(i => i.status === INVOICE_STATUS.PAID);
    const pendingInvoices = invoicesArr.filter(i => i.status === INVOICE_STATUS.SENT);

    const pendingAccountsReceivableInr = pendingInvoices.reduce((acc, i) => acc + i.amountInr, 0);

    return {
      totalInvoicesCount: invoicesArr.length,
      paidInvoicesCount: paidInvoices.length,
      pendingInvoicesCount: pendingInvoices.length,
      totalCollectedRevenueInr: this.totalCollectedInr,
      totalNetProfitInr: this.totalProfitInr,
      pendingReceivableInr: pendingAccountsReceivableInr,
      averageOrderValueInr: paidInvoices.length > 0 ? Number((this.totalCollectedInr / paidInvoices.length).toFixed(2)) : 0
    };
  }
}

export const InvoiceAndBillingManager = InvoiceManager;
