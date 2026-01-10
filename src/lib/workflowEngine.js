// Workflow Engine for Niche-Specific Automation (RAF-GS authoritative version)

import { createClient } from "@supabase/supabase-js";

import { evaluateRAFGS } from "../engine/rafgsEngine.js";
import {
  RAFGSState,
  RAFGSEvent,
  transitionState
} from "../engine/rafgsFSM.js";

// -------------------- Supabase (server-side only) --------------------

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// IMPORTANT: update this on each RAF-GS logic change
const RAFGS_ENGINE_VERSION = "1.0";
const RAFGS_ENGINE_COMMIT = "2c417e2"; // e.g. "a9f3c2d"

// -------------------------------------------------------------------

export class WorkflowEngine {
  constructor() {
    this.automations = new Map();
  }

  static getInstance() {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  async initialize() {
    const { data, error } = await supabase
      .from("workflow_automations")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading workflow automations:", error);
      return;
    }

    this.automations.clear();
    data.forEach(a => {
      if (!this.automations.has(a.trigger_event)) {
        this.automations.set(a.trigger_event, []);
      }
      this.automations.get(a.trigger_event).push(a);
    });

    console.log(`✅ Workflow Engine initialized with ${data.length} automations`);
  }

  async triggerWorkflow(event, data) {
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
        setTimeout(() => {
          this.executeAutomation(automation, data);
        }, automation.delay_minutes * 60 * 1000);
      } else {
        await this.executeAutomation(automation, data);
      }
    }
  }

  async executeAutomation(automation, data) {
    if (!data.lead_id) return;

    // FIX 2: Capture now once for determinism
    const now = new Date();

    // -------------------- Load RAF-GS context --------------------

    const [{ data: lead }, { data: messages }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", data.lead_id).single(),
      supabase
        .from("messages")
        .select("sent_at, direction")
        .eq("lead_id", data.lead_id)
    ]);

    const inboundTimes = (messages || [])
      .filter(m => m.direction === "in")
      .map(m => new Date(m.sent_at));

    const decision = evaluateRAFGS({
      currentState: lead.rafgs_state || RAFGSState.NEW,
      lastOutboundAt: lead.last_outbound_at
        ? new Date(lead.last_outbound_at)
        : undefined,
      inboundMessageTimes: inboundTimes,
      delayMinutes: automation.delay_minutes,
      now
    });

    // -------------------- Audit log (MANDATORY) --------------------

    await supabase.from("automation_logs").insert({
      user_id: data.user_id,
      lead_id: data.lead_id,
      action_type: automation.action_type,
      executed_at: now.toISOString(),
      data: {
        rafgs_decision: decision,
        rafgs_version: RAFGS_ENGINE_VERSION,
        engine: "RAF-GS",
        engine_commit: RAFGS_ENGINE_COMMIT,
        trigger_event: automation.trigger_event
      }
    });

    if (decision.action === "SKIP") {
      return;
    }

    // -------------------- Execute action --------------------

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
        return;
    }

    // -------------------- Record outbound message --------------------

    await supabase.from("messages").insert({
      user_id: data.user_id,
      lead_id: data.lead_id,
      channel: "email",
      direction: "out",
      sent_at: now.toISOString()
    });

    // -------------------- FSM transition --------------------

    const nextState = transitionState(
      lead.rafgs_state || RAFGSState.NEW,
      RAFGSEvent.OUTBOUND_SENT
    );

    await supabase
      .from("leads")
      .update({
        rafgs_state: nextState,
        last_outbound_at: now.toISOString()
      })
      .eq("id", data.lead_id);
  }

  // -------------------- Execution helpers --------------------

  async sendReviewRequest(data) {
    const { createReviewRequest, getReviewRequestData } =
      await import("./reviewRequestSystem.js");

    const reviewData = await getReviewRequestData(data.booking_id);
    if (!reviewData) return;

    await createReviewRequest(reviewData);
  }

  async sendReferralOffer(data) {
    const { createReferralOffer } =
      await import("./referralSystem.js");

    await createReferralOffer(data.review_id);
  }

  async updateLeadStatus(data) {
    await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", data.lead_id);
  }

  async sendBookingConfirmation(data) {
    console.log(`Booking confirmation sent to ${data.customer_name}`);
  }
}

export const workflowEngine = WorkflowEngine.getInstance();
