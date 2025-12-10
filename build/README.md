# ToolBox Application Icons

This directory contains the application icon:

- `icon.png` - Custom toolbox icon (1024x1024) - electron-builder will automatically convert this to platform-specific formats (.icns for macOS, .ico for Windows)

## Creating Custom Icons

To create custom icons for your application:

1. **Create a 512x512 PNG icon** with your design
2. **Replace `icon.png`** with your custom icon
3. **Generate platform-specific icons**:
   - For macOS (.icns): Use `iconutil` or online tools like [iConvert Icons](https://iconverticons.com/)
   - For Windows (.ico): Use ImageMagick or online tools
   - electron-builder can also auto-generate from a 512x512 PNG

## Auto-generation

electron-builder can automatically generate platform-specific icons from a single 512x512 PNG file named `icon.png`. Simply replace the `icon.png` file and electron-builder will handle the rest during the build process.
