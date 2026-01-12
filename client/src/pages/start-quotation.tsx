import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLeads, logActivity, upsertLead } from "@/modules/crm/storage";
import { generateUUID } from "@/lib/uuid";
import type { LeadRecord } from "@/modules/crm/types";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  ArrowRight,
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeadSource = "website" | "whatsapp" | "manual";
type ProjectType = "bedroom" | "wardrobe" | "kitchen" | "living" | "office";

const PROJECT_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "bedroom", label: "Bedroom" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living", label: "Living Room" },
  { value: "office", label: "Office" },
];

function safeId(prefix: string) {
  return `${prefix}-${generateUUID()}`;
}

export default function StartQuotationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get("source") as LeadSource | null;

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [projectType, setProjectType] = useState<ProjectType>("bedroom");

  const source: LeadSource = sourceParam === "whatsapp" || sourceParam === "manual" ? sourceParam : "website";

  const [nameError, setNameError] = useState("");
  const [mobileError, setMobileError] = useState("");

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Required");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateMobile = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setMobileError("Required");
      return false;
    }
    if (digits.length < 10) {
      setMobileError("Enter 10 digits");
      return false;
    }
    setMobileError("");
    return true;
  };

  const handleUseCurrentLocation = () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocation("GPS Location");
        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      }
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isNameValid = validateName(name);
    const isMobileValid = validateMobile(mobile);

    if (!isNameValid || !isMobileValid) return;

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    const trimmedEmail = email.trim();
    const trimmedLocation = location.trim();
    const lat = latitude ?? undefined;
    const lng = longitude ?? undefined;
    const normalizedMobile = trimmedMobile.replace(/\D/g, "");
    const at = new Date().toISOString();

    const existing = getLeads().find(
      (lead) => (lead.mobile || "").replace(/\D/g, "") === normalizedMobile
    );

    const quoteId = safeId("quote");

    let leadRecord: LeadRecord;
    if (existing) {
      leadRecord = {
        ...existing,
        name: trimmedName,
        mobile: trimmedMobile,
        source,
        email: trimmedEmail || existing.email || "",
        location: trimmedLocation || existing.location || "",
        latitude: lat ?? existing.latitude,
        longitude: lng ?? existing.longitude,
        updatedAt: at,
        quoteId,
      };

      upsertLead(leadRecord);
      logActivity({
        leadId: existing.id,
        type: "NOTE_ADDED",
        message: `Reused lead and started new ${projectType} quotation.`,
      });
    } else {
      const leadId = safeId("lead");
      leadRecord = {
        id: leadId,
        name: trimmedName,
        mobile: trimmedMobile,
        source,
        status: "NEW",
        createdAt: at,
        updatedAt: at,
        email: trimmedEmail || "",
        location: trimmedLocation || "",
        latitude: lat,
        longitude: lng,
        quoteId,
      };

      upsertLead(leadRecord);
      logActivity({
        leadId,
        type: "LEAD_CREATED",
        message: `Lead created via Start Quotation (${projectType}).`,
      });
    }

    logActivity({
      leadId: leadRecord.id,
      type: "QUOTE_CREATED",
      message: `Quote created (${projectType}).`,
      meta: { quoteId },
    });

    navigate(
      `/visual-quotation?leadId=${encodeURIComponent(leadRecord.id)}&quoteId=${encodeURIComponent(quoteId)}`
    );
  };

  const isFormValid = name.trim() && mobile.replace(/\D/g, "").length >= 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">New Quotation</h1>
                  <p className="text-xs text-white/80">Create lead & start designing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Name & Mobile Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) validateName(e.target.value);
                  }}
                  onBlur={() => validateName(name)}
                  placeholder="Customer name"
                  className={cn(
                    "h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white",
                    nameError && "border-red-300 focus:border-red-400"
                  )}
                />
                {nameError && (
                  <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {nameError}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  Mobile <span className="text-red-500">*</span>
                </label>
                <Input
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (mobileError) validateMobile(e.target.value);
                  }}
                  onBlur={() => validateMobile(mobile)}
                  inputMode="tel"
                  placeholder="9876543210"
                  className={cn(
                    "h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white",
                    mobileError && "border-red-300 focus:border-red-400"
                  )}
                />
                {mobileError && (
                  <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {mobileError}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-400" />
                Email
                <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className="h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                Location
                <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or site address"
                  className="h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={locationStatus === "loading"}
                  className={cn(
                    "h-10 px-3 text-xs whitespace-nowrap",
                    locationStatus === "success" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                    locationStatus === "error" && "border-red-300 bg-red-50 text-red-700"
                  )}
                >
                  {locationStatus === "loading" ? (
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : locationStatus === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : locationStatus === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Project Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Home className="h-3 w-3 text-slate-400" />
                Project Type
              </label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                <SelectTrigger className="h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isFormValid}
              className={cn(
                "w-full h-11 text-sm font-semibold rounded-xl shadow-md transition-all duration-200 mt-2",
                isFormValid
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              )}
            >
              Continue to Quotation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-slate-500 mt-4">
          You can add more details later in the editor
        </p>
      </div>
    </div>
  );
}
