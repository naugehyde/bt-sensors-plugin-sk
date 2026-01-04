import React, { useState } from 'react'
const RadialRing = ({ 
  size = 400,   
  radius = 200, 
  centerOffset = {x:0, y:0},
  offsets = { inner: 0.6, middle: 0.8 },
  colors = { primary: "#ff0000", accent: "#ff0000" }, pulse=false
}) => {

  const cx = size / 2;
  const cy = size / 2
    const pulsar=`
    @keyframes pulse {
      0% {
        transform: scale(.5);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
  `;
  const ringStyle = {
    transformOrigin: 'center',
    animation: pulse ? `pulse 2s ease-out infinite` : 'none',
  };
  return (
    <div>
      <style>{pulsar}</style>
    <svg 
        viewBox={`${0} ${0} ${size} ${size}`}
    >
      <defs>
        <radialGradient id="ringGradient">
          <stop offset={offsets.inner} stopColor={colors.primary} stopOpacity={0}/>
          <stop offset={offsets.middle} stopColor={colors.accent} stopOpacity={1}/>
          <stop offset={1} stopColor={colors.primary} stopOpacity={0}/>
        </radialGradient>
      </defs>
        <g 
          transform={`translate(${centerOffset.x}, ${-1*centerOffset.y})`}>

      <circle cx={cx} cy={cy} r={radius} fill="url(#ringGradient)" style={ringStyle} />
      </g>
    </svg>
  </div>
  );
};

const FuzzyDistance = ({ distance = 10, accuracy = 0.75, size = 200, centerOffset={x:0, y:0}, scale=100, pulse=false }) => {
  const ptom = size / scale;
  const delta = (((1 - (accuracy>=1?.96:accuracy)) * distance))
  const r = (distance + delta)*ptom;
  const innerR = (distance - delta)*ptom;

  const offset0 = innerR/r
  const offset1 = (1 + (innerR / r)) / 2;
  
  return (
    <RadialRing 
      pulse={pulse}
      radius={r} 
      centerOffset={{x:centerOffset.x*ptom, y: centerOffset.y*ptom}}
      offsets={{ inner: offset0, middle: offset1  }} 
    />
  );
};


const Boat = ({ 
  lengthMeters = 5, 
  widthMeters = 2, 
  offset = { x: 0, y: 0 }
}) => {
  // We use a constant internal coordinate system (e.g., 1 unit = 1 meter)
  // The viewBox will handle the scaling to the actual pixel size
  const halfW = widthMeters / 2;
  const halfL = lengthMeters / 2;
  const padding = 0 ; // 1 meter of padding around the boat

  // Calculate the viewBox to ensure the boat and the dot are always visible
  const minX = -Math.max(halfW, Math.abs(offset.x)) - padding;
  const minY = -Math.max(halfL, Math.abs(offset.y)) - padding;
  const width = (Math.max(halfW, Math.abs(offset.x)) + padding) * 2;
  const height = (Math.max(halfL, Math.abs(offset.y)) + padding) * 2;

  // Path data using SVG Command syntax:
  // M = MoveTo, C = Cubic Bezier, L = LineTo, Z = ClosePath
  const hullPath = `
    M 0 ${-halfL} 
    C ${halfW * 1.2} ${-halfL * 0.5}, ${halfW} ${halfL * 0.5}, ${halfW * 0.8} ${halfL}
    L ${-halfW * 0.8} ${halfL}
    C ${-halfW} ${halfL * 0.5}, ${-halfW * 1.2} ${-halfL * 0.5}, 0 ${-halfL}
    Z
  `;

  
  return (
      <svg 
        viewBox={`${minX} ${minY} ${width} ${height}`} 
        style={{ width: '100%', height: '100%' }}
      >
        {/* The Boat Hull */}
        <path 
          d={hullPath} 
          fill="white" 
          stroke="#333" 
          strokeWidth={widthMeters * 0.02} 
          strokeLinejoin="round" 
        />

        <g 
          transform={`translate(${offset.x}, ${-1*offset.y})`}
          stroke="#211d3a77" 
          strokeWidth={widthMeters * 0.015}         
        >
          {/* Horizontal line */}
          <line x1="-0.3" y1="0" x2="0.3" y2="0" />
          {/* Vertical line */}
          <line x1="0" y1="-0.3" x2="0" y2="0.3" />
        </g>
      </svg>
  );
};
function formatMilliseconds(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  // Format with leading zeros
  return `${days}${days>0?'d':''} ${days>0|hours>0?String(hours).padStart(2, '0')+'h':''} ${hours>0|minutes>0?String(minutes).padStart(2, '0')+'m':''} ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Calculates the nautical distance between two points on Earth.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in Nautical Miles (NM)
 *//**
 * Calculates the nautical distance between two points on Earth.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in Nautical Miles (NM)
 */
function calculateNauticalDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth's radius in Nautical Miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in NM

    return d;
}

function getLatLonOffset(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    // 1. Calculate the difference in Radians
    const dLat = toRad(lat2 - lat1);  
    const dLon = toRad(lon2 - lon1);
    const latAvg = toRad((lat1 + lat2) / 2);

    // 2. Apply the projection
    const dy = toRad(lat2 - lat1) * R;
    const dx = dLon * R * Math.cos(latAvg);

    return { x: dx, y: dy };
}

function getBearing(lat1, lon1, lat2, lon2) {
    // Convert degrees to radians
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const toDegrees = (radians) => (radians * 180) / Math.PI;

    const startLat = toRadians(lat1);
    const startLng = toRadians(lon1);
    const destLat = toRadians(lat2);
    const destLng = toRadians(lon2);

    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);

    let bearing = Math.atan2(y, x);
    bearing = toDegrees(bearing);

    // Normalize to 0-360 degrees
    return (bearing + 360) % 360;
}

const BeaconRenderer = ({value, centerOffset={x:0,y:0}, size}) => {
   const [index, setIndex] = useState(0);
   const [distanceTo, setDistanceTo ] = useState(calculateNauticalDistance(value.latitude, value.longitude, value[index].latitude, value[index].longitude ))

  const latLonOffset = getLatLonOffset(  value.log[index].latitude, value.log[index].longitude, value.latitude, value.longitude )

  const minSize=Math.max(Math.abs(latLonOffset.x*1.5),Math.abs(latLonOffset.y*1.5))
  const spriteScale=minSize<beam?0.9:scale/2
  const ptom = size/(loa/scale)
  console.log(scale, value.loa/(1/scale), ptom, latLonOffset.x*ptom, latLonOffset.y*ptom)
   return (
    <div>
  
     <div style={{ width: size, height: size, background: '#42b9f5', border: '1px solid #ccc', position:'absolute'  }}>
       <div style={{  transform: [
                            `translateX(${latLonOffset.x*ptom/2}px) 
                            translateY(${latLonOffset.y*ptom/2}px)`]
                    }}>
        <div style={{ zIndex:1, width: size, height: size, position: 'absolute',   
                        transform: [`scale(${spriteScale})
                    rotate(${value.heading}rad)`]}}>
          <Boat  lengthMeters={value.loa} widthMeters={value.beam} offset={centerOffset}   />
        </div>
       </div>
        <div style={{  transform: [`scale(${spriteScale})`], width: size, height: size, position: 'absolute', zIndex:2}}>
        <FuzzyDistance pulse={distanceTo*1852>(value.loa/2)} scale={(value.loa)} accuracy={value.log[index].distances.accuracy} distance={value.log[index].distances.avgDistance} centerOffset={centerOffset} size={size}/> 
        </div>

       <div style={{ color:"black",  fontSize: `${size/22}px`}}>
       <div style={{ position: 'absolute', top:10, left: 10}}>
       
       {value.log[0].latitude}, {value.log[0].longitude} <p/>
          {formatMilliseconds(timeNow-new Date(value.log[index].timestamp).valueOf())}
       </div>
        <div style={{ position: 'absolute', bottom:10, left:10 }}>
       {distanceTo>.25?distanceTo.toFixed(2)+'nm':(distanceTo*1852).toFixed(2)+'m'} {getBearing(value.latitude, value.longitude, value.log[index].latitude, value.log[index].longitude ).toFixed(2)}°
        </div>
     </div>
        <div style={{ color:"black", position: 'absolute', bottom:10, right:40 }}>
          <button 
            onClick={() => {setIndex(index==0?value.log.length-1:index - 1)}}
          >
        ◀
      </button>
      </div>
       <div style={{ color:"black", position: 'absolute', bottom:10, right: 10}}>
       <button 
        onClick={() => {setIndex(index==value.log.length-1?0:index + 1)}}
      >
       ►
      </button>
      </div>
    </div>
    </div>
  );
};
export default BeaconRenderer