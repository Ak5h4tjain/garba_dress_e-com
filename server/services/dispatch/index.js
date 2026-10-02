// Dispatch Microservice: Rider Assignment Algorithm, ETA, Route Generation, GPS Telemetry
import { postgresDB } from "../../storage/postgres-db.js";
import { redisStore } from "../../storage/redis-store.js";
import { kafka } from "../../event-bus/kafka-simulator.js";
import { CONFIG } from "../../config.js";

export class DispatchService {
  constructor() {
    this.activeDispatches = new Map(); // orderId -> { riderId, storeCoord, customerCoord, currentCoord, etaMinutes, progressPct }
  }

  // Haversine distance formula in kilometers
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 2.0;
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * (Math.PI / 180)) *
      Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  // Match optimal available delivery partner to order
  assignRider(order) {
    const store = CONFIG.DARK_STORES.find(s => s.id === order.storeId) || CONFIG.DARK_STORES[0];
    const customerCoord = order.deliveryAddress?.coordinates || { lat: 12.9745, lng: 77.6478 };

    // Find closest available rider
    const availableRiders = postgresDB.getAllRiders().filter(r => r.status === "AVAILABLE");
    let chosenRider = null;
    let minDistance = Infinity;

    for (const rider of availableRiders) {
      const dist = this.calculateDistance(rider.coordinates, store.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        chosenRider = rider;
      }
    }

    if (!chosenRider) {
      // Fallback: pick any rider or mark queueing
      chosenRider = postgresDB.getAllRiders()[0];
    }

    // Update rider state in DB
    postgresDB.updateRider(chosenRider.id, {
      status: "BUSY",
      activeOrderId: order.id
    });

    const distanceStoreToCustomer = this.calculateDistance(store.coordinates, customerCoord);
    // Average speed in urban Bangalore traffic: 22 km/h -> ~2.7 mins per km + 3 mins packing buffer
    const etaMinutes = Math.max(7, Math.round(distanceStoreToCustomer * 2.8 + 4));

    const dispatchRecord = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      riderId: chosenRider.id,
      riderName: chosenRider.name,
      riderPhone: chosenRider.phone,
      vehicleNumber: chosenRider.vehicleNumber,
      storeCoordinates: store.coordinates,
      customerCoordinates: customerCoord,
      currentCoordinates: { ...chosenRider.coordinates },
      distanceKm: distanceStoreToCustomer,
      etaMinutes,
      progressPct: 0,
      startedAt: new Date().toISOString()
    };

    this.activeDispatches.set(order.id, dispatchRecord);

    // Save initial coordinates into Redis geospatial store
    redisStore.updateRiderLocation(chosenRider.id, chosenRider.coordinates.lat, chosenRider.coordinates.lng);

    // Publish to Kafka
    kafka.publish(CONFIG.KAFKA_TOPICS.RIDER_ASSIGNED, order.id, {
      orderId: order.id,
      customerId: order.customerId,
      riderId: chosenRider.id,
      riderName: chosenRider.name,
      riderPhone: chosenRider.phone,
      vehicleNumber: chosenRider.vehicleNumber,
      etaMinutes,
      distanceKm: distanceStoreToCustomer
    });

    return dispatchRecord;
  }

  // Progress rider simulated telemetry along the route
  updateTelemetry(orderId, stepProgress = 0.25) {
    let dispatch = this.activeDispatches.get(orderId);
    if (!dispatch) {
      const order = postgresDB.getOrder(orderId);
      if (order) {
        dispatch = this.assignRider(order);
      } else {
        return null;
      }
    }

    dispatch.progressPct = Math.min(1.0, dispatch.progressPct + stepProgress);

    // Linear interpolation between Dark Store and Customer delivery location
    const start = dispatch.storeCoordinates;
    const end = dispatch.customerCoordinates;

    dispatch.currentCoordinates = {
      lat: Number((start.lat + (end.lat - start.lat) * dispatch.progressPct).toFixed(5)),
      lng: Number((start.lng + (end.lng - start.lng) * dispatch.progressPct).toFixed(5))
    };

    dispatch.etaMinutes = Math.max(1, Math.round(dispatch.etaMinutes * (1 - dispatch.progressPct)));

    // Update Redis
    redisStore.updateRiderLocation(
      dispatch.riderId,
      dispatch.currentCoordinates.lat,
      dispatch.currentCoordinates.lng
    );

    // Publish GPS ping event
    kafka.publish(CONFIG.KAFKA_TOPICS.RIDER_GPS_PING, orderId, {
      orderId,
      riderId: dispatch.riderId,
      coordinates: dispatch.currentCoordinates,
      etaMinutes: dispatch.etaMinutes,
      progressPct: dispatch.progressPct
    });

    return dispatch;
  }

  getDispatchByOrder(orderId) {
    return this.activeDispatches.get(orderId) || null;
  }

  getAllActiveDispatches() {
    return Array.from(this.activeDispatches.values());
  }
}

export const dispatchService = new DispatchService();
