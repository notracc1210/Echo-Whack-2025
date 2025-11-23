import { MapPin, Navigation } from 'lucide-react';

interface Resource {
  id: number;
  name: string;
  type: string;
  distance: string;
  lat: number;
  lng: number;
}

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="text-lg text-blue-600">{resource.distance}</span>
          </div>
          <h3 className="text-gray-900 mb-1 text-2xl">{resource.name}</h3>
          <p className="text-gray-600 text-xl">{resource.type}</p>
        </div>
        
        <button 
          className="flex-shrink-0 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
          aria-label="Get directions"
        >
          <Navigation className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}