import { MapPin } from 'lucide-react';
import { ResourceCard } from './ResourceCard';

interface Resource {
  id: number;
  name: string;
  type: string;
  distance: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  resources: Resource[];
}

export function MapView({ resources }: MapViewProps) {
  return (
    <div className="w-full h-full relative bg-gradient-to-br from-green-50 to-blue-50">
      {/* Map Background with Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(209, 213, 219, 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(209, 213, 219, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}>
        {/* Decorative Map Elements */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <path
            d="M 50 200 Q 200 150, 350 250 T 650 200"
            stroke="#3b82f6"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 100 400 Q 300 350, 500 450 T 800 400"
            stroke="#10b981"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Resources Overlay */}
      {resources.length > 0 ? (
        <div className="relative z-10 h-full overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>

          {/* Map Markers */}
          <div className="absolute top-20 left-1/4">
            <MapPin className="w-10 h-10 text-blue-600 drop-shadow-lg animate-bounce" fill="#3b82f6" />
          </div>
          <div className="absolute top-40 right-1/3">
            <MapPin className="w-10 h-10 text-blue-600 drop-shadow-lg" fill="#3b82f6" style={{ animationDelay: '0.2s' }} />
          </div>
          <div className="absolute bottom-1/3 left-1/3">
            <MapPin className="w-10 h-10 text-blue-600 drop-shadow-lg" fill="#3b82f6" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center px-6">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-2xl">Speak to find activities and resources near you</p>
          </div>
        </div>
      )}
    </div>
  );
}