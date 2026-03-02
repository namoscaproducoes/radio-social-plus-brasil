import { createContext, useContext } from 'react';

interface TimezoneContextType {
  timezone: string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const timezone = 'America/Sao_Paulo';

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, formatTime, formatDateTime }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone deve ser usado dentro de TimezoneProvider');
  }
  return context;
}
