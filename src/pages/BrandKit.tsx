import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { BrandKit, BrandKitAsset } from "@/lib/types";
import { Palette, Type, FileImage, Video, Trash2, Check, Sparkles, Pencil, ExternalLink, X } from "lucide-react";

const BUCKET = "media";
const DEFAULTS: Omit<BrandKit, "user_id"> = {
  primary_color: "#7C3AED",
  accent_color: "#2563EB",
  success_color: "#22C55E",
  bg_color: "#F8FAFC",
  heading_font: "Plus Jakarta Sans",
  body_font: "Inter",
};

const HEADING_FONTS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Modern Display)" },
  { value: "Clash Display", label: "Clash Display (Bold Editorial)" },
  { value: "Playfair Display", label: "Playfair Display (Executive Serif)" },
  { value: "Inter", label: "Inter (Clean Neutral)" },
];
const BODY_FONTS = [
  { value: "Inter", label: "Inter (High Readability)" },
  { value: "DM Sans", label: "DM Sans (Soft Rounded)" },
  { value: "Outfit", label: "Outfit (Contemporary)" },
];

export function BrandKitPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [kit, setKit] = useState<Omit<BrandKit, "user_id">>(DEFAULTS);
  const [logos, setLogos] = useState<BrandKitAsset[]>([]);
  const [videos, setVideos] = useState<BrandKitAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // State for replacing an asset and previewing media
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);
  const [selectedPreviewAsset, setSelectedPreviewAsset] = useState<BrandKitAsset | null>(null);

  const logoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const editAssetInput = useRef<HTMLInputElement>(null);
  const targetAssetToReplace = useRef<BrandKitAsset | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: kitData }, { data: assetData }] = await Promise.all([
      supabase.from("brand_kit").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("brand_kit_assets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (kitData) setKit(kitData as BrandKit);
    setLogos(((assetData as BrandKitAsset[]) ?? []).filter((a) => a.kind === "logo"));
    setVideos(((assetData as BrandKitAsset[]) ?? []).filter((a) => a.kind === "video"));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function assetUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("brand_kit").upsert({ user_id: userId, ...kit });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save brand kit");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssetUpload(e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "video") {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    kind === "logo" ? setUploadingLogo(true) : setUploadingVideo(true);
    setError(null);
    try {
      const path = `${userId}/brand-kit/${kind}s/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("brand_kit_assets").insert({
        user_id: userId,
        kind,
        name: file.name,
        path,
        tag: kind === "logo" ? "Untagged" : "Bumper",
      });
      if (insertErr) throw insertErr;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not upload ${kind}`);
    } finally {
      setUploadingLogo(false);
      setUploadingVideo(false);
      if (logoInput.current) logoInput.current.value = "";
      if (videoInput.current) videoInput.current.value = "";
    }
  }

  // Trigger file browser to edit/replace any asset (logo or video)
  function triggerEditAsset(asset: BrandKitAsset) {
    targetAssetToReplace.current = asset;
    if (editAssetInput.current) {
      editAssetInput.current.accept = asset.kind === "logo" ? "image/*" : "video/*";
      editAssetInput.current.click();
    }
  }

  // Handle replacing an existing logo or video file
  async function handleReplaceAsset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const oldAsset = targetAssetToReplace.current;
    if (!file || !userId || !oldAsset) return;

    setReplacingAssetId(oldAsset.id);
    setError(null);
    try {
      // 1. Upload new file
      const newPath = `${userId}/brand-kit/${oldAsset.kind}s/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(newPath, file);
      if (uploadErr) throw uploadErr;

      // 2. Remove old storage object
      await supabase.storage.from(BUCKET).remove([oldAsset.path]);

      // 3. Update database record
      const { error: updateErr } = await supabase
        .from("brand_kit_assets")
        .update({
          name: file.name,
          path: newPath,
        })
        .eq("id", oldAsset.id);

      if (updateErr) throw updateErr;

      // 4. Reload asset list
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not update ${oldAsset.kind}`);
    } finally {
      setReplacingAssetId(null);
      targetAssetToReplace.current = null;
      if (editAssetInput.current) editAssetInput.current.value = "";
    }
  }

  async function removeAsset(asset: BrandKitAsset) {
    try {
      await supabase.storage.from(BUCKET).remove([asset.path]);
      await supabase.from("brand_kit_assets").delete().eq("id", asset.id);
      if (asset.kind === "logo") setLogos((l) => l.filter((a) => a.id !== asset.id));
      else setVideos((v) => v.filter((a) => a.id !== asset.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove asset");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="text-sm text-slate-500">Loading your brand kit…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Hidden input used for replacing logos or videos */}
      <input
        ref={editAssetInput}
        type="file"
        className="hidden"
        onChange={handleReplaceAsset}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="badge bg-brand/10 text-brand uppercase tracking-wide text-[10px]">Brand Identity System</span>
            <h1 className="font-display text-xl font-bold text-slate-900 mt-1">Brand Kit & Styling Rules</h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
              Store your logos, colors, fonts, and video bumpers. Everything the AI Ghostwriter and future graphic tools generate will inherit these rules automatically.
            </p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 shrink-0">
            {saved ? <Check size={16} /> : <Sparkles size={16} />}
            {saved ? "Brand Kit Saved!" : saving ? "Saving…" : "Save Brand Rules"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: colors + typography */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-4">
              <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <Palette size={16} className="text-brand" />
                Brand Color Palette
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ColorField label="Primary Accent" value={kit.primary_color} onChange={(v) => setKit({ ...kit, primary_color: v })} />
                <ColorField label="Secondary Accent" value={kit.accent_color} onChange={(v) => setKit({ ...kit, accent_color: v })} />
                <ColorField label="Success Highlight" value={kit.success_color} onChange={(v) => setKit({ ...kit, success_color: v })} />
                <ColorField label="Canvas Background" value={kit.bg_color} onChange={(v) => setKit({ ...kit, bg_color: v })} />
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <Type size={16} className="text-brand" />
                Typography Pairing
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Display Headings Font</label>
                  <select value={kit.heading_font} onChange={(e) => setKit({ ...kit, heading_font: e.target.value })} className="input">
                    {HEADING_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Body Text Font</label>
                  <select value={kit.body_font} onChange={(e) => setKit({ ...kit, body_font: e.target.value })} className="input">
                    {BODY_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Live Typography Sample</span>
                <h4 className="text-lg font-bold text-slate-900" style={{ fontFamily: kit.heading_font }}>
                  Unlocking Growth Through Consistent Brand Voice
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: kit.body_font }}>
                  SwiftBrand automatically styles carousel titles, quote blocks, and subtitle overlays using your selected font pair.
                </p>
              </div>
            </div>
          </div>

          {/* Right: logos + video assets */}
          <div className="space-y-6">
            {/* LOGOS SECTION */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                  <FileImage size={16} className="text-emerald-600" />
                  Logos & Watermarks
                </h3>
                <label className="text-xs font-medium text-brand hover:text-brand-dark cursor-pointer">
                  {uploadingLogo ? "Uploading…" : "+ Upload"}
                  <input ref={logoInput} type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => handleAssetUpload(e, "logo")} />
                </label>
              </div>
              <div className="space-y-2.5">
                {logos.length === 0 && <p className="text-xs text-slate-400">No logos uploaded yet.</p>}
                {logos.map((logo) => (
                  <div key={logo.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div
                      onClick={() => setSelectedPreviewAsset(logo)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      title="Click to view logo"
                    >
                      <div className="relative">
                        <img src={assetUrl(logo.path)} alt={logo.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 group-hover:opacity-80 transition-opacity" />
                        <span className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink size={12} className="text-white" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate group-hover:text-brand transition-colors">{logo.name}</p>
                        <span className="text-[10px] text-slate-500">{logo.tag}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => triggerEditAsset(logo)}
                        disabled={replacingAssetId === logo.id}
                        className="flex items-center gap-1 text-xs text-slate-600 hover:text-brand hover:bg-slate-200/60 px-2 py-1 rounded-md transition-colors"
                      >
                        <Pencil size={12} />
                        <span>{replacingAssetId === logo.id ? "Updating…" : "Edit"}</span>
                      </button>

                      <button onClick={() => removeAsset(logo)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VIDEOS SECTION */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                  <Video size={16} className="text-amber-500" />
                  Video Intros / Outros
                </h3>
                <label className="text-xs font-medium text-brand hover:text-brand-dark cursor-pointer">
                  {uploadingVideo ? "Uploading…" : "+ Add Video"}
                  <input ref={videoInput} type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={(e) => handleAssetUpload(e, "video")} />
                </label>
              </div>
              <div className="space-y-2.5">
                {videos.length === 0 && <p className="text-xs text-slate-400">No video bumpers uploaded yet.</p>}
                {videos.map((vid) => (
                  <div key={vid.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div
                      onClick={() => setSelectedPreviewAsset(vid)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                      title="Click to view video"
                    >
                      <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0 group-hover:bg-amber-500/20 transition-colors">
                        <Video size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate group-hover:text-brand transition-colors">{vid.name}</p>
                        <span className="text-[10px] text-slate-500">{vid.tag}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => triggerEditAsset(vid)}
                        disabled={replacingAssetId === vid.id}
                        className="flex items-center gap-1 text-xs text-slate-600 hover:text-brand hover:bg-slate-200/60 px-2 py-1 rounded-md transition-colors"
                      >
                        <Pencil size={12} />
                        <span>{replacingAssetId === vid.id ? "Updating…" : "Edit"}</span>
                      </button>

                      <button onClick={() => removeAsset(vid)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Modal for viewing Logo or Video in high resolution */}
      {selectedPreviewAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setSelectedPreviewAsset(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="font-display font-semibold text-slate-900 text-base">{selectedPreviewAsset.name}</h3>
              <p className="text-xs text-slate-500">{selectedPreviewAsset.tag} • {selectedPreviewAsset.kind === "logo" ? "Logo Asset" : "Video Asset"}</p>
            </div>

            <div className="bg-slate-100/70 p-4 rounded-xl flex items-center justify-center border border-slate-200/60 max-h-96 overflow-hidden">
              {selectedPreviewAsset.kind === "logo" ? (
                <img
                  src={assetUrl(selectedPreviewAsset.path)}
                  alt={selectedPreviewAsset.name}
                  className="max-h-72 object-contain"
                />
              ) : (
                <video
                  src={assetUrl(selectedPreviewAsset.path)}
                  controls
                  autoPlay
                  className="max-h-72 w-full rounded-lg object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const assetToEdit = selectedPreviewAsset;
                  setSelectedPreviewAsset(null);
                  triggerEditAsset(assetToEdit);
                }}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <Pencil size={14} />
                <span>Edit / Replace {selectedPreviewAsset.kind === "logo" ? "Logo" : "Video"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-slate-600 block">{label}</label>
      <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-slate-50">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0" />
        <span className="text-xs font-mono font-medium text-slate-800">{value}</span>
      </div>
    </div>
  );
}

//
///**
// * @license
// * SPDX-License-Identifier: Apache-2.0
// */
//
//import React, { useState } from 'react';
//import { motion, AnimatePresence } from 'motion/react';
//import {
//  UploadCloud,
//  FileUp,
//  FileText,
//  Video,
//  Image as ImageIcon,
//  Sparkles,
//  Check,
//  X,
//  Edit3,
//  Activity,
//  Calendar,
//  Share2,
//  TrendingUp,
//  Inbox
//} from 'lucide-react';
//import { MediaAsset, CalendarPost } from '../../types';
//
//interface MediaLibraryViewProps {
//  onAddPostToCalendar: (post: CalendarPost) => void;
//}
//
//export default function MediaLibraryView({ onAddPostToCalendar }: MediaLibraryViewProps) {
//  const [activeAsset, setActiveAsset] = useState<MediaAsset | null>(null);
//  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
//
//  // Preset media database
//  const [assets, setAssets] = useState<MediaAsset[]>([
//    {
//      id: 'asset_1',
//      name: 'Pulse AI System Dashboard Teaser.png',
//      type: 'image',
//      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
//      size: '2.4 MB',
//      uploadDate: '2026-07-19',
//      recommendation: {
//        platform: 'LinkedIn',
//        caption: `Say goodbye to archaic social planners. 🧠 Pulse AI auto-maps your brand's unique products & positioning into high-velocity content schedules directly from your assets. Review our compliance sandbox dashboard:`,
//        postingDate: '2026-07-21',
//        hashtags: ['MarketingOS', 'AutonomousAI', 'B2BMarketing', 'VisualAnalytics'],
//        campaign: 'Q3 Product Operations Launch',
//        targetAudience: 'Chief Marketing Officers, SaaS Founders, & Operations Leads',
//        expectedEngagement: '5.8% (Very High)'
//      }
//    },
//    {
//      id: 'asset_2',
//      name: 'Co-Founder Interview Promo Clip.mp4',
//      type: 'video',
//      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400',
//      size: '48.1 MB',
//      uploadDate: '2026-07-18',
//      recommendation: {
//        platform: 'Instagram',
//        caption: `How do you scale high-touch marketing without burning out your design crew? ☕️ Our co-founder walks through the paradigm shift of utilizing specialized, digital AI agents in daily workspaces. Tune in:`,
//        postingDate: '2026-07-23',
//        hashtags: ['FounderInsights', 'AIEngine', 'GrowthMarketing', 'Productivity'],
//        campaign: 'Product Strategy Run',
//        targetAudience: 'Early-stage builders, marketers, & product architects',
//        expectedEngagement: '7.2% (Elite)'
//      }
//    },
//    {
//      id: 'asset_3',
//      name: 'Pulse Compliance Whitepaper Deck.pdf',
//      type: 'pdf',
//      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400',
//      size: '8.7 MB',
//      uploadDate: '2026-07-17'
//    }
//  ]);
//
//  const handleSimulatedUpload = () => {
//    setUploadProgress(0);
//    const interval = setInterval(() => {
//      setUploadProgress(prev => {
//        if (prev !== null && prev >= 100) {
//          clearInterval(interval);
//          setTimeout(() => {
//            // Add new asset to the roster
//            const newAsset: MediaAsset = {
//              id: `asset_${Date.now()}`,
//              name: 'Brand Manifesto Vector Asset.png',
//              type: 'image',
//              url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&q=80&w=400',
//              size: '1.8 MB',
//              uploadDate: '2026-07-20',
//              recommendation: {
//                platform: 'X',
//                caption: `Marketing software is officially dead. You shouldn't be spending hours tweaking template grids. Pulse AI deploys a dedicated, autonomous AI marketing crew to manage your schedules. Here is our brand DNA manifesto:`,
//                postingDate: '2026-07-22',
//                hashtags: ['MarketingAutomation', 'BrandingOS', 'FutureOfWork'],
//                campaign: 'Thought Leadership Run',
//                targetAudience: 'CTOs, CMOs, & Product Developers looking for automated platforms',
//                expectedEngagement: '4.6% (High)'
//              }
//            };
//            setAssets(prevAssets => [newAsset, ...prevAssets]);
//            setActiveAsset(newAsset);
//            setUploadProgress(null);
//          }, 400);
//          return 100;
//        }
//        return (prev ?? 0) + 20;
//      });
//    }, 150);
//  };
//
//  const handleAcceptRecommendation = (asset: MediaAsset) => {
//    if (!asset.recommendation) return;
//
//    // Convert asset into a scheduled post
//    const rec = asset.recommendation;
//    const post: CalendarPost = {
//      id: `post_${Date.now()}`,
//      platform: rec.platform,
//      title: asset.name.split('.')[0],
//      caption: rec.caption,
//      mediaUrl: asset.url,
//      mediaType: asset.type,
//      hashtags: rec.hashtags,
//      scheduledTime: '10:00 AM',
//      scheduledDate: rec.postingDate,
//      status: 'Approved',
//      cta: 'Learn more'
//    };
//
//    onAddPostToCalendar(post);
//    alert(`Success! Recommended post approved and scheduled for ${rec.postingDate} on ${rec.platform}.`);
//
//    // Remove recommendation tag from active asset
//    setAssets(prev => prev.map(a => {
//      if (a.id === asset.id) {
//        return { ...a, recommendation: undefined };
//      }
//      return a;
//    }));
//    setActiveAsset(null);
//  };
//
//  const getAssetIcon = (type: string) => {
//    switch (type) {
//      case 'video': return <Video className="w-5 h-5 text-pink-600" />;
//      case 'pdf': return <FileText className="w-5 h-5 text-indigo-600" />;
//      default: return <ImageIcon className="w-5 h-5 text-blue-600" />;
//    }
//  };
//
//  return (
//    <div className="space-y-8 font-sans">
//
//      {/* View Header */}
//      <div>
//        <h1 className="text-2xl font-bold font-display text-slate-900">Media Library & Smart Assets</h1>
//        <p className="text-xs text-slate-500 mt-1">Upload brand files. Our AI scans metadata, extracts positioning hooks, and recommends schedule optimizations.</p>
//      </div>
//
//      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//
//        {/* Left 2 Columns: Uploader & Assets Grid */}
//        <div className="lg:col-span-2 space-y-6">
//
//          {/* Drag and Drop Box */}
//          <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-8 bg-white text-center cursor-pointer relative group transition-colors">
//            <input
//              type="file"
//              className="absolute inset-0 opacity-0 cursor-pointer"
//              onChange={handleSimulatedUpload}
//              disabled={uploadProgress !== null}
//            />
//            {uploadProgress !== null ? (
//              <div className="space-y-3">
//                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
//                <p className="text-sm font-semibold text-slate-800">Uploading asset to Secure Vault ({uploadProgress}%)</p>
//                <div className="w-48 bg-slate-100 h-1 rounded-full mx-auto overflow-hidden">
//                  <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
//                </div>
//              </div>
//            ) : (
//              <div>
//                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:scale-105 transition-transform" />
//                <p className="text-sm font-semibold text-slate-700">Drag brand photos, videos, flyers or PDFs here</p>
//                <p className="text-xs text-slate-400 mt-1">Or click to select files from your operating system</p>
//              </div>
//            )}
//          </div>
//
//          {/* Uploaded assets grid */}
//          <div className="space-y-3">
//            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Stored Assets ({assets.length})</span>
//
//            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//              {assets.map((asset) => (
//                <div
//                  key={asset.id}
//                  onClick={() => setActiveAsset(asset)}
//                  className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all relative flex flex-col justify-between ${activeAsset?.id === asset.id ? 'border-blue-600 ring-1 ring-blue-600/30 shadow-sm' : 'border-slate-200'}`}
//                >
//
//                  {/* AI Recommendation notification dot */}
//                  {asset.recommendation && (
//                    <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
//                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
//                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white"></span>
//                    </span>
//                  )}
//
//                  <div>
//                    <div className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50 aspect-video mb-3">
//                      {asset.type === 'image' ? (
//                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
//                      ) : (
//                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
//                          {getAssetIcon(asset.type)}
//                        </div>
//                      )}
//                    </div>
//
//                    <h4 className="text-xs font-bold text-slate-900 truncate pr-4">{asset.name}</h4>
//                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
//                      <span>{asset.size}</span>
//                      <span>•</span>
//                      <span>Uploaded {asset.uploadDate}</span>
//                    </div>
//                  </div>
//
//                  {asset.recommendation && (
//                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50/50 px-2 py-1 rounded">
//                      <Sparkles className="w-3 h-3 text-blue-500 animate-pulse-glow" />
//                      <span>AI Schedule Plan Available</span>
//                    </div>
//                  )}
//
//                </div>
//              ))}
//            </div>
//          </div>
//
//        </div>
//
//        {/* Right 1 Column: AI Recommendation Drawer */}
//        <div className="space-y-6">
//          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">AI Scheduling Advisor</span>
//
//          {activeAsset ? (
//            <AnimatePresence mode="wait">
//              <motion.div
//                key={activeAsset.id}
//                initial={{ opacity: 0, y: 10 }}
//                animate={{ opacity: 1, y: 0 }}
//                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
//              >
//                {/* Advisor Header */}
//                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5">
//                  {getAssetIcon(activeAsset.type)}
//                  <div>
//                    <h4 className="text-xs font-bold text-slate-950 truncate max-w-[200px]">{activeAsset.name}</h4>
//                    <p className="text-[10px] text-slate-400 mt-0.5">Asset Analysis Deck</p>
//                  </div>
//                </div>
//
//                {activeAsset.recommendation ? (
//                  <div className="p-5 space-y-5">
//
//                    <div className="p-3.5 bg-gradient-to-br from-blue-50/50 to-white border border-blue-100 rounded-xl space-y-1.5">
//                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
//                        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse-glow" />
//                        <span>Visual Recommendation</span>
//                      </div>
//                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
//                        Pulse AI scanned this visual. We recommend deploying it as an organic <strong>{activeAsset.recommendation.platform} post</strong> inside the campaign <strong>&ldquo;{activeAsset.recommendation.campaign}&rdquo;</strong>.
//                      </p>
//                    </div>
//
//                    <div className="space-y-4 text-xs">
//                      <div>
//                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Platform Channel</span>
//                        <span className="font-bold text-slate-900">{activeAsset.recommendation.platform} Feed</span>
//                      </div>
//
//                      <div>
//                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Recommended Posting Date</span>
//                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
//                          <Calendar className="w-4 h-4 text-slate-400" />
//                          <span>{activeAsset.recommendation.postingDate} at 10:00 AM</span>
//                        </div>
//                      </div>
//
//                      <div>
//                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Proposed Marketing Caption</span>
//                        <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed text-[11px] font-sans whitespace-pre-line">{activeAsset.recommendation.caption}</p>
//                        <div className="flex flex-wrap gap-1 mt-2">
//                          {activeAsset.recommendation.hashtags.map(h => (
//                            <span key={h} className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{h}</span>
//                          ))}
//                        </div>
//                      </div>
//
//                      <div>
//                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">ICP Audience Placement</span>
//                        <p className="text-slate-500 leading-normal text-[11px] font-medium">{activeAsset.recommendation.targetAudience}</p>
//                      </div>
//
//                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
//                        <div>
//                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Campaign Name</span>
//                          <span className="text-slate-800 font-bold block truncate">{activeAsset.recommendation.campaign}</span>
//                        </div>
//                        <div>
//                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Expected CTR</span>
//                          <div className="flex items-center gap-1 text-emerald-600 font-bold">
//                            <Activity className="w-3.5 h-3.5" />
//                            <span>{activeAsset.recommendation.expectedEngagement}</span>
//                          </div>
//                        </div>
//                      </div>
//                    </div>
//
//                    <div className="pt-4 border-t border-slate-100 flex gap-2.5">
//                      <button
//                        onClick={() => {
//                          setAssets(prev => prev.map(a => {
//                            if (a.id === activeAsset.id) {
//                              return { ...a, recommendation: undefined };
//                            }
//                            return a;
//                          }));
//                          setActiveAsset(null);
//                        }}
//                        className="flex-1 py-2 px-3 text-xs font-semibold border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl"
//                      >
//                        Reject Plan
//                      </button>
//                      <button
//                        onClick={() => handleAcceptRecommendation(activeAsset)}
//                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1 cursor-pointer"
//                      >
//                        <Check className="w-3.5 h-3.5 stroke-[3]" />
//                        <span>Accept & Schedule</span>
//                      </button>
//                    </div>
//
//                  </div>
//                ) : (
//                  <div className="p-8 text-center text-slate-400 space-y-3">
//                    <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
//                    <p className="text-xs font-semibold text-slate-700">No Recommendations Queue</p>
//                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">This asset has already been accepted or contains no active recommend schedule triggers.</p>
//                  </div>
//                )}
//
//              </motion.div>
//            </AnimatePresence>
//          ) : (
//            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center py-20">
//              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
//              <p className="text-xs font-semibold text-slate-800">Select an asset</p>
//              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">Click any brand photo, flyer, or video on the left panel to review AI recomend schedule details.</p>
//            </div>
//          )}
//        </div>
//
//      </div>
//
//    </div>
//  );
//}
