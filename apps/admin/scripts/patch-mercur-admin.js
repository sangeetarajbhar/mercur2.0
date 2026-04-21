import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the node_modules directory at the workspace root
const rootNodeModules = path.resolve(__dirname, '../../../node_modules');

// Since Bun uses a global cache and links to it, we need to iterate over the .bun cache directory 
// to find the installed @mercurjs/admin package(s) since editing the root symlink doesn't always work.

const bunCacheDir = path.join(rootNodeModules, '.bun');
if (!fs.existsSync(bunCacheDir)) {
  console.log('Could not find .bun cache directory, skipping patch.');
  process.exit(0);
}

const dirs = fs.readdirSync(bunCacheDir).filter(d => d.startsWith('@mercurjs+admin'));
let patched = false;

for (const dir of dirs) {
  const targetFile = path.join(bunCacheDir, dir, 'node_modules/@mercurjs/admin/dist/index.js');
  
  if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf-8');
    
    // The exact string to find (from the original SDK)
    const searchStr = `const { children: customChildren, ...customRest } = customRoute;`;
    
    // Our fix logic
    const replacementStr = `const { children: customChildren, ...customRest } = customRoute;
      
      // ✅ PATCH: Fix for overriding leaf routes (like 'create') that have lazy loading attached
      if (customChildren?.length === 1 && customChildren[0].path === "" && customChildren[0].lazy) {
        customRest.lazy = customChildren[0].lazy; // hoist the custom component to override the default lazy
        customChildren.length = 0; // discard the empty trailing wrapper
      }`;

    // Apply patch if it hasn't been applied yet
    if (content.includes(searchStr) && !content.includes('PATCH: Fix for overriding leaf routes')) {
      content = content.replace(searchStr, replacementStr);
      fs.writeFileSync(targetFile, content);
      patched = true;
    }
  }
}

if (patched) {
  console.log('✅ Successfully applied routing patch to @mercurjs/admin core.');
} else {
  console.log('ℹ️ Route override patch already applied or package not found.');
}
