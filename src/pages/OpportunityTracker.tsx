import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  Plus, Sparkles, ArrowRight, Building2, Lock, CheckCircle2, Circle,
  ShieldCheck, Link2, Copy, Trash2, Wallet, AlertTriangle, Clock, Send,
  ExternalLink, Eye, ChevronRight, RefreshCw, FileText
} from "lucide-react";

// ================= TYPES & ARCHITECTURE =================
export type PipelineStage =
  | "LEAD_CAPTURED"
  | "PROPOSAL_SENT"
  | "CONTRACT_DEPOSIT"
  | "SHARED_PROJECT_VIEW"
  | "MILESTONE_RELEASE"
  | "FINAL_PAYMENT_CLOSE"
  | "RETAIN_REFER";

export type SocialPlatform = "LinkedIn" | "YouTube" | "X (Twitter)" | "Instagram" | "TikTok" | "Newsletter" | "Website" | "Podcast";
export type AudienceSegment = "High-Ticket Client" | "Brand/Sponsor" | "Fan/Member" | "Peer";
export type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "DELIVERED" | "APPROVED";
export type EscrowTxType = "DEPOSIT_HELD" | "RELEASED" | "REFUNDED";

export interface PaymentDoc {
  id: string;
  type: "Invoice" | "Receipt" | "Contract" | "Deliverable" | "Change Order";
  title: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Signed" | "Held";
}

export interface ClientWorkLog {
  id: string;
  workDone: string;
  completedDate: string;
  platformPublished: SocialPlatform;
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  sequence: number;
  status: MilestoneStatus;
  deliverableNote?: string;
  deliveredAt?: string;
  approvedAt?: string;
  approvedBy?: "professional" | "client";
  isChangeOrder?: boolean;
}

export interface EscrowTransaction {
  id: string;
  type: EscrowTxType;
  amount: number;
  note?: string;
  milestoneId?: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  token: string;
  clientName?: string;
  clientEmail?: string;
  isActive: boolean;
  createdAt: string;
}

export interface OpportunityLead {
  id: string;
  name: string;
  handleOrEmail: string;
  companyOrRole: string;
  category: string;
  audienceSegment: AudienceSegment;
  pipelineStage: PipelineStage;
  dealValue: number;
  sourcePlatform: SocialPlatform;
  firstEngagedDate: string;
  lastInteraction: string;
  note: string;
  nextStep: string;
  clientFeedback?: string;
  hasOngoingBusiness: "Yes" | "No";
  documents: PaymentDoc[];
  workLogs: ClientWorkLog[];
  milestones: Milestone[];
  escrowTransactions: EscrowTransaction[];
  shareLink: ShareLink | null;
}

const DEFAULT_CATEGORIES = ["RETAINER", "BRAND STRATEGY", "SPONSORSHIP", "SPEAKING", "DEVELOPMENT"];

function rowToLead(row: any): OpportunityLead {
  return {
    id: row.id,
    name: row.name,
    handleOrEmail: row.handle_or_email ?? "",
    companyOrRole: row.company_or_role ?? "",
    category: row.category ?? "BRAND STRATEGY",
    audienceSegment: row.audience_segment ?? "High-Ticket Client",
    pipelineStage: row.pipeline_stage ?? "LEAD_CAPTURED",
    dealValue: Number(row.deal_value) || 0,
    sourcePlatform: row.source_platform ?? "LinkedIn",
    firstEngagedDate: row.first_engaged_date ?? "",
    lastInteraction: row.last_interaction ?? "",
    note: row.note ?? "",
    nextStep: row.next_step ?? "",
    clientFeedback: row.client_feedback ?? "",
    hasOngoingBusiness: row.has_ongoing_business ?? "No",
    documents: (row.opportunity_documents ?? []).map((d: any) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      amount: Number(d.amount) || 0,
      date: d.doc_date,
      status: d.status,
    })),
    workLogs: (row.opportunity_work_logs ?? []).map((w: any) => ({
      id: w.id,
      workDone: w.work_done,
      completedDate: w.completed_date,
      platformPublished: w.platform_published,
    })),
    milestones: (row.opportunity_milestones ?? [])
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        amount: Number(m.amount) || 0,
        sequence: m.sequence,
        status: m.status,
        deliverableNote: m.deliverable_note ?? "",
        deliveredAt: m.delivered_at,
        approvedAt: m.approved_at,
        approvedBy: m.approved_by,
        isChangeOrder: m.is_change_order ?? false,
      }))
      .sort((a: Milestone, b: Milestone) => a.sequence - b.sequence),
    escrowTransactions: (row.escrow_transactions ?? []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount) || 0,
      note: t.note ?? "",
      milestoneId: t.milestone_id,
      createdAt: t.created_at,
    })),
    shareLink: row.opportunity_share_links?.[0]
      ? {
          id: row.opportunity_share_links[0].id,
          token: row.opportunity_share_links[0].token,
          clientName: row.opportunity_share_links[0].client_name,
          clientEmail: row.opportunity_share_links[0].client_email,
          isActive: row.opportunity_share_links[0].is_active,
          createdAt: row.opportunity_share_links[0].created_at,
        }
      : null,
  };
}

function getEscrowBalance(lead: OpportunityLead): number {
  return lead.escrowTransactions.reduce((bal, tx) => {
    if (tx.type === "DEPOSIT_HELD") return bal + tx.amount;
    if (tx.type === "RELEASED" || tx.type === "REFUNDED") return bal - tx.amount;
    return bal;
  }, 0);
}

function getMilestonesTotal(lead: OpportunityLead): number {
  return lead.milestones.reduce((sum, m) => sum + m.amount, 0);
}

function getApprovedTotal(lead: OpportunityLead): number {
  return lead.milestones.filter((m) => m.status === "APPROVED").reduce((sum, m) => sum + m.amount, 0);
}

function generateToken(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 16);
}

export function OpportunityTracker() {
  const [activeMainTab, setActiveMainTab] = useState<"board" | "clients">("board");
  const [activeLifecycleTab, setActiveLifecycleTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showExplainer, setShowExplainer] = useState(true);
  const [selectedLeadForVault, setSelectedLeadForVault] = useState<OpportunityLead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [leads, setLeads] = useState<OpportunityLead[]>([]);
  const [newLead, setNewLead] = useState<Partial<OpportunityLead>>({
    name: "", handleOrEmail: "", companyOrRole: "", category: DEFAULT_CATEGORIES[0],
    audienceSegment: "High-Ticket Client", pipelineStage: "LEAD_CAPTURED", dealValue: 0,
    sourcePlatform: "LinkedIn", note: "", nextStep: "", hasOngoingBusiness: "No",
  });

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: leadRows }, { data: catRows }] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*, opportunity_documents(*), opportunity_work_logs(*), opportunity_milestones(*), escrow_transactions(*), opportunity_share_links(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("opportunity_categories").select("name").eq("user_id", user.id),
    ]);
    setLeads((leadRows ?? []).map(rowToLead));
    const customCats = (catRows ?? []).map((c) => c.name);
    setCategories([...new Set([...DEFAULT_CATEGORIES, ...customCats])]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // 7-Stage End-to-End Release Spine
  const stages: { id: PipelineStage; label: string; color: string; clientVisible: boolean; desc: string }[] = [
    { id: "LEAD_CAPTURED", label: "1. Lead Captured", color: "border-slate-400 text-slate-700 bg-slate-50", clientVisible: false, desc: "Internal inbound" },
    { id: "PROPOSAL_SENT", label: "2. Proposal & Price", color: "border-amber-500 text-amber-700 bg-amber-50", clientVisible: true, desc: "Client sees proposal" },
    { id: "CONTRACT_DEPOSIT", label: "3. Contract & Deposit", color: "border-blue-500 text-blue-700 bg-blue-50", clientVisible: true, desc: "Escrow pending" },
    { id: "SHARED_PROJECT_VIEW", label: "4. Shared Project View", color: "border-purple-500 text-purple-700 bg-purple-50", clientVisible: true, desc: "Live client portal" },
    { id: "MILESTONE_RELEASE", label: "5. Milestone Review", color: "border-indigo-500 text-indigo-700 bg-indigo-50", clientVisible: true, desc: "Approval & release" },
    { id: "FINAL_PAYMENT_CLOSE", label: "6. Paid & Closed", color: "border-emerald-500 text-emerald-700 bg-emerald-50", clientVisible: true, desc: "Settled in full" },
    { id: "RETAIN_REFER", label: "7. Retain & Refer", color: "border-teal-500 text-teal-700 bg-teal-50", clientVisible: false, desc: "Internal flywheel" },
  ];

  const calculateClientFinancials = (client: OpportunityLead) => {
    const totalCollected = client.documents.filter((d) => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);
    const totalHeld = getEscrowBalance(client);
    const totalAgreed = Math.max(client.dealValue, client.documents.filter((d) => d.type === "Contract" || d.type === "Invoice").reduce((max, d) => Math.max(max, d.amount), 0));
    const pendingBalance = Math.max(0, totalAgreed - totalCollected - totalHeld);
    const collectedPercentage = totalAgreed > 0 ? Math.min(100, Math.round((totalCollected / totalAgreed) * 100)) : 0;
    return { totalCollected, totalHeld, totalAgreed, pendingBalance, collectedPercentage };
  };

  const totalPipelineValue = leads.reduce((sum, l) => sum + l.dealValue, 0);
  const activeDealsCount = leads.filter((l) => l.pipelineStage !== "FINAL_PAYMENT_CLOSE" && l.pipelineStage !== "RETAIN_REFER").length;
  const closedWonCount = leads.filter((l) => l.pipelineStage === "FINAL_PAYMENT_CLOSE" || l.pipelineStage === "RETAIN_REFER").length;
  const closedWonRate = leads.length > 0 ? Math.round((closedWonCount / leads.length) * 100) : 0;
  const totalHeldAcrossPipeline = leads.reduce((sum, l) => sum + getEscrowBalance(l), 0);

  function updateLeadInState(leadId: string, updater: (lead: OpportunityLead) => OpportunityLead) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updater(l) : l)));
    setSelectedLeadForVault((prev) => (prev && prev.id === leadId ? updater(prev) : prev));
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const formatted = newCategoryName.trim().toUpperCase();
    if (!formatted || categories.includes(formatted)) {
      setNewCategoryName("");
      setIsAddingCategory(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("opportunity_categories").insert({ user_id: user.id, name: formatted });
    setCategories([...categories, formatted]);
    setActiveLifecycleTab(formatted.toLowerCase());
    setNewCategoryName("");
    setIsAddingCategory(false);
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.name || !newLead.handleOrEmail) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        name: newLead.name,
        handle_or_email: newLead.handleOrEmail,
        company_or_role: newLead.companyOrRole || "Independent",
        category: newLead.category || categories[0],
        audience_segment: newLead.audienceSegment || "High-Ticket Client",
        pipeline_stage: newLead.pipelineStage || "LEAD_CAPTURED",
        deal_value: Number(newLead.dealValue) || 0,
        source_platform: newLead.sourcePlatform || "LinkedIn",
        last_interaction: "Initial record created",
        note: newLead.note || "",
        next_step: newLead.nextStep || "Initial outreach",
        has_ongoing_business: newLead.hasOngoingBusiness || "No",
      })
      .select("*, opportunity_documents(*), opportunity_work_logs(*), opportunity_milestones(*), escrow_transactions(*), opportunity_share_links(*)")
      .single();

    if (!error && data) {
      setLeads([rowToLead(data), ...leads]);
    }
    setIsAddModalOpen(false);
    setNewLead({ name: "", handleOrEmail: "", companyOrRole: "", category: categories[0], audienceSegment: "High-Ticket Client", pipelineStage: "LEAD_CAPTURED", dealValue: 0, sourcePlatform: "LinkedIn", note: "", nextStep: "", hasOngoingBusiness: "No" });
  }

  const openAddModalForStage = (stageId: PipelineStage) => {
    setNewLead((prev) => ({ ...prev, pipelineStage: stageId }));
    setIsAddModalOpen(true);
  };

  async function handleStageMove(leadId: string, newStage: PipelineStage) {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, pipelineStage: newStage } : lead)));
    await supabase.from("opportunities").update({ pipeline_stage: newStage }).eq("id", leadId);
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setTimeout(() => setIsDragging(false), 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedLeadId;
    if (id) handleStageMove(id, targetStage);
    setDraggedLeadId(null);
  };

  const handleCardClick = (lead: OpportunityLead) => {
    if (!isDragging) setSelectedLeadForVault(lead);
  };

  async function handleUpdateLead(updatedLead: OpportunityLead) {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLeadForVault(updatedLead);
    await supabase.from("opportunities").update({
      pipeline_stage: updatedLead.pipelineStage,
      client_feedback: updatedLead.clientFeedback,
      has_ongoing_business: updatedLead.hasOngoingBusiness,
    }).eq("id", updatedLead.id);
  }

  async function handleAddDocument(leadId: string, doc: Omit<PaymentDoc, "id" | "date">) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("opportunity_documents")
      .insert({ opportunity_id: leadId, user_id: user.id, type: doc.type, title: doc.title, amount: doc.amount, status: doc.status })
      .select()
      .single();
    if (!error && data) {
      const newDoc: PaymentDoc = { id: data.id, type: data.type, title: data.title, amount: Number(data.amount), date: data.doc_date, status: data.status };
      updateLeadInState(leadId, (l) => ({ ...l, documents: [...l.documents, newDoc] }));
    }
  }

  async function handleAddMilestone(leadId: string, milestone: { title: string; amount: number; isChangeOrder?: boolean }) {
    const { data: { user } } = await supabase.auth.getUser();
    const lead = leads.find((l) => l.id === leadId);
    if (!user || !lead || !milestone.title.trim() || milestone.amount <= 0) return;
    const nextSequence = lead.milestones.length + 1;
    const { data, error } = await supabase
      .from("opportunity_milestones")
      .insert({
        opportunity_id: leadId,
        user_id: user.id,
        title: milestone.title.trim(),
        amount: milestone.amount,
        sequence: nextSequence,
        status: nextSequence === 1 ? "IN_PROGRESS" : "NOT_STARTED",
        is_change_order: milestone.isChangeOrder ?? false,
      })
      .select()
      .single();
    if (!error && data) {
      const newMs: Milestone = {
        id: data.id, title: data.title, amount: Number(data.amount), sequence: data.sequence,
        status: data.status, deliverableNote: data.deliverable_note ?? "",
        deliveredAt: data.delivered_at, approvedAt: data.approved_at, approvedBy: data.approved_by,
        isChangeOrder: data.is_change_order,
      };
      updateLeadInState(leadId, (l) => ({
        ...l,
        dealValue: milestone.isChangeOrder ? l.dealValue + milestone.amount : l.dealValue,
        milestones: [...l.milestones, newMs].sort((a, b) => a.sequence - b.sequence)
      }));
    }
  }

  async function handleDeleteMilestone(leadId: string, milestoneId: string) {
    const lead = leads.find((l) => l.id === leadId);
    const target = lead?.milestones.find((m) => m.id === milestoneId);
    if (!target || target.status === "APPROVED") return;
    await supabase.from("opportunity_milestones").delete().eq("id", milestoneId);
    updateLeadInState(leadId, (l) => ({ ...l, milestones: l.milestones.filter((m) => m.id !== milestoneId) }));
  }

  async function handleMarkDelivered(leadId: string, milestoneId: string, deliverableNote: string) {
    const nowIso = new Date().toISOString();
    await supabase.from("opportunity_milestones").update({ status: "DELIVERED", delivered_at: nowIso, deliverable_note: deliverableNote }).eq("id", milestoneId);
    updateLeadInState(leadId, (l) => ({
      ...l,
      pipelineStage: l.pipelineStage === "SHARED_PROJECT_VIEW" ? "MILESTONE_RELEASE" : l.pipelineStage,
      milestones: l.milestones.map((m) => (m.id === milestoneId ? { ...m, status: "DELIVERED" as MilestoneStatus, deliveredAt: nowIso, deliverableNote } : m)),
    }));
  }

  async function handleApproveMilestone(leadId: string, milestoneId: string, approvedBy: "professional" | "client" = "professional") {
    const lead = leads.find((l) => l.id === leadId);
    const milestone = lead?.milestones.find((m) => m.id === milestoneId);
    if (!lead || !milestone || milestone.status !== "DELIVERED") return;

    const balance = getEscrowBalance(lead);
    if (balance < milestone.amount) {
      alert(`Only $${balance.toLocaleString()} is held in escrow. Record a deposit before releasing $${milestone.amount.toLocaleString()}.`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const nowIso = new Date().toISOString();
    await supabase.from("opportunity_milestones").update({ status: "APPROVED", approved_at: nowIso, approved_by: approvedBy }).eq("id", milestoneId);

    const { data: txData } = await supabase
      .from("escrow_transactions")
      .insert({ opportunity_id: leadId, user_id: user.id, type: "RELEASED", amount: milestone.amount, milestone_id: milestoneId, note: `Escrow Released: ${milestone.title}` })
      .select()
      .single();

    const { data: docData } = await supabase
      .from("opportunity_documents")
      .insert({ opportunity_id: leadId, user_id: user.id, type: "Receipt", title: `Milestone Released — ${milestone.title}`, amount: milestone.amount, status: "Paid" })
      .select()
      .single();

    const sorted = [...lead.milestones].sort((a, b) => a.sequence - b.sequence);
    const idx = sorted.findIndex((m) => m.id === milestoneId);
    const next = sorted[idx + 1];
    const allApproved = sorted.every((m) => m.id === milestoneId || m.status === "APPROVED");

    if (next && next.status === "NOT_STARTED") {
      await supabase.from("opportunity_milestones").update({ status: "IN_PROGRESS" }).eq("id", next.id);
    }

    const nextStage: PipelineStage = allApproved ? "FINAL_PAYMENT_CLOSE" : lead.pipelineStage;

    updateLeadInState(leadId, (l) => ({
      ...l,
      pipelineStage: nextStage,
      milestones: l.milestones.map((m) => {
        if (m.id === milestoneId) return { ...m, status: "APPROVED" as MilestoneStatus, approvedAt: nowIso, approvedBy };
        if (next && m.id === next.id) return { ...m, status: "IN_PROGRESS" as MilestoneStatus };
        return m;
      }),
      escrowTransactions: txData
        ? [...l.escrowTransactions, { id: txData.id, type: txData.type, amount: Number(txData.amount), note: txData.note, milestoneId: txData.milestone_id, createdAt: txData.created_at }]
        : l.escrowTransactions,
      documents: docData
        ? [...l.documents, { id: docData.id, type: docData.type, title: docData.title, amount: Number(docData.amount), date: docData.doc_date, status: docData.status }]
        : l.documents,
    }));
  }

  async function handleRecordDeposit(leadId: string, amount: number, note: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || amount <= 0) return;
    const { data: txData, error } = await supabase
      .from("escrow_transactions")
      .insert({ opportunity_id: leadId, user_id: user.id, type: "DEPOSIT_HELD", amount, note })
      .select()
      .single();
    if (error || !txData) return;

    const { data: docData } = await supabase
      .from("opportunity_documents")
      .insert({ opportunity_id: leadId, user_id: user.id, type: "Receipt", title: note || "Deposit held in escrow", amount, status: "Held" })
      .select()
      .single();

    updateLeadInState(leadId, (l) => ({
      ...l,
      pipelineStage: l.pipelineStage === "CONTRACT_DEPOSIT" ? "SHARED_PROJECT_VIEW" : l.pipelineStage,
      escrowTransactions: [...l.escrowTransactions, { id: txData.id, type: txData.type, amount: Number(txData.amount), note: txData.note, milestoneId: txData.milestone_id, createdAt: txData.created_at }],
      documents: docData
        ? [...l.documents, { id: docData.id, type: docData.type, title: docData.title, amount: Number(docData.amount), date: docData.doc_date, status: docData.status }]
        : l.documents,
    }));
  }

  async function handleGenerateShareLink(leadId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const lead = leads.find((l) => l.id === leadId);
    if (!user || !lead) return;
    const token = generateToken();
    const { data, error } = await supabase
      .from("opportunity_share_links")
      .upsert(
        { opportunity_id: leadId, user_id: user.id, token, client_name: lead.name, client_email: lead.handleOrEmail, is_active: true },
        { onConflict: "opportunity_id" }
      )
      .select()
      .single();
    if (!error && data) {
      const link: ShareLink = { id: data.id, token: data.token, clientName: data.client_name, clientEmail: data.client_email, isActive: data.is_active, createdAt: data.created_at };
      updateLeadInState(leadId, (l) => ({ ...l, shareLink: link }));
    }
  }

  async function handleToggleShareLink(leadId: string, isActive: boolean) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead?.shareLink) return;
    await supabase.from("opportunity_share_links").update({ is_active: isActive }).eq("id", lead.shareLink.id);
    updateLeadInState(leadId, (l) => (l.shareLink ? { ...l, shareLink: { ...l.shareLink, isActive } } : l));
  }

  const filteredLeads = leads.filter((lead) => activeLifecycleTab === "all" || lead.category.toLowerCase() === activeLifecycleTab.toLowerCase());
  const clientFolders = leads.filter((lead) => lead.documents.length > 0 || lead.dealValue > 0 || lead.pipelineStage === "FINAL_PAYMENT_CLOSE" || lead.pipelineStage === "RETAIN_REFER");

  if (loading) {
    return (
      <AppShell>
        <div className="text-xs text-slate-500 p-8 font-mono flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          Loading integrated pipeline layer...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[1700px] mx-auto space-y-4 pb-8 font-sans">
        {/* TOP BANNER */}
        {showExplainer && (
          <div className="bg-[#0B102F] text-white rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-widest text-purple-300 uppercase shrink-0">
                  INTEGRATED WORKFLOW SPINE
                </span>
                <p className="text-xs text-slate-300 truncate border-l border-slate-700 pl-3">
                  Public Profile → Inbound Lead → Shared Portal → Milestone Approval → Escrow Release.
                </p>
              </div>
            </div>
            <button onClick={() => setShowExplainer(false)} className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded transition shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {/* HEADER AREA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Opportunity Tracker</h1>
            <span className="text-[10px] font-bold tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md uppercase border border-purple-100">
              {leads.length} Active Deals
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-200/70 p-1 rounded-lg flex items-center gap-1">
              <button onClick={() => setActiveMainTab("board")} className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${activeMainTab === "board" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}>Board View</button>
              <button onClick={() => setActiveMainTab("clients")} className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${activeMainTab === "clients" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}>Client Dossiers ({clientFolders.length})</button>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#0B102F] hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Opportunity</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">TOTAL PIPELINE VALUE</span>
              <div className="text-lg font-bold text-slate-900">${totalPipelineValue.toLocaleString()}</div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+18% inbound</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">ACTIVE IN FLIGHT</span>
              <div className="text-lg font-bold text-slate-900">{activeDealsCount} Deals</div>
            </div>
            <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">Shared Views Active</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">RELEASED / WIN RATE</span>
              <div className="text-lg font-bold text-blue-600">{closedWonRate}%</div>
            </div>
            <span className="text-[10px] text-blue-600 font-medium">{closedWonCount} closed</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">HELD IN ESCROW</span>
              <div className="text-lg font-bold text-emerald-700">${totalHeldAcrossPipeline.toLocaleString()}</div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* BOARD VIEW */}
        {activeMainTab === "board" && (
          <div className="space-y-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[9px] mr-1">Filter:</span>
              <button onClick={() => setActiveLifecycleTab("all")} className={`px-2.5 py-1 rounded-md capitalize font-semibold text-[11px] transition ${activeLifecycleTab === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>All Categories</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveLifecycleTab(cat.toLowerCase())} className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${activeLifecycleTab === cat.toLowerCase() ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{cat}</button>
              ))}
              {isAddingCategory ? (
                <form onSubmit={handleAddCategory} className="flex items-center gap-1">
                  <input type="text" autoFocus placeholder="NEW CAT" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="px-2 py-0.5 text-[11px] border border-indigo-500 rounded focus:outline-none uppercase font-bold text-slate-800" />
                  <button type="submit" className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">Save</button>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="text-slate-400 px-1 font-bold">✕</button>
                </form>
              ) : (
                <button onClick={() => setIsAddingCategory(true)} className="px-2 py-1 rounded-md text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Category
                </button>
              )}
            </div>

            {/* 7-COLUMN FULL LIFE-CYCLE PIPELINE */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-2.5 overflow-x-auto pb-2">
              {stages.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.pipelineStage === stage.id);
                const stageTotalValue = stageLeads.reduce((sum, l) => sum + l.dealValue, 0);
                return (
                  <div key={stage.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)} className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-2 flex flex-col h-[calc(100vh-270px)] min-h-[500px] min-w-[210px]">
                    {/* Compact Column Header */}
                    <div className="pb-2 border-b border-slate-200/80 mb-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <h3 className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${stage.color} truncate`}>{stage.label}</h3>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openAddModalForStage(stage.id)} title="Add lead here" className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition">
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">{stageLeads.length}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5">
                        <span className="truncate">{stage.clientVisible ? "👁 Client sees" : "🔒 Internal"}</span>
                        <span className="font-bold text-slate-700">${stageTotalValue.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* DENSE CARD CONTAINER */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
                      {stageLeads.map((lead) => {
                        const approvedCount = lead.milestones.filter((m) => m.status === "APPROVED").length;
                        const escrowBalance = getEscrowBalance(lead);
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleCardClick(lead)}
                            className={`bg-white rounded-lg border border-slate-200/90 p-2 shadow-2xs hover:shadow-xs hover:border-purple-400 transition cursor-pointer group relative ${draggedLeadId === lead.id ? "opacity-30 border-dashed border-purple-500" : "opacity-100"}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors truncate">{lead.name}</h4>
                                </div>
                                {lead.companyOrRole && (
                                  <p className="text-[9.5px] text-slate-400 truncate flex items-center gap-1">
                                    <Building2 className="w-2.5 h-2.5 inline shrink-0" />
                                    <span className="truncate">{lead.companyOrRole}</span>
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                                ${lead.dealValue.toLocaleString()}
                              </span>
                            </div>

                            <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
                              <span className="text-slate-400 font-medium truncate">{lead.category}</span>
                              {lead.shareLink && (
                                <span className="text-purple-600 font-bold bg-purple-50 px-1 py-0.2 rounded flex items-center gap-0.5">
                                  <Eye className="w-2.5 h-2.5" /> Portal Active
                                </span>
                              )}
                            </div>

                            {lead.milestones.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
                                <span className="font-bold text-slate-500 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                  {approvedCount}/{lead.milestones.length} approved
                                </span>
                                {escrowBalance > 0 && (
                                  <span className="font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />${escrowBalance.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {stageLeads.length === 0 && (
                        <div className="h-16 flex items-center justify-center border border-dashed border-slate-200/80 rounded-lg text-[9.5px] text-slate-400 font-medium">
                          Empty stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLIENT DOSSIERS VIEW */}
        {activeMainTab === "clients" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clientFolders.map((client) => {
              const { totalCollected, totalHeld, pendingBalance, collectedPercentage } = calculateClientFinancials(client);
              return (
                <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm">📂</div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{client.name}</h3>
                          <p className="text-[10px] text-slate-500">{client.companyOrRole}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{client.category}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg space-y-1.5 border border-slate-100 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[11px]">Earned / Released:</span>
                        <span className="font-bold text-emerald-600 text-xs">${totalCollected.toLocaleString()}</span>
                      </div>
                      {totalHeld > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Held in Escrow:</span>
                          <span className="font-bold text-blue-600 text-xs">${totalHeld.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[9px] font-semibold text-slate-500">
                          <span>Secured: {collectedPercentage}%</span>
                          <span>Unsecured: ${pendingBalance.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${collectedPercentage}%` }} />
                          <div className="bg-blue-400 h-full" style={{ width: `${Math.min(100 - collectedPercentage, (totalHeld / Math.max(client.dealValue, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLeadForVault(client)} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5">
                    Open Shared Dossier
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE LEAD MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Add Opportunity</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
              </div>
              <form onSubmit={handleCreateLead} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Contact Name</label>
                    <input type="text" required placeholder="Name" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email / Handle</label>
                    <input type="text" required placeholder="@handle or email" value={newLead.handleOrEmail} onChange={(e) => setNewLead({ ...newLead, handleOrEmail: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Company / Role</label>
                    <input type="text" placeholder="Company" value={newLead.companyOrRole} onChange={(e) => setNewLead({ ...newLead, companyOrRole: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 text-xs" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Value ($)</label>
                    <input type="number" placeholder="3500" value={newLead.dealValue} onChange={(e) => setNewLead({ ...newLead, dealValue: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-200 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select value={newLead.category} onChange={(e) => setNewLead({ ...newLead, category: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs">
                      {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Stage</label>
                    <select value={newLead.pipelineStage} onChange={(e) => setNewLead({ ...newLead, pipelineStage: e.target.value as PipelineStage })} className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs">
                      {stages.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-1.5 text-slate-500 font-semibold">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save Opportunity</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INTEGRATED SHARED VAULT MODAL */}
        {selectedLeadForVault && (
          <DetailedClientVaultModal
            lead={selectedLeadForVault}
            stages={stages}
            onClose={() => setSelectedLeadForVault(null)}
            onUpdateLead={handleUpdateLead}
            onAddDocument={handleAddDocument}
            onAddMilestone={handleAddMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            onMarkDelivered={handleMarkDelivered}
            onApproveMilestone={handleApproveMilestone}
            onRecordDeposit={handleRecordDeposit}
            onGenerateShareLink={handleGenerateShareLink}
            onToggleShareLink={handleToggleShareLink}
          />
        )}
      </div>
    </AppShell>
  );
}

// ---------- INTEGRATED CLIENT VAULT & SHARED PORTAL MODAL ----------
function DetailedClientVaultModal({
  lead, stages, onClose, onUpdateLead, onAddDocument,
  onAddMilestone, onDeleteMilestone, onMarkDelivered, onApproveMilestone,
  onRecordDeposit, onGenerateShareLink, onToggleShareLink,
}: {
  lead: OpportunityLead;
  stages: { id: PipelineStage; label: string }[];
  onClose: () => void;
  onUpdateLead: (lead: OpportunityLead) => void;
  onAddDocument: (leadId: string, doc: Omit<PaymentDoc, "id" | "date">) => void;
  onAddMilestone: (leadId: string, milestone: { title: string; amount: number; isChangeOrder?: boolean }) => void;
  onDeleteMilestone: (leadId: string, milestoneId: string) => void;
  onMarkDelivered: (leadId: string, milestoneId: string, deliverableNote: string) => void;
  onApproveMilestone: (leadId: string, milestoneId: string, approvedBy?: "professional" | "client") => void;
  onRecordDeposit: (leadId: string, amount: number, note: string) => void;
  onGenerateShareLink: (leadId: string) => void;
  onToggleShareLink: (leadId: string, isActive: boolean) => void;
}) {
  const [viewMode, setViewMode] = useState<"internal" | "client_preview">("internal");
  const [showDocForm, setShowDocForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showChangeOrderForm, setShowChangeOrderForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [deliverNote, setDeliverNote] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const totalCollected = lead.documents.filter((d) => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);
  const totalAgreed = Math.max(lead.dealValue, lead.documents.filter((d) => d.type === "Contract" || d.type === "Invoice").reduce((max, d) => Math.max(max, d.amount), 0));
  const escrowBalance = getEscrowBalance(lead);
  const milestonesTotal = getMilestonesTotal(lead);
  const approvedTotal = getApprovedTotal(lead);

  const [newDoc, setNewDoc] = useState<{ type: "Invoice" | "Receipt" | "Contract" | "Deliverable" | "Change Order"; title: string; amount: number; status: "Paid" | "Pending" | "Signed" | "Held" }>({ type: "Invoice", title: "", amount: lead.dealValue, status: "Paid" });
  const [newMilestone, setNewMilestone] = useState({ title: "", amount: 0 });
  const [changeOrder, setChangeOrder] = useState({ title: "", amount: 0 });
  const [newDeposit, setNewDeposit] = useState({ amount: 0, note: "" });

  const shareUrl = lead.shareLink ? `swiftbrand.tech/shared/${lead.shareLink.token}` : "";

  function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDoc.title.trim()) return;
    onAddDocument(lead.id, newDoc);
    setShowDocForm(false);
  }

  function handleMilestoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestone.title.trim() || newMilestone.amount <= 0) return;
    onAddMilestone(lead.id, { title: newMilestone.title, amount: newMilestone.amount, isChangeOrder: false });
    setShowMilestoneForm(false);
    setNewMilestone({ title: "", amount: 0 });
  }

  function handleChangeOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!changeOrder.title.trim() || changeOrder.amount <= 0) return;
    onAddMilestone(lead.id, { title: `[Change Order] ${changeOrder.title}`, amount: changeOrder.amount, isChangeOrder: true });
    setShowChangeOrderForm(false);
    setChangeOrder({ title: "", amount: 0 });
  }

  function handleDepositSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newDeposit.amount <= 0) return;
    onRecordDeposit(lead.id, newDeposit.amount, newDeposit.note);
    setShowDepositForm(false);
    setNewDeposit({ amount: 0, note: "" });
  }

  function copyLink() {
    navigator.clipboard?.writeText(`https://${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const statusMeta: Record<MilestoneStatus, { label: string; icon: JSX.Element; pillClass: string }> = {
    NOT_STARTED: { label: "Upcoming", icon: <Circle className="w-3.5 h-3.5" />, pillClass: "bg-slate-100 text-slate-400" },
    IN_PROGRESS: { label: "In Progress", icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, pillClass: "bg-amber-50 text-amber-600" },
    DELIVERED: { label: "Delivered — Awaiting Approval", icon: <Send className="w-3.5 h-3.5 text-indigo-500" />, pillClass: "bg-indigo-50 text-indigo-600" },
    APPROVED: { label: "Approved & Escrow Released", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, pillClass: "bg-emerald-50 text-emerald-600" },
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-6" onClick={(e) => e.stopPropagation()}>

        {/* VIEW MODE TOGGLE */}
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode("internal")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "internal" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}>
              Internal Dossier
            </button>
            <button onClick={() => setViewMode("client_preview")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${viewMode === "client_preview" ? "bg-purple-600 text-white shadow-2xs" : "text-purple-700"}`}>
              <Eye className="w-3.5 h-3.5" /> Shared View (Client Portal)
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold px-2">✕</button>
        </div>

        {/* ---------------- CLIENT PREVIEW VIEW ---------------- */}
        {viewMode === "client_preview" ? (
          <div className="space-y-4 border border-purple-200 rounded-xl p-4 bg-purple-50/20">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <span className="text-[9px] font-bold tracking-widest text-purple-600 uppercase">CLIENT PORTAL DEMO</span>
                <h3 className="text-sm font-bold text-slate-900">{lead.name} — Project Progress</h3>
              </div>
              <span className="text-xs font-mono bg-white px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 font-bold">
                {shareUrl || "Link Not Generated"}
              </span>
            </div>

            {/* Escrow Status Widget */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[9px] font-bold uppercase block">Escrow Protected Balance</span>
                  <span className="text-lg font-bold text-emerald-400">${escrowBalance.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[9px] font-bold uppercase block">Total Released</span>
                  <span className="text-xs font-semibold text-slate-200">${approvedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Client Interactive Milestone Checklist */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Milestones & Deliverables</h4>
              {lead.milestones.map((m) => {
                const meta = statusMeta[m.status];
                return (
                  <div key={m.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{m.sequence}. {m.title}</span>
                        {m.isChangeOrder && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold">CHANGE ORDER</span>}
                      </div>
                      <span className="font-bold text-xs text-slate-900">${m.amount.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${meta.pillClass}`}>{meta.icon}{meta.label}</span>

                      {/* CLIENT ACTION BUTTON: Approve Milestone = Escrow Release */}
                      {m.status === "DELIVERED" && (
                        <button
                          onClick={() => onApproveMilestone(lead.id, m.id, "client")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Release ${m.amount.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ---------------- INTERNAL MANAGEMENT VIEW ---------------- */
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2"><span className="text-lg">📁</span><h2 className="text-base font-bold text-slate-900">{lead.name}</h2></div>
                <p className="text-xs text-slate-500">{lead.companyOrRole} • <span className="font-semibold text-slate-700">{lead.handleOrEmail}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">${lead.dealValue.toLocaleString()}</span>
              </div>
            </div>

            {/* Stage Modifier */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">Pipeline Stage:</span>
              <select
                value={lead.pipelineStage}
                onChange={(e) => onUpdateLead({ ...lead, pipelineStage: e.target.value as PipelineStage })}
                className="bg-white border border-slate-300 font-bold text-xs rounded-lg px-2.5 py-1 text-slate-800"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Escrow & Deposits */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Escrow & Deposit Layer
                </h4>
                {!showDepositForm && (
                  <button onClick={() => setShowDepositForm(true)} className="text-blue-600 font-bold text-[11px] flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Record deposit
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="font-bold text-blue-700 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Balance Held in Escrow</span>
                <span className="font-bold text-blue-700">${escrowBalance.toLocaleString()}</span>
              </div>

              {showDepositForm && (
                <form onSubmit={handleDepositSubmit} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" required placeholder="Amount" value={newDeposit.amount || ""} onChange={(e) => setNewDeposit({ ...newDeposit, amount: Number(e.target.value) })} className="text-xs p-1.5 rounded border border-slate-200" />
                    <input type="text" placeholder="Note (e.g. Deposit)" value={newDeposit.note} onChange={(e) => setNewDeposit({ ...newDeposit, note: e.target.value })} className="col-span-2 text-xs p-1.5 rounded border border-slate-200" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowDepositForm(false)} className="px-2 py-1 text-xs text-slate-500">Cancel</button>
                    <button type="submit" className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Record Deposit</button>
                  </div>
                </form>
              )}
            </div>

            {/* Milestones & Change Orders */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Milestones & Scope</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowChangeOrderForm(true)} className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold text-[10px]">
                    + Change Order
                  </button>
                  <button onClick={() => setShowMilestoneForm(true)} className="text-indigo-600 font-bold text-[11px]">
                    + Milestone
                  </button>
                </div>
              </div>

              {/* CHANGE ORDER FORM */}
              {showChangeOrderForm && (
                <form onSubmit={handleChangeOrderSubmit} className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 space-y-2">
                  <span className="font-bold text-[10px] text-amber-800 block">NEW CHANGE ORDER (SCOPE EXPANSION)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" required placeholder="Out of scope request" value={changeOrder.title} onChange={(e) => setChangeOrder({ ...changeOrder, title: e.target.value })} className="col-span-2 text-xs p-1.5 rounded border border-amber-200 bg-white" />
                    <input type="number" required placeholder="Extra $" value={changeOrder.amount || ""} onChange={(e) => setChangeOrder({ ...changeOrder, amount: Number(e.target.value) })} className="text-xs p-1.5 rounded border border-amber-200 bg-white" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowChangeOrderForm(false)} className="px-2 py-1 text-xs text-slate-500">Cancel</button>
                    <button type="submit" className="px-2 py-1 bg-amber-700 text-white text-xs font-semibold rounded">Add to Scope</button>
                  </div>
                </form>
              )}

              {/* STANDARD MILESTONE FORM */}
              {showMilestoneForm && (
                <form onSubmit={handleMilestoneSubmit} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" required placeholder="Milestone title" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} className="col-span-2 text-xs p-1.5 rounded border border-slate-200" />
                    <input type="number" required placeholder="Amount" value={newMilestone.amount || ""} onChange={(e) => setNewMilestone({ ...newMilestone, amount: Number(e.target.value) })} className="text-xs p-1.5 rounded border border-slate-200" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowMilestoneForm(false)} className="px-2 py-1 text-xs text-slate-500">Cancel</button>
                    <button type="submit" className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded">Add Milestone</button>
                  </div>
                </form>
              )}

              {/* MILESTONE LIST */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {lead.milestones.map((m) => {
                  const meta = statusMeta[m.status];
                  return (
                    <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{m.title}</span>
                        <span className="font-bold text-slate-900">${m.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold text-[10px] ${meta.pillClass}`}>{meta.icon}{meta.label}</span>
                        {m.status === "IN_PROGRESS" && (
                          <button onClick={() => onMarkDelivered(lead.id, m.id, "Work uploaded & ready for review")} className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded">
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CLIENT ACCESS LINK CONTROL */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" /> Public / Client Portal Link
              </h4>
              {!lead.shareLink ? (
                <button onClick={() => onGenerateShareLink(lead.id)} className="w-full p-2 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-purple-400 hover:text-purple-600 transition">
                  Generate Shared URL
                </button>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-600 truncate">{shareUrl}</span>
                  <button onClick={copyLink} className="text-slate-500 hover:text-purple-600 flex items-center gap-1 text-[10px] font-bold shrink-0">
                    <Copy className="w-3 h-3" />{copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

export default OpportunityTracker;