/**
 * Quick Quotation Module - Client Info Card (Compact)
 *
 * Inline form for client information with mobile-optimized inputs.
 * 48px min height on mobile, 16px min font size.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import { useClient, useQuickQuotationStore } from '../store/quickQuotationStore';

export function ClientInfoCard() {
  const client = useClient();
  const setClientField = useQuickQuotationStore(state => state.setClientField);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <span className="text-xs sm:text-sm uppercase font-semibold tracking-wide">Client Details</span>
          </div>

          {/* Mobile: 2 column grid, Desktop: single row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            {/* Name - full width on mobile, flex on desktop */}
            <div className="col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[150px]">
              <Input
                placeholder="Client Name *"
                value={client.name}
                onChange={(e) => setClientField('name', e.target.value)}
                className="h-12 sm:h-10 text-base sm:text-sm rounded-xl"
              />
            </div>

            {/* Phone - with icon hint */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Phone"
                inputMode="tel"
                value={client.contact}
                onChange={(e) => setClientField('contact', e.target.value)}
                className="h-12 sm:h-10 text-base sm:text-sm pl-10 rounded-xl sm:w-36"
              />
            </div>

            {/* Email - with icon hint */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type="email"
                inputMode="email"
                placeholder="Email"
                value={client.email}
                onChange={(e) => setClientField('email', e.target.value)}
                className="h-12 sm:h-10 text-base sm:text-sm pl-10 rounded-xl sm:w-48"
              />
            </div>

            {/* Address - full width on mobile */}
            <div className="col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[180px] relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Address / Location"
                value={client.address}
                onChange={(e) => setClientField('address', e.target.value)}
                className="h-12 sm:h-10 text-base sm:text-sm pl-10 rounded-xl"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
