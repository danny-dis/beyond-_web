# 🌟 Beyond Web - Interactive Star Map

A beautiful, responsive web application for exploring the night sky with real-time star positions and astronomical data.

## ✨ Features

- **🌙 Night Mode Default**: Optimized for astronomy with dark theme as default
- **📍 Smart Location Detection**: Automatic GPS location with manual override options
- **⭐ Real Star Data**: Accurate star positions based on your location and time
- **🎯 Interactive Sky Map**: Click on stars to learn more about them
- **📱 Mobile Responsive**: Works perfectly on all devices
- **🌍 Global Locations**: Pre-configured popular locations worldwide
- **⏰ Real-time Updates**: Star positions update based on current time
- **🕒 Exact Time Control**: Live-time toggle and HH:MM picker to set an exact time
- **🔎 Flexible Location Input**: Search by place name or GPS ("lat, lon" or "lat lon")
- **🛰️ Artificial Satellites**: Toggle to show/hide (ISS, Hubble demo; extensible)
- **🌌 Deep-Sky Objects**: Toggle to show galaxies, nebulae, and clusters (OpenNGC)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Jeff9497/beyond-_web.git
cd beyond-_web

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app in action!

## 🛠️ Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📚 Data Sources

- **Stars (HYG v3)**: Fetched via internal API that proxies the HYG catalog and filters by magnitude. Source: [HYG Database](https://github.com/astronexus/HYG-Database)
- **Deep-Sky (OpenNGC)**: Galaxies, nebulae, and clusters from OpenNGC. Source: [OpenNGC](https://github.com/mattiaverga/OpenNGC)
- **Satellites (TLE/SGP4)**: Live propagation using `satellite.js` with sample TLEs (ISS, Hubble). Source: [satellite.js](https://github.com/shashwatak/satellite-js)

### Internal API Routes

- `GET /api/hyg?minMag=-1&maxMag=6&limit=2000`
  - Returns filtered star catalog entries (RA in hours, Dec in degrees)
- `GET /api/opengc?maxMag=13&limit=1500`
  - Returns filtered deep-sky catalog entries (RA in hours, Dec in degrees)

## 🎨 Recent Improvements

### Theme Enhancements
- ✅ **Night mode as default** - Perfect for stargazing
- ✅ **Theme persistence** - Remembers your preference across sessions
- ✅ **Improved contrast** - Better text visibility in both themes

### Location Features
- ✅ **Enhanced dropdown visibility** - Location text clearly visible in all themes
- ✅ **Popular locations** - Quick access to major cities worldwide
- ✅ **Coordinate support** - Enter exact latitude/longitude coordinates

### Technical Improvements
- ✅ **TypeScript fixes** - Resolved build errors
- ✅ **Clean code** - Removed debug logs and improved structure
- ✅ **Responsive design** - Optimized for mobile and desktop
- ✅ **Real Catalogs** - HYG (stars) and OpenNGC (deep-sky) wired via API routes
- ✅ **Satellite Support** - ISS/Hubble demo via TLE+SGP4 (toggle in settings)
- ✅ **Exact Time & Location Inputs** - Live-time toggle, HH:MM picker, GPS parsing
- ✅ **Offline Pack** - Save current sky snapshot to JSON for offline viewing

## 🌍 Supported Locations

### Kenya
- Nairobi, Nakuru, Mombasa, Kisumu, Eldoret

### International
- London (UK), New York (USA), Tokyo (Japan), Sydney (Australia), Cairo (Egypt)

### Custom Locations
Enter any city name or exact coordinates (latitude, longitude)

## 🔧 Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Astronomy**: Custom calculations with real star data

## 📱 Mobile Features

- Touch-friendly interface
- Responsive panels and controls
- Optimized for portrait and landscape modes
- Fast loading and smooth animations

## 📴 Offline Mode

- Open Settings → enable Offline Mode.
- Use "Save Offline" to capture the current sky (stars + deep-sky for your location/time). This stores a JSON pack in your browser.
- Use "Download JSON" to export the offline pack.
- Use "Import JSON" to load a previously saved pack. While in Offline Mode, the app renders from the pack and avoids network.

## 🔧 Configuration Notes

- Requires Node.js 18+
- The app fetches external catalogs at runtime; ensure your network allows requests to:
  - `https://raw.githubusercontent.com/astronexus/HYG-Database/master/hygdata_v3.csv`
  - `https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/opengd.json`
- Satellite TLEs are embedded for ISS/Hubble demo; extend by adding more TLEs or a feed.

## 🔒 Permissions & Privacy

- Geolocation is requested to personalize the sky view. If denied, a default location is used.

## 🤝 Contributing

This is a fork of [danny-dis/beyond-_web](https://github.com/danny-dis/beyond-_web) with enhancements for better user experience.

### Development Workflow
1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🙏 Acknowledgments

- Original project by [danny-dis](https://github.com/danny-dis)
- Enhanced by [Jeff9497](https://github.com/Jeff9497)
- Star data and astronomical calculations
- Open source community

---

**🌟 Explore the cosmos from your browser!** ✨