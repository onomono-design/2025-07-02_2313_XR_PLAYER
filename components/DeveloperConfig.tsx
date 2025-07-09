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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header - Fixed size */}
        <div className="flex-shrink-0 text-center p-4 md:p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Settings className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Developer Configuration</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto">
            Configure tour location, mode, and content before launching the application
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs md:text-sm">
              <Info className="h-3 w-3 mr-1" />
              Development Mode
            </Badge>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Configuration Panel */}
            <div className="space-y-4 md:space-y-6">
              {/* Tour Location Selection */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                    <MapPin className="h-5 w-5" />
                    Tour Location
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm md:text-base">
                    Select the tour location to configure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {playlistData && Object.entries(playlistData.locations).map(([key, location]) => (
                    <Button
                      key={key}
                      variant={selectedLocation === key ? "default" : "outline"}
                      className={`w-full justify-start h-auto p-3 md:p-4 ${
                        selectedLocation === key 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      onClick={() => setSelectedLocation(key)}
                    >
                      <div className="text-left">
                        <div className="font-medium text-sm md:text-base">{location.name}</div>
                        <div className="text-xs md:text-sm opacity-75 line-clamp-2">{location.description}</div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>

                          {/* Mode Selection */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                    <Play className="h-5 w-5" />
                    Tour Mode
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm md:text-base">
                    Choose between teaser preview or full tour experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant={selectedMode === 'teaser' ? "default" : "outline"}
                      className={`h-auto p-3 md:p-4 ${
                        selectedMode === 'teaser' 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      onClick={() => setSelectedMode('teaser')}
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm md:text-base">Teaser Mode</div>
                        <div className="text-xs md:text-sm opacity-75">Preview Experience</div>
                      </div>
                    </Button>
                    <Button
                      variant={selectedMode === 'full_tour' ? "default" : "outline"}
                      className={`h-auto p-3 md:p-4 ${
                        selectedMode === 'full_tour' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      onClick={() => setSelectedMode('full_tour')}
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm md:text-base">Full Tour</div>
                        <div className="text-xs md:text-sm opacity-75">Complete Experience</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

                          {/* Teaser Selection (only shown in teaser mode) */}
              {selectedMode === 'teaser' && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3 md:pb-6">
                    <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                      <Users className="h-5 w-5" />
                      Teaser Selection
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm md:text-base">
                      Choose which teaser experience to configure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {['teaser_1', 'teaser_2', 'teaser_3', 'teaser_4'].map((teaserId) => {
                        const teaserData = selectedLocation && playlistData 
                          ? playlistData.locations[selectedLocation]?.teasers[teaserId] 
                          : null;
                        
                        return (
                          <Button
                            key={teaserId}
                            variant={selectedTeaser === teaserId ? "default" : "outline"}
                            className={`h-auto p-2 md:p-3 min-h-[60px] ${
                              selectedTeaser === teaserId 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                            onClick={() => setSelectedTeaser(teaserId)}
                          >
                            <div className="text-center">
                              <div className="font-medium text-xs md:text-sm">{teaserId.replace('_', ' ').toUpperCase()}</div>
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

            {/* Configuration Preview */}
            <div className="space-y-4 md:space-y-6">
            {/* Current Configuration Status */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                  <Globe className="h-5 w-5" />
                  Configuration Preview
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm md:text-base">
                  Current configuration status and media availability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 pt-0">
                {selectedLocation && playlistData ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm md:text-base">Location:</span>
                      <Badge variant="outline" className="text-white text-xs md:text-sm">
                        {playlistData.locations[selectedLocation].name}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm md:text-base">Mode:</span>
                      <Badge variant="outline" className={`text-xs md:text-sm ${selectedMode === 'teaser' ? 'text-purple-400' : 'text-green-400'}`}>
                        {selectedMode === 'teaser' ? 'Teaser Mode' : 'Full Tour'}
                      </Badge>
                    </div>
                    {selectedMode === 'teaser' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm md:text-base">Teaser:</span>
                        <Badge variant="outline" className="text-purple-400 text-xs md:text-sm">
                          {selectedTeaser.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm md:text-base">Status:</span>
                      <div className="flex items-center gap-2">
                        {currentConfig.isValid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 text-sm">Media Available</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span className="text-red-400 text-sm">Media Not Found</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm md:text-base">Select a location to preview configuration</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media Details */}
            {selectedLocation && currentConfig.mediaData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-white text-base md:text-lg">Media Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {selectedMode === 'teaser' ? (
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm md:text-base">{currentConfig.mediaData.title}</h4>
                      <p className="text-slate-400 text-xs md:text-sm mb-3 line-clamp-2">{currentConfig.mediaData.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs md:text-sm">Audio:</span>
                          {currentConfig.mediaData.audio_src ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs md:text-sm">Video:</span>
                          {currentConfig.mediaData.video_src ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs md:text-sm">Images:</span>
                          {currentConfig.mediaData.thumbnails && currentConfig.mediaData.thumbnails.length > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm md:text-base">Full Tour Experience</h4>
                      <p className="text-slate-400 text-xs md:text-sm mb-3">
                        {currentConfig.mediaData.available 
                          ? `${currentConfig.mediaData.chapters.length} chapters available`
                          : 'No chapters available'
                        }
                      </p>
                      {currentConfig.mediaData.chapters && currentConfig.mediaData.chapters.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {currentConfig.mediaData.chapters.map((chapter: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-xs md:text-sm">
                              <span className="text-slate-300 truncate">{chapter.title}:</span>
                              {chapter.available ? (
                                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
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

            {/* Launch Button */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-4 md:pt-6">
                {currentConfig.isValid ? (
                  <Button 
                    onClick={handleLaunchConfiguration}
                    disabled={isConfiguring}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 md:h-14 text-sm md:text-base"
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
                    <AlertDescription className="text-red-300 text-sm md:text-base">
                      {selectedLocation 
                        ? 'Selected configuration has no media available. Please choose a different option.'
                        : 'Please select a tour location to continue.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 