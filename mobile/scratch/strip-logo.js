const { Jimp } = require('jimp');
const path = require('path');

const srcPath = 'C:\\Users\\dell\\.gemini\\antigravity-ide\\brain\\c8555e90-bc39-4e23-be88-18938dc44b95\\gatecode_app_icon_1783501208996.png';
const destLightPath = path.join(__dirname, '..', 'assets', 'gatecode-logo-light.png');
const destDarkPath = path.join(__dirname, '..', 'assets', 'gatecode-logo-dark.png');

Jimp.read(srcPath)
  .then(image => {
    console.log('Original image loaded successfully. Dimensions:', image.bitmap.width, 'x', image.bitmap.height);

    // Create a clone for the light logo (transparent background)
    const lightImg = image.clone();
    
    // Create a clone for the dark logo (transparent background)
    const darkImg = image.clone();

    // Loop through pixels and strip checkerboard/white backgrounds
    // The logo mark has deep metallic steel and vibrant teal/cyan colors
    // White background pixels are close to 255.
    // Checkerboard gray pixels are around 238-242 range.
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];

      // If the pixel is white or part of the gray checkerboard pattern
      const isWhite = r > 235 && g > 235 && b > 235;
      const isGrayGrid = (r > 200 && r < 230) && (g > 200 && g < 230) && (b > 200 && b < 230) && Math.abs(r - g) < 5 && Math.abs(g - b) < 5;

      if (isWhite || isGrayGrid) {
        // Set transparent for light logo
        lightImg.bitmap.data[idx + 3] = 0;
        
        // Set transparent for dark logo
        darkImg.bitmap.data[idx + 3] = 0;
      }
    });

    // Save light and dark logos
    return Promise.all([
      lightImg.write(destLightPath),
      darkImg.write(destDarkPath)
    ]).then(() => {
      console.log('Light and Dark transparent logos saved successfully!');
    });
  })
  .catch(err => {
    console.error('Error processing logo image:', err);
  });
