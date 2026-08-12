class LocationService {
  constructor() {
    this.currentLat = 12.9716;
    this.currentLng = 77.5946;
    this.addressText = "Emergency Zone (Simulated/Default)";
    this.accuracy = "High Precision GPS";
    this.watchId = null;
  }

  async getCurrentLocation() {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            this.currentLat = pos.coords.latitude;
            this.currentLng = pos.coords.longitude;
            this.accuracy = `Accurate to ${Math.round(pos.coords.accuracy || 10)}m`;
            this.addressText = `GPS Coordinates (${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)})`;

            resolve(this.getLocationPayload());
          },
          async (err) => {
            console.warn("HTML5 Geolocation notice:", err.message, "- Trying IP Geolocation fallback...");
            await this.fetchIPLocationFallback();
            resolve(this.getLocationPayload());
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      } else {
        this.fetchIPLocationFallback().then(() => resolve(this.getLocationPayload()));
      }
    });
  }

  async fetchIPLocationFallback() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          this.currentLat = data.latitude;
          this.currentLng = data.longitude;
          this.addressText = `${data.city || 'Emergency Zone'}, ${data.region || ''} ${data.country_name || ''}`;
          this.accuracy = "IP-Based Network Triangulation";
          return;
        }
      }
    } catch (e) {
      console.warn("IP geolocation fallback notice");
    }
    // Ultimate fallback if completely offline
    this.currentLat = 12.9716;
    this.currentLng = 77.5946;
    this.addressText = "Springfield Emergency Zone";
    this.accuracy = "System Default Emergency Coordinates";
  }

  getLocationPayload() {
    return {
      lat: this.currentLat,
      lng: this.currentLng,
      address: this.addressText,
      accuracy: this.accuracy,
      mapLink: `https://maps.google.com/?q=${this.currentLat},${this.currentLng}`
    };
  }

  startLiveLocationWatch(onLocationUpdate) {
    if ("geolocation" in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.currentLat = pos.coords.latitude;
          this.currentLng = pos.coords.longitude;
          this.accuracy = `Accurate to ${Math.round(pos.coords.accuracy || 5)}m`;
          this.addressText = `Live GPS Fix (${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)})`;
          if (onLocationUpdate) onLocationUpdate(this.getLocationPayload());
        },
        (err) => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }
  }
}

const locationService = new LocationService();
