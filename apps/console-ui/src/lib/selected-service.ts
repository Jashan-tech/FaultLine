'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'faultline.selectedService';
const CHANGE_EVENT = 'faultline:selected-service';

type ServicesResponse = { services: string[] };

function readStoredService(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function setSelectedService(service: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, service);
  window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: service }));
}

export function useSelectedService(): [string, (service: string) => void] {
  const [selectedService, setSelectedServiceState] = useState('');

  useEffect(() => {
    setSelectedServiceState(readStoredService());

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSelectedServiceState(event.newValue || '');
      }
    };

    const onChange = (event: Event) => {
      const custom = event as CustomEvent<string>;
      setSelectedServiceState(custom.detail || readStoredService());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  const update = useCallback((service: string) => {
    setSelectedService(service);
    setSelectedServiceState(service);
  }, []);

  return [selectedService, update];
}

export function useServiceOptions(): { services: string[]; loading: boolean } {
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void fetch('/api/services')
      .then((response) => response.json())
      .then((data: ServicesResponse) => {
        if (!active) {
          return;
        }
        setServices(data.services || []);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setServices([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { services, loading };
}

export function pickDefaultService(services: string[]): string {
  if (services.includes('node-express-example')) {
    return 'node-express-example';
  }
  return services[0] || '';
}
