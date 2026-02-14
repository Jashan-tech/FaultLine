'use client';

import { useEffect } from 'react';
import {
  pickDefaultService,
  useSelectedService,
  useServiceOptions
} from '@/lib/selected-service';

export function ServiceSelector(): React.JSX.Element {
  const { services, loading } = useServiceOptions();
  const [selectedService, setSelectedService] = useSelectedService();

  useEffect(() => {
    if (loading || services.length === 0) {
      return;
    }

    if (!selectedService || !services.includes(selectedService)) {
      setSelectedService(pickDefaultService(services));
    }
  }, [loading, selectedService, services, setSelectedService]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Service</span>
      <select
        className="h-8 w-52 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
        disabled={loading || services.length === 0}
        value={selectedService}
        onChange={(event) => setSelectedService(event.target.value)}
      >
        {services.length === 0 ? <option value="">No services</option> : null}
        {services.map((service) => (
          <option key={service} value={service}>
            {service}
          </option>
        ))}
      </select>
    </div>
  );
}
