import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLeads, logActivity, upsertLead } from "@/modules/crm/storage";
import { generateUUID } from "@/lib/uuid";
import type { LeadRecord } from "@/modules/crm/types";

type LeadSource = "website" | "whatsapp" | "manual";
type ProjectType = "Bedroom" | "Wardrobe" | "Kitchen";

function safeId(prefix: string) {
  return `${prefix}-${generateUUID()}`;
}

export default function StartQuotationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get("source") as LeadSource | null;
  const defaultSource: LeadSource = useMemo(
    () => (sourceParam === "whatsapp" || sourceParam === "manual" ? sourceParam : "website"),
    [sourceParam]
  );

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<ProjectType>("Bedroom");
  const [source, setSource] = useState<LeadSource>(defaultSource);

  useEffect(() => {
    setSource(defaultSource);
  }, [defaultSource]);

  const handleUseCurrentLocation = () => {
    setLocationStatus(null);
    if (!navigator.geolocation) {
      setLocationStatus("Location permission denied. Please enter address manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocation("Location detected (GPS)");
        setLocationStatus("Location captured successfully");
      },
      () => {
        setLocationStatus("Location permission denied. Please enter address manually.");
      }
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      return;
    }

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
      `/visual-quotation?leadId=${encodeURIComponent(leadRecord.id)}&quoteId=${encodeURIComponent(
        quoteId
      )}`
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">Start Your Quotation</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Capture lead details and jump straight into the visual quotation flow.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                inputMode="tel"
                placeholder="e.g. 9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Site Address (optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or site address"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                >
                  📍 Use My Current Location
                </Button>
                {locationStatus && (
                  <span className="text-xs text-gray-600">{locationStatus}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project type</Label>
              <select
                id="projectType"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
              >
                <option value="Bedroom">Bedroom</option>
                <option value="Wardrobe">Wardrobe</option>
                <option value="Kitchen">Kitchen</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Lead source</Label>
              <select
                id="source"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
              >
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Continue to Advanced Quotation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
