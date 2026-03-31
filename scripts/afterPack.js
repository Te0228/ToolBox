/**
 * electron-builder afterPack hook
 * 清理不必要的文件以减小包体积
 */
const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, electronPlatformName, arch } = context;

  console.log(`Running afterPack for ${electronPlatformName}-${arch}...`);

  // 移除Electron中不用的locale文件（保留英文）
  if (electronPlatformName === 'darwin') {
    const resourcesPath = path.join(appOutDir, 'ToolBox.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', '@electron', 'remote', 'dist');
    const frameworkResourcesPath = path.join(appOutDir, 'ToolBox.app', 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Resources');

    // 清理locale文件，只保留en-US
    if (fs.existsSync(frameworkResourcesPath)) {
      const localesPath = path.join(frameworkResourcesPath, 'locales');
      if (fs.existsSync(localesPath)) {
        const files = fs.readdirSync(localesPath);
        let removedCount = 0;
        files.forEach(file => {
          if (file !== 'en-US.pak') {
            fs.unlinkSync(path.join(localesPath, file));
            removedCount++;
          }
        });
        if (removedCount > 0) {
          console.log(`✓ Removed ${removedCount} locale files`);
        }
      }
    }
  }

  console.log(`✓ Package optimized for ${electronPlatformName}-${arch}`);
};
