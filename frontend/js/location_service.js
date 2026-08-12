class LocationService {
  constructor() {
    this.currentLat = 12.9716;
    this.currentLng = 77.5946;
    this.addressText = "Springfield Emergency Location";
  }

  async getCurrentLocation() {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.currentLat = pos.coords.latitude;
            this.currentLng = pos.coords.longitude;
            resolve({
              lat: this.currentLat,
              lng: this.currentLng,
              mapLink: `https://maps.google.com/?q=${this.currentLat},${this.currentLng}`
            });
          },
          (err) => {
            console.warn("Geolocation fallback activated:", err.message);
            resolve({
              lat: this.currentLat,
              lng: this.currentLng,
              mapLink: `https://maps.google.com/?q=${this.currentLat},${this.currentLng}`
            });
          },
          { timeout: 5000 }
        );
      } else {
        resolve({
          lat: this.currentLat,
          lng: this.currentLng,
          mapLink: `https://maps.google.com/?q=${this.currentLat},${this.currentLng}`
        });
      }
    });
  }
}

const locationService = new LocationService();
