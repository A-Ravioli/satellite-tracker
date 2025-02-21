"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';

interface Satellite {
  name: string;
  norad_id: number;
  lon: string;
  lat: string;
  alt: string;
  category: 'communication' | 'navigation' | 'weather' | 'telescope' | 'debris';
}

const SatelliteTracker: React.FC = () => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch satellite data
  useEffect(() => {
    const fetchSatellites = async () => {
      try {
        // In a real implementation, you would fetch from space-track.org API or similar
        // This requires authentication and proper API handling
        // Example endpoint: https://www.space-track.org/basicspacedata/query/class/tle_latest/
        
        // For demo, using expanded sample data to show scale
        const sampleData = Array.from({ length: 200 }, (_, i) => ({
          name: `SAT-${i + 1}`,
          norad_id: i + 1,
          lon: (Math.random() * 360 - 180).toFixed(2),
          lat: (Math.random() * 180 - 90).toFixed(2),
          alt: (300 + Math.random() * 35700).toFixed(2),
          category: ['communication', 'navigation', 'weather', 'telescope', 'debris'][Math.floor(Math.random() * 5)] as Satellite['category']
        }));

        setSatellites(sampleData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch satellite data');
        setLoading(false);
      }
    };

    fetchSatellites();
    const interval = setInterval(fetchSatellites, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // 3D transformation matrix calculations
  const calculateMatrix = (x: number, y: number) => {
    const cosX = Math.cos(x * Math.PI / 180);
    const sinX = Math.sin(x * Math.PI / 180);
    const cosY = Math.cos(y * Math.PI / 180);
    const sinY = Math.sin(y * Math.PI / 180);

    return [
      cosY, 0, sinY,
      sinX * sinY, cosX, -sinX * cosY,
      -cosX * sinY, sinX, cosX * cosY
    ];
  };

  // Project 3D point to 2D with perspective
  const project3D = (point: { x: number; y: number; z: number }, matrix: number[]) => {
    const x = point.x * matrix[0] + point.y * matrix[1] + point.z * matrix[2];
    const y = point.x * matrix[3] + point.y * matrix[4] + point.z * matrix[5];
    const z = point.x * matrix[6] + point.y * matrix[7] + point.z * matrix[8];
    
    const scale = 1000 / (1000 + z);
    return {
      x: x * scale,
      y: y * scale,
      z: z
    };
  };

  // Convert spherical to cartesian coordinates
  const toCartesian = (lon: string, lat: string, radius: number) => {
    const lonRad = (parseFloat(lon) - 90) * Math.PI / 180;
    const latRad = parseFloat(lat) * Math.PI / 180;
    return {
      x: radius * Math.cos(latRad) * Math.cos(lonRad),
      y: radius * Math.cos(latRad) * Math.sin(lonRad),
      z: radius * Math.sin(latRad)
    };
  };

  // Mouse event handlers with improved sensitivity
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setRotation(prev => ({
      x: (prev.x + dy * 0.3) % 360,
      y: (prev.y + dx * 0.3) % 360
    }));
    
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2.5, prev + direction * 0.1)));
  };

  // Filter satellites
  const filteredSatellites = satellites.filter(sat => {
    const matchesCategory = filter === 'all' || sat.category === filter;
    const matchesSearch = sat.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const matrix = calculateMatrix(rotation.x, rotation.y);
  const isVisible = (z: number) => z > -100;

  return (
    <Card className="w-full max-w-4xl bg-black text-white">
      <CardHeader>
        <CardTitle>Global Satellite Tracker</CardTitle>
        <div className="flex space-x-4 mt-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search satellites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 text-white border-gray-700"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-gray-900 text-white border-gray-700">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 text-white border-gray-700">
              <SelectItem value="all">All Satellites</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="navigation">Navigation</SelectItem>
              <SelectItem value="weather">Weather</SelectItem>
              <SelectItem value="telescope">Telescope</SelectItem>
              <SelectItem value="debris">Debris</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="relative w-full h-96 bg-black rounded-lg overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
            <Button variant="outline" size="icon" onClick={() => handleZoom(1)}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleZoom(-1)}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
          
          <svg viewBox="-120 -120 240 240" className="w-full h-full">
            <defs>
              {/* Earth texture patterns */}
              <pattern id="earthMap" patternUnits="userSpaceOnUse" width="200" height="100">
                <image
                  href="/images/earth-texture.jpg"
                  width="200"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
              
              {/* Night side gradient */}
              <radialGradient id="nightSide">
                <stop offset="0%" stopColor="rgba(0,0,0,0.9)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
              </radialGradient>
              
              {/* Atmosphere glow */}
              <radialGradient id="atmosphereGlow">
                <stop offset="80%" stopColor="rgba(88,106,255,0)" />
                <stop offset="100%" stopColor="rgba(88,106,255,0.3)" />
              </radialGradient>
            </defs>

            {/* Stars background */}
            {Array.from({ length: 200 }).map((_, i) => (
              <circle
                key={`star-${i}`}
                cx={Math.random() * 240 - 120}
                cy={Math.random() * 240 - 120}
                r={Math.random() * 0.5}
                fill="white"
                opacity={Math.random() * 0.8 + 0.2}
              />
            ))}

            {/* Earth with atmosphere */}
            <circle 
              cx="0" 
              cy="0" 
              r="105" 
              fill="url(#atmosphereGlow)" 
            />
            <g transform={`scale(${zoom}) rotate(${rotation.y}, 0, 0)`}>
              <circle 
                cx="0" 
                cy="0" 
                r="100" 
                fill="url(#earthMap)" 
                stroke="#304050" 
                strokeWidth="0.5"
              />
              <circle 
                cx="0" 
                cy="0" 
                r="100" 
                fill="url(#nightSide)" 
                transform={`rotate(${-rotation.y}, 0, 0)`}
                style={{ 
                  mixBlendMode: 'multiply'
                }}
              />
            </g>

            {/* Satellites */}
            {loading ? (
              <text x="0" y="0" fill="white" textAnchor="middle">Loading satellites...</text>
            ) : error ? (
              <text x="0" y="0" fill="red" textAnchor="middle">{error}</text>
            ) : (
              <g transform={`scale(${zoom})`}>
                {filteredSatellites.map((sat) => {
                  const cart = toCartesian(sat.lon, sat.lat, 100 + parseFloat(sat.alt) / 100);
                  const proj = project3D(cart, matrix);
                  if (isVisible(proj.z)) {
                    const opacity = (proj.z + 100) / 200;
                    return (
                      <g key={sat.name}>
                        <circle 
                          cx={proj.x} 
                          cy={proj.y} 
                          r="1.5" 
                          fill={sat.category === 'debris' ? '#ff4444' : '#44ff44'}
                          className="animate-pulse"
                          style={{ opacity }}
                        />
                        {opacity > 0.7 && (
                          <text
                            x={proj.x + 3}
                            y={proj.y}
                            fill="white"
                            fontSize="6"
                            style={{ opacity }}
                          >
                            {sat.name}
                          </text>
                        )}
                      </g>
                    );
                  }
                  return null;
                })}
              </g>
            )}
          </svg>
        </div>
        
        <div className="mt-4 space-y-2 text-gray-300">
          <p className="text-sm">
            Tracking {filteredSatellites.length} satellites. Drag to rotate, use buttons to zoom.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {filteredSatellites.slice(0, 10).map(sat => (
              <div key={sat.name} className="text-sm">
                <span className="font-medium">{sat.name}</span>
                <span className="ml-2 text-gray-500">
                  {sat.lat}°N, {sat.lon}°E, {sat.alt}km
                </span>
              </div>
            ))}
            {filteredSatellites.length > 10 && (
              <div className="text-sm text-gray-500">
                ...and {filteredSatellites.length - 10} more
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SatelliteTracker; 