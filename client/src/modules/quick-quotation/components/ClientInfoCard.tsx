/**
 * Quick Quotation Module - Client Info Card (Compact)
 *
 * Inline form for client information.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';
import { useClient, useQuickQuotationStore } from '../store/quickQuotationStore';

export function ClientInfoCard() {
  const client = useClient();
  const setClientField = useQuickQuotationStore(state => state.setClientField);

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <User className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase font-medium">Client</span>
          </div>

          {/* Mobile: 2x2 grid, Desktop: single row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-1">
            <Input
              placeholder="Name *"
              value={client.name}
              onChange={(e) => setClientField('name', e.target.value)}
              className="h-7 sm:h-8 text-xs sm:text-sm col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[120px]"
            />
            <Input
              placeholder="Phone"
              value={client.contact}
              onChange={(e) => setClientField('contact', e.target.value)}
              className="h-7 sm:h-8 text-xs sm:text-sm sm:w-32"
            />
            <Input
              type="email"
              placeholder="Email"
              value={client.email}
              onChange={(e) => setClientField('email', e.target.value)}
              className="h-7 sm:h-8 text-xs sm:text-sm sm:w-44"
            />
            <Input
              placeholder="Address"
              value={client.address}
              onChange={(e) => setClientField('address', e.target.value)}
              className="h-7 sm:h-8 text-xs sm:text-sm col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[150px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
