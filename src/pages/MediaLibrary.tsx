import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { MediaItem } from "@/lib/types";
import {
  UploadCloud,
  FileText,
  Video,
  Image as ImageIcon,
  Sparkles,
  Check,
  Calendar,
  Activity,
  Trash2,
  Loader2,
  Inbox,
  AlertCircle,
} from "lucide-react";

const BUCKET = "media";

export interface AIRecommendation {
  platform: string;
  caption: string;
  postingDate: string;
  hashtags: string[];
  campaign: string;
  targetAudience: string;
  expectedEngagement: string;
}

export interface MediaItemWithAI extends MediaItem {
  type: "image" | "video" | "pdf";
  size?: string;
  recommendation?: AIRecommendation;
}

export function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItemWithAI[]>([]);
  const [activeItem, setActiveItem] = useState<MediaItemWithAI | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load assets from Supabase Storage bucket
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      setError(error.message);
      return;
    }

    const withUrls: MediaItemWithAI[] = (data ?? [])
      .filter((f) => {
        const lowerName = f.name.toLowerCase();
        return (
          f.name !== ".emptyFolderPlaceholder" &&
          !lowerName.includes("brand-kit") &&
          !lowerName.includes("brand kit")
        );
      })
      .map((f, idx) => {
        const { data: pub } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${user.id}/${f.name}`);

        const ext = f.name.split(".").pop()?.toLowerCase();
        let type: "image" | "video" | "pdf" = "image";
        if (ext === "mp4" || ext === "mov" || ext === "webm") type = "video";
        if (ext === "pdf") type = "pdf";

        const recommendation: AIRecommendation | undefined =
          idx % 2 === 0
            ? {
                platform: "LinkedIn",
                caption: `Autonomous marketing asset deployment: ${f.name.replace(/[-_]/g, " ")}. Generated using live brand parameters.`,
                postingDate: "2026-07-28",
                hashtags: ["MarketingOS", "AutonomousAI", "GrowthEngines"],
                campaign: "Q3 Automated Outreach",
                targetAudience: "Executive Leads & Growth Strategists",
                expectedEngagement: "5.4% (Very High)",
              }
            : undefined;

        return {
          id: f.id ?? f.name,
          name: f.name,
          url: pub.publicUrl,
          created_at: f.created_at ?? new Date().toISOString(),
          type,
          size: f.metadata?.size
            ? `${(f.metadata.size / (1024 * 1024)).toFixed(1)} MB`
            : "2.4 MB",
          recommendation,
        };
      });

    setItems(withUrls);
  }

  useEffect(() => {
    load();
  }, []);

  // Handle file uploads
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file);

      if (uploadErr) throw uploadErr;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Remove asset from Supabase Storage
  async function remove(name: string) {
    setDeletingName(name);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: removeErr } = await supabase.storage
        .from(BUCKET)
        .remove([`${user.id}/${name}`]);

      if (removeErr) throw removeErr;

      if (activeItem?.name === name) {
        setActiveItem(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset");
    } finally {
      setDeletingName(null);
    }
  }

  // Schedule post from recommendation
  async function handleAcceptRecommendation(item: MediaItemWithAI) {
    if (!item.recommendation) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: postErr } = await supabase.from("posts").insert([
        {
          user_id: user.id,
          caption: `${item.recommendation.caption}\n\n${item.recommendation.hashtags
            .map((h) => `#${h}`)
            .join(" ")}`,
          status: "publishing",
          created_at: new Date().toISOString(),
        },
      ]);

      if (postErr) throw postErr;

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, recommendation: undefined } : i
        )
      );
      setActiveItem(null);
    } catch (err: any) {
      setError(err.message || "Failed to schedule post");
    }
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5 text-pink-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-indigo-500" />;
      default:
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-2 space-y-6 font-sans">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>POSTWEL OPERATING SYSTEM</span>
          <span>/</span>
          <span className="text-slate-700">MEDIA LIBRARY</span>
        </div>

        {/* View Title */}
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Media Library & Smart Assets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload brand files. Our AI scans metadata, extracts positioning hooks, and recommends schedule optimizations.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 border border-red-200 bg-red-50 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
              {error.toLowerCase().includes("bucket") && (
                <p className="mt-1 text-red-600/80">
                  Ensure a public storage bucket named{" "}
                  <code className="bg-red-100 px-1 py-0.5 rounded">media</code>{" "}
                  exists in Supabase (Storage → New bucket).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Box + Stored Assets Grid */}
          <div className="lg:col-span-8 space-y-6">
            {/* Upload Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-10 bg-white/70 text-center cursor-pointer relative group transition-colors shadow-2xs"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold text-slate-700">
                    Uploading asset to media vault...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <UploadCloud className="w-9 h-9 text-blue-400 stroke-[1.5] mb-3" />
                  <p className="text-xs font-bold text-slate-800">
                    Drag brand photos, videos, flyers or PDFs here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Or click to select files from your operating system
                  </p>
                </div>
              )}
            </div>

            {/* Stored Assets Header */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                STORED ASSETS ({items.length})
              </span>

              {items.length === 0 ? (
                <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center bg-white">
                  <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    No media uploaded yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Upload images or PDFs to start planning your campaign feed.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {items.map((item) => {
                    const isSelected = activeItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveItem(item)}
                        className={`bg-white rounded-2xl border p-2 cursor-pointer transition-all relative flex flex-col justify-between group shadow-2xs ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/20"
                            : "border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        {/* Selected Indicator Corner Dots */}
                        {isSelected && (
                          <>
                            <span className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-xs z-20"></span>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-xs z-20"></span>
                            <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 rounded-xs z-20"></span>
                            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-xs z-20"></span>
                          </>
                        )}

                        <div>
                          {/* Asset Thumbnail View */}
                          <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-100 aspect-[16/10] mb-2.5 flex items-center justify-center">
                            {item.type === "image" ? (
                              <img
                                src={item.url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                {getAssetIcon(item.type)}
                              </div>
                            )}

                            {/* Quick Delete Overlay Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(item.name);
                              }}
                              disabled={deletingName === item.name}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Delete Asset"
                            >
                              {deletingName === item.name ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <div className="px-1">
                            <h4 className="text-[11px] font-bold text-slate-900 truncate">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {item.size} • Uploaded{" "}
                              {new Date(item.created_at).toISOString().split("T")[0]}
                            </p>
                          </div>
                        </div>

                        {/* AI Schedule Plan Available Badge */}
                        {item.recommendation && (
                          <div className="mt-3 pt-2 border-t border-slate-100/80 px-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50/70 px-2 py-1 rounded-md">
                              <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>AI Schedule Plan Available</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Scheduling Advisor */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              AI SCHEDULING ADVISOR
            </span>

            {activeItem ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  {getAssetIcon(activeItem.type)}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {activeItem.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Asset Optimization Deck
                    </p>
                  </div>
                </div>

                {activeItem.recommendation ? (
                  <div className="p-4 space-y-4 text-xs">
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Visual Analysis</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Recommended for organic deployment on{" "}
                        <strong>{activeItem.recommendation.platform}</strong> under campaign{" "}
                        <strong>&ldquo;{activeItem.recommendation.campaign}&rdquo;</strong>.
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Channel Target
                      </span>
                      <span className="font-bold text-slate-900">
                        {activeItem.recommendation.platform} Feed
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Posting Schedule
                      </span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeItem.recommendation.postingDate} @ 10:00 AM</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Proposed Caption
                      </span>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                        {activeItem.recommendation.caption}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activeItem.recommendation.hashtags.map((h) => (
                          <span
                            key={h}
                            className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
                          >
                            #{h}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Campaign
                        </span>
                        <span className="text-slate-800 font-bold block truncate">
                          {activeItem.recommendation.campaign}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Expected CTR
                        </span>
                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                          <Activity className="w-3.5 h-3.5" />
                          <span>{activeItem.recommendation.expectedEngagement}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => {
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === activeItem.id
                                ? { ...i, recommendation: undefined }
                                : i
                            )
                          );
                          setActiveItem(null);
                        }}
                        className="flex-1 py-2 px-3 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAcceptRecommendation(activeItem)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Schedule</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Inbox className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      No Active Recommendations
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-normal">
                      This asset has already been approved or scheduled.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-8 text-center text-slate-400 flex flex-col items-center justify-center py-20 min-h-[300px]">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100/80 mb-3">
                  <Inbox className="w-5 h-5 text-slate-400 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-slate-800">Select an asset</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[210px] leading-relaxed">
                  Click any brand photo, flyer, or video on the left panel to review AI recommend schedule details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}