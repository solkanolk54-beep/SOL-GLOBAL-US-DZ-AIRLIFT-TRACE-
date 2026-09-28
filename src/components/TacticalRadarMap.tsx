import React, { useState } from 'react';
import { AirliftShipment } from '../types';
import { Plane, MapPin, Radio, Compass, Navigation } from 'lucide-react';

interface Props {
  shipments: AirliftShipment[];
  onSelectFlight: (flight: AirliftShipment) => void;
  selectedFlightId?: string;
}

export const TacticalRadarMap: React.FC<Props> = ({
  shipments,
  onSelectFlight,
  selectedFlightId,
}) => {
  const [activeHub, setActiveHub] = useState<string | null>(null);

  // Strategic Locations with normalized SVG viewbox coordinates [x: 0-1000, y: 0-500]
  const US_AIRPORTS: Record<string, { name: string; state: string; x: number; y: number; code: string }> = {
    DFW: { name: 'Dallas Fort Worth Int.', state: 'Texas', x: 190, y: 260, code: 'DFW' },
    IAH: { name: 'Houston Intercontinental', state: 'Texas', x: 200, y: 280, code: 'IAH' },
    PHX: { name: 'Phoenix Sky Harbor', state: 'Arizona', x: 135, y: 250, code: 'PHX' },
    ABQ: { name: 'Albuquerque Sunport', state: 'New Mexico', x: 155, y: 245, code: 'ABQ' },
  };

  const DZ_AIRPORTS: Record<string, { name: string; wilaya: string; x: number; y: number; code: string }> = {
    ALG: { name: 'Algiers Houari Boumediene', wilaya: 'Algiers / Mila', x: 675, y: 215, code: 'ALG' },
    BSK: { name: 'Biskra Mohamed Khider', wilaya: 'Biskra', x: 690, y: 245, code: 'BSK' },
    AZR: { name: 'Adrar Touat Airport', wilaya: 'Adrar (Sahara Hub)', x: 645, y: 310, code: 'AZR' },
  };

  const DZ_MEGA_FARMS = [
    { id: 'DZ-FARM-ADRAR-01', name: 'Adrar Mega-Dairy Oasis (30K-100K Heads)', wilaya: 'Adrar', x: 640, y: 325 },
    { id: 'DZ-FARM-BISKRA-01', name: 'Ziban Agro-Dairy Basin', wilaya: 'Biskra', x: 700, y: 255 },
    { id: 'DZ-FARM-MILA-01', name: 'Mila High Plains Complex', wilaya: 'Mila', x: 710, y: 220 },
  ];

  return (
    <div className="relative rounded-xl border border-emerald-950/80 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Tactical Header Overlay */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 border border-emerald-500/40 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-100">
            TRANSLOG RADAR • US-DZ AIRLIFT CORRIDOR
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
            ATLANTIC GREAT CIRCLE ARC
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>ORIGIN: TEXAS/AZ/NM ➔ DEST: ADRAR/BISKRA/MILA</span>
        </div>
      </div>

      {/* SVG GIS Tactical Canvas */}
      <div className="w-full aspect-[21/9] min-h-[380px] max-h-[520px] relative bg-[#040810] tactical-grid">
        <svg
          viewBox="0 0 1000 500"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="flightArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#05101a" />
              <stop offset="100%" stopColor="#02070f" />
            </linearGradient>

            {/* Radar Sweep Effect */}
            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Ocean and Grid */}
          <rect width="1000" height="500" fill="url(#oceanGrad)" />

          {/* Radar Circles */}
          <g opacity="0.2">
            <circle cx="500" cy="250" r="120" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="500" cy="250" r="220" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="6 6" />
            <circle cx="500" cy="250" r="340" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="8 8" />
            <line x1="500" y1="0" x2="500" y2="500" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
          </g>

          {/* Stylized Continent Outlines (North America & North Africa) */}
          <g fill="#0b1726" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.6">
            {/* North America approximation */}
            <path d="M 80 120 L 220 110 L 260 170 L 290 220 L 250 250 L 210 320 L 160 300 L 110 240 Z" />
            {/* Europe / Med approximation */}
            <path d="M 580 100 L 680 90 L 730 140 L 710 190 L 620 180 Z" />
            {/* Algeria & North Africa approximation */}
            <path d="M 610 200 L 730 200 L 770 280 L 740 380 L 620 390 L 590 270 Z" fill="#0c231e" stroke="#10b981" strokeWidth="1" opacity="0.7" />
          </g>

          {/* Region Titles */}
          <text x="180" y="340" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">
            UNITED STATES (CATTLE HUBS)
          </text>
          <text x="640" y="420" fill="#10b981" fontSize="12" fontFamily="monospace" fontWeight="bold">
            ALGERIA (MEGA-FARMS BASIN)
          </text>
          <text x="420" y="160" fill="#334155" fontSize="11" fontFamily="monospace" letterSpacing="4">
            ATLANTIC TRANSIT CORRIDOR
          </text>

          {/* Render Active Airlift Flight Paths */}
          {shipments.map((flight, idx) => {
            const origin = (flight.originAirport?.code && US_AIRPORTS[flight.originAirport.code]) || US_AIRPORTS['DFW'];
            const dest = (flight.destinationAirport?.code && DZ_AIRPORTS[flight.destinationAirport.code]) || DZ_AIRPORTS['AZR'];
            const isSelected = selectedFlightId === flight.id;

            // Arc control point for Atlantic Great Circle path (curves upward over Atlantic)
            const midX = (origin.x + dest.x) / 2;
            const midY = Math.min(origin.y, dest.y) - 90 - (idx % 3) * 20;

            const pathD = `M ${origin.x} ${origin.y} Q ${midX} ${midY} ${dest.x} ${dest.y}`;

            // Animated airplane position along curve:
            // in_flight ~55%, landed ~98%, boarding ~15%
            let progress = 0.05;
            if (flight.status === 'in_flight') progress = 0.58;
            if (flight.status === 'landed' || flight.status === 'quarantine_holding') progress = 0.95;
            if (flight.status === 'boarding') progress = 0.15;

            // Compute approximate point along quadratic bezier
            const t = progress;
            const planeX = (1 - t) * (1 - t) * origin.x + 2 * (1 - t) * t * midX + t * t * dest.x;
            const planeY = (1 - t) * (1 - t) * origin.y + 2 * (1 - t) * t * midY + t * t * dest.y;

            return (
              <g key={flight.id} onClick={() => onSelectFlight(flight)} className="cursor-pointer group">
                {/* Flight Path Arc */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? '#34d399' : '#059669'}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeDasharray={flight.status === 'in_flight' ? '8 4' : 'none'}
                  opacity={isSelected ? 1 : 0.65}
                  className="transition-all duration-300"
                />

                {/* Animated Waypoint Pulse for in-flight */}
                {flight.status === 'in_flight' && (
                  <circle cx={planeX} cy={planeY} r="14" fill="#06b6d4" opacity="0.3" className="animate-ping" />
                )}

                {/* Airplane Marker */}
                <g transform={`translate(${planeX}, ${planeY})`}>
                  <circle
                    r={isSelected ? '9' : '7'}
                    fill={flight.status === 'in_flight' ? '#06b6d4' : '#10b981'}
                    stroke="#040810"
                    strokeWidth="2"
                  />
                  {/* Small Flight label */}
                  <text
                    x="12"
                    y="4"
                    fill={isSelected ? '#34d399' : '#94a3b8'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {flight.flightNumber.split('-').slice(-2).join('-')}
                  </text>
                </g>
              </g>
            );
          })}

          {/* US Departure Hub Markers */}
          {Object.entries(US_AIRPORTS).map(([code, hub]) => (
            <g
              key={code}
              transform={`translate(${hub.x}, ${hub.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setActiveHub(code)}
              onMouseLeave={() => setActiveHub(null)}
            >
              <circle r="6" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
              <circle r="12" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              <text x="-12" y="-10" fill="#93c5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {code} ({hub.state})
              </text>
            </g>
          ))}

          {/* DZ Destination Airport Markers */}
          {Object.entries(DZ_AIRPORTS).map(([code, port]) => (
            <g key={code} transform={`translate(${port.x}, ${port.y})`} className="cursor-pointer">
              <circle r="7" fill="#10b981" stroke="#047857" strokeWidth="2" />
              <circle r="15" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
              <text x="12" y="4" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {code} ({port.wilaya})
              </text>
            </g>
          ))}

          {/* DZ Mega Farms PostGIS Hubs */}
          {DZ_MEGA_FARMS.map((farm) => (
            <g key={farm.id} transform={`translate(${farm.x}, ${farm.y})`} className="cursor-pointer">
              <rect x="-4" y="-4" width="8" height="8" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
              <text x="10" y="14" fill="#fcd34d" fontSize="8.5" fontFamily="monospace">
                ★ {farm.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Bottom Live Flight Telemetry Bar */}
      <div className="border-t border-slate-800 bg-slate-900/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>AIRLIFT AIRPORTS: 4 US HUBS ➔ 3 DZ PORTS</span>
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400 rotate-45"></span>
            <span>STRATEGIC MEGA-FARMS: ADRAR • BISKRA • MILA</span>
          </span>
        </div>

        <div className="text-slate-400">
          TRANSIT DISTANCE: <strong className="text-slate-200">~8,920 KM (11H 45M B747-400F)</strong>
        </div>
      </div>
    </div>
  );
};
