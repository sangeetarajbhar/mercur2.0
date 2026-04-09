import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
} from "@medusajs/ui";
// import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Plus, PencilSquare } from "@medusajs/icons";
import { useZone } from "../../../hooks/api/zones";
import { InstantPromise, useInstantPromises } from "../../../hooks/api/instant-promises";
import { SlotDefinition, useSlotDefinitions } from "../../../hooks/api/slot-definitions";
import { useStockLocation } from "../../../hooks/api/stock-locations";
import { useState } from "react";
import SlotDefinitionModal from "../components/slot-definition-modal";
import SlotDefinitionsList from "../components/slot-definitions-list";
import SlotOverrideModal from "../components/slot-override-modal";
import SlotOverridesList from "../components/slot-overrides-list";
import InstantPromiseModal from "../components/instant-promise-modal";

const ZoneDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: zone, isLoading, error } = useZone(id!);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotDefinition | null>(null);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [slotOverrideModalOpen, setSlotOverrideModalOpen] = useState(false);
  const [promiseModalOpen, setPromiseModalOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<InstantPromise | null>(null);
  
  // Slot definitions data
  const { data: slotDefinitionsData } = useSlotDefinitions(id!);
  const slotDefinitions = slotDefinitionsData?.slot_definitions || [];
  
  // Note: Slot overrides are now fetched within SlotOverridesList component
  
  // Instant promises data
  const { data: instantPromisesData, isLoading: promisesLoading } = useInstantPromises(id!);
  const instantPromises = instantPromisesData?.instant_promises || [];
  
  // Location data
  const { stock_location: location, isLoading: locationLoading } = useStockLocation(zone?.location_id || '', undefined, {
    enabled: !!zone?.location_id
  });
  

  if (isLoading) {
    return (
      <Container>
        <div className="flex size-full flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">Loading zone details...</Text>
        </div>
      </Container>
    );
  }

  if (error || !zone) {
    return (
      <Container>
        <div className="flex size-full flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">Failed to load zone details. Please try again.</Text>
          <Button 
            onClick={() => navigate('/zones')} 
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Zones
          </Button>
        </div>
      </Container>
    );
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge color={isActive ? 'green' : 'red'} size="small">
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const handleCreatePromise = () => {
    setEditingPromise(null);
    setPromiseModalOpen(true);
  };

  const handleEditPromise = (promise: InstantPromise) => {
    setEditingPromise(promise);
    setPromiseModalOpen(true);
  };



  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="transparent"
              onClick={() => navigate('/zones')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Heading level="h1" className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {zone.name}
              </Heading>
              <Text className="text-ui-fg-muted">
                Zone ID: {zone.id}
              </Text>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Zone Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-ui-bg-subtle p-6 rounded-lg">
              <Heading level="h2" className="mb-4">Zone Information</Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text className="font-medium">Status:</Text>
                  {getStatusBadge(zone.is_active)}
                </div>
                    <div className="flex justify-between">
                      <Text className="font-medium">Location:</Text>
                      <div className="text-right">
                        {locationLoading ? (
                          <Text className="text-sm text-ui-fg-muted">Loading...</Text>
                        ) : location ? (
                          <div>
                            <Text className="font-medium">{location.name}</Text>
                            <Text className="text-xs text-ui-fg-muted font-mono">ID: {zone.location_id}</Text>
                          </div>
                        ) : (
                          <Text className="font-mono text-sm">{zone.location_id}</Text>
                        )}
                      </div>
                    </div>
                {/* <div className="flex justify-between">
                  <Text className="font-medium">Postcodes:</Text>
                  <Text>{zone.postcodes?.length || 0} codes</Text>
                </div> */}
                <div className="flex justify-between">
                  <Text className="font-medium">Created:</Text>
                  <Text className="text-sm">{formatDate(zone.created_at)}</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="font-medium">Updated:</Text>
                  <Text className="text-sm">{formatDate(zone.updated_at)}</Text>
                </div>
              </div>
            </div>

            <div className="bg-ui-bg-subtle p-6 rounded-lg">
              <Heading level="h2" className="mb-4">Description</Heading>
              <Text className="text-ui-fg-muted">
                {zone.description || 'No description provided'}
              </Text>
            </div>
          </div>

          {/* Postcodes */}
          {zone.postcodes && zone.postcodes.length > 0 && (
            <div className="bg-ui-bg-subtle p-6 rounded-lg">
              <Heading level="h2" className="mb-4">Postcodes ({zone.postcodes.length})</Heading>
              <div className="flex flex-wrap gap-2">
                {zone.postcodes.map((postcode, index) => (
                  <Badge key={index} size="small">
                    {postcode}
                  </Badge>
                ))}
              </div>
            </div>
          )}

              {/* Instant Promises */}
              <div className="bg-ui-bg-subtle p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <Heading level="h2" className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Instant Promise {instantPromises.length > 0 ? '(1)' : '(0)'}
                  </Heading>
                  {instantPromises.length === 0 ? (
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCreatePromise();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Promise
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditPromise(instantPromises[0]);
                      }}
                    >
                      <PencilSquare className="h-4 w-4 mr-1" />
                      Edit Promise
                    </Button>
                  )}
                </div>

            {promisesLoading ? (
              <div className="text-center py-8">
                <Text className="text-ui-fg-muted">Loading instant promise...</Text>
              </div>
            ) : instantPromises.length > 0 ? (
              <div className="bg-ui-bg-base p-6 rounded-lg border">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Promise Text</Text>
                    <Text className="text-lg font-medium">{instantPromises[0].promise_text}</Text>
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Status</Text>
                    {getStatusBadge(instantPromises[0].is_active)}
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Delivery Time</Text>
                    <Text className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {instantPromises[0].promise_minutes} min
                    </Text>
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Pickup Lead Time</Text>
                    <Text>{instantPromises[0].pickup_lead_minutes} min</Text>
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Return Lead Time</Text>
                    <Text>{instantPromises[0].return_lead_minutes} min</Text>
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-subtle mb-2">Created</Text>
                    <Text className="text-sm text-ui-fg-muted">
                      {formatDate(instantPromises[0].created_at)}
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-ui-fg-muted mx-auto mb-4" />
                <Text className="text-ui-fg-muted mb-4">No instant promise configured for this zone</Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreatePromise();
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Promise
                </Button>
              </div>
            )}
          </div>


          {/* Slot Overrides Section - Today & Tomorrow */}
          <div className="bg-ui-bg-subtle p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Heading level="h2" className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today & Tomorrow Slots
                </Heading>
                <Text className="text-ui-fg-muted text-sm">
                  Shows only slot overrides that have been created for today and tomorrow
                </Text>
              </div>
              <div className="flex gap-2">
                {slotDefinitions.length > 0 && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      setIsBulkEditMode(true)
                      setEditingSlot(null)
                      setSlotModalOpen(true)
                    }}
                  >
                    <PencilSquare className="h-4 w-4 mr-1" />
                    Edit Slots
                  </Button>
                )}
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    setSlotOverrideModalOpen(true)
                  }}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Manage Overrides
                </Button>
              </div>
            </div>
            
            <SlotOverridesList 
              zoneId={zone?.id || ''} 
            />
          </div>

          {/* Slot Definitions */}
          <div className="bg-ui-bg-subtle p-6 rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Heading level="h2" className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5" />
                  Slot Definitions
                </Heading>
                <Text className="text-ui-fg-muted text-sm">
                  Manage delivery time slots for this zone
                </Text>
              </div>
              {slotDefinitions.length === 0 && (
                <Button
                  size="small"
                  onClick={() => {
                    setIsBulkEditMode(false)
                    setEditingSlot(null)
                    setSlotModalOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Slot
                </Button>
              )}
            </div>
            
            <SlotDefinitionsList 
              zoneId={zone?.id || ''} 
              onEdit={(slot) => {
                setEditingSlot(slot)
                setSlotModalOpen(true)
              }}
            />
          </div>

          {/* Metadata */}
          {zone.metadata && Object.keys(zone.metadata).length > 0 && (
            <div className="bg-ui-bg-subtle p-6 rounded-lg">
              <Heading level="h2" className="mb-4">Metadata</Heading>
              <pre className="bg-ui-bg-base p-4 rounded-md text-sm overflow-auto">
                {JSON.stringify(zone.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      {/* Slot Definition Modal */}
          <SlotDefinitionModal
            open={slotModalOpen}
            onOpenChange={(open) => {
              setSlotModalOpen(open)
              if (!open) {
                setEditingSlot(null)
                setIsBulkEditMode(false)
              }
            }}
            onSuccess={() => {
              // The list will automatically refresh due to React Query cache invalidation
            }}
            zoneId={zone?.id || ''}
            slot={editingSlot || undefined}
            isEdit={!!editingSlot}
            isBulkEditMode={isBulkEditMode}
            existingSlots={slotDefinitions}
          />

      {/* Slot Override Modal */}
      <SlotOverrideModal
        open={slotOverrideModalOpen}
        onOpenChange={setSlotOverrideModalOpen}
        onSuccess={() => {
          // The list will automatically refresh due to React Query cache invalidation
        }}
        zoneId={zone?.id || ''}
      />

      {/* Instant Promise Modal */}
      <InstantPromiseModal
        open={promiseModalOpen}
        onOpenChange={(open) => {
          setPromiseModalOpen(open)
          if (!open) {
            setEditingPromise(null)
          }
        }}
        onSuccess={() => {
          setEditingPromise(null)
          // The list will automatically refresh due to React Query cache invalidation
        }}
        zoneId={id || ''}
        promise={editingPromise || undefined}
        isEdit={!!editingPromise}
      />
    </Container>
  );
};

// export const config: RouteConfig = {
//   label: "Zone Details",
//   icon: MapPin,
// };

export default ZoneDetailPage;