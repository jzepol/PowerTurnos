#!/usr/bin/env node

/**
 * Script para agregar imports de logger a archivos que lo usan pero no lo tienen importado
 */

const fs = require('fs');
const path = require('path');

// Directorio base del proyecto
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Verificar si usa logger pero no lo tiene importado
    const usesLogger = content.includes('logger.') || content.includes('logger(');
    const hasLoggerImport = content.includes("import { logger }") || content.includes("import { logger,") || content.includes("from '@/lib/logger'");

    if (usesLogger && !hasLoggerImport) {
      // Encontrar la línea de imports más apropiada
      const lines = content.split('\n');
      let importIndex = -1;
      
      // Buscar la última línea de import
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          importIndex = i;
        }
      }

      if (importIndex >= 0) {
        // Insertar el import después de la última línea de import
        lines.splice(importIndex + 1, 0, "import { logger } from '@/lib/logger'");
        content = lines.join('\n');
        hasChanges = true;
      }
    }

    // Si hay cambios, escribir el archivo de vuelta
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - Import de logger agregado`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

// Función para recorrer directorios recursivamente
function walkDirectory(dir, fileExtension = '.ts') {
  let totalChanges = 0;
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Saltar node_modules y .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        totalChanges += walkDirectory(filePath, fileExtension);
      }
    } else if (file.endsWith(fileExtension)) {
      totalChanges += processFile(filePath);
    }
  });

  return totalChanges;
}

// Función principal
function main() {
  console.log('🚀 Arreglando imports de logger...\n');

  const totalChanges = walkDirectory(srcDir);
  
  console.log(`\n📊 Resumen:`);
  console.log(`- Archivos procesados: ${srcDir}`);
  console.log(`- Total de imports agregados: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log(`\n✅ Imports de logger agregados exitosamente`);
  } else {
    console.log(`\n✅ No se encontraron archivos que necesiten imports de logger`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { processFile, walkDirectory };
