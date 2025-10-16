#!/usr/bin/env node

/**
 * Script para limpiar y reemplazar console.log con el sistema de logging profesional
 * 
 * Uso: node scripts/cleanup-logs.js
 */

const fs = require('fs');
const path = require('path');

// Directorio base del proyecto
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Patrones de console.log a reemplazar
const logPatterns = [
  // Debug logs comunes
  {
    pattern: /console\.log\(['"`](.*?)['"`],?\s*(.*?)\);?/g,
    replacement: 'logger.debug(\'$1\', $2);',
    description: 'Debug logs básicos'
  },
  // Logs de API
  {
    pattern: /console\.log\(['"`](.*API.*)['"`],?\s*(.*?)\);?/gi,
    replacement: 'logger.apiCall(\'$1\', \'GET\', $2);',
    description: 'Logs de API'
  },
  // Logs de usuario
  {
    pattern: /console\.log\(['"`](.*usuario.*|.*user.*)['"`],?\s*(.*?)\);?/gi,
    replacement: 'logger.userAction(\'$1\', undefined, $2);',
    description: 'Logs de usuario'
  },
  // Logs de sistema
  {
    pattern: /console\.log\(['"`](.*sistema.*|.*system.*)['"`],?\s*(.*?)\);?/gi,
    replacement: 'logger.systemEvent(\'$1\', $2);',
    description: 'Logs de sistema'
  },
  // Logs de error
  {
    pattern: /console\.log\(['"`](.*error.*|.*Error.*)['"`],?\s*(.*?)\);?/gi,
    replacement: 'logger.error(\'$1\', $2);',
    description: 'Logs de error'
  },
  // Logs de información general
  {
    pattern: /console\.log\(['"`](.*)['"`]\);?/g,
    replacement: 'logger.info(\'$1\');',
    description: 'Logs informativos'
  }
];

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let changeCount = 0;

    // Aplicar cada patrón de reemplazo
    logPatterns.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changeCount += matches.length;
        hasChanges = true;
      }
    });

    // Si hay cambios, escribir el archivo de vuelta
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - ${changeCount} logs actualizados`);
      return changeCount;
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
  console.log('🚀 Iniciando limpieza de console.log...\n');

  const totalChanges = walkDirectory(srcDir);
  
  console.log(`\n📊 Resumen:`);
  console.log(`- Archivos procesados: ${srcDir}`);
  console.log(`- Total de logs reemplazados: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log(`\n⚠️  IMPORTANTE:`);
    console.log(`1. Revisa los cambios antes de hacer commit`);
    console.log(`2. Asegúrate de importar el logger en los archivos modificados:`);
    console.log(`   import { logger } from '@/lib/logger';`);
    console.log(`3. Prueba la aplicación para verificar que todo funciona correctamente`);
  } else {
    console.log(`\n✅ No se encontraron console.log para reemplazar`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { processFile, walkDirectory };
