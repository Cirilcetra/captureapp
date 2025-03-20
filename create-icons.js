const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to create a square icon with a letter in the center
function createIcon(size, letter, color, bgColor, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  // Rounded corners (optional)
  const radius = size * 0.1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  
  // Letter
  ctx.fillStyle = color;
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2);
  
  // Write to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/${filename}`, buffer);
  console.log(`Created ${filename}`);
}

// Create icons of different sizes
createIcon(192, 'C', 'white', 'black', 'icon-192.png');
createIcon(512, 'C', 'white', 'black', 'icon-512.png');
createIcon(180, 'C', 'white', 'black', 'apple-icon.png');
createIcon(32, 'C', 'white', 'black', 'favicon.ico'); 