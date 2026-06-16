const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Find all toast.XXX( ... ) calls
  // We'll use a replacer that evaluates the string
  const regex = /toast\.(success|error|warning|info)\(([\s\S]*?)\)/g;

  content = content.replace(regex, (match, type, argsInner) => {
    // If it already starts with {, leave it alone
    if (argsInner.trim().startsWith('{')) {
      return match;
    }

    // Attempt to split by comma, taking into account quotes and template literals
    // Let's do a simple heuristic since our code is quite simple
    // Example 1: `toast.error(error.message, { title: 'Gagal' })`
    // Example 2: `toast.success('Berhasil dihapus')`
    
    // Check if it ends with } (has options object)
    if (argsInner.trim().endsWith('}')) {
      // It has options. Let's find the comma before the {
      const matchOpts = argsInner.match(/^(.*?),\s*\{\s*title:\s*(.*)\s*\}$/s);
      if (matchOpts) {
        const msg = matchOpts[1].trim();
        const title = matchOpts[2].trim();
        return `toast.${type}({ title: ${title}, description: ${msg} })`;
      }
    } else {
      // Single argument
      return `toast.${type}({ title: ${argsInner.trim()} })`;
    }
    
    return match; // fallback
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.vue')) {
      fixFile(fullPath);
    }
  }
}

walk(srcDir);
