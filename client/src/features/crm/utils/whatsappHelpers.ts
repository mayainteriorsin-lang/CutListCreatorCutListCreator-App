import type { LeadRecord } from "@/modules/crm/types";

export function generateAppointmentLink(leadId: string): string {
    return `${window.location.origin}/appointment/${leadId}`;
}

export function generateWhatsAppLink(lead: LeadRecord): string {
    const appointmentLink = generateAppointmentLink(lead.id);
    const message = `Hi ${lead.name},

Please schedule your site visit appointment:

${appointmentLink}

Looking forward to meeting you!`;

    const phone = lead.mobile.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("91") ? phone : `91${phone}`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}
