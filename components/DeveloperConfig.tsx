import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Settings, 
  MapPin, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Globe, 
  Users,
  ArrowRight,
  Info
} from 'lucide-react';

export interface DeveloperConfigSelection {
  location: string;
  mode: 'teaser' | 'full_tour';
  teaserId?: string;
  isValid: boolean;
  mediaData?: any;
}

interface DeveloperConfigProps {
  onConfigurationComplete: (config: DeveloperConfigSelection) => void;
}

interface PlaylistData {
  locations: {
    [key: string]: {
      name: string;
      description: string;
      teasers: {
        [key: string]: {
          title: string;
          description: string;
          duration: number;
          audio_src: string;
          video_src: string;
          thumbnails: any[];
          available: boolean;
        };
      };
      full_tour: {
        available: boolean;
        chapters: any[];
      };
    };
  };
  metadata: {
    version: string;
    last_updated: string;
    supported_formats: {
      audio: string[];
      video: string[];
      images: string[];
    };
  };
}

export function DeveloperConfig({ onConfigurationComplete }: DeveloperConfigProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'teaser' | 'full_tour'>('teaser');
  const [selectedTeaser, setSelectedTeaser] = useState<string>('teaser_1');
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Load playlist data on component mount
  useEffect(() => {
    const loadPlaylistData = async () => {
      try {
        const response = await fetch('/data/playlist.json');
        if (!response.ok) {
          throw new Error('Failed to load playlist data');
        }
        const data = await response.json();
        setPlaylistData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading playlist data:', err);
        setError('Failed to load tour configuration data');
        setIsLoading(false);
      }
    };

    loadPlaylistData();
  }, []);

  // Get the current configuration status
  const getCurrentConfig = (): DeveloperConfigSelection => {
    if (!playlistData || !selectedLocation) {
      return {
        location: selectedLocation,
        mode: selectedMode,
        teaserId: selectedMode === 'teaser' ? selectedTeaser : undefined,
        isValid: false
      };
    }

    const locationData = playlistData.locations[selectedLocation];
    if (!locationData) {
      return {
        location: selectedLocation,
        mode: selectedMode,
        teaserId: selectedMode === 'teaser' ? selectedTeaser : undefined,
        isValid: false
      };
    }

    let mediaData;
    let isValid = false;

    if (selectedMode === 'teaser') {
      const teaserData = locationData.teasers[selectedTeaser];
      if (teaserData && teaserData.available) {
        mediaData = teaserData;
        isValid = true;
      } else {
        mediaData = teaserData;
        isValid = false;
      }
    } else {
      if (locationData.full_tour.available && locationData.full_tour.chapters.length > 0) {
        mediaData = locationData.full_tour;
        isValid = true;
      } else {
        mediaData = locationData.full_tour;
        isValid = false;
      }
    }

    return {
      location: selectedLocation,
      mode: selectedMode,
      teaserId: selectedMode === 'teaser' ? selectedTeaser : undefined,
      isValid,
      mediaData
    };
  };

  const handleLaunchConfiguration = async () => {
    const config = getCurrentConfig();
    if (!config.isValid) {
      return;
    }

    setIsConfiguring(true);
    
    // Simulate configuration setup delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔧 Developer Configuration Complete:', config);
    onConfigurationComplete(config);
  };

  const currentConfig = getCurrentConfig();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center safe-top safe-bottom safe-left safe-right">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-white text-sm">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 safe-top safe-bottom safe-left safe-right">
        <Alert className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-300 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 safe-top safe-bottom safe-left safe-right">
      <div className="h-full flex flex-col max-w-6xl mx-auto">
        {/* Compact Header - Fixed size */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-600/20 rounded-md">
              <Settings className="h-4 w-4 text-blue-400" />
            </div>
            <h1 className="text-lg font-bold text-white">Developer Configuration</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Configure tour location and mode
          </p>
          <div className="mt-1">
            <Badge variant="outline" className="text-xs">
              <Info className="h-3 w-3 mr-1" />
              Development Mode
            </Badge>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Single Column Layout on Mobile, Two Columns on Desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Left Column - Configuration Controls */}
              <div className="space-y-4">
                {/* Tour Location Selection */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      Tour Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {playlistData && Object.entries(playlistData.locations).map(([key, location]) => (
                      <Button
                        key={key}
                        variant={selectedLocation === key ? "default" : "outline"}
                        className={`w-full justify-start h-auto p-3 text-left ${
                          selectedLocation === key 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        onClick={() => setSelectedLocation(key)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{location.name}</div>
                          <div className="text-xs opacity-75 line-clamp-1">{location.description}</div>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                {/* Mode Selection */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Play className="h-4 w-4" />
                      Tour Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedMode === 'teaser' ? "default" : "outline"}
                        className={`h-auto p-3 ${
                          selectedMode === 'teaser' 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        onClick={() => setSelectedMode('teaser')}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm">Teaser</div>
                          <div className="text-xs opacity-75">Preview</div>
                        </div>
                      </Button>
                      <Button
                        variant={selectedMode === 'full_tour' ? "default" : "outline"}
                        className={`h-auto p-3 ${
                          selectedMode === 'full_tour' 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        onClick={() => setSelectedMode('full_tour')}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm">Full Tour</div>
                          <div className="text-xs opacity-75">Complete</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Teaser Selection */}
                {selectedMode === 'teaser' && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        Teaser Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {['teaser_1', 'teaser_2', 'teaser_3', 'teaser_4'].map((teaserId) => {
                          const teaserData = selectedLocation && playlistData 
                            ? playlistData.locations[selectedLocation]?.teasers[teaserId] 
                            : null;
                          
                          return (
                            <Button
                              key={teaserId}
                              variant={selectedTeaser === teaserId ? "default" : "outline"}
                              className={`h-auto p-2 min-h-[48px] ${
                                selectedTeaser === teaserId 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                              }`}
                              onClick={() => setSelectedTeaser(teaserId)}
                            >
                              <div className="text-center">
                                <div className="font-medium text-xs">{teaserId.replace('_', ' ').toUpperCase()}</div>
                                <div className="flex items-center justify-center mt-1">
                                  {teaserData?.available ? (
                                    <CheckCircle className="h-3 w-3 text-green-400" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-400" />
                                  )}
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Preview and Status */}
              <div className="space-y-4">
                {/* Configuration Preview */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      Configuration Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {selectedLocation && playlistData ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">Location:</span>
                          <Badge variant="outline" className="text-white text-xs">
                            {playlistData.locations[selectedLocation].name}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">Mode:</span>
                          <Badge variant="outline" className={`text-xs ${selectedMode === 'teaser' ? 'text-purple-400' : 'text-green-400'}`}>
                            {selectedMode === 'teaser' ? 'Teaser Mode' : 'Full Tour'}
                          </Badge>
                        </div>
                        {selectedMode === 'teaser' && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">Teaser:</span>
                            <Badge variant="outline" className="text-purple-400 text-xs">
                              {selectedTeaser.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">Status:</span>
                          <div className="flex items-center gap-1">
                            {currentConfig.isValid ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-400" />
                                <span className="text-green-400 text-xs">Available</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 text-red-400" />
                                <span className="text-red-400 text-xs">Not Found</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Select a location to preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Media Details */}
                {selectedLocation && currentConfig.mediaData && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Media Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {selectedMode === 'teaser' ? (
                        <div>
                          <h4 className="text-white font-medium mb-1 text-sm">{currentConfig.mediaData.title}</h4>
                          <p className="text-slate-400 text-xs mb-3 line-clamp-2">{currentConfig.mediaData.description}</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 text-xs">Audio:</span>
                              {currentConfig.mediaData.audio_src ? (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 text-xs">Video:</span>
                              {currentConfig.mediaData.video_src ? (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 text-xs">Images:</span>
                              {currentConfig.mediaData.thumbnails && currentConfig.mediaData.thumbnails.length > 0 ? (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-white font-medium mb-1 text-sm">Full Tour Experience</h4>
                          <p className="text-slate-400 text-xs mb-3">
                            {currentConfig.mediaData.available 
                              ? `${currentConfig.mediaData.chapters.length} chapters available`
                              : 'No chapters available'
                            }
                          </p>
                          {currentConfig.mediaData.chapters && currentConfig.mediaData.chapters.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {currentConfig.mediaData.chapters.map((chapter: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-300 truncate">{chapter.title}:</span>
                                  {chapter.available ? (
                                    <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Launch Button */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
          {currentConfig.isValid ? (
            <Button 
              onClick={handleLaunchConfiguration}
              disabled={isConfiguring}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-sm font-medium"
            >
              {isConfiguring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Configuring...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Launch Configuration
                </>
              )}
            </Button>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300 text-sm">
                {selectedLocation 
                  ? 'Selected configuration has no media available. Please choose a different option.'
                  : 'Please select a tour location to continue.'
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
} 