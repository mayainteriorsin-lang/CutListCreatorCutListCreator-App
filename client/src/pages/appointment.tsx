import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicLeadInfo, createAppointment, upsertAppointment } from "@/modules/crm/storage";
import type { Appointment } from "@/modules/crm/types";
import {
  Calendar,
  Clock,
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  User,
  CalendarPlus,
  RefreshCw,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Company branding config - can be customized
const COMPANY_CONFIG = {
  name: "Premium Interiors",
  tagline: "Transform Your Space",
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  logo: null as string | null, // Set to image URL if you have a logo
};

// Time slots configuration
const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

// Simple lead info for display (from public index)
interface LeadInfo {
  name: string;
  mobile: string;
}

export default function AppointmentPage() {
  const { leadId } = useParams<{ leadId: string }>();

  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [existingAppointment, setExistingAppointment] = useState<Appointment | null>(null);
  const [isReschedule, setIsReschedule] = useState(false);

  // Form fields
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [secondaryMobile, setSecondaryMobile] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Validation
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    // Use public lead index (doesn't require PIN/encryption)
    const publicInfo = getPublicLeadInfo(leadId);
    setLead(publicInfo);
    setLoading(false);
  }, [leadId]);

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
        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      }
    );
  };

  const validateDate = (value: string) => {
    if (!value) {
      setDateError("Please select a date");
      return false;
    }
    const selected = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      setDateError("Please select a future date");
      return false;
    }
    setDateError("");
    return true;
  };

  const validateTime = (value: string) => {
    if (!value) {
      setTimeError("Please select a time");
      return false;
    }
    setTimeError("");
    return true;
  };

  // Generate Google Calendar link
  const generateGoogleCalendarLink = (scheduledDate: Date) => {
    const startTime = scheduledDate.toISOString().replace(/-|:|\.\d+/g, "");
    const endTime = new Date(scheduledDate.getTime() + 60 * 60 * 1000)
      .toISOString()
      .replace(/-|:|\.\d+/g, "");

    const title = encodeURIComponent(`Site Visit - ${COMPANY_CONFIG.name}`);
    const details = encodeURIComponent(
      `Site visit appointment with ${COMPANY_CONFIG.name}\n\nContact: ${COMPANY_CONFIG.phone}`
    );
    const location = encodeURIComponent(locationNote || "Site Location");

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
  };

  // Generate WhatsApp confirmation link
  const generateWhatsAppConfirmation = (scheduledDate: Date) => {
    const dateStr = scheduledDate.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = scheduledDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `Hi! I've scheduled a site visit appointment.

Date: ${dateStr}
Time: ${timeStr}
${locationNote ? `Location: ${locationNote}` : ""}
${customerNote ? `Note: ${customerNote}` : ""}

Looking forward to the visit!`;

    return `https://wa.me/${COMPANY_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!leadId) return;

    const isDateValid = validateDate(date);
    const isTimeValid = validateTime(time);

    if (!isDateValid || !isTimeValid) return;

    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    if (isReschedule && existingAppointment) {
      // Update existing appointment
      upsertAppointment({
        ...existingAppointment,
        scheduledAt,
        secondaryMobile: secondaryMobile.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        locationNote: locationNote.trim(),
        customerNote: customerNote.trim() || undefined,
        status: "PENDING",
      });
    } else {
      createAppointment({
        leadId,
        scheduledAt,
        secondaryMobile: secondaryMobile.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        locationNote: locationNote.trim(),
        customerNote: customerNote.trim() || undefined,
      });
    }

    setSubmitted(true);
  };

  const handleReschedule = () => {
    setIsReschedule(true);
    setSubmitted(false);
    setDate("");
    setTime("");
  };

  const isFormValid = date && time && locationNote.trim();

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-red-200/60 shadow-xl shadow-red-200/50 overflow-hidden p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
            <p className="text-sm text-slate-600">
              This appointment link is invalid or expired. Please contact us for a new link.
            </p>
            <a
              href={`tel:${COMPANY_CONFIG.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
            >
              <Phone className="h-4 w-4" />
              Call Us
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const scheduledDate = new Date(`${date}T${time}`);
    const googleCalendarLink = generateGoogleCalendarLink(scheduledDate);
    const whatsappLink = generateWhatsAppConfirmation(scheduledDate);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-emerald-200/60 shadow-xl shadow-emerald-200/50 overflow-hidden">
            {/* Success Header */}
            <div className="p-6 text-center border-b border-emerald-100">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                {isReschedule ? "Appointment Rescheduled!" : "Appointment Scheduled!"}
              </h1>
              <p className="text-sm text-slate-600">
                Thank you for scheduling your appointment. We will contact you to confirm.
              </p>
            </div>

            {/* Appointment Details */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {scheduledDate.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Add to Google Calendar */}
                <a
                  href={googleCalendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <CalendarPlus className="h-4 w-4 text-blue-600" />
                  Add to Google Calendar
                </a>

                {/* Send WhatsApp Confirmation */}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 bg-green-500 rounded-xl text-sm font-medium text-white hover:bg-green-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send WhatsApp Confirmation
                </a>

                {/* Reschedule Button */}
                <button
                  onClick={handleReschedule}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reschedule Appointment
                </button>
              </div>

              {/* Company Contact */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center mb-2">Need help? Contact us</p>
                <a
                  href={`tel:${COMPANY_CONFIG.phone.replace(/\s/g, "")}`}
                  className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-600"
                >
                  <Phone className="h-4 w-4" />
                  {COMPANY_CONFIG.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Company Branding Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
            <div className="flex items-center gap-3">
              {COMPANY_CONFIG.logo ? (
                <img
                  src={COMPANY_CONFIG.logo}
                  alt={COMPANY_CONFIG.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold">{COMPANY_CONFIG.name}</h1>
                <p className="text-xs text-white/80">{COMPANY_CONFIG.tagline}</p>
              </div>
            </div>
          </div>

          {/* Page Title */}
          <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold text-indigo-900">
                {isReschedule ? "Reschedule Appointment" : "Schedule Site Visit"}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">{lead.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.mobile}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (dateError) validateDate(e.target.value);
                  }}
                  onBlur={() => validateDate(date)}
                  className={cn(
                    "h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white",
                    dateError && "border-red-300 focus:border-red-400"
                  )}
                />
                {dateError && (
                  <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {dateError}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  Time Slot <span className="text-red-500">*</span>
                </label>
                <Select value={time} onValueChange={(v) => { setTime(v); if (timeError) validateTime(v); }}>
                  <SelectTrigger
                    className={cn(
                      "h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white",
                      timeError && "border-red-300 focus:border-red-400"
                    )}
                  >
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {timeError && (
                  <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {timeError}
                  </p>
                )}
              </div>
            </div>

            {/* Secondary Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                Secondary Mobile
                <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                value={secondaryMobile}
                onChange={(e) => setSecondaryMobile(e.target.value)}
                inputMode="tel"
                placeholder="Alternate contact number"
                className="h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Site Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                Site Location <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="Flat/building/landmark"
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
              {locationStatus === "success" && latitude && longitude && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  GPS location captured ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                </p>
              )}
            </div>

            {/* Customer Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-slate-400" />
                Additional Notes
                <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </label>
              <Textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Any special requirements or things we should know..."
                className="min-h-[80px] text-sm bg-slate-50/50 border-slate-200 focus:bg-white resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isFormValid}
              className={cn(
                "w-full h-11 text-sm font-semibold rounded-xl shadow-md transition-all duration-200 mt-2",
                isFormValid
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/20"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              )}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isReschedule ? "Confirm Reschedule" : "Confirm Appointment"}
            </Button>
          </form>

          {/* Company Contact Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Need help?</span>
              <a
                href={`tel:${COMPANY_CONFIG.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600"
              >
                <Phone className="h-3 w-3" />
                {COMPANY_CONFIG.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-slate-500 mt-4">
          We will contact you to confirm the appointment
        </p>
      </div>
    </div>
  );
}
