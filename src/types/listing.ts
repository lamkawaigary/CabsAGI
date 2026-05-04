// Cabs Carpool - Listing Type Definition
// Unified model for both driver offers and passenger requests

export type ListingType = 'driver_offer' | 'passenger_request'
export type ListingStatus = 'OPEN' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export interface Location {
  placeName: string
  latitude: number
  longitude: number
  address?: string
}

export interface ListingParticipant {
  oderId: string
  name: string
  phone: string
  joinedAt: string
  confirmedAt?: string
  priceQuoted?: number
  notes?: string
}

export interface Listing {
  id: string
  
  // Who created this listing
  type: ListingType
  initiatorId: string
  initiatorName: string
  
  // Route info
  route: {
    pickup: Location
    dropoff: Location
  }
  departureTime: string  // ISO string
  
  // Requirements
  passengerCount: number
  vehicleType: 'sedan' | '7seater'
  isCarpool: boolean
  notes?: string
  
  // Pricing (optional, can be set when responding)
  pricePerSeat?: number
  tunnelFee?: number
  
  // When confirmed - driver info is filled
  driverId?: string
  driverName?: string
  driverPhone?: string
  
  // Confirmed passengers
  passengers: ListingParticipant[]
  
  // Interest tracking
  interestedDrivers: ListingParticipant[]   // Drivers who quoted price
  interestedPassengers: ListingParticipant[] // Passengers who want to join
  
  // Status
  status: ListingStatus
  
  // Chat room for negotiation (created when first response)
  chatRoomId?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  completedAt?: string
}

export interface CreateListingData {
  type: ListingType
  initiatorId: string
  initiatorName: string
  initiatorPhone?: string
  
  pickup: Location
  dropoff: Location
  departureTime: string
  
  passengerCount: number
  vehicleType: 'sedan' | '7seater'
  isCarpool: boolean
  notes?: string
}

export interface QuotePriceData {
  pricePerSeat: number
  tunnelFee?: number
  notes?: string
}