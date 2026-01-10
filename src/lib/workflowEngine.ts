// src/lib/workflowEngine.ts
// DEPRECATED / NON-AUTHORITATIVE
// Runtime uses workflowEngine.js as the canonical server runtime adapter.
// This file is kept for reference only and should not be used in production.

import { supabase } from "./supabaseClient";
import { generateText } from "./ollamaClient";
import { sendEmail } from "./sendEmail";

import { evaluateRAFGS } from "@/engine/rafgsEngine";
import { RAFGSState, RAFGSEvent, transitionState } from "@/engine/rafgsFSM";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface WorkflowAutomation {
  id: string;
  niche_template_id: string;
  trigger_event: string;
  delay_minutes: number;
  action_type: string;
  template_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowData {
  lead_id?: string;
  booking_id?: string;
  user_id: string;
  business_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_type?: string;
  booking_time?: string;
  review_link?: string;
  referral_link?: string;
  [key: string]: any;
}

/* ------------------------------------------------------------------ */
/* Workflow Engine (Adapter)                                           */
/* ------------------------------------------------------------------ */

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private automations: Map<string, WorkflowAutomation[]> = new Map();

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  /* -------------------------------------------------------------- */
  /* Initialization                                                  */
  /* -------------------------------------------------------------- */

  async initialize(): Promise<void> {
    const { data, error } = await supabase
      .from("workflow_automations")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to load workflow automations:", error);
      return;
    }

    this.automations.clear();
    data?.forEach(a => {
      if (!this.automations.has(a.trigger_event)) {
        this.automations.set(a.trigger_event, []);
      }
      this.automations.get(a.trigger_event)!.push(a);
    });

    console.log(`✅ WorkflowEngine initialized (${data?.length ?? 0} automations)`);
  }

  /* -------------------------------------------------------------- */
  /* Trigger Entry Point                                             */
  /* -------------------------------------------------------------- */

  async triggerWorkflow(event: string, data: WorkflowData): Promise<void> {
    const automations = this.automations.get(event) || [];

    for (const automation of automations) {
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("niche_template_id")
        .eq("user_id", data.user_id)
        .single();

      if (userSettings?.niche_template_id !== automation.niche_template_id) {
        continue;
      }

      if (automation.delay_minutes > 0) {
        setTimeout(
          () => this.executeAutomation(automation, data),
          automation.delay_minutes * 60 * 1000
        );
      } else {
        await this.executeAutomation(automation, data);
      }
    }
  }

  /* -------------------------------------------------------------- */
  /* RAF-GS Context Loader                                           */
  /* -------------------------------------------------------------- */

  private async loadRAFGSContext(leadId: string) {
    const { data: lead } = await supabase
      .from("leads")
      .select("rafgs_state, last_outbound_at")
      .eq("id", leadId)
      .single();

    const currentState: RAFGSState =
      (lead?.rafgs_state as RAFGSState) ?? RAFGSState.NEW;

    const lastOutboundAt = lead?.last_outbound_at
      ? new Date(lead.last_outbound_at)
      : undefined;

    const { data: messages } = await supabase
      .from("messages")
      .select("direction, sent_at")
      .eq("lead_id", leadId);

    const inboundMessageTimes =
      messages
        ?.filter(m => m.direction === "in" && m.sent_at)
        .map(m => new Date(m.sent_at))
        .filter(d => !isNaN(d.getTime())) ?? [];

    return { currentState, lastOutboundAt, inboundMessageTimes };
  }

  /* -------------------------------------------------------------- */
  /* Core Execution (RAF-GS enforced)                                */
  /* -------------------------------------------------------------- */

  private async executeAutomation(
    automation: WorkflowAutomation,
    data: WorkflowData
  ): Promise<void> {
    if (!data.lead_id) return;

    try {
      // BUG #2: Capture now once for determinism
      const now = new Date();
      const ctx = await this.loadRAFGSContext(data.lead_id);

      const decision = evaluateRAFGS({
        currentState: ctx.currentState,
        lastOutboundAt: ctx.lastOutboundAt,
        inboundMessageTimes: ctx.inboundMessageTimes,
        delayMinutes: automation.delay_minutes,
        now
      });

      // --- Audit log (MANDATORY for O-1 evidence) ---
      // FIX 5: Standardized to use data field for consistency with workflowEngine.js
      await supabase.from("automation_logs").insert({
        user_id: data.user_id,
        lead_id: data.lead_id,
        action_type: automation.action_type,
        executed_at: now.toISOString(),
        data: {
          rafgs_decision: decision,
          rafgs_version: "1.0",
          engine: "RAF-GS",
          engine_commit: "2c417e2",
          trigger_event: automation.trigger_event
        }
      });

      if (decision.action === "SKIP") {
        console.log(`⛔ RAF-GS blocked action`, decision.rule);
        return;
      }

      // --- Execute side effect ---
      await this.executeSideEffect(automation, data);

      // --- State transition ---
      const nextState = transitionState(
        ctx.currentState,
        RAFGSEvent.OUTBOUND_SENT
      );

      await supabase
        .from("leads")
        .update({
          rafgs_state: nextState,
          last_outbound_at: now.toISOString()
        })
        .eq("id", data.lead_id);

    } catch (err) {
      console.error("RAF-GS execution failure:", err);
    }
  }

  /* -------------------------------------------------------------- */
  /* Side Effects Only (NO decisions here)                           */
  /* -------------------------------------------------------------- */

  private async executeSideEffect(
    automation: WorkflowAutomation,
    data: WorkflowData
  ): Promise<void> {
    switch (automation.action_type) {
      case "send_review_request":
        await this.sendReviewRequest(data);
        break;
      case "send_referral_offer":
        await this.sendReferralOffer(data);
        break;
      case "update_lead_status":
        await this.updateLeadStatus(data);
        break;
      case "send_booking_confirmation":
        await this.sendBookingConfirmation(data);
        break;
      default:
        console.warn("Unknown automation action:", automation.action_type);
    }
  }

  /* -------------------------------------------------------------- */
  /* Original Action Handlers (unchanged behavior)                  */
  /* -------------------------------------------------------------- */

  private async sendReviewRequest(data: WorkflowData): Promise<void> {
    const template = await this.getNicheTemplate(data.user_id, "review_request");
    const prompt = this.buildReviewRequestPrompt(data, template);
    const message = await generateText(prompt);

    if (data.customer_email) {
      await sendEmail({
        to: data.customer_email,
        subject: `How was your visit to ${data.business_name}?`,
        body: message
      });
    }
  }

  private async sendReferralOffer(data: WorkflowData): Promise<void> {
    const referralCode = this.generateReferralCode(data.lead_id!);
    const referralLink = `https://${data.business_name
      .toLowerCase()
      .replace(/\s+/g, "")}.getgetleads.com/r/${referralCode}`;

    const template = await this.getNicheTemplate(data.user_id, "referral_offer");
    const prompt = this.buildReferralOfferPrompt(data, template, referralLink);
    const message = await generateText(prompt);

    if (data.customer_email) {
      await sendEmail({
        to: data.customer_email,
        subject: "Share the love — Get $10 off!",
        body: message
      });
    }

    await supabase.from("referrals").insert({
      referrer_lead_id: data.lead_id,
      referral_code: referralCode,
      link_url: referralLink,
      status: "active"
    });
  }

  private async updateLeadStatus(data: WorkflowData): Promise<void> {
    if (!data.lead_id) return;
    await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", data.lead_id);
  }

  private async sendBookingConfirmation(data: WorkflowData): Promise<void> {
    const template = await this.getNicheTemplate(
      data.user_id,
      "booking_confirmation"
    );
    const message = this.buildBookingConfirmationMessage(data, template);

    if (data.customer_email) {
      await sendEmail({
        to: data.customer_email,
        subject: `Your appointment at ${data.business_name} is confirmed`,
        body: message
      });
    }
  }

  /* -------------------------------------------------------------- */
  /* Helpers                                                        */
  /* -------------------------------------------------------------- */

  private async getNicheTemplate(userId: string, type: string): Promise<any> {
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("niche_template_id")
      .eq("user_id", userId)
      .single();

    const { data: template } = await supabase
      .from("niche_templates")
      .select("config")
      .eq("id", userSettings?.niche_template_id)
      .single();

    return template?.config?.content_templates?.[type] ?? null;
  }

  private buildReviewRequestPrompt(data: WorkflowData, template: any): string {
    return `Generate a friendly review request for ${data.customer_name} at ${data.business_name}.`;
  }

  private buildReferralOfferPrompt(
    data: WorkflowData,
    template: any,
    link: string
  ): string {
    return `Generate a referral message for ${data.customer_name}. Link: ${link}`;
  }

  private buildBookingConfirmationMessage(
    data: WorkflowData,
    template: any
  ): string {
    return template
      ?.replace("{{customer_name}}", data.customer_name)
      ?.replace("{{business_name}}", data.business_name)
      ?.replace("{{booking_time}}", data.booking_time ?? "");
  }

  private generateReferralCode(leadId: string): string {
    return `${leadId.slice(0, 4).toUpperCase()}${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
  }
}

/* ------------------------------------------------------------------ */

export const workflowEngine = WorkflowEngine.getInstance();
